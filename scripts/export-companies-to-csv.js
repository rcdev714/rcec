#!/usr/bin/env node
/**
 * Export `public.companies` to CSV in small batches (keyset pagination).
 *
 * Designed for large tables (e.g. 1.5M+ rows):
 * - Never loads the whole table in memory
 * - Streams rows to disk
 * - Supports resume via checkpoint file (afterId)
 *
 * Requirements (env):
 * - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL / SOURCE_* variants)
 * - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY / SOURCE_* variants)
 *
 * Usage examples:
 * - Export all rows to companies.csv (default):
 *   node scripts/export-companies-to-csv.js
 *
 * - Export in bigger batches and save a checkpoint:
 *   node scripts/export-companies-to-csv.js --batchSize 2000 --checkpoint .companies-export.checkpoint.json
 *
 * - Resume from checkpoint:
 *   node scripts/export-companies-to-csv.js --checkpoint .companies-export.checkpoint.json
 *
 * - Start after a specific id:
 *   node scripts/export-companies-to-csv.js --afterId 500000
 *
 * - Export only some columns:
 *   node scripts/export-companies-to-csv.js --columns id,ruc,nombre,provincia,anio,ciiu,descripcion
 */

// Load env vars like Next.js does.
// Node scripts do NOT automatically load `.env.local`, so we explicitly load it first.
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const fs = require("fs");
const { once } = require("events");
const { createClient } = require("@supabase/supabase-js");
const { stringify } = require("csv-stringify");

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
  const baseDelayMs = Number.isFinite(Number(options.baseDelayMs)) ? Number(options.baseDelayMs) : 1000;

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
      const delay = baseDelayMs * Math.min(attempt, 8);
      console.warn(`[retry] ${label} failed (attempt ${attempt}/${retries + 1}): ${msg}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

function parseColumns(columnsArg) {
  if (!columnsArg || typeof columnsArg !== "string") return null;
  const cols = columnsArg
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return cols.length ? cols : null;
}

function safeUnlink(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    // ignore
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(`
export-companies-to-csv

Options:
  --output <path>         Output CSV path (default: ./companies.csv)
  --batchSize <n>         Rows per request (default: 1000, max: 5000)
  --afterId <n>           Start after this id (default: 0)
  --checkpoint <path>     JSON checkpoint file to resume (optional)
  --columns <a,b,c>       Columns to export (default: *)
  --maxBatches <n>        Stop after N batches (0 = unlimited, default: 0)
  --overwrite             Overwrite output + checkpoint if they exist
  --append                Append to output (useful with --checkpoint)
`);
    process.exit(0);
  }

  const outputPath = typeof args.output === "string" ? args.output : path.resolve(process.cwd(), "companies.csv");
  const checkpointPath = typeof args.checkpoint === "string" ? args.checkpoint : null;

  const batchSize = Math.min(Math.max(toInt(args.batchSize, 1000), 1), 5000);
  const maxBatches = toInt(args.maxBatches, 0); // 0 => unlimited
  const overwrite = Boolean(args.overwrite);
  const appendFlag = Boolean(args.append);

  const explicitColumns = parseColumns(args.columns);
  const selectClause = explicitColumns ? explicitColumns.join(",") : "*";

  const sourceUrl =
    pickEnv(["SOURCE_SUPABASE_URL", "SOURCE_NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]) ||
    requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const sourceServiceKey =
    pickEnv(["SOURCE_SUPABASE_SERVICE_ROLE_KEY", "SOURCE_SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"]) ||
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(sourceUrl, sourceServiceKey, { auth: { persistSession: false } });

  let afterId = Math.max(toInt(args.afterId, 0), 0);
  let totalWritten = 0;
  let columns = explicitColumns;
  let fileAppendMode = appendFlag;

  // Load checkpoint if present
  if (checkpointPath && fs.existsSync(checkpointPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(checkpointPath, "utf-8"));
      if (Number.isFinite(Number(raw.lastId))) afterId = Number(raw.lastId);
      if (Number.isFinite(Number(raw.totalWritten))) totalWritten = Number(raw.totalWritten);
      if (Array.isArray(raw.columns) && raw.columns.every((c) => typeof c === "string")) columns = raw.columns.slice();
      if (typeof raw.outputPath === "string" && raw.outputPath && path.resolve(raw.outputPath) !== path.resolve(outputPath)) {
        throw new Error(`Checkpoint outputPath (${raw.outputPath}) does not match --output (${outputPath}).`);
      }
      fileAppendMode = true; // resuming implies append
      console.log(`✓ loaded checkpoint: afterId=${afterId}, totalWritten=${totalWritten} (${checkpointPath})`);
    } catch (e) {
      console.warn(`Could not read checkpoint file (${checkpointPath}), continuing without it:`, e.message);
    }
  }

  if (overwrite) {
    safeUnlink(outputPath);
    if (checkpointPath) safeUnlink(checkpointPath);
    fileAppendMode = false;
    totalWritten = 0;
    // afterId is still respected if user passed it explicitly
    if (!checkpointPath) {
      // no-op
    }
  }

  const outputExists = fs.existsSync(outputPath);
  if (outputExists && !fileAppendMode) {
    throw new Error(`Output file already exists: ${outputPath}. Use --overwrite or --append (with a matching --checkpoint).`);
  }
  if (fileAppendMode && !outputExists) {
    console.warn(`! --append/resume requested but output file does not exist yet (${outputPath}). Creating a new file with header.`);
    fileAppendMode = false;
  }

  console.log("Export config:");
  console.log(`- source project: ${sourceUrl}`);
  console.log(`- table: public.companies`);
  console.log(`- select: ${selectClause}`);
  console.log(`- output: ${outputPath}${fileAppendMode ? " (append)" : ""}`);
  if (checkpointPath) console.log(`- checkpoint: ${checkpointPath}`);
  console.log(`- batchSize: ${batchSize}`);
  console.log(`- start afterId: ${afterId}`);

  const fileStream = fs.createWriteStream(outputPath, { flags: fileAppendMode ? "a" : "w" });
  fileStream.on("error", (e) => {
    console.error("File write error:", e);
    process.exit(1);
  });

  let csvStream = null;
  let startedAt = new Date().toISOString();
  let batchNum = 0;

  const writeCheckpoint = (lastId) => {
    if (!checkpointPath) return;
    fs.writeFileSync(
      checkpointPath,
      JSON.stringify(
        {
          table: "companies",
          select: selectClause,
          columns,
          outputPath,
          lastId,
          totalWritten,
          batchSize,
          startedAt,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  };

  while (true) {
    batchNum++;
    if (maxBatches > 0 && batchNum > maxBatches) {
      console.log(`Reached maxBatches=${maxBatches}. Done.`);
      break;
    }

    console.log(`→ fetching rows: afterId>${afterId}, limit=${batchSize}`);
    const { data, error } = await withRetries(
      "fetch(companies)",
      async () =>
        supabase
          .from("companies")
          .select(selectClause)
          .order("id", { ascending: true })
          .gt("id", afterId)
          .limit(batchSize),
      { retries: 4, baseDelayMs: 1200 }
    );

    if (error) throw error;
    const rows = data || [];
    if (rows.length === 0) {
      console.log("No more rows to export.");
      break;
    }

    if (!columns) {
      // Derive CSV columns from the first row keys (includes null-valued columns).
      columns = Object.keys(rows[0] || {});
      if (!columns.length) throw new Error("Could not infer columns from first row.");
    }

    if (!csvStream) {
      // Initialize CSV stream once we know columns.
      csvStream = stringify({
        header: !fileAppendMode,
        columns,
      });
      csvStream.on("error", (e) => {
        throw e;
      });
      csvStream.pipe(fileStream);
    }

    for (const row of rows) {
      // Ensure consistent output even if PostgREST/JSON changes object shape (shouldn't, but safe).
      // csv-stringify will pick values by column names.
      if (!csvStream.write(row)) {
        await once(csvStream, "drain");
      }
    }

    const lastId = rows[rows.length - 1].id;
    afterId = Number(lastId);
    totalWritten += rows.length;

    console.log(`✓ batch ${batchNum}: wrote=${rows.length}, lastId=${afterId}, totalWritten=${totalWritten}`);
    writeCheckpoint(afterId);
  }

  if (csvStream) {
    csvStream.end();
  } else {
    // No data was written; still create empty file with header if explicit columns were provided.
    if (!fileAppendMode && explicitColumns && explicitColumns.length) {
      const emptyCsv = stringify({ header: true, columns: explicitColumns });
      emptyCsv.pipe(fileStream);
      emptyCsv.end();
    } else {
      fileStream.end();
    }
  }

  console.log("✓ export complete");
  console.log(`- output: ${outputPath}`);
  if (checkpointPath) console.log(`- checkpoint: ${checkpointPath}`);
  console.log(`- totalWritten: ${totalWritten}`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});


