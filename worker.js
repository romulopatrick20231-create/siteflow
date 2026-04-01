/**
 * worker.js
 * BullMQ worker process — run alongside index.js in queue mode.
 *
 * Usage:
 *   node worker.js
 *   CONCURRENCY=5 node worker.js
 */

import "dotenv/config";
import { startWorker } from "./src/queue.js";
import { qualifyLead } from "./src/qualifier.js";
import { scoreLead } from "./src/scorer.js";
import { enrichLead } from "./src/enrich.js";
import { gerarMateriais } from "./src/openai.js";
import { generateSite } from "./src/siteGenerator.js";
import { deployToVercel } from "./src/deploy.js";
import { insertLead, updateLeadStatus } from "./src/crm.js";
import { generateOutreach } from "./src/outreach.js";
import { salvarResultadoCompleto } from "./src/generator.js";
import { saveCheckpoint } from "./src/checkpoint.js";

const CONCURRENCY = parseInt(process.env.CONCURRENCY || "3", 10);

function log(ctx, msg) {
  const ts = new Date().toLocaleTimeString("pt-BR");
  console.log(`[${ts}][${ctx}] ${msg}`);
}

async function processJob(job) {
  const { fields, index } = job.data;
  const label = fields.nomeBase || `lead-${index}`;

  log(label, "Starting...");
  await job.updateProgress(5);

  // 1. Qualify
  log(label, "Qualifying website...");
  const qualified = await qualifyLead(fields);
  log(label, `Site: ${qualified.siteStatus}`);
  await job.updateProgress(15);

  // 2. Score
  const scored = scoreLead(qualified, fields);
  log(label, `Score: ${scored.score}/10 | Priority: ${scored.priority}`);
  await job.updateProgress(20);

  // Skip low-priority unless forced
  if (scored.priority === "low" && process.env.PROCESS_ALL_LEADS !== "true") {
    log(label, "Skipping (low priority)");
    return { skipped: true, slug: fields.slug, reason: "low_priority", score: scored.score };
  }

  // 3. Enrich + attach scoring metadata
  const ctx = enrichLead(fields);
  ctx.siteStatus = qualified.siteStatus;
  ctx.score = scored.score;
  ctx.priority = scored.priority;

  // 4. Generate AI copy
  log(label, "Generating AI content...");
  await job.updateProgress(35);
  const mat = await gerarMateriais(ctx);
  await job.updateProgress(55);

  // 5. Generate HTML site
  log(label, "Building HTML site...");
  const html = generateSite(ctx, mat);
  await job.updateProgress(65);

  // 6. Deploy to Vercel (optional)
  let siteUrl = null;
  if (process.env.VERCEL_TOKEN) {
    log(label, "Deploying to Vercel...");
    try {
      siteUrl = await deployToVercel(fields.slug, html);
      log(label, `Deployed → ${siteUrl}`);
    } catch (err) {
      log(label, `Deploy failed (non-fatal): ${err.message}`);
    }
  }
  await job.updateProgress(75);

  // 7. Generate outreach
  const outreach = generateOutreach(ctx, siteUrl);
  mat.scriptWhatsappMessages = outreach.messages;
  mat.scriptWhatsappLinks = outreach.links;

  // 8. Save to CRM (optional)
  let crmId = null;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    log(label, "Saving to CRM...");
    try {
      const record = await insertLead({
        name: ctx.nome,
        phone: ctx.telefone,
        neighborhood: ctx.bairro,
        city: ctx.cidade,
        niche: ctx.nicho,
        siteStatus: qualified.siteStatus,
        score: scored.score,
        priority: scored.priority,
        siteUrl,
      });
      crmId = record.id;
      await updateLeadStatus(crmId, "processed");
      log(label, `CRM saved (id: ${crmId})`);
    } catch (err) {
      log(label, `CRM failed (non-fatal): ${err.message}`);
    }
  }
  await job.updateProgress(90);

  // 9. Save output files
  const meta = { siteStatus: qualified.siteStatus, score: scored.score, priority: scored.priority, siteUrl, crmId };
  const savedPath = salvarResultadoCompleto(fields.slug, ctx, mat, html, meta);
  saveCheckpoint(index, fields.slug);

  await job.updateProgress(100);
  log(label, `Done → ${savedPath}`);

  return { slug: fields.slug, siteUrl, score: scored.score, priority: scored.priority, crmId };
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(55)}`);
console.log(`  FORGESITES AI — WORKER (concurrency: ${CONCURRENCY})`);
console.log(`${"═".repeat(55)}\n`);

const worker = startWorker({
  concurrency: CONCURRENCY,
  processor: processJob,
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("\n[Worker] SIGTERM received — shutting down...");
  await worker.close();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("\n[Worker] SIGINT received — shutting down...");
  await worker.close();
  process.exit(0);
});

console.log("[Worker] Waiting for jobs... (Ctrl+C to stop)\n");
