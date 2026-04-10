# PedeZap — Painel do Parceiro (Lovable Prompt)

```
Crie o painel do lojista mais completo e bonito já feito para delivery no Brasil. Chama-se "PedeZap — Painel do Parceiro". É o coração da operação de restaurantes, pizzarias, hamburgerias, açaíterias e sorveterias: gerencia pedidos em tempo real como o iFood Parceiros, edita o cardápio como o Shopify, personaliza o site como um construtor visual e analisa o negócio com dados em tempo real.

Inspiração OBRIGATÓRIA de design e UX:
- iFood Parceiros: alerta de pedido full-screen, kanban operacional, timer de urgência, impressão de comanda
- Shopify Admin: catálogo visual em grid, edição inline de preços, bulk edit, theme editor com preview ao vivo
- Linear: dark mode refinado, tipografia perfeita, micro-animações
- Stripe Dashboard: métricas claras, gráficos elegantes

Stack: React + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion + TanStack Query + Socket.io client + Recharts.
Dark mode obrigatório com toggle light. Fonte Inter. Radius 8px.
VITE_API_URL como base. Authorization: Bearer {token} em todas as chamadas.

---

## 🔐 AUTH
- Tela de login premium: logo PedeZap centralizado em laranja vibrante, e-mail + senha, botão com loading
- POST {VITE_API_URL}/auth/login → { token, store }
- JWT em localStorage. Redirect se já logado. Sessão 7 dias com renovação silenciosa

---

## 🔔 ALERTA DE NOVO PEDIDO — MODO IFOOD (PRIORIDADE MÁXIMA)

Quando Socket.io emitir "new_order":

1. TELA DE TAKEOVER TOTAL (igual iFood Parceiros):
   - Overlay fullscreen com blur
   - Card central animado (spring): fundo laranja #f97316, borda pulsante branca
   - Conteúdo:
     • 🛵 ícone gigante animado (bounce)
     • "NOVO PEDIDO!" — 36px bold white
     • Nome do cliente — 24px
     • Lista de itens com quantidades e variações
     • Observação do cliente — caixa amarela destacada
     • Endereço (ENTREGA) ou "🏪 Retirada no local"
     • Forma de pagamento + troco se dinheiro
     • **Valor total — 32px bold**
   - Input: "Tempo estimado (min)" — default 30 — obrigatório para aceitar
   - Dois botões massivos: "✅ ACEITAR (30 min)" e "❌ RECUSAR"
   - Timer regressivo 90s: barra de progresso laranja → vermelha ao esgotar
   - Se expirar sem ação: re-toca som + card pisca

2. SOM DE ALERTA:
   - AudioContext: melodia animada 4 notas (392→523→659→784hz), 120ms cada, repetida a cada 3s
   - Volume persistido em localStorage
   - Botão mute global no header

3. NOTIFICAÇÃO DO BROWSER:
   - Pede permissão no primeiro login
   - Notificação mesmo com aba minimizada: "🛵 Novo pedido de {cliente} — R$ {valor}"

4. BADGE + TÍTULO:
   - Sidebar: badge vermelho pulsante animado (pulse ring)
   - Tab: "🛵 (N) Novo pedido! — PedeZap"

5. RECUSAR: modal → motivo (select: "Estabelecimento lotado" / "Produto indisponível" / "Fora da área") → WhatsApp automático de desculpas ao cliente

---

## 🗂 LAYOUT
- Sidebar 240px colapsável (64px com ícones), Framer Motion spring
- Header 56px: breadcrumb | toggle Aberto/Fechado (switch grande animado) | volume | sino | avatar
- Toggle Aberto/Fechado → PATCH {VITE_API_URL}/store/status — confirmação "Deseja fechar a loja?" se houver pedidos ativos
- Skeleton shimmer em todas páginas
- Toasts bottom-right com ícone e duração
- Transições de rota: fade 150ms

---

## 📌 SIDEBAR
```
🏠  Dashboard
📋  Pedidos          ← badge contador vivo
🍕  Cardápio
    └─ Produtos
    └─ Categorias
    └─ Importar CSV
💬  Clientes (CRM)
💰  Financeiro
🎨  Minha Loja
    └─ Editor do Site
    └─ Configurações
```

---

## 📊 DASHBOARD — CENTRAL DE OPERAÇÕES

**Saudação dinâmica:** "Boa noite, {nome do restaurante} 🍕" + status + data

**Row 1 — KPIs animados (5 cards, CountUp):**
| Card | Destaque |
|------|---------|
| Pedidos Hoje | vs ontem (badge % verde/vermelho) |
| Pendentes | badge vermelho pulsante se >0 |
| Faturamento Hoje | R$, grande |
| Ticket Médio | últimos 30 dias |
| Tempo Médio de Entrega | "28 min" — verde se <30, vermelho se >45 |

**Row 2 — Operacional (2 colunas 65/35):**

**Esquerda — Mapa de Pedidos ao Vivo:**
Cards de pedidos ativos ordenados por urgência (mais antigo no topo):
- Borda esquerda colorida: verde (<5min) → amarelo → laranja → vermelho pulsante (>20min)
- Card: avatar do cliente, nome, resumo dos itens, **observação do cliente** (caixa amarela se existir), valor total, timer mm:ss
- Botões de progressão rápida:
  • **Aceitar** → confirmado + input tempo (ex: 25 min) + WhatsApp "✅ Pedido confirmado! Pronto em aprox. 25 min 🍕"
  • **Em preparo** → envia WhatsApp "🍳 Seu pedido entrou na cozinha!"
  • **Saiu pra entrega** → modal: nome do motoboy + placa (opcionais) → WhatsApp "🛵 Seu pedido saiu pra entrega com {motoboy}!"
  • **Entregue** → confete animado + som de sino + WhatsApp "✅ Chegou! Bom apetite 😊 Que tal avaliar? ⭐"
- Botão "🖨️ Imprimir comanda" em cada card → abre janela de impressão formatada

**Direita — Analytics Rápido:**
- Gráfico de barras: faturamento 7 dias (cor laranja)
- Top 5 itens mais pedidos hoje (lista com ranking e barra proporcional)
- "Aviso para clientes" — textarea ao vivo: o que o lojista digitar aqui aparece como banner no site (ex: "Tempo extra: 45 min") — PUT {VITE_API_URL}/store/notice em tempo real

---

## 📋 PEDIDOS — KANBAN OPERACIONAL

### Header
- Toggle: **Kanban** | **Lista**
- Filtros: período | busca por cliente ou ID | forma de pagamento
- Botão "🖨️ Imprimir todas comandas do dia"

### Visão Kanban (padrão)
5 colunas com scroll horizontal em mobile:
```
[🔔 Novos]  [✅ Aceitos]  [🍳 Em Preparo]  [🛵 Saindo]  [✔️ Entregues]
```
Coluna "Novos": header com fundo laranja suave pulsante se tiver pedidos

Cada card:
- **#ID** (mono) + **timer ao vivo** (cor muda com urgência)
- Avatar inicial + nome do cliente
- Ícone 🚗 Entrega ou 🏪 Retirada
- Itens: max 2 linhas + "e mais N..."
- Valor total em destaque
- **Se obs do cliente:** ícone ⚠️ amarelo no card
- Botão de ação principal (próximo status) + "⋯" menu (Detalhes | Imprimir | Cancelar)
- Drag & drop entre colunas → PATCH status

### Visão Lista
Tabela: # | Cliente | Itens | Valor | Tipo | Pagamento | Status badge | Tempo | Ações

### Drawer de Detalhes (480px)
Aba **Pedido:**
- Dados do cliente: nome, telefone (link WhatsApp), endereço + 📍 link Google Maps
- **Itens detalhados:** foto miniatura, nome, variação escolhida, grupos de adicionais, qty × preço, subtotal
- **Caixa amarela:** "⚠️ Obs: {observação}" — sempre visível se existir
- Forma de pagamento + troco
- Taxa de entrega | Total final
- "Motoboy": input livre (aparece no WhatsApp)
- "Tempo estimado": input minutos
- Timeline de status com timestamps
- Botão "🖨️ Imprimir comanda"

Aba **WhatsApp:**
- Histórico de mensagens enviadas
- Campo livre + botão enviar
- Templates rápidos (chips): "Confirmado 25min" | "Saindo agora" | "Entregue!" | "Problema..."

---

## 🍕 CARDÁPIO — SHOPIFY MODE

### Header
"Cardápio" + contador + "Adicionar produto" (primário) + "Importar CSV" + "Exportar"

### Ferramentas
- Busca em tempo real (debounce 300ms)
- Filtros: Categoria (multi) | Disponível/Indisponível | Ordenar (Nome/Preço/Mais vendido)
- Toggle: **Grid** | **Lista**

### Visão Grid (padrão — IGUAL SHOPIFY)
Grid responsivo 2→3→4→5 colunas.
Card de produto:
- Foto aspect-ratio 1:1, object-cover, border-radius 8px
- Hover: overlay escuro + botão "✏️ Editar" centralizado (Framer Motion)
- Badge no canto: "Esgotado" (vermelho) | "Destaque ⭐" (dourado) | "Novo" (azul)
- Nome (2 linhas max, truncado)
- Preço: se promoção → **R$25,90** ~~R$32,00~~
- **Quick Edit: duplo clique no preço** → campo input inline → Enter salva, Esc cancela
- Toggle disponível/indisponível inline (aparece no hover)

### Visão Lista
Tabela densa: checkbox | foto 48px | nome | categoria | preço (clique para editar inline) | disponível (toggle) | ações

### Bulk Edit
- Selecionar vários → barra bottom: "X selecionados" → Alterar preço (% ou R$) | Alterar categoria | Ativar | Desativar | Excluir
- Modal bulk preço: "Aumentar 10%" | "Definir como R$ X" → preview do impacto

### Modal de Produto (Sheet 760px — Shopify-like)
Slide-in da direita. Header: nome + badge "Disponível ●".

**Layout 2 colunas:**
Esquerda (58%):
- **Nome** — input grande
- **Descrição** — textarea (inclui ingredientes, alergênicos, etc.)
- **Categoria** — select com busca
- **Tags** — chips (ex: #vegano, #sem-gluten, #picante, #destaque, #novo)
- **Serve quantas pessoas** (select: 1 / 2 / 3-4 / Família)
- **Preços:**
  - Preço de venda (grande)
  - Preço riscado/original (se promoção)
  - Toggle "Tem tamanhos/variações" →
- **Seção Tamanhos** (se toggle ativo) — lista dinâmica:
  - Cada linha: Nome do tamanho + Preço próprio + Estoque próprio
  - Pizzaria: "Brotinho R$25 / Pequena R$35 / Média R$48 / Grande R$58 / Família R$78"
  - Açaíteria: "300ml R$12 / 500ml R$18 / 700ml R$26 / 1L R$36"
  - Hamburgueria: "Simples R$22 / Duplo R$30 / Triplo R$40"
  - Sorveteria: "1 bola R$8 / 2 bolas R$14 / 3 bolas R$20 / Pote 500ml R$22"
  - Drag handle para reordenar
- **Grupos de Adicionais** (IFOOD-like):
  - Cada grupo: nome do grupo + min/max seleções + lista de opções (nome + preço)
  - Pizzaria:
    • "Borda" (obrigatório, 1): Sem borda | Cheddar +R$6 | Catupiry +R$6 | Mussarela +R$5
    • "Extras" (opcional, até 3): Ovo +R$3 | Mussarela extra +R$4 | Azeitona +R$2
  - Açaíteria:
    • "Frutas" (opcional, até 4): Banana | Morango | Kiwi | Manga | Uva
    • "Coberturas" (opcional, até 3): Leite Ninho +R$0 | Granola | Paçoca | Bis +R$2
    • "Complementos" (opcional): Leite condensado +R$2 | Nutella +R$4
  - Hamburgueria:
    • "Ponto" (obrigatório, 1): Ao ponto | Bem passado | Mal passado
    • "Extras" (opcional): Bacon +R$4 | Ovo +R$2 | Cheddar +R$3
  - Botão "+ Adicionar grupo"

Direita (42%):
- **Upload de foto principal:** drag & drop grande, preview ao vivo, aspect 1:1
  - File picker: jpg/png/webp até 10MB
  - Botão "🤖 Sugerir foto" → GET {VITE_API_URL}/products/suggest-image?name={nome}
- **Galeria extra:** até 4 fotos adicionais (grid 2×2)
- **Status:**
  - Toggle "Disponível no cardápio"
  - "Em destaque" (aparece no topo do cardápio no site)
- **Disponibilidade por horário:**
  - Grade: dias da semana × horários de disponibilidade
  - Ex: "Só disponível Sex-Dom" (promoção de fim de semana)
- **Preview do card:** miniatura mostrando como ficará no site

Footer: "Cancelar" + "Salvar" (com loading, optimistic update)

---

## 🗂 CATEGORIAS

Grid drag & drop de cards. Cada card: emoji grande + nome + "X produtos" + toggle ativo + editar/excluir.
Reordenar = reordena no site automaticamente.

**Padrão por nicho (detectado pelo tipo da loja):**
🍕 **Pizzaria:** Pizzas Salgadas | Pizzas Doces | Bordas Especiais | Bebidas | Sobremesas | Combos
🍔 **Hamburgueria:** Hambúrgueres | Smash Burgers | Hot Dogs | Acompanhamentos | Bebidas | Sobremesas | Combos
🍧 **Açaíteria:** Açaí | Sorvetes na Taça | Vitaminas | Sucos | Coberturas Avulsas | Combos
🍦 **Sorveteria:** Sorvetes | Picolés | Sundaes | Milkshakes | Casquinhas | Combos
🥗 **Outros:** configuração livre

---

## 📥 IMPORTAR CARDÁPIO CSV

Wizard 4 passos com stepper visual:

**Passo 1 — Upload:**
- Drag & drop animado (.csv ou .xlsx)
- Preview 10 linhas
- Botão "Baixar modelo"

**Passo 2 — Mapeamento:**
- Detecção automática de colunas (fuzzy match)
- Tabela: coluna do arquivo → campo do sistema (select)
- Validação ao vivo

**Passo 3 — IA Categoriza:**
- POST {VITE_API_URL}/products/ai-categorize
- Categorização por nicho:
  🍕 Pizzaria: "Margherita" → Pizzas Salgadas | "Prestígio" → Pizzas Doces | "Coca-Cola" → Bebidas | "Borda Cheddar" → Bordas
  🍔 Hamburgueria: "X-Burgão" → Hambúrgueres | "Batata rústica" → Acompanhamentos | "Brownie" → Sobremesas
  🍧 Açaíteria: "Açaí com granola 500ml" → Açaí | "Vitamina de morango" → Vitaminas | "Granola extra" → Coberturas Avulsas
  🍦 Sorveteria: "Sorvete de chocolate" → Sorvetes | "Picolé de uva" → Picolés | "Milkshake baunilha" → Milkshakes
- Tabela editável: produto | categoria sugerida (select) | confiança (barra colorida)
- "Aceitar todas" ou editar linha por linha

**Passo 4 — Importar:**
- Resumo: X novos | Y atualizados | Z ignorados
- Progress bar por lote + log ao vivo
- Baixar relatório de erros (se houver)

---

## 💬 CLIENTES — CRM

**Tabela:** Avatar | Nome | Telefone | Bairro | Último pedido | Nº pedidos | LTV | Tag | Ações

**Tags automáticas:**
👑 VIP (LTV > R$300) | 🔁 Fiel (>8 pedidos) | 🆕 Novo (<2 pedidos) | 😴 Inativo (>21 dias sem pedir)

**Drawer cliente (560px) com abas:**
- **Visão Geral:** LTV grande, total pedidos, ticket médio, 1º pedido
- **Pedidos:** timeline vertical — cada pedido com itens, valor, status, data
- **Favoritos:** top 3 mais pedidos com foto e frequência
- **WhatsApp:** histórico de mensagens + campo enviar nova mensagem + templates
- **Notas:** textarea auto-save

---

## 💰 FINANCEIRO

KPIs: MRR projeção | Faturamento do mês | Ticket médio | Taxa de cancelamento

Gráfico linha dupla: mês atual (laranja) vs mês anterior (cinza) — recharts

Gráfico pizza: faturamento por categoria

Tabela: # | Data | Cliente | Itens | Subtotal | Entrega | Total | Pagamento

Exportar CSV: GET {VITE_API_URL}/store/revenue/export

---

## 🎨 EDITOR DO SITE — SHOPIFY THEME EDITOR

Layout: painel esquerdo 360px fixo + iframe preview ao vivo à direita.

**Topo do preview:**
- Toggle 📱 Mobile / 🖥️ Desktop
- Botão "Abrir no navegador"

**Painel esquerdo (acordeão):**

📌 **Identidade:**
- Nome da loja, tipo (Pizzaria/Hamburgueria/Açaíteria/Sorveteria)
- Slogan, logo (upload + preview)

🎨 **Cores:**
- Cor principal, cor de destaque (color pickers com swatches)
- Preview aplica no iframe imediatamente

🖼 **Banners (5 slots):**
- Cada slot: preview 16:5 + upload/URL + label
- Atualiza iframe em tempo real (debounce 500ms)

🃏 **Cards Promocionais (6 slots):**
- Mesmo padrão

📝 **Textos:**
- Título, subtítulo, boas-vindas, rodapé

⏰ **Horário exibido no site:**
- Input texto: "Seg–Sex: 11h–23h | Sáb–Dom: 11h–00h"

📣 **Aviso especial:**
- Textarea: aparece como banner no site (ex: "🔥 Frete grátis acima de R$40!")

**Ações:**
- "💾 Salvar rascunho"
- "🚀 Publicar agora" → progress: Salvando → Renderizando → Publicando → ✅ No ar!
- URL do site + botão "Abrir" + "Copiar"
- "Último publicado: há X horas"

---

## ⚙️ CONFIGURAÇÕES

**Loja:**
- WhatsApp, endereço completo, raio de entrega, taxa de entrega (fixo ou grátis acima de R$X), pedido mínimo, tempo estimado
- Formas: Dinheiro | PIX | Débito | Crédito | Vale-refeição
- Se Dinheiro: "Aceita troco" toggle + valor máximo de troco
- Modalidades: Entrega toggle | Retirada toggle
- Horário: grade 7 dias com abre/fecha + toggle "Fechado hoje"

**Notificações:**
- Toggle som | Slider de volume | Botão "Testar som"
- Toggle notificação browser
- Toggle e-mail resumo diário

**Conta:**
- Nome, e-mail, trocar senha
- Plano: badge "Pro ✨" + vencimento + "Gerenciar plano"

---

## 🎨 DESIGN SYSTEM

**Paleta:**
- bg-base: #09090b
- bg-surface: #111113
- bg-card: #18181b
- border: #27272a
- text-primary: #fafafa
- text-muted: #71717a
- primary: #f97316 (orange-500)
- primary-hover: #ea580c
- primary-glow: rgba(249,115,22,0.15)
- kanban-new-bg: rgba(249,115,22,0.08) com borda laranja pulsante
- danger: #ef4444 | warning: #f59e0b | success: #22c55e

**Micro-animações (Framer Motion):**
- Cards pedido: hover scale(1.01) + sombra laranja suave 150ms
- Novo pedido: spring bounce entrada + pulse ring na borda
- Urgência: borda do card pisca quando timer > 20min
- Sidebar collapse: spring 300/30
- Modais/sheets: slide-in bottom/right 300ms ease-out
- CountUp em todos os KPIs
- Skeleton shimmer
- Botão: pressão scale(0.97)
- Confete ao marcar entregue (canvas-confetti)

**Componentes shadcn obrigatórios:**
Button, Input, Textarea, Select, Badge, Card, Table, Dialog, Sheet, Tabs, Toast, Skeleton, Progress, Switch, Separator, Avatar, DropdownMenu, Command, Calendar, Popover, Accordion, Tooltip, ScrollArea

---

## ⚡ REGRAS TÉCNICAS

- TanStack Query: refetchInterval 15s (dashboard) | 10s (pedidos ativos) — delivery é mais urgente
- Socket.io: reconexão infinita, reconnectionDelay 500ms
- Optimistic updates: toggle disponível, mudança de status, edição inline de preço
- Prefetch ao hover nos links da sidebar
- Erros 401: logout + redirect + toast
- Erros 5xx: toast com "Tentar novamente"
- Imagens: lazy + blur placeholder + fallback ícone
- Impressão: CSS @media print — layout de comanda 80mm (impressora térmica)
- PWA: manifest.json "PedeZap", display standalone, ícone laranja — "Adicionar à tela inicial"
- Mobile: sidebar → bottom sheet | kanban → lista vertical com swipe actions
- Sem mock data — 100% VITE_API_URL real
- VITE_API_URL sem trailing slash
- Paginação cursor-based, "Carregar mais" (não paginação numérica)
- Observação do cliente: SEMPRE visível em caixa amarela destacada no card e no drawer
```
