/**
 * storeFactory.js — Gerador automático de lojas completas.
 *
 * Função principal: createStoreWithTemplate(data)
 *
 * Fluxo:
 *   1. Valida input + gera slug único
 *   2. Gera senha segura
 *   3. Cria usuário Supabase (reusa createAdminUser)
 *   4. Cria store com owner_id do novo usuário
 *   5. Cria categorias do template
 *   6. Busca imagens no Pexels em paralelo (respeitando rate limit do pexelsService)
 *   7. Cria produtos com image_url preenchida
 *   8. Retorna { store_url, login, password, store, summary }
 */

import { getAdminClient }    from './db.js';
import { createAdminUser }   from './admin.js';
import { createStore }       from './storeService.js';
import { getTemplate, NICHES_BY_TYPE } from './storeTemplates.js';
import { searchImage, clearImageCache } from '../services/pexelsService.js';
import logger                from '../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Gera uma senha aleatória segura de 12 caracteres.
 * Formato: [4 letras maiúsculas][4 dígitos][4 letras minúsculas]
 */
function generatePassword() {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower  = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '0123456789';
  const special = '@#$!';

  const rand = (chars) => chars[Math.floor(Math.random() * chars.length)];

  // 3 upper + 4 digits + 3 lower + 2 special = 12 chars
  const parts = [
    rand(upper), rand(upper), rand(upper),
    rand(digits), rand(digits), rand(digits), rand(digits),
    rand(lower), rand(lower), rand(lower),
    rand(special), rand(special),
  ];

  // Shuffle
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }

  return parts.join('');
}

/**
 * Converte nome para slug URL-safe.
 * "Pizzaria do João" → "pizzaria-do-joao"
 */
function toSlug(name, niche) {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')   // remove especiais
    .trim()
    .replace(/\s+/g, '-');           // espaços → hífens

  return normalized || niche.toLowerCase();
}

/**
 * Garante que o slug seja único adicionando sufixo numérico se necessário.
 * "pizzaria-da-vila" → "pizzaria-da-vila-2"
 */
async function ensureUniqueSlug(baseSlug) {
  const db = getAdminClient();
  let slug     = baseSlug;
  let attempts = 0;

  while (attempts < 20) {
    const { count } = await db
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug);

    if (!count) return slug;

    attempts++;
    slug = `${baseSlug}-${attempts + 1}`;
  }

  // Fallback com timestamp
  return `${baseSlug}-${Date.now()}`;
}

// ── Pexels ────────────────────────────────────────────────────────────────────

/**
 * Busca imagem no Pexels para um produto.
 * Retorna URL da imagem ou null se não encontrar.
 */
async function fetchProductImage(product, storeType, usedIds) {
  if (!process.env.PEXELS_API_KEY) return null;

  try {
    const niche       = storeType === 'food' ? 'restaurante' : 'generico';
    const sectionType = 'products_grid';

    const photo = await searchImage(
      product.pexelsQuery,
      { niche, sectionType },
      { orientation: 'square', excludeIds: usedIds }
    );

    if (photo) {
      usedIds.add(photo.id);
      return photo.url;
    }
  } catch (err) {
    logger.warn('storeFactory: Pexels fetch failed', {
      product: product.name,
      error: err.message,
    });
  }

  return null;
}

// ── Criação em lote ───────────────────────────────────────────────────────────

/**
 * Cria categorias para uma loja e retorna mapa { key → id }.
 */
async function createCategories(storeId, categories) {
  const db = getAdminClient();

  const rows = categories.map((c) => ({
    store_id: storeId,
    name:     c.name,
    order:    c.order,
  }));

  const { data, error } = await db
    .from('store_categories')
    .insert(rows)
    .select('id, name');

  if (error) throw new Error(`createCategories: ${error.message}`);

  // Monta mapa key → id usando o nome como ponte
  const nameToId = Object.fromEntries((data ?? []).map((c) => [c.name, c.id]));
  const keyToId  = {};
  for (const cat of categories) {
    keyToId[cat.key] = nameToId[cat.name];
  }
  return keyToId;
}

/**
 * Busca imagens em paralelo e cria os produtos no banco.
 * Retorna { created, failed } counts.
 */
async function createProducts(storeId, products, categoryKeyToId, storeType) {
  // Limpa cache do Pexels para garantir variedade nesta loja
  clearImageCache();
  const usedPhotoIds = new Set();

  // Busca imagens em paralelo (pLimit(3) já controla o rate no pexelsService)
  const withImages = await Promise.all(
    products.map(async (p) => ({
      ...p,
      imageUrl: await fetchProductImage(p, storeType, usedPhotoIds),
    }))
  );

  // Monta rows para inserção em lote
  const rows = withImages.map((p) => ({
    store_id:              storeId,
    category_id:           categoryKeyToId[p.category] ?? null,
    name:                  p.name,
    price:                 p.price,
    image_url:             p.imageUrl ?? null,
    description:           p.description,
    metadata:              {},
    requires_prescription: p.requiresPrescription ?? false,
    is_active:             true,
  }));

  const { data, error } = await getAdminClient()
    .from('store_products')
    .insert(rows)
    .select('id');

  if (error) throw new Error(`createProducts: ${error.message}`);

  const withImg    = withImages.filter((p) => p.imageUrl).length;
  const withoutImg = withImages.filter((p) => !p.imageUrl).length;

  return {
    total:        data?.length ?? 0,
    withImage:    withImg,
    withoutImage: withoutImg,
  };
}

// ── Função principal ──────────────────────────────────────────────────────────

/**
 * Cria uma loja completa a partir de um template de nicho.
 *
 * @param {object} data
 * @param {string} data.name         — Nome da loja (ex: "Pizzaria da Vila")
 * @param {string} data.niche        — Nicho: "pizzaria" | "hamburgueria" | "acai" | "sorveteria" | "farmacia"
 * @param {string} data.email        — Email do lojista (será o login)
 * @param {string} data.type         — Produto: "pedezap" | "farmazap"
 * @param {number} [data.deliveryFee=5.00]  — Taxa de entrega padrão
 *
 * @returns {Promise<{
 *   store_url: string,
 *   login: string,
 *   password: string,
 *   type: string,
 *   store: object,
 *   summary: object
 * }>}
 */
export async function createStoreWithTemplate({ name, niche, email, type, deliveryFee = 5.00 }) {
  // ── 1. Valida input ──────────────────────────────────────────────────────────
  if (!name?.trim())  throw Object.assign(new Error('name é obrigatório'),  { statusCode: 400 });
  if (!niche?.trim()) throw Object.assign(new Error('niche é obrigatório'), { statusCode: 400 });
  if (!email?.trim()) throw Object.assign(new Error('email é obrigatório'), { statusCode: 400 });
  if (!type?.trim())  throw Object.assign(new Error('type é obrigatório (pedezap | farmazap)'), { statusCode: 400 });

  const allowedNiches = NICHES_BY_TYPE[type];
  if (!allowedNiches) {
    throw Object.assign(
      new Error(`type inválido: "${type}". Use: pedezap | farmazap`),
      { statusCode: 400 }
    );
  }

  const nicheKey = niche.toLowerCase().trim();
  if (!allowedNiches.includes(nicheKey)) {
    throw Object.assign(
      new Error(
        `Nicho "${niche}" não permitido para ${type}. ` +
        `Permitidos: ${allowedNiches.join(', ')}`
      ),
      { statusCode: 400 }
    );
  }

  const template = getTemplate(nicheKey); // lança 400 se nicho inválido

  console.log('[storeFactory] STEP 1 — input válido', { name, niche: nicheKey, email, type, storeType: template.type });
  logger.info('storeFactory: iniciando criação', { name, niche, email, type });

  // ── 2. Gera credenciais ──────────────────────────────────────────────────────
  const password = generatePassword();
  const baseSlug = await ensureUniqueSlug(toSlug(name, niche));
  console.log('[storeFactory] STEP 2 — slug gerado:', baseSlug);

  // ── 3. Cria usuário ──────────────────────────────────────────────────────────
  let newUser;
  try {
    console.log('[storeFactory] STEP 3 — criando usuário Supabase:', { email, type });
    newUser = await createAdminUser(email, password, 'basic', type);
    console.log('[storeFactory] STEP 3 — usuário criado:', newUser.id);
  } catch (err) {
    console.error('[storeFactory] STEP 3 FALHOU — createAdminUser:', err);
    const message = err.message.includes('already')
      ? `Email já está em uso: ${email}`
      : `Falha ao criar usuário: ${err.message}`;
    throw Object.assign(new Error(message), { statusCode: 409 });
  }

  logger.info('storeFactory: usuário criado', { userId: newUser.id, email });

  // ── 4. Cria loja ─────────────────────────────────────────────────────────────
  let store;
  try {
    console.log('[storeFactory] STEP 4 — criando loja:', { name, slug: baseSlug, type: template.type });
    store = await createStore({
      name,
      slug:         baseSlug,
      type:         template.type,
      deliveryFee,
      deliveryNeighborhoods: [],
    });
    console.log('[storeFactory] STEP 4 — loja criada:', store.id);
  } catch (err) {
    console.error('[storeFactory] STEP 4 FALHOU — createStore:', err);
    throw err;
  }

  // Vincula owner_id ao usuário criado
  try {
    console.log('[storeFactory] STEP 4b — vinculando owner_id:', newUser.id);
    const { error: updErr } = await getAdminClient()
      .from('stores')
      .update({
        owner_id:                 newUser.id,
        average_delivery_minutes: template.type === 'food' ? 40 : 60,
      })
      .eq('id', store.id);
    if (updErr) console.error('[storeFactory] STEP 4b — update owner_id FALHOU:', updErr);
    else console.log('[storeFactory] STEP 4b — owner_id vinculado');
  } catch (err) {
    console.error('[storeFactory] STEP 4b FALHOU — update owner_id:', err);
    throw err;
  }

  logger.info('storeFactory: loja criada', { storeId: store.id, slug: baseSlug });

  // ── 5. Cria categorias ───────────────────────────────────────────────────────
  let categoryKeyToId;
  try {
    console.log('[storeFactory] STEP 5 — criando categorias:', template.categories.map(c => c.name));
    categoryKeyToId = await createCategories(store.id, template.categories);
    console.log('[storeFactory] STEP 5 — categorias criadas:', Object.keys(categoryKeyToId).length);
  } catch (err) {
    console.error('[storeFactory] STEP 5 FALHOU — createCategories:', err);
    throw err;
  }

  logger.info('storeFactory: categorias criadas', {
    storeId: store.id,
    count: template.categories.length,
  });

  // ── 6 + 7. Busca imagens + cria produtos ─────────────────────────────────────
  let productSummary;
  try {
    console.log('[storeFactory] STEP 6 — criando', template.products.length, 'produtos');
    productSummary = await createProducts(
      store.id,
      template.products,
      categoryKeyToId,
      template.type
    );
    console.log('[storeFactory] STEP 6 — produtos criados:', productSummary);
  } catch (err) {
    console.error('[storeFactory] STEP 6 FALHOU — createProducts:', err);
    throw err;
  }

  logger.info('storeFactory: produtos criados', {
    storeId: store.id,
    ...productSummary,
  });

  // ── 8. Monta retorno ─────────────────────────────────────────────────────────
  const storeUrl = `/loja/${baseSlug}`;

  return {
    store_url: storeUrl,
    login:     email,
    password,
    type,
    store: {
      id:        store.id,
      name:      store.name,
      slug:      baseSlug,
      storeType: template.type,
    },
    summary: {
      categoriesCreated: template.categories.length,
      productsCreated:   productSummary.total,
      productsWithImage: productSummary.withImage,
      niche,
      product: type,
    },
  };
}
