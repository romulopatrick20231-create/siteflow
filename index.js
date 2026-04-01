/**
 * index.js — ForgeSites AI v2
 * Production-grade outbound sales engine.
 *
 * Usage:
 *   node index.js                      → process input/leads.csv (sequential)
 *   node index.js input/my.csv         → custom CSV file
 *   node index.js --queue              → enqueue to BullMQ (run worker.js separately)
 *   node index.js --reset              → clear checkpoint and re-process all
 *   PROCESS_ALL_LEADS=true node index.js → ignore priority filter
 */

import "dotenv/config";
import path from "path";
import { readCSV, extractFields } from "./src/parser.js";
import { enrichLead } from "./src/enrich.js";
import { qualifyLead } from "./src/qualifier.js";
import { scoreLead } from "./src/scorer.js";
import { gerarMateriais } from "./src/openai.js";
import { generateSite } from "./src/siteGenerator.js";
import { deployToVercel } from "./src/deploy.js";
import { insertLead, updateLeadStatus } from "./src/crm.js";
import { generateOutreach } from "./src/outreach.js";
import { salvarResultadoCompleto, salvarRelatorio } from "./src/generator.js";
import {
  readCheckpoint,
  saveCheckpoint,
  resetCheckpoint,
  isAlreadyProcessed,
} from "./src/checkpoint.js";

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const USE_QUEUE   = args.includes("--queue");
const DO_RESET    = args.includes("--reset");
const CSV_FILE    = args.find((a) => !a.startsWith("--")) || "./input/leads.csv";
const MIN_PRIORITY = process.env.MIN_PRIORITY || "medium"; // low | medium | high
const PROCESS_ALL  = process.env.PROCESS_ALL_LEADS === "true";
const DELAY_MS     = parseInt(process.env.DELAY_MS || "1500", 10);

// ─── Logger ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(icon, msg) {
  const ts = new Date().toLocaleTimeString("pt-BR");
  console.log(`[${ts}] ${icon}  ${msg}`);
}

function section(title) {
  console.log(`\n${"─".repeat(56)}\n  ${title}\n${"─".repeat(56)}`);
}

const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

function shouldProcess(priority) {
  if (PROCESS_ALL) return true;
  return (PRIORITY_ORDER[priority] ?? 0) >= (PRIORITY_ORDER[MIN_PRIORITY] ?? 2);
}

// ─── Queue mode ───────────────────────────────────────────────────────────────
async function runQueueMode(parsedLeads) {
  const { createQueue, enqueueLeads, isRedisAvailable } = await import("./src/queue.js");

  log("🔌", "Checking Redis...");
  const ok = await isRedisAvailable();
  if (!ok) {
    log("❌", "Redis unreachable. Start Redis or remove --queue flag.");
    process.exit(1);
  }

  const queue = createQueue();
  await enqueueLeads(queue, parsedLeads);
  log("✅", `${parsedLeads.length} jobs enqueued. Run 'node worker.js' to process.`);
  await queue.close();
}

// ─── Process single lead ──────────────────────────────────────────────────────
async function processSingle(fields, index, total) {
  section(`[${index + 1}/${total}] ${fields.nomeBase}`);

  // 1. Qualify
  log("🔍", "Qualifying website...");
  const qualified = await qualifyLead(fields);
  log("🌐", `Site: ${qualified.siteStatus} (${qualified.siteReasons.slice(0, 2).join(", ")})`);

  // 2. Score
  const scored = scoreLead(qualified, fields);
  log("🎯", `Score: ${scored.score}/10 | Priority: ${scored.priority}`);

  if (!shouldProcess(scored.priority)) {
    log("⏭️ ", `Skipped (priority=${scored.priority}, min=${MIN_PRIORITY})`);
    return { slug: fields.slug, skipped: true, ctx: null, mat: null, meta: { score: scored.score, priority: scored.priority } };
  }

  // 3. Enrich
  const ctx = enrichLead(fields);
  ctx.siteStatus  = qualified.siteStatus;
  ctx.score       = scored.score;
  ctx.priority    = scored.priority;
  log("🏷️ ", `Niche: ${ctx.icone} ${ctx.nicho} | ${ctx.autoridade}`);

  // 4. OpenAI copy generation
  log("🤖", "Generating content (OpenAI)...");
  const mat = await gerarMateriais(ctx);
  log("✅", `Headline: "${mat.headline}"`);

  // 5. HTML site
  log("🖥️ ", "Building HTML site...");
  const html = generateSite(ctx, mat);

  // 6. Deploy (optional)
  let siteUrl = null;
  if (process.env.VERCEL_TOKEN) {
    log("🚀", "Deploying to Vercel...");
    try {
      siteUrl = await deployToVercel(fields.slug, html);
      log("🌍", `Live: ${siteUrl}`);
    } catch (err) {
      log("⚠️ ", `Deploy skipped: ${err.message}`);
    }
  } else {
    log("💡", "VERCEL_TOKEN not set — site saved locally only");
  }

  // 7. Outreach messages
  const outreach = generateOutreach(ctx, siteUrl);
  mat.scriptWhatsappMessages = outreach.messages;
  mat.scriptWhatsappLinks    = outreach.links;

  // 8. CRM (optional)
  let crmId = null;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    log("📋", "Saving to CRM...");
    try {
      const record = await insertLead({
        name: ctx.nome, phone: ctx.telefone,
        neighborhood: ctx.bairro, city: ctx.cidade, niche: ctx.nicho,
        siteStatus: qualified.siteStatus, score: scored.score,
        priority: scored.priority, siteUrl,
      });
      crmId = record.id;
      await updateLeadStatus(crmId, "processed");
      log("✅", `CRM id: ${crmId}`);
    } catch (err) {
      log("⚠️ ", `CRM skipped: ${err.message}`);
    }
  }

  // 9. Save files
  const meta = {
    siteStatus: qualified.siteStatus,
    score: scored.score,
    priority: scored.priority,
    siteUrl,
    crmId,
  };
  const filePath = salvarResultadoCompleto(fields.slug, ctx, mat, html, meta);
  saveCheckpoint(index, fields.slug);
  log("💾", `Saved → ${filePath}`);

  return { slug: fields.slug, skipped: false, ctx, mat, meta, erro: null };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  section("🔥 FORGESITES AI v2 — STARTING");

  if (DO_RESET) {
    resetCheckpoint();
    log("🔄", "Checkpoint cleared — processing all leads");
  }

  log("📂", `CSV: ${CSV_FILE}`);
  let rows;
  try {
    rows = readCSV(path.resolve(CSV_FILE));
  } catch (err) {
    log("❌", `CSV error: ${err.message}`);
    process.exit(1);
  }
  log("📋", `${rows.length} lead(s) found`);
  if (rows.length === 0) { log("⚠️ ", "No leads."); process.exit(0); }

  // Parse all rows
  const parsedLeads = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const fields = extractFields(rows[i]);
      parsedLeads.push({ fields, index: i });
    } catch (err) {
      log("❌", `Parse error row ${i + 1}: ${err.message}`);
    }
  }

  // Queue mode
  if (USE_QUEUE) {
    await runQueueMode(parsedLeads);
    return;
  }

  // Sequential mode — skip already-processed via checkpoint
  const checkpoint = readCheckpoint();
  const toProcess = parsedLeads.filter(({ fields, index }) => {
    if (isAlreadyProcessed(fields.slug)) {
      log("⏭️ ", `[${index + 1}] Already processed: ${fields.nomeBase}`);
      return false;
    }
    return true;
  });

  log("📌", `${toProcess.length} to process (${parsedLeads.length - toProcess.length} skipped)`);
  log("⚙️ ", `Min priority: ${MIN_PRIORITY} | Process all: ${PROCESS_ALL}`);

  const resultados = [];

  for (let i = 0; i < toProcess.length; i++) {
    const { fields, index } = toProcess[i];
    let result;
    try {
      result = await processSingle(fields, index, rows.length);
    } catch (err) {
      log("❌", `Error on ${fields.nomeBase}: ${err.message}`);
      result = { slug: fields.slug, skipped: false, ctx: null, mat: null, meta: {}, erro: err.message };
    }
    resultados.push(result);

    // Delay between API calls
    const shouldDelay = !result.skipped && !result.erro && i < toProcess.length - 1;
    if (shouldDelay) {
      log("⏳", `Waiting ${DELAY_MS}ms...`);
      await sleep(DELAY_MS);
    }
  }

  // Final report
  section("📊 FINAL REPORT");
  const reportPath = salvarRelatorio(resultados);

  const ok      = resultados.filter((r) => !r.erro && !r.skipped).length;
  const skipped = resultados.filter((r) => r.skipped).length;
  const failed  = resultados.filter((r) => r.erro).length;
  const high    = resultados.filter((r) => r.meta?.priority === "high").length;
  const deployed = resultados.filter((r) => r.meta?.siteUrl).length;

  log("✅", `Processed: ${ok}`);
  log("⏭️ ", `Skipped (low priority): ${skipped}`);
  if (failed > 0) log("❌", `Failed: ${failed}`);
  log("🔥", `High-priority leads: ${high}`);
  log("🌍", `Sites deployed: ${deployed}`);
  log("📄", `Report: ${reportPath}`);

  section("🏁 DONE — /output folder ready");
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
