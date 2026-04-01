/**
 * checkpoint.js
 * Persists processing state to allow resume after interruption.
 * Prevents duplicate processing of leads already completed.
 */

import fs from "fs";

const CHECKPOINT_FILE = "./checkpoint.json";

/**
 * Reads the current checkpoint.
 * @returns {{ lastProcessedIndex: number, processedSlugs: string[] }}
 */
export function readCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_FILE)) {
    return { lastProcessedIndex: -1, processedSlugs: [] };
  }
  try {
    const raw = fs.readFileSync(CHECKPOINT_FILE, "utf-8");
    const data = JSON.parse(raw);
    return {
      lastProcessedIndex: data.lastProcessedIndex ?? -1,
      processedSlugs: data.processedSlugs ?? [],
    };
  } catch {
    return { lastProcessedIndex: -1, processedSlugs: [] };
  }
}

/**
 * Saves progress after successfully processing a lead.
 * @param {number} index - index of last processed lead
 * @param {string} slug - slug of processed lead
 */
export function saveCheckpoint(index, slug) {
  const current = readCheckpoint();
  const slugs = new Set(current.processedSlugs);
  if (slug) slugs.add(slug);

  const data = {
    lastProcessedIndex: Math.max(current.lastProcessedIndex, index),
    processedSlugs: [...slugs],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Checks if a lead was already processed.
 * @param {string} slug
 * @returns {boolean}
 */
export function isAlreadyProcessed(slug) {
  const { processedSlugs } = readCheckpoint();
  return processedSlugs.includes(slug);
}

/**
 * Deletes the checkpoint file (start from scratch).
 */
export function resetCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
    console.log("[Checkpoint] Reset — will start from index 0");
  }
}
