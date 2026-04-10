# PedeZap — Complemento do Prompt (cole junto com o prompt principal)

```
Adicione os seguintes comportamentos ao painel PedeZap já descrito:

---

## RECUSA DE PEDIDO — INTELIGENTE

Ao clicar "❌ Recusar" no alerta de novo pedido:

Modal "Recusar pedido" com 3 etapas:

**Etapa 1 — Motivo:**
Select obrigatório:
- "Estabelecimento lotado"
- "Ingrediente(s) em falta"
- "Fora da área de entrega"
- "Cozinha fechando"
- "Problema técnico"
- "Outro"

**Etapa 2 — Mensagem inteligente (editável antes de enviar):**

Sistema monta a mensagem baseada no motivo + dados reais do pedido e do estabelecimento.

• **Estabelecimento lotado:**
Gera: "Oi {nome}! Aqui é a {nome do restaurante} 🍕 Infelizmente estamos com a cozinha no limite agora e não conseguimos garantir a qualidade e o prazo do seu pedido. A gente não abre mão disso! Tenta de novo em 30 minutinhos? Vai valer a pena 😄🙏"

• **Ingrediente(s) em falta:**
Sistema identifica os itens do pedido e lista os que têm estoque 0:
Gera: "Oi {nome}! Aqui é a {nome do restaurante}. A gente precisou cancelar seu pedido porque acabou um ingrediente aqui na cozinha agora:
😔 {item 1} — estamos sem {ingrediente/item}
Você quer manter o pedido trocando esse item ou prefere cancelar? É só me falar que a gente resolve na hora! 🙌"

Exemplo real gerado: "Oi João! Aqui é a Pizzaria Dom Luigi. A gente precisou cancelar seu pedido porque acabou um ingrediente aqui na cozinha agora:
😔 Pizza Calabresa — estamos sem calabresa hoje
Você quer manter o pedido trocando a calabresa por outro sabor (Frango, Portuguesa, Mussarela)? É só me falar que fazemos pra você! 🙌"

• **Fora da área de entrega:**
Gera: "Oi {nome}! Infelizmente o endereço {bairro do cliente} ainda não está na nossa área de entrega 😢 Mas você pode retirar aqui com a gente em {endereço do restaurante} e economiza no frete! Quer fazer assim? 😊"

• **Cozinha fechando:**
Gera: "Oi {nome}! Infelizmente recebemos seu pedido já no finalzinho do nosso horário e não conseguiríamos preparar com a qualidade que você merece. Amanhã abrimos às {horário de abertura} e será um prazer te atender! 🙏"

• **Problema técnico:**
Gera: "Oi {nome}! Tivemos um problema interno e precisamos cancelar seu pedido agora 😔 Pedimos desculpas! Pode fazer novamente que te colocamos na frente da fila e garantimos prioridade total 🙌"

• **Outro:**
Textarea em branco para mensagem livre.

**Etapa 3 — Confirmar:**
- Preview visual da mensagem (estilo bolha WhatsApp — fundo verde claro)
- "✉️ Recusar e enviar mensagem" (primário) | "Recusar sem enviar" (ghost)
- Ao confirmar: PATCH {VITE_API_URL}/orders/:id/status (cancelled) + POST {VITE_API_URL}/whatsapp/send

---

## CONTROLE DE ESTOQUE / DISPONIBILIDADE — COMPLETO

No delivery, o "estoque" funciona diferente de uma farmácia — um ingrediente acaba, o produto some. O sistema deve tratar isso de forma prática:

### Na página de Cardápio:
- Toggle "Disponível / Indisponível" inline em cada card (aparece no hover) — o mais importante
- Badge: 🟢 Disponível | 🔴 Indisponível | 🟡 Estoque baixo (se controle de qty ativo)
- Toggle é instantâneo (optimistic update) — lojista desativa a calabresa em 1 clique quando acaba

### Controle de quantidade (opcional por produto):
- Toggle "Controlar quantidade" no modal do produto (ex: útil para sorveterias — "50 bolas de chocolate")
- Se ativo: campo estoque + badge + alerta ao zerar
- Se inativo (padrão delivery): produto simplesmente aparece como disponível ou não pelo toggle

### Alerta de estoque baixo (se qty ativo):
- Toast quando ≤ 3 unidades restantes
- Badge amarelo na sidebar "Cardápio"

### Ao ACEITAR pedido:
- Se produto tem qty ativa: desconta automaticamente (PATCH {VITE_API_URL}/products/:id → decrement)
- Se produto zerou entre o pedido chegar e ser aceito: alerta inline "⚠️ {produto} ficou indisponível. Aceitar mesmo assim ou recusar?"

### Desativar rápido em massa:
- Na tela de Cardápio: botão "🚫 Pausar item" visível no hover do card — 1 clique desativa
- Botão "Reativar tudo" no header (para fim do dia ou quando estoque chega) — reativa todos os produtos desativados de uma vez com confirmação

### "86 de item" — linguagem de cozinha:
- Quando lojista desativa um produto: toast interno "Calabresa pausada — clientes não conseguem mais pedir"
- No site do cliente: item some do cardápio ou fica acinzentado com "Indisponível hoje"

---

## SUGESTÃO DE TROCA NO CHAT (quando ingrediente acaba)

Ao recusar por "Ingrediente em falta" e o cliente responder que quer trocar:

No drawer do pedido, aba WhatsApp:
- Botão "🔄 Sugerir produtos alternativos" → abre modal com lista dos produtos da mesma categoria disponíveis
- Lojista seleciona os que quer sugerir → sistema monta mensagem: "Temos disponível hoje: ✅ Pizza Frango com Catupiry | ✅ Pizza Portuguesa | ✅ Pizza Quatro Queijos — qual prefere?"
- Ao cliente escolher e confirmar: lojista cria pedido substituto manualmente via botão "Criar pedido manual" (formulário simples: cliente + itens + endereço já preenchidos do pedido original)
```
