import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServiceClient } from "@/lib/supabase/server-admin";
import type { Company } from "@/types/company";

export type CompaniesVectorConfig = {
  bucket: string;
  index: string;
  embeddingModel: string;
  enabled: boolean;
};

export type CompanyVectorMetadata = {
  // NOTE:
  // - Some Vector Buckets deployments reject numeric/boolean metadata values.
  // - Additionally, the metadata key `company_id` can be rejected by server-side validation.
  // We rely on the vector `key` (set to the company id) to recover ids at query-time.
  ruc?: string | null;
  nombre?: string | null;
  nombre_comercial?: string | null;
  provincia?: string | null;
  anio?: string | null;
  ciiu?: string | null;
  ciiu_n1?: string | null;
  segmento?: string | null;
  // Optional: small snippet for RAG context (keep short!)
  snippet?: string | null;
};

const DEFAULTS: CompaniesVectorConfig = {
  bucket: "companies",
  index: "companies-ec-latest",
  embeddingModel: "text-embedding-004",
  enabled: false,
};

export function getCompaniesVectorConfig(): CompaniesVectorConfig {
  const bucket =
    process.env.COMPANIES_VECTOR_BUCKET ||
    process.env.S3_VECTORS_BUCKET ||
    DEFAULTS.bucket;

  const index =
    process.env.COMPANIES_VECTOR_INDEX ||
    process.env.S3_VECTORS_INDEX ||
    DEFAULTS.index;

  const embeddingModel =
    process.env.COMPANIES_VECTOR_EMBEDDING_MODEL ||
    process.env.S3_VECTORS_EMBEDDING_MODEL ||
    DEFAULTS.embeddingModel;

  const enabledRaw =
    process.env.COMPANIES_VECTOR_ENABLED ||
    process.env.S3_VECTORS_ENABLED ||
    "";

  const enabled =
    enabledRaw === "true" ||
    enabledRaw === "1" ||
    // Auto-enable if bucket+index explicitly set (helps avoid forgetting the toggle)
    Boolean(process.env.COMPANIES_VECTOR_BUCKET && process.env.COMPANIES_VECTOR_INDEX);

  return { bucket, index, embeddingModel, enabled };
}

function getEmbeddingClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is required for company embeddings but is not set.");
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function embedText(text: string, modelName?: string): Promise<number[]> {
  const config = getCompaniesVectorConfig();
  const embeddingModel = modelName || config.embeddingModel;
  const genAI = getEmbeddingClient();
  const model = genAI.getGenerativeModel({ model: embeddingModel });

  // @google/generative-ai returns { embedding: { values: number[] } } for embedding models.
  const result: any = await model.embedContent(text);
  const values = result?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`Embedding generation failed for model "${embeddingModel}".`);
  }
  return values as number[];
}

export function buildCompanyEmbeddingText(company: Pick<
  Company,
  | "id"
  | "ruc"
  | "nombre"
  | "nombre_comercial"
  | "provincia"
  | "ciiu"
  | "ciiu_n1"
  | "segmento"
  | "anio"
  | "descripcion"
  | "director_nombre"
  | "director_cargo"
> & { descripcion?: string | null }): string {
  const name = company.nombre_comercial || company.nombre || "";
  const pieces: string[] = [];

  if (name) pieces.push(name);
  if (company.ruc) pieces.push(`RUC ${company.ruc}`);
  if (company.provincia) pieces.push(`Provincia: ${company.provincia}`);
  if (company.ciiu) pieces.push(`CIIU: ${company.ciiu}`);
  if (company.ciiu_n1) pieces.push(`Sección CIIU: ${company.ciiu_n1}`);
  if (company.segmento) pieces.push(`Segmento: ${company.segmento}`);
  if (company.anio) pieces.push(`Año: ${company.anio}`);
  if (company.descripcion) pieces.push(`Actividad: ${company.descripcion}`);
  if (company.director_nombre) {
    pieces.push(
      `Representante: ${company.director_nombre}${company.director_cargo ? ` (${company.director_cargo})` : ""}`
    );
  }

  // Keep text compact; long texts increase latency/cost without much benefit for this use case.
  return pieces.join(" | ").slice(0, 2000);
}

export function buildCompanyVectorMetadata(company: Pick<
  Company,
  | "id"
  | "ruc"
  | "nombre"
  | "nombre_comercial"
  | "provincia"
  | "anio"
  | "ciiu"
  | "ciiu_n1"
  | "segmento"
  | "descripcion"
>): CompanyVectorMetadata {
  const snippet = (company.descripcion || "").slice(0, 280) || null;
  return {
    ruc: company.ruc,
    nombre: company.nombre,
    nombre_comercial: company.nombre_comercial,
    provincia: company.provincia,
    anio: company.anio != null ? String(company.anio) : null,
    ciiu: company.ciiu,
    ciiu_n1: company.ciiu_n1,
    segmento: company.segmento,
    snippet,
  };
}

export async function upsertCompanyVectors(params: {
  vectors: Array<{
    company: Company;
    embedding: number[];
  }>;
}) {
  const config = getCompaniesVectorConfig();
  if (!config.enabled) {
    throw new Error("Companies vector indexing is disabled (set COMPANIES_VECTOR_ENABLED=true).");
  }

  const supabase = createServiceClient();
  const vectorsPayload = params.vectors.map(({ company, embedding }) => ({
    key: String(company.id),
    data: { float32: embedding },
    metadata: buildCompanyVectorMetadata(company),
  }));

  // Supabase vector buckets API (alpha). Types may lag behind supabase-js.
  const index: any = (supabase as any).storage?.vectors?.from(config.bucket)?.index(config.index);
  if (!index?.putVectors) {
    throw new Error(
      "Supabase Storage Vectors API is not available on this client. Ensure supabase-js supports storage.vectors in your version."
    );
  }

  const { error } = await index.putVectors({ vectors: vectorsPayload });
  if (error) throw error;
}

export async function semanticSearchCompanyIds(params: {
  query: string;
  topK?: number;
  filter?: Record<string, any>;
}): Promise<{
  ids: number[];
  debug: { bucket: string; index: string; topK: number; count: number };
}> {
  const config = getCompaniesVectorConfig();
  if (!config.enabled) return { ids: [], debug: { bucket: config.bucket, index: config.index, topK: params.topK || 0, count: 0 } };

  const supabase = createServiceClient();
  const index: any = (supabase as any).storage?.vectors?.from(config.bucket)?.index(config.index);
  if (!index?.queryVectors) {
    throw new Error(
      "Supabase Storage Vectors API is not available on this client. Ensure supabase-js supports storage.vectors in your version."
    );
  }

  const embedding = await embedText(params.query, config.embeddingModel);
  const topK = Math.min(Math.max(params.topK ?? 50, 1), 200);

  const { data, error } = await index.queryVectors({
    queryVector: { float32: embedding },
    topK,
    returnDistance: true,
    returnMetadata: true,
    ...(params.filter ? { filter: params.filter } : {}),
  });
  if (error) throw error;

  const vectors: any[] = data?.vectors || [];
  const ids = vectors
    .map((v) => {
      const metaId = v?.metadata?.company_id;
      const keyId = v?.key;
      const raw = metaId ?? keyId;
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : null;
    })
    .filter((n): n is number => n !== null);

  return {
    ids,
    debug: { bucket: config.bucket, index: config.index, topK, count: ids.length },
  };
}


