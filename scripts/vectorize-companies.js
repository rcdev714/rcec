#!/usr/bin/env node
/**
 * Vectorize (index) companies into Supabase Vector Buckets (S3 Vectors).
 *
 * This script is intended for batch/offline indexing (NOT for runtime requests).
 *
 * Requirements (env):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - GOOGLE_API_KEY (for embeddings)
 *
 * Optional (env):
 * - COMPANIES_VECTOR_ENABLED=true
 * - COMPANIES_VECTOR_BUCKET=companies
 * - COMPANIES_VECTOR_INDEX=companies-ec-latest
 * - COMPANIES_VECTOR_EMBEDDING_MODEL=text-embedding-004
 *
 * Usage examples:
 * - Index 200 rows starting after id 0:
 *   node scripts/vectorize-companies.js --afterId 0 --limit 200
 *
 * - Run continuously in batches of 200 and save checkpoint:
 *   node scripts/vectorize-companies.js --limit 200 --checkpoint .vectorize-checkpoint.json
 *
 * - Create bucket + index (dimension inferred from embedding model):
 *   node scripts/vectorize-companies.js --createBucket --createIndex
 *
 * Notes:
 * - This script reads from `latest_companies_with_directors` by default.
 * - If you point env vars to the `camella-global` branch URL/key, it will index that branch.
 */

// Load env vars like Next.js does.
// Node scripts do NOT automatically load `.env.local`, so we explicitly load it first.
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function pickEnv(names) {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return null;
}

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(err) {
  if (!err) return String(err);
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err && typeof err.message === "string") return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function withRetries(label, fn, options = {}) {
  const retries = Number.isFinite(Number(options.retries)) ? Number(options.retries) : 3;
  const baseDelayMs = Number.isFinite(Number(options.baseDelayMs)) ? Number(options.baseDelayMs) : 750;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt++;
    try {
      return await fn(attempt);
    } catch (err) {
      const msg = formatError(err);
      const isLast = attempt > retries;
      if (isLast) throw err;
      const delay = baseDelayMs * Math.min(attempt, 6);
      console.warn(`[retry] ${label} failed (attempt ${attempt}/${retries + 1}): ${msg}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

function buildCompanyEmbeddingText(company) {
  const name = company.nombre_comercial || company.nombre || "";
  const pieces = [];

  if (name) pieces.push(name);
  if (company.ruc) pieces.push(`RUC ${company.ruc}`);
  if (company.provincia) pieces.push(`Provincia: ${company.provincia}`);
  if (company.ciiu) pieces.push(`CIIU: ${company.ciiu}`);
  if (company.ciiu_n1) pieces.push(`Sección CIIU: ${company.ciiu_n1}`);
  if (company.ciiu_n6) pieces.push(`CIIU N6: ${company.ciiu_n6}`);
  if (company.segmento) pieces.push(`Segmento: ${company.segmento}`);
  if (company.cod_segmento) pieces.push(`Cod segmento: ${company.cod_segmento}`);
  if (company.anio) pieces.push(`Año: ${company.anio}`);
  if (company.descripcion) pieces.push(`Actividad: ${company.descripcion}`);
  if (company.director_nombre) {
    pieces.push(
      `Representante: ${company.director_nombre}${company.director_cargo ? ` (${company.director_cargo})` : ""}`
    );
  }

  return pieces.join(" | ").slice(0, 2000);
}

function getSourceSelect(source) {
  // Keep these aligned with actual DB schema to avoid PostgREST errors.
  if (source === "companies") {
    // The raw companies table is huge and has fewer descriptive fields in this project.
    return "id,ruc,nombre,provincia,anio,ciiu_n1,ciiu_n6,cod_segmento";
  }
  if (source === "latest_companies") {
    return "id,ruc,nombre,provincia,anio,ciiu,ciiu_n1,segmento,descripcion";
  }
  // Default: latest_companies_with_directors
  return "id,ruc,nombre,provincia,anio,ciiu,ciiu_n1,segmento,descripcion,director_nombre,director_cargo";
}

function buildCompanyVectorMetadata(company) {
  const snippet = (company.descripcion || "").slice(0, 280) || null;
  // NOTE: This Vector Buckets deployment rejects numeric/boolean metadata values.
  // Keep everything as strings for maximum compatibility.
  return {
    ruc: company.ruc != null ? String(company.ruc) : null,
    nombre: company.nombre != null ? String(company.nombre) : null,
    nombre_comercial: company.nombre_comercial != null ? String(company.nombre_comercial) : null,
    provincia: company.provincia != null ? String(company.provincia) : null,
    anio: company.anio != null ? String(company.anio) : null,
    ciiu: company.ciiu != null ? String(company.ciiu) : null,
    ciiu_n1: company.ciiu_n1 != null ? String(company.ciiu_n1) : null,
    ciiu_n6: company.ciiu_n6 != null ? String(company.ciiu_n6) : null,
    cod_segmento: company.cod_segmento != null ? String(company.cod_segmento) : null,
    segmento: company.segmento != null ? String(company.segmento) : null,
    snippet,
  };
}

function getConfig(overrides = {}) {
  // Prefer TARGET_* vars when doing cross-project indexing (source DB != target vector bucket)
  const bucket =
    overrides.bucket ||
    pickEnv(["TARGET_COMPANIES_VECTOR_BUCKET", "TARGET_S3_VECTORS_BUCKET"]) ||
    process.env.COMPANIES_VECTOR_BUCKET ||
    process.env.S3_VECTORS_BUCKET ||
    "companies";
  const index =
    overrides.index ||
    pickEnv(["TARGET_COMPANIES_VECTOR_INDEX", "TARGET_S3_VECTORS_INDEX"]) ||
    process.env.COMPANIES_VECTOR_INDEX ||
    process.env.S3_VECTORS_INDEX ||
    "companies-ec-latest";
  const embeddingModel =
    overrides.embeddingModel ||
    pickEnv(["TARGET_COMPANIES_VECTOR_EMBEDDING_MODEL", "TARGET_S3_VECTORS_EMBEDDING_MODEL"]) ||
    process.env.COMPANIES_VECTOR_EMBEDDING_MODEL ||
    process.env.S3_VECTORS_EMBEDDING_MODEL ||
    "text-embedding-004";
  const enabledRaw =
    pickEnv(["TARGET_COMPANIES_VECTOR_ENABLED", "TARGET_S3_VECTORS_ENABLED"]) ||
    process.env.COMPANIES_VECTOR_ENABLED ||
    process.env.S3_VECTORS_ENABLED ||
    "";
  const enabled = enabledRaw === "true" || enabledRaw === "1" || Boolean(process.env.COMPANIES_VECTOR_BUCKET && process.env.COMPANIES_VECTOR_INDEX);
  return { bucket, index, embeddingModel, enabled };
}

async function embedText(text, embeddingModel) {
  const apiKey = requireEnv("GOOGLE_API_KEY");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: embeddingModel });
  const result = await withRetries(`embedText(${embeddingModel})`, async () => model.embedContent(text), {
    retries: 4,
    baseDelayMs: 1000,
  });
  const values = result && result.embedding && result.embedding.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`Embedding generation failed for model "${embeddingModel}".`);
  }
  return values;
}

async function maybeCreateBucketAndIndex({ supabase, bucket, index, embeddingModel, createBucket, createIndex, distanceMetric }) {
  if (!createBucket && !createIndex) return;
  if (!supabase.storage || !supabase.storage.vectors) {
    throw new Error("This supabase-js build does not support Vector Buckets (storage.vectors).");
  }

  if (createBucket) {
    const { error } = await withRetries(`createBucket(${bucket})`, async () => supabase.storage.vectors.createBucket(bucket), {
      retries: 2,
      baseDelayMs: 800,
    });
    if (error && !String(error.message || "").toLowerCase().includes("already")) {
      throw error;
    }
    console.log(`✓ bucket ok: ${bucket}`);
  }

  if (createIndex) {
    // Infer dimension from the embedding model.
    const probe = await embedText("dimension probe", embeddingModel);
    const dimension = probe.length;
    const metric = distanceMetric || "cosine";

    const bucketClient = supabase.storage.vectors.from(bucket);
    const { error } = await withRetries(`createIndex(${bucket}/${index})`, async () => bucketClient.createIndex({
      indexName: index,
      dataType: "float32",
      dimension,
      distanceMetric: metric,
    }), { retries: 2, baseDelayMs: 1200 });

    if (error && !String(error.message || "").toLowerCase().includes("already")) {
      throw error;
    }
    console.log(`✓ index ok: ${bucket}/${index} (dim=${dimension}, metric=${metric})`);
  }
}

async function main() {
  const args = parseArgs(process.argv);

  // Support cross-project vectorization:
  // - SOURCE_*: where we read companies rows from (main)
  // - TARGET_*: where we upsert vectors into (camella-global)
  const sourceUrl =
    pickEnv(["SOURCE_SUPABASE_URL", "SOURCE_NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]) ||
    requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const sourceServiceKey =
    pickEnv(["SOURCE_SUPABASE_SERVICE_ROLE_KEY", "SOURCE_SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"]) ||
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const targetUrl =
    pickEnv(["TARGET_SUPABASE_URL", "TARGET_NEXT_PUBLIC_SUPABASE_URL"]) ||
    sourceUrl;
  const targetServiceKey =
    pickEnv(["TARGET_SUPABASE_SERVICE_ROLE_KEY", "TARGET_SUPABASE_SERVICE_KEY"]) ||
    sourceServiceKey;

  const source = args.source || "latest_companies_with_directors";
  const limit = Math.min(Math.max(toInt(args.limit, 200), 1), 500);
  const concurrency = Math.min(Math.max(toInt(args.concurrency, 6), 1), 30);
  const maxBatches = toInt(args.maxBatches, 0); // 0 => unlimited

  const checkpointPath = typeof args.checkpoint === "string" ? args.checkpoint : null;
  let afterId = toInt(args.afterId, 0);

  if (checkpointPath && fs.existsSync(checkpointPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(checkpointPath, "utf-8"));
      if (Number.isFinite(Number(raw.lastId))) afterId = Number(raw.lastId);
      console.log(`✓ loaded checkpoint: afterId=${afterId} (${checkpointPath})`);
    } catch (e) {
      console.warn("Could not read checkpoint file, continuing without it:", e.message);
    }
  }

  const { bucket, index, embeddingModel } = getConfig({
    bucket: args.bucket,
    index: args.index,
    embeddingModel: args.embeddingModel,
  });

  const sourceSupabase = createClient(sourceUrl, sourceServiceKey, { auth: { persistSession: false } });
  const targetSupabase = createClient(targetUrl, targetServiceKey, { auth: { persistSession: false } });

  // Optional: create bucket/index if asked
  await maybeCreateBucketAndIndex({
    supabase: targetSupabase,
    bucket,
    index,
    embeddingModel,
    createBucket: Boolean(args.createBucket),
    createIndex: Boolean(args.createIndex),
    distanceMetric: typeof args.distanceMetric === "string" ? args.distanceMetric : undefined,
  });

  if (!targetSupabase.storage?.vectors) {
    throw new Error("Vector Buckets API missing. Upgrade @supabase/supabase-js to a version that supports storage.vectors.");
  }

  const vectorIndex = targetSupabase.storage.vectors.from(bucket).index(index);

  console.log("Indexing config:");
  console.log(`- source project (read rows): ${sourceUrl}`);
  console.log(`- target project (write vectors): ${targetUrl}`);
  if (sourceUrl !== targetUrl) {
    console.log("! cross-project mode enabled (SOURCE_* -> TARGET_*). Ensure company IDs match in target DB.");
  }
  console.log(`- source: ${source}`);
  console.log(`- bucket/index: ${bucket}/${index}`);
  console.log(`- embeddingModel: ${embeddingModel}`);
  console.log(`- limit: ${limit}, concurrency: ${concurrency}`);
  console.log(`- start afterId: ${afterId}`);

  let batchNum = 0;
  let totalProcessed = 0;
  const startedAt = new Date().toISOString();

  while (true) {
    batchNum++;
    if (maxBatches > 0 && batchNum > maxBatches) {
      console.log(`Reached maxBatches=${maxBatches}. Done.`);
      break;
    }

    console.log(`→ fetching rows: source=${source}, afterId>${afterId}, limit=${limit}`);
    const { data, error } = await withRetries(
      `fetch(${source})`,
      async () =>
        sourceSupabase
          .from(source)
          .select(getSourceSelect(source))
          .order("id", { ascending: true })
          .gt("id", afterId)
          .limit(limit),
      { retries: 3, baseDelayMs: 1200 }
    );

    if (error) throw error;
    const rows = data || [];
    if (rows.length === 0) {
      console.log("No more rows to index.");
      break;
    }

    console.log(`→ embedding: rows=${rows.length}, concurrency=${concurrency}`);
    // Embed with a simple concurrency pool
    const queue = rows.slice();
    const embedded = [];

    const workers = Array.from({ length: concurrency }, () => (async () => {
      while (queue.length > 0) {
        const row = queue.shift();
        if (!row) break;
        const text = buildCompanyEmbeddingText(row);
        const embedding = await embedText(text, embeddingModel);
        embedded.push({
          key: String(row.id),
          data: { float32: embedding },
          metadata: buildCompanyVectorMetadata(row),
        });
      }
    })());

    await Promise.all(workers);

    // Upsert vectors (max 500 per request)
    console.log(`→ upserting vectors: count=${embedded.length}, bucket/index=${bucket}/${index}`);
    for (let i = 0; i < embedded.length; i += 500) {
      const chunk = embedded.slice(i, i + 500);
      const { error: putErr } = await withRetries(
        `putVectors(${bucket}/${index})`,
        async () => vectorIndex.putVectors({ vectors: chunk }),
        { retries: 4, baseDelayMs: 1500 }
      );
      if (putErr) throw putErr;
    }

    const lastId = rows[rows.length - 1].id;
    afterId = lastId;
    totalProcessed += rows.length;

    console.log(`✓ batch ${batchNum}: indexed=${rows.length}, lastId=${lastId}, total=${totalProcessed}`);

    if (checkpointPath) {
      fs.writeFileSync(
        checkpointPath,
        JSON.stringify(
          {
            source,
            bucket,
            index,
            embeddingModel,
            lastId,
            processed: totalProcessed,
            startedAt,
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
    }
  }
}

main().catch((err) => {
  console.error("Vectorize failed:", err);
  process.exit(1);
});


