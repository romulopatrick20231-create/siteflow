/**
 * deploy.js
 * Deploys a generated HTML file to Vercel via their Deployments API.
 *
 * Required env vars:
 *   VERCEL_TOKEN    — from vercel.com/account/tokens
 *   VERCEL_TEAM_ID  — (optional) team slug for team accounts
 */

import axios from "axios";

const API_BASE = "https://api.vercel.com";

function projectName(slug) {
  // Vercel project names: lowercase letters, numbers, hyphens, max 52 chars
  return `forgesites-${slug}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52);
}

/**
 * Deploys HTML to Vercel and returns the live URL.
 * @param {string} slug - unique lead slug (used as project name)
 * @param {string} html - full HTML content
 * @returns {Promise<string>} production URL (https://...)
 */
export async function deployToVercel(slug, html) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not set in .env");

  const teamQuery = process.env.VERCEL_TEAM_ID
    ? `?teamId=${process.env.VERCEL_TEAM_ID}`
    : "";

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const payload = {
    name: projectName(slug),
    files: [
      {
        file: "index.html",
        data: Buffer.from(html, "utf-8").toString("base64"),
        encoding: "base64",
      },
    ],
    projectSettings: {
      framework: null,
      buildCommand: null,
      outputDirectory: null,
      installCommand: null,
      devCommand: null,
    },
    target: "production",
  };

  let response;
  try {
    response = await axios.post(
      `${API_BASE}/v13/deployments${teamQuery}`,
      payload,
      { headers, timeout: 90_000 }
    );
  } catch (err) {
    const body = err.response?.data
      ? JSON.stringify(err.response.data).slice(0, 300)
      : err.message;
    throw new Error(`Vercel API error: ${body}`);
  }

  const { url, readyState, error: vErr } = response.data;

  if (vErr) throw new Error(`Vercel deployment error: ${vErr.message}`);
  if (!url) throw new Error(`Vercel returned no URL. Response: ${JSON.stringify(response.data).slice(0, 200)}`);

  return `https://${url}`;
}
