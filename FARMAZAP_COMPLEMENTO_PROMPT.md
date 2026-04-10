# FarmaZap — Complemento do Prompt (cole junto com o prompt principal)

```
Adicione os seguintes comportamentos ao painel FarmaZap já descrito:

---

## RECUSA DE PEDIDO — INTELIGENTE

Ao clicar "❌ Recusar" no alerta de novo pedido:

Modal "Recusar pedido" com 3 etapas:

**Etapa 1 — Motivo:**
Select obrigatório com os motivos:
- "Estabelecimento lotado"
- "Produto(s) indisponível(is)"
- "Fora da área de entrega"
- "Problema técnico"
- "Outro"

**Etapa 2 — Configurar mensagem (dinâmica por motivo):**

O sistema monta automaticamente uma mensagem inteligente baseada no pedido e no motivo. O lojista pode editar antes de enviar.

Regras de geração da mensagem:

• **Estabelecimento lotado:**
Sistema gera: "Oi {nome}! Aqui é a {nome da farmácia} 👋 Infelizmente estamos com um volume alto de pedidos agora e não conseguimos garantir a qualidade no seu atendimento. Pode tentar novamente em uns 20 minutinhos? Sua saúde merece o melhor! 🙏"

• **Produto(s) indisponível(is):**
Sistema identifica quais itens do pedido estão com estoque 0 e os lista na mensagem.
Gera: "Oi {nome}! Aqui é a {nome da farmácia}. Infelizmente o(s) produto(s) abaixo acabaram no nosso estoque agora:
❌ {produto 1}
❌ {produto 2}
Quer que a gente ajuste seu pedido retirando esses itens? É só me responder que refazemos na hora! 😊"

• **Fora da área de entrega:**
Gera: "Oi {nome}! Aqui é a {nome da farmácia} 👋 Infelizmente seu endereço ({bairro do cliente}) ainda não está na nossa área de entrega. Estamos crescendo e em breve chegamos aí! Por enquanto, você pode retirar na loja: {endereço da farmácia} 📍"

• **Problema técnico:**
Gera: "Oi {nome}! Tivemos um problema interno aqui e precisamos cancelar seu pedido agora. Pedimos desculpas pelo transtorno! Pode fazer o pedido novamente que te atendemos com prioridade 🙏"

• **Outro:**
Campo textarea em branco para o lojista escrever livremente.

**Etapa 3 — Confirmar:**
- Preview da mensagem formatada (igual WhatsApp — fundo verde claro, fonte correta)
- Dois botões: "✉️ Recusar e enviar mensagem" (primário) | "Recusar sem enviar" (ghost)
- Ao confirmar: POST {VITE_API_URL}/orders/:id/status (status: cancelled) + POST {VITE_API_URL}/whatsapp/send

---

## CONTROLE DE ESTOQUE — COMPLETO

### Na página de Produtos:
- Badge de estoque em cada card: 🟢 Bom (>10) | 🟡 Baixo (3-10) | 🔴 Crítico (1-3) | ⚫ Esgotado (0)
- Filtro rápido: "Ver produtos com estoque crítico" — badge no header se houver algum
- Edição inline de estoque na visão lista: clicar no número → input → Enter salva

### Alerta de estoque baixo:
- Quando produto atinge estoque ≤ 3: toast de aviso no painel + badge amarelo na sidebar "Catálogo"
- Produto com estoque 0: some automaticamente do site (fica com badge "Esgotado" no cardápio online)

### Ao ACEITAR um pedido:
- Sistema desconta o estoque de cada item automaticamente (PATCH {VITE_API_URL}/products/:id → decrement stock)
- Se entre a chegada do pedido e a aceitação algum produto zerou: alerta inline "⚠️ {produto} zerou o estoque. Deseja aceitar assim mesmo ou recusar?"
- Ao aceitar mesmo assim: produto fica marcado como "Esgotado" no site automaticamente

### Histórico de estoque (drawer do produto, nova aba):
- Timeline: "Estoque ajustado de 50 → 45 por pedido #0042 — 14h32"
- Botão "Ajuste manual de estoque": input + motivo (Reposição / Perda / Correção / Outro)

### Reposição rápida:
- Na tela de Produtos, botão "📦 Repor estoque" (abre modal com lista de produtos com estoque crítico, inputs de quantidade, salva todos de uma vez)

---

## MENSAGEM DE PRODUTO ESGOTADO NO SITE

Quando cliente tenta adicionar produto esgotado no site:
- Botão fica cinza "Indisponível" — sem acesso ao carrinho
- Tooltip ao hover: "Este produto está temporariamente indisponível"
(Isso é comportamento do site gerado — não do painel, mas documentar para o backend saber)
```
