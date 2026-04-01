/**
 * domain.js — Domain management service.
 *
 * Abstracts the domain provider (Namecheap or Cloudflare).
 * Each method throws a typed AppError on failure.
 *
 * Supported providers:
 *   namecheap  — availability check + registration
 *   cloudflare — DNS management + Vercel connection
 */

import axios  from "axios";
import { env } from "../config/env.js";
import { getAdminClient } from "../saas/db.js";
import logger from "../utils/logger.js";
import {
  BusinessError,
  ServiceUnavailableError,
  ConflictError,
  NotFoundError,
} from "../utils/errors.js";

// ── Provider abstraction ──────────────────────────────────────────────────

class NamecheapProvider {
  #baseUrl = env.NODE_ENV === "production"
    ? "https://api.namecheap.com/xml.response"
    : "https://api.sandbox.namecheap.com/xml.response";

  #params() {
    return {
      ApiUser:  env.NAMECHEAP_API_USER,
      ApiKey:   env.NAMECHEAP_API_KEY,
      UserName: env.NAMECHEAP_API_USER,
      ClientIp: env.NAMECHEAP_CLIENT_IP,
    };
  }

  #parseXml(xml, path) {
    // Lightweight XML value extractor — no dependency needed for these simple responses
    const match = xml.match(new RegExp(`<${path}[^>]*>([^<]*)</${path}>`));
    return match ? match[1].trim() : null;
  }

  #checkApiErrors(xml) {
    const errorNum = xml.match(/<Error Number="(\d+)"[^>]*>([^<]*)<\/Error>/);
    if (errorNum) {
      throw new ServiceUnavailableError(`Namecheap API error ${errorNum[1]}: ${errorNum[2]}`);
    }
    const status = this.#parseXml(xml, "ApiResponse");
    if (status && xml.includes('Status="ERROR"')) {
      const errMsg = xml.match(/ErrCount="([^"]+)"/);
      throw new ServiceUnavailableError(`Namecheap API returned error`);
    }
  }

  async checkAvailability(domain) {
    const [sld, ...tldParts] = domain.split(".");
    const tld = tldParts.join(".");

    const { data: xml } = await axios.get(this.#baseUrl, {
      params: {
        ...this.#params(),
        Command:    "namecheap.domains.check",
        DomainList: domain,
      },
      timeout: 10_000,
    });

    this.#checkApiErrors(xml);

    const available = xml.includes(`Available="true"`);
    const priceMatch = xml.match(/RegularPrice="([^"]+)"/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : null;

    return {
      domain,
      available,
      price,
      currency: "USD",
      provider: "namecheap",
    };
  }

  async register(domain, years, contact) {
    const [sld, ...tldParts] = domain.split(".");
    const tld = tldParts.join(".");

    const { data: xml } = await axios.get(this.#baseUrl, {
      params: {
        ...this.#params(),
        Command:              "namecheap.domains.create",
        DomainName:           domain,
        Years:                years,
        // Registrant contact
        RegistrantFirstName:  contact.firstName,
        RegistrantLastName:   contact.lastName,
        RegistrantAddress1:   contact.address1,
        RegistrantCity:       contact.city,
        RegistrantStateProvince: contact.state,
        RegistrantPostalCode: contact.zip,
        RegistrantCountry:    contact.country,
        RegistrantPhone:      contact.phone,
        RegistrantEmailAddress: contact.email,
        // Copy to admin + tech + billing
        AdminFirstName:       contact.firstName,
        AdminLastName:        contact.lastName,
        AdminAddress1:        contact.address1,
        AdminCity:            contact.city,
        AdminStateProvince:   contact.state,
        AdminPostalCode:      contact.zip,
        AdminCountry:         contact.country,
        AdminPhone:           contact.phone,
        AdminEmailAddress:    contact.email,
        TechFirstName:        contact.firstName,
        TechLastName:         contact.lastName,
        TechAddress1:         contact.address1,
        TechCity:             contact.city,
        TechStateProvince:    contact.state,
        TechPostalCode:       contact.zip,
        TechCountry:          contact.country,
        TechPhone:            contact.phone,
        TechEmailAddress:     contact.email,
        AuxBillingFirstName:  contact.firstName,
        AuxBillingLastName:   contact.lastName,
        AuxBillingAddress1:   contact.address1,
        AuxBillingCity:       contact.city,
        AuxBillingStateProvince: contact.state,
        AuxBillingPostalCode: contact.zip,
        AuxBillingCountry:    contact.country,
        AuxBillingPhone:      contact.phone,
        AuxBillingEmailAddress: contact.email,
        // Nameservers — point to Vercel/Cloudflare after registration
        Nameservers:          "dns1.registrar-servers.com,dns2.registrar-servers.com",
      },
      timeout: 30_000,
    });

    this.#checkApiErrors(xml);

    if (!xml.includes('Registered="true"')) {
      const errMsg = xml.match(/<Error>([^<]+)<\/Error>/);
      throw new BusinessError(errMsg ? errMsg[1] : "Domain registration failed");
    }

    const orderId = this.#parseXml(xml, "OrderID");
    return {
      providerId:    orderId,
      registeredAt:  new Date().toISOString(),
      expiresAt:     new Date(Date.now() + years * 365.25 * 86400000).toISOString(),
    };
  }
}

class CloudflareProvider {
  #headers() {
    return {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  async checkAvailability(domain) {
    // Cloudflare registrar: check if domain is available
    const res = await axios.get(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/registrar/domains/${domain}`,
      { headers: this.#headers(), timeout: 10_000 }
    ).catch(() => null);

    // If 404, domain may be available; if found, it's already registered by this account
    const available = !res || !res.data?.result?.id;
    return { domain, available, price: null, currency: "USD", provider: "cloudflare" };
  }

  async register(domain, years, contact) {
    const { data } = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/registrar/domains`,
      { name: domain, period: years, auto_renew: true, privacy: true },
      { headers: this.#headers(), timeout: 30_000 }
    );
    if (!data.success) {
      throw new BusinessError(data.errors?.[0]?.message || "Cloudflare registration failed");
    }
    return {
      providerId:   data.result.id,
      registeredAt: new Date().toISOString(),
      expiresAt:    data.result.expires_at,
    };
  }

  /**
   * Connect a custom domain to a Vercel deployment.
   */
  async createZone(domain) {
    const { data } = await axios.post(
      `https://api.cloudflare.com/client/v4/zones`,
      { name: domain, jump_start: true, account: { id: env.CLOUDFLARE_ACCOUNT_ID } },
      { headers: this.#headers(), timeout: 15_000 }
    );
    if (!data.success) {
      throw new ServiceUnavailableError(`Cloudflare zone creation failed: ${data.errors?.[0]?.message}`);
    }
    return data.result.id;
  }
}

function getProvider() {
  return env.DOMAIN_PROVIDER === "cloudflare"
    ? new CloudflareProvider()
    : new NamecheapProvider();
}

// ── Vercel domain connection ──────────────────────────────────────────────

async function addDomainToVercel(vercelProjectName, domain) {
  const teamQuery = env.VERCEL_TEAM_ID ? `?teamId=${env.VERCEL_TEAM_ID}` : "";
  const { data } = await axios.post(
    `https://api.vercel.com/v9/projects/${vercelProjectName}/domains${teamQuery}`,
    { name: domain },
    {
      headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}`, "Content-Type": "application/json" },
      timeout: 15_000,
    }
  );
  return data;
}

async function verifyDomainOnVercel(vercelProjectName, domain) {
  const teamQuery = env.VERCEL_TEAM_ID ? `?teamId=${env.VERCEL_TEAM_ID}` : "";
  const { data } = await axios.get(
    `https://api.vercel.com/v9/projects/${vercelProjectName}/domains/${domain}${teamQuery}`,
    {
      headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` },
      timeout: 10_000,
    }
  );
  return { verified: data.verified, configuredBy: data.configuredBy };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Check domain availability.
 */
export async function searchDomain(domain) {
  const provider = getProvider();
  try {
    return await provider.checkAvailability(domain);
  } catch (err) {
    if (err instanceof BusinessError || err instanceof ServiceUnavailableError) throw err;
    throw new ServiceUnavailableError("Domain API");
  }
}

/**
 * Register a domain and store it in the DB.
 */
export async function registerDomain(userId, siteId, { domain, years, ...contact }) {
  const db = getAdminClient();

  // Check not already registered
  const { count } = await db
    .from("domains")
    .select("id", { count: "exact", head: true })
    .eq("domain", domain);
  if (count > 0) throw new ConflictError(`Domain "${domain}" is already in use`);

  // Verify site ownership
  const { data: site } = await db.from("sites").select("id, slug, site_url").eq("id", siteId).eq("user_id", userId).single();
  if (!site) throw new NotFoundError("Site");

  const provider = getProvider();
  const result   = await provider.register(domain, years, contact);

  // Persist to DB
  const { data: domainRow, error } = await db.from("domains").insert({
    user_id:       userId,
    site_id:       siteId,
    domain,
    provider:      env.DOMAIN_PROVIDER,
    provider_id:   result.providerId,
    status:        "pending",
    registered_at: result.registeredAt,
    expires_at:    result.expiresAt,
  }).select().single();

  if (error) throw new Error(`Failed to save domain: ${error.message}`);

  logger.info("Domain registered", { userId, domain, siteId });
  return domainRow;
}

/**
 * Connect a registered domain to the site's Vercel deployment.
 */
export async function connectDomain(userId, siteId, domainId) {
  const db = getAdminClient();

  // Verify ownership
  const { data: site } = await db.from("sites").select("id, slug, site_url, status").eq("id", siteId).eq("user_id", userId).single();
  if (!site) throw new NotFoundError("Site");
  if (site.status !== "published") throw new BusinessError("Site must be published before connecting a custom domain");

  const { data: domainRow } = await db.from("domains").select("*").eq("id", domainId).eq("user_id", userId).single();
  if (!domainRow) throw new NotFoundError("Domain");
  if (domainRow.site_id !== siteId) throw new BusinessError("Domain does not belong to this site");

  // Add domain to Vercel project
  const vercelProject = `forgesites-${site.slug}`;
  let vercelData;
  try {
    vercelData = await addDomainToVercel(vercelProject, domainRow.domain);
  } catch (err) {
    logger.error("Vercel domain connection failed", { domain: domainRow.domain, error: err.message });
    throw new ServiceUnavailableError("Vercel domain connection");
  }

  // Update domain status
  await db.from("domains").update({
    status:          "active",
    vercel_zone_id:  vercelData.apexName,
    dns_verified:    vercelData.verified || false,
    updated_at:      new Date().toISOString(),
  }).eq("id", domainId);

  // Update site with custom domain URL
  await db.from("sites").update({
    site_url:   `https://${domainRow.domain}`,
    updated_at: new Date().toISOString(),
  }).eq("id", siteId);

  logger.info("Domain connected to Vercel", { domain: domainRow.domain, siteId });

  return {
    domain:        domainRow.domain,
    status:        "active",
    verified:      vercelData.verified || false,
    dnsInstructions: vercelData.nameservers || [
      "dns1.vercel-dns.com",
      "dns2.vercel-dns.com",
    ],
  };
}

/**
 * Get all domains for a user.
 */
export async function getUserDomains(userId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("domains")
    .select("*, sites(id, business_name, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getUserDomains: ${error.message}`);
  return data ?? [];
}

/**
 * Verify domain DNS propagation on Vercel.
 */
export async function verifyDomain(userId, domainId) {
  const db = getAdminClient();
  const { data: domainRow } = await db.from("domains").select("*, sites(slug)").eq("id", domainId).eq("user_id", userId).single();
  if (!domainRow) throw new NotFoundError("Domain");

  try {
    const vercelProject = `forgesites-${domainRow.sites?.slug}`;
    const result = await verifyDomainOnVercel(vercelProject, domainRow.domain);

    await db.from("domains").update({
      dns_verified: result.verified,
      status:       result.verified ? "active" : domainRow.status,
      updated_at:   new Date().toISOString(),
    }).eq("id", domainId);

    return { domain: domainRow.domain, verified: result.verified };
  } catch (err) {
    throw new ServiceUnavailableError("Domain verification");
  }
}
