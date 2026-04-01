/**
 * outreach.js
 * Generates personalized WhatsApp outreach messages and click-to-chat links.
 * Short, natural, curiosity-driven — not spammy.
 */

function encodeMsg(text) {
  return encodeURIComponent(text.trim());
}

function waLink(phone, message) {
  const digits = (phone || "").replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeMsg(message)}`;
}

/**
 * Generates 3 message variations adapted to the lead's context.
 * @param {Object} contexto - enriched lead (nome, nicho, bairro, telefone, siteStatus, avaliacoes)
 * @param {string|null} siteUrl - deployed preview URL (if available)
 * @returns {{ messages: string[], links: string[] }}
 */
export function generateOutreach(contexto, siteUrl = null) {
  const { nome, nicho, bairro, telefone, siteStatus, avaliacoes } = contexto;

  const nichoLower = (nicho || "negócio").toLowerCase();
  const preview = siteUrl ? `\n\nFiz uma prévia do site de vocês → ${siteUrl}` : "";

  let messages;

  if (siteStatus === "no_site") {
    // Lead has NO website at all
    messages = [
      `Oi! Encontrei a ${nome} no Google Maps e vi que vocês ainda não têm site.

Criei uma versão de demonstração gratuita para vocês verem como ficaria.${preview}

Posso enviar o link? 🚀`,

      `Olá! Vocês da ${nome} têm ótimas avaliações em ${bairro}, mas sem site perdem clientes toda semana.

Mostro como resolver isso em menos de 24h.${preview}

Posso te contar como?`,

      `Boa tarde! Trabalho com presença digital para ${nichoLower} em ${bairro}.

Já deixei uma prévia pronta pra ${nome} — sem custo, só quero mostrar o que é possível.${preview}

Tem 2 minutos?`,
    ];
  } else {
    // Lead has a WEAK or outdated website
    messages = [
      `Oi! Dei uma olhada no site da ${nome} em ${bairro} e notei alguns pontos que estão fazendo vocês perder clientes.

Preparei uma versão atualizada mostrando como ficaria com WhatsApp e conversão moderna.${preview}

Posso enviar?`,

      `Olá! O site atual da ${nome} não aparece bem no celular e não tem CTA pro WhatsApp — isso corta conversão pela metade.

Fiz uma versão nova de demonstração.${preview}

Posso compartilhar?`,

      `Boa tarde! Vi que a ${nome} em ${bairro} tem ${avaliacoes > 0 ? `${avaliacoes}+ avaliações` : "uma boa reputação"} mas o site não reflete esse nível.

Preparei algo diferente — moderno, rápido e focado em agendamentos pelo WhatsApp.${preview}

Tem interesse em ver?`,
    ];
  }

  const links = messages.map((msg) => waLink(telefone, msg));

  return { messages, links };
}
