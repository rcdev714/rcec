import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server-admin";
import { buildCompanyEmbeddingText, embedText, upsertCompanyVectors } from "@/lib/vector/companies-vectors";

/**
 * Admin-only endpoint to index companies into Supabase Vector Buckets (S3 Vectors).
 *
 * This runs in small batches to avoid timeouts.
 * Call with JSON:
 * {
 *   "source": "latest_companies_with_directors" | "latest_companies" (optional),
 *   "afterId": number (optional),
 *   "limit": number (optional, default 50, max 200)
 * }
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const source =
      body?.source === "latest_companies" || body?.source === "latest_companies_with_directors"
        ? body.source
        : "latest_companies";
    const afterId = Number.isFinite(Number(body?.afterId)) ? Number(body.afterId) : 0;
    const limitRaw = Number.isFinite(Number(body?.limit)) ? Number(body.limit) : 50;
    const limit = Math.min(Math.max(limitRaw, 1), 200);

    const supabase = createServiceClient();

    const selectFields =
      source === "latest_companies_with_directors"
        ? "id,ruc,nombre,provincia,anio,ciiu,ciiu_n1,segmento,descripcion,director_nombre,director_cargo"
        : "id,ruc,nombre,provincia,anio,ciiu,ciiu_n1,segmento,descripcion";

    // Fetch a batch of latest companies (snapshot) by id ascending for checkpointing.
    let query = supabase
      .from(source)
      .select(
        selectFields
      )
      .order("id", { ascending: true })
      .limit(limit);

    if (afterId > 0) query = query.gt("id", afterId);

    const { data, error } = await query;
    if (error) throw error;

    const companies = (data || []) as any[];
    if (companies.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        lastId: afterId,
        source,
        message: "No more rows to index.",
      });
    }

    // Embed + upsert (sequential with small concurrency could be added later)
    const vectors: Array<{ company: any; embedding: number[] }> = [];
    for (const company of companies) {
      const text = buildCompanyEmbeddingText(company);
      const embedding = await embedText(text);
      vectors.push({ company, embedding });
    }

    await upsertCompanyVectors({ vectors });

    const lastId = companies[companies.length - 1]?.id ?? afterId;

    return NextResponse.json({
      ok: true,
      processed: companies.length,
      lastId,
      source,
    });
  } catch (error) {
    console.error("[admin/companies/vectorize] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: msg.includes("Unauthorized") ? 401 : 500 });
  }
}


