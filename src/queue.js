/**
 * queue.js
 * BullMQ-based queue system for scalable lead processing.
 * Requires Redis (local or via REDIS_URL env var).
 *
 * Usage:
 *   Import createQueue() to add jobs.
 *   Import startWorker() in worker.js to process jobs.
 */

import { Queue, Worker } from "bullmq";

const QUEUE_NAME = "leadsQueue";

export function getRedisConnection() {
  const raw = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  try {
    const u = new URL(raw);
    return {
      host: u.hostname || "127.0.0.1",
      port: parseInt(u.port) || 6379,
      password: u.password || undefined,
      db: u.pathname.replace("/", "") ? parseInt(u.pathname.replace("/", "")) : 0,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379 };
  }
}

const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 4000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 1000 },
};

/**
 * Creates and returns the BullMQ Queue instance.
 */
export function createQueue() {
  return new Queue(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTS,
  });
}

/**
 * Adds an array of lead jobs to the queue.
 * @param {Queue} queue
 * @param {Array<{ fields: Object, index: number }>} leads
 */
export async function enqueueLeads(queue, leads) {
  const jobs = leads.map(({ fields, index }) => ({
    name: `lead-${index}`,
    data: { fields, index },
    opts: {
      // Higher score = higher priority in queue (lower number = processed first)
      jobId: `lead-${fields.slug}-${Date.now()}`,
    },
  }));

  await queue.addBulk(jobs);
  console.log(`[Queue] Enqueued ${jobs.length} leads`);
}

/**
 * Starts a BullMQ Worker that processes leads end-to-end.
 *
 * @param {Object} opts
 * @param {number} opts.concurrency - parallel jobs (default: 3)
 * @param {Function} opts.processor - async (job) => result
 * @param {Function} [opts.onComplete]
 * @param {Function} [opts.onFailed]
 * @returns {Worker}
 */
export function startWorker({ concurrency = 3, processor, onComplete, onFailed } = {}) {
  if (!processor) throw new Error("startWorker requires a processor function");

  const worker = new Worker(QUEUE_NAME, processor, {
    connection: getRedisConnection(),
    concurrency,
  });

  worker.on("completed", (job, result) => {
    const label = result?.skipped ? "SKIPPED" : "DONE";
    console.log(`[Worker] [${label}] Job ${job.id} — ${result?.slug || ""}`);
    if (onComplete) onComplete(job, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] [FAILED] Job ${job?.id} — ${err.message}`);
    if (onFailed) onFailed(job, err);
  });

  worker.on("error", (err) => {
    console.error(`[Worker] Error:`, err.message);
  });

  return worker;
}

/**
 * Checks if Redis is reachable (used for graceful fallback to direct mode).
 * @returns {Promise<boolean>}
 */
export async function isRedisAvailable() {
  const { default: Redis } = await import("ioredis");
  const conn = getRedisConnection();
  const client = new Redis({ ...conn, connectTimeout: 3000, lazyConnect: true });
  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    try { await client.quit(); } catch {}
    return false;
  }
}
