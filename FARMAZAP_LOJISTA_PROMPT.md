# FarmaZap — Painel do Parceiro (Lovable Prompt)

```
Crie o painel do lojista mais completo e bonito já feito para farmácias online no Brasil. Chama-se "FarmaZap — Painel do Parceiro". É o coração da operação diária do farmacêutico: ele gerencia pedidos em tempo real, edita o catálogo igual ao Shopify, personaliza o site como um construtor visual, e vê o negócio crescer num dashboard digno de uma startup série B.

Inspiração OBRIGATÓRIA de design e UX:
- iFood Parceiros: alerta de pedido, kanban de status, ação rápida
- Shopify Admin: catálogo visual, edição inline, bulk edit, theme editor com preview ao vivo
- Linear: tipografia, dark mode, micro-animações suaves
- Stripe Dashboard: cards de métricas, gráficos limpos

Stack: React + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion + TanStack Query + Socket.io client + Recharts.
Dark mode obrigatório com toggle light. Fonte Inter. Radius 8px.
Variável de ambiente: VITE_API_URL. Authorization: Bearer {token} em todas as chamadas.

---

## 🔐 AUTH
- Tela de login premium: logo FarmaZap centralizado, campo e-mail + senha, botão "Entrar" com loading spinner
- POST {VITE_API_URL}/auth/login → { token, store }
- JWT em localStorage. Redirect automático para /dashboard se já logado
- Sessão expira em 7 dias — renovação silenciosa

---

## 🔔 ALERTA DE NOVO PEDIDO — IFOOD MODE (PRIORIDADE MÁXIMA)

Quando Socket.io emitir evento "new_order":

1. TELA DE TAKEOVER COMPLETA:
   - Overlay dark semitransparente cobre 100% da tela com blur
   - Card central gigante (max-w-lg) animado com spring: fundo verde vibrante #10b981, borda pulsante
   - Conteúdo do card:
     • Ícone de sino animado (wiggle infinito)
     • Texto "NOVO PEDIDO!" em 32px bold
     • Nome do cliente em 24px
     • Lista dos itens do pedido
     • Valor total em 28px bold
     • Endereço de entrega
   - Dois botões grandes: "✅ ACEITAR" (verde) e "❌ RECUSAR" (vermelho)
   - Timer regressivo de 90 segundos — se expirar sem ação, toca o som novamente e pulsa mais forte

2. SOM DE ALERTA:
   - AudioContext: melodia de 3 notas ascendentes (523hz→659hz→784hz), 150ms cada, repetida a cada 4 segundos até ação do lojista
   - Botão global mute no header para silenciar sem perder alertas visuais

3. NOTIFICAÇÃO DO BROWSER:
   - Pede permissão no primeiro login (Notification API)
   - Dispara notificação mesmo com aba minimizada

4. BADGE + TÍTULO:
   - Sidebar: badge vermelho pulsante com contador
   - Tab title: "🔔 (N) Novo pedido! — FarmaZap"

5. PEDIDO RECUSADO: modal pergunta motivo → envia WhatsApp automático de desculpas

---

## 🗂 LAYOUT GERAL
- Sidebar fixa 240px colapsável (64px com ícones) com animação suave Framer Motion
- Header 56px: breadcrumb dinâmico à esquerda + centro vazio + direita: toggle loja (Aberta/Fechada), sino, avatar
- Toggle loja: switch grande animado — "Aberta 🟢" / "Fechada 🔴" → PATCH {VITE_API_URL}/store/status
- Conteúdo: padding 24px, max-width 1400px, centralizado
- Skeleton shimmer em toda página antes de carregar (nunca spinner puro)
- Toasts bottom-right com ícone, cor e duração (sucesso 3s, erro 6s)
- Transições de rota: fade 150ms

---

## 📌 SIDEBAR
```
🏠 Dashboard
📦 Pedidos          ← badge contador pedidos ativos
🏪 Catálogo
   └─ Produtos
   └─ Categorias
   └─ Importar CSV
💬 Clientes (CRM)
💰 Financeiro
🎨 Minha Loja
   └─ Editor do Site  ← NOVO: theme editor
   └─ Configurações
```

---

## 📊 DASHBOARD — CENTRO DE COMANDO

### Cabeçalho do Dashboard
- Saudação: "Bom dia, {nome da loja} 👋" + data atual
- Status do negócio: "Sua loja está Aberta 🟢 — 3 pedidos hoje"

### Row 1 — KPIs (5 cards animados com CountUp.js)
| Card | Valor | Detalhe |
|------|-------|---------|
| Pedidos Hoje | número | vs ontem (+12%) badge verde/vermelho |
| Pendentes | número | badge vermelho se >0, pulsante |
| Faturamento Hoje | R$ | vs ontem |
| Ticket Médio | R$ | últimos 30 dias |
| Produtos Ativos | número | clicável → vai pra Catálogo |

### Row 2 — Painel Operacional (2 colunas 60/40)

**Coluna esquerda — Pedidos Ao Vivo:**
- Header: "Em andamento" + badge com total
- Lista de cards de pedido ordenados por urgência:
  - Cor da borda esquerda: verde (<5min) → amarelo (5-15min) → laranja (15-30min) → vermelho (>30min, pulsante)
  - Cada card: avatar inicial do cliente, nome, itens resumidos, valor, timer ao vivo (mm:ss)
  - Botões inline: confirmar → em preparo → saiu pra entrega → entregue
  - Ao confirmar: input rápido "Tempo estimado (min)" — padrão 30min — envia WhatsApp automaticamente
  - Ao "Saiu pra entrega": modal deslizante: "Nome do entregador" (input) → confirma → WhatsApp "🚗 Seu pedido saiu pra entrega!"
  - Ao "Entregue": animação de confete suave, som de conclusão (sino 440hz 1x), WhatsApp "✅ Pedido entregue! Obrigado por comprar conosco 🙏"
- Se lista vazia: ilustração simpática "Tudo tranquilo por aqui ✨"

**Coluna direita — Analytics Rápido:**
- Gráfico de barras: faturamento últimos 7 dias, cor emerald, tooltip ao hover
- Divider
- "Top 5 produtos hoje": lista com rank, nome, quantidade vendida, barra de progresso proporcional
- Divider
- "Pedidos por horário": mini heatmap 7 colunas (dias) × 24 linhas (horas), intensidade em verde

---

## 📦 PEDIDOS — KANBAN + LISTA

### Barra superior
- Toggle de visão: "Kanban" | "Lista" (salva preferência em localStorage)
- Filtros: período (date range picker) | busca por cliente/ID
- Botão "Imprimir comanda" (ícone impressora) — disponível ao selecionar pedido

### Visão Kanban (padrão)
5 colunas com scroll horizontal:
```
[🔔 Novos] [✅ Confirmados] [🔬 Em Preparo] [🚗 Saindo] [✅ Entregues]
```
- Cada coluna: header com nome + badge contador + cor
- Cards arrastáveis entre colunas (drag & drop = atualiza status via PATCH)
- Card de pedido:
  - ID (#0042) + tempo aguardando (timer vivo)
  - Nome e avatar inicial do cliente
  - Resumo dos itens (max 2 + "e mais N")
  - Valor total
  - Badge: ENTREGA / RETIRADA
  - Botão de ação principal (próximo status)
  - "⋯" menu: Ver detalhes | Imprimir | Cancelar

### Visão Lista
- Tabela com: ID | Cliente | Itens | Valor | Status badge | Criado em | Ações
- Linha clicável → abre drawer lateral

### Drawer de Detalhes do Pedido
Sheet lateral 480px com abas:
**Aba Pedido:**
- Dados do cliente: nome, telefone (clicável → abre WhatsApp), endereço + link Google Maps
- Itens detalhados: foto miniatura, nome, variação escolhida, adicionais, obs do cliente, qty × preço
- Caixa amarela destacada: "⚠️ Observação: {obs do cliente}" (se houver)
- Subtotal | Taxa de entrega | **Total: R$ XX**
- Forma de pagamento + troco (se dinheiro)
- Timeline de status com timestamps e ícones
**Aba WhatsApp:**
- Histórico de mensagens enviadas para este pedido (lista com timestamp)
- Campo de mensagem livre + botão "Enviar via WhatsApp"
- Templates rápidos (chips): "Confirmamos!" | "Saindo!" | "Entregue!" | "Problema..."

---

## 🛍 CATÁLOGO — SHOPIFY MODE

### Produtos — visão principal
**Header:** "Catálogo" + contador "247 produtos" + botões: "Adicionar produto" (primário) | "Importar CSV" | "Exportar"

**Barra de ferramentas:**
- Busca em tempo real (debounce 300ms)
- Filtros: Categoria (multi-select) | Status (Todos/Ativo/Inativo/Sem estoque) | Ordenar (Nome/Preço/Estoque/Mais vendido)
- Toggle de visão: Grid (padrão) | Lista

**Visão Grid (padrão — igual Shopify):**
- Grid responsivo 2→3→4→5 colunas
- Cada card de produto:
  - Foto em aspect-ratio 1:1 com object-cover, bordas arredondadas
  - Ao hover: overlay escuro suave + botão "✏️ Editar" centralizado (Framer Motion)
  - Badge no canto: "Esgotado" (vermelho) | "Oferta" (laranja) | "Novo" (azul) — se aplicável
  - Nome do produto (truncado 2 linhas)
  - Preço em destaque (riscado se tiver promoção)
  - Estoque: "23 un" com cor (verde/amarelo/vermelho)
  - Toggle ativo/inativo inline (aparece no hover)
  - **Quick Edit inline ao duplo clique no preço:** campo input aparece no lugar do preço, enter salva, esc cancela — PATCH imediato

**Visão Lista:**
- Tabela densa: checkbox | foto 40px | nome | categoria | preço (clicável para editar inline) | estoque (clicável para editar inline) | status toggle | ações

**Bulk Edit Mode:**
- Selecionar múltiplos produtos (checkboxes)
- Barra de ação fixa no bottom: "X selecionados" + ações: Alterar categoria | Alterar preço (% ou R$ fixo) | Ativar | Desativar | Excluir
- Modal de bulk edit preço: "Aumentar X%" | "Diminuir X%" | "Definir como R$ X" → preview do impacto antes de confirmar

### Modal de Produto (Sheet 720px — Shopify-like)
Abre com animação slide-in da direita. Header: nome do produto + "Publicado ●" badge.

**Layout 2 colunas dentro do sheet:**
Esquerda (60%):
- **Nome** — input grande, placeholder "Ex: Dipirona 500mg"
- **Descrição** — textarea com formatação básica (negrito, lista)
- **Categoria** — select com busca inline
- **Tags** — input com chips (Enter adiciona)
- Seção **Preços:**
  - Preço de venda (input moeda grande)
  - Preço original/riscado (input moeda menor, label "Preço promocional")
  - Toggle "Tem variações de preço" → expande seção de variações
- Seção **Variações** (se toggle ativo):
  - Lista dinâmica de variações: nome + preço + estoque
  - Ex: "500mg — R$8,90 — 45 un" | "+ Adicionar variação"
  - Drag handle para reordenar
- Seção **Adicionais/Complementos:**
  - Lista: nome + preço
  - Ex: "Sacola térmica (+R$1,00)" | "+ Adicionar"
- Seção **Estoque:**
  - Quantidade (input número)
  - Toggle "Controlar estoque" — se OFF nunca mostra esgotado
  - Unidade (select: un, cx, fr, comp, ml, g)
  - SKU / Código de barras

Direita (40%):
- **Upload de foto** principal:
  - Caixa grande drag & drop com ícone de câmera
  - Preview em tempo real (object-cover, aspect 1:1)
  - Ao clicar: file picker aceita jpg/png/webp até 5MB
  - Botão "🤖 Sugerir foto automaticamente" → GET {VITE_API_URL}/products/suggest-image?name={nome} → preview da sugestão + "Usar esta foto"
  - Galeria secundária: até 4 fotos extras (grid 2×2)
- **Status de publicação:**
  - Toggle grande: "Visível no site" / "Oculto"
  - "Disponível para pedidos" (toggle separado — produto aparece mas não pode ser comprado)
- **Miniatura preview:** card pequeno mostrando como ficará no site do cliente

Footer: "Cancelar" (ghost) + "Salvar produto" (primário, com loading)

---

## 🗂 CATEGORIAS — SHOPIFY-LIKE

Grid de cards + lista lado a lado.
Cada categoria: ícone emoji grande + nome + "X produtos" + toggle ativo + "Editar" | "Excluir"
**Drag & drop** para reordenar (reorder salva automaticamente via PATCH)

Categorias padrão FarmaZap (editáveis, com ícones):
💊 Medicamentos | 💉 Vitaminas e Suplementos | ✨ Dermocosméticos | 💆 Cabelos | 🧴 Higiene Pessoal | 👶 Bebê e Mamãe | 🌸 Perfumaria | 🦽 Ortopedia | ❤️ Sexual | 🌿 Homeopatia | 💊 Genéricos | ⚗️ Manipulados | 🐾 Veterinário

---

## 📥 IMPORTAR CATÁLOGO CSV

Wizard em 4 passos com stepper visual no topo:

**Passo 1 — Upload:**
- Zona drag & drop com animação de borda pontilhada ao arrastar
- Aceita .csv, .xlsx
- Preview das primeiras 10 linhas em tabela estilizada
- Botão "Baixar modelo" → CSV de exemplo

**Passo 2 — Mapeamento Inteligente:**
- Sistema detecta colunas automaticamente (fuzzy match)
- Tabela editável: "Coluna do arquivo" → "Campo do sistema" (select)
- Campos: nome*, preço*, estoque, categoria, descrição, código_barras, foto_url
- Validação ao vivo: linha vermelha se campo obrigatório não mapeado

**Passo 3 — Categorização por IA:**
- Card animado: "🤖 IA analisando seus produtos..."
- POST {VITE_API_URL}/products/ai-categorize
- Resultado: tabela com produto | categoria sugerida (select editável) | confiança (barra colorida)
- Categorização automática:
  • Fluoxetina, Rivotril, Sertralina → 💊 Medicamentos
  • Shampoo, Condicionador, Máscara capilar → 💆 Cabelos
  • Vitamina C, Whey, Creatina → 💉 Vitaminas
  • Fralda, Bepantol, Talco → 👶 Bebê e Mamãe
  • Preservativo, Gel íntimo → ❤️ Sexual
  • Perfume, Body splash → 🌸 Perfumaria
- Botão "Aceitar todas sugestões" ou editar linha por linha

**Passo 4 — Confirmar:**
- Resumo: ✅ X novos | 🔄 Y atualizados | ⏭ Z ignorados (duplicados)
- Progress bar animada por lote (50 produtos por vez)
- Log em tempo real: "✅ Dipirona 500mg importado" | "❌ Erro: preço inválido na linha 23"
- Botão "Baixar relatório de erros" (se houver)

---

## 💬 CLIENTES — CRM COMPLETO

**Header:** "Clientes" + contador + busca + filtros (tag, último pedido, LTV)

**Tabela principal:**
Avatar inicial | Nome | Telefone | Bairro | Último pedido | Nº pedidos | LTV (R$) | Tag | Ações

Tags automáticas com badge colorido:
- 👑 VIP (LTV > R$500) — dourado
- 🔁 Fiel (>5 pedidos) — azul
- 🆕 Novo (<2 pedidos) — verde
- 😴 Inativo (>30 dias) — cinza

**Drawer do cliente (560px):**
Topo: avatar grande, nome, tag badge, WhatsApp clicável
Abas:
- **Visão geral:** LTV grande em destaque, total de pedidos, ticket médio, data do primeiro pedido
- **Histórico de pedidos:** timeline vertical com cada pedido: data, itens, valor, status — clicável para abrir drawer do pedido
- **Produtos favoritos:** top 3 mais pedidos com foto e frequência
- **Mensagens:** histórico de WhatsApp + campo para enviar nova mensagem
- **Notas:** textarea com auto-save "Salvo há 2 segundos"

---

## 💰 FINANCEIRO

**KPIs topo (4 cards):**
MRR (projeção) | Faturamento do mês | Ticket médio | Taxa de cancelamento

**Gráfico principal:** linha dupla — mês atual (emerald) vs mês anterior (cinza) — recharts com tooltip rico

**Gráfico secundário:** pizza — faturamento por categoria

**Tabela de transações:**
# | Data | Cliente | Itens | Subtotal | Entrega | Total | Pagamento | Status

Filtros: período | forma de pagamento | status
Exportar CSV: GET {VITE_API_URL}/store/revenue/export

---

## 🎨 EDITOR DO SITE — SHOPIFY THEME EDITOR

Esta é a feature mais diferenciada do produto. Funciona EXATAMENTE como o Shopify Theme Editor.

**Layout:**
- Painel esquerdo fixo (360px): controles de edição organizados em seções colapsáveis
- Painel direito: preview ao vivo do site do cliente em iframe
  - Toggle mobile/desktop no topo do preview (ícone smartphone / monitor)
  - O iframe atualiza em tempo real conforme o lojista edita (debounce 500ms → PUT {VITE_API_URL}/site)

**Seções do painel esquerdo (acordeão):**

📌 **Identidade:**
- Nome da loja (input)
- Slogan (input)
- Logo: upload drag&drop + preview 80px

🎨 **Cores e Tema:**
- Cor principal (color picker com swatches pré-definidos)
- Cor de destaque (color picker)
- Preview ao vivo aplicado no iframe imediatamente

🖼 **Banners (5 slots):**
- Lista de slots: Banner 1...5
- Ao clicar: expand inline com preview 16:5 + upload/URL
- Upload: drag&drop ou "Buscar no computador"
- Preview atualiza no iframe

🃏 **Cards Promocionais (6 slots):**
- Mesmo padrão dos banners
- Preview 1:1

📝 **Textos:**
- Título principal (input)
- Subtítulo (input)
- Mensagem de boas-vindas (textarea)
- Rodapé (textarea)

⏰ **Horário (exibido no site):**
- Input de texto livre: "Seg–Sex: 8h–22h | Sáb: 9h–20h"

**Ações do editor:**
- Botão "💾 Salvar rascunho" (salva sem publicar)
- Botão "🚀 Publicar agora" (primário)
  - Ao clicar: progress inline "Salvando... → Renderizando... → Publicando no Vercel... → ✅ Site no ar!"
  - Exibe URL do site com botão "Abrir" e "Copiar link"
- "Último publicado: há 2 horas" embaixo do botão

---

## ⚙️ CONFIGURAÇÕES

Tabs:
**Loja:**
- WhatsApp, endereço, raio de entrega, taxa, pedido mínimo, tempo estimado
- Formas de pagamento (checkboxes): Dinheiro | PIX | Débito | Crédito | Vale farmácia
- Modalidades: toggle Entrega / toggle Retirada
- Horário de funcionamento: grade 7 dias × abre/fecha com toggle "Fechado"

**Notificações:**
- Toggle som de novos pedidos | Volume (slider) | Preview do som (botão tocar)
- Toggle notificação do browser
- Toggle e-mail de resumo diário

**Conta:**
- Nome, e-mail, senha (campos separados com botão "Alterar")
- Plano atual: badge "Pro ✨" + data de vencimento + botão "Gerenciar plano"

---

## 🎨 DESIGN SYSTEM COMPLETO

**Paleta:**
- bg-base: #09090b
- bg-surface: #111113
- bg-card: #18181b
- border: #27272a
- text-primary: #fafafa
- text-muted: #71717a
- primary: #10b981 (emerald-500)
- primary-hover: #059669
- primary-glow: rgba(16,185,129,0.15)
- danger: #ef4444
- warning: #f59e0b
- success: #22c55e

**Micro-animações (Framer Motion):**
- Cards: hover scale(1.01) + shadow suave, transition 150ms
- Sidebar collapse: spring stiffness 300 damping 30
- Modais: slide-in bottom 300ms ease-out
- Toasts: slide-in right + fade-out
- Botões: pressão sutil scale(0.97) ao click
- Skeleton: shimmer gradient animado
- Badge de pedido: pulse ring infinito quando >0
- CountUp: números animam de 0 ao valor real ao carregar

**Tipografia:**
- Heading: Inter 600/700
- Body: Inter 400/500
- Mono: JetBrains Mono (para IDs, códigos)

**Componentes shadcn obrigatórios:**
Button, Input, Textarea, Select, Badge, Card, Table, Dialog, Sheet, Tabs, Toast, Skeleton, Progress, Switch, Separator, Avatar, DropdownMenu, Command (busca), Calendar (date picker), Popover, Accordion, Tooltip

---

## ⚡ REGRAS TÉCNICAS

- TanStack Query: cache 60s dashboard | 30s pedidos | 120s catálogo | staleTime metade do cache
- Dashboard polling: refetchInterval 20000 (20s)
- Socket.io: reconexão automática infinita, reconnectionDelay 1000, exponential backoff
- Prefetch: ao hover no link da sidebar, prefetch a query da próxima página
- Otimistic updates: toggle ativo/inativo e mudança de status atualizam UI antes da resposta
- Erros 401: logout + redirect /login + toast "Sessão expirada"
- Erros 5xx: toast de erro com botão "Tentar novamente" que refaz a request
- Imagens: lazy loading com blur placeholder, fallback para ícone de produto
- Mobile: sidebar vira bottom sheet, kanban vira lista vertical
- PWA: manifest.json com ícone, nome "FarmaZap", display standalone — permite "Adicionar à tela inicial"
- Sem mock data algum — tudo consome VITE_API_URL real
- VITE_API_URL sem trailing slash
- Paginação: cursor-based, 20 itens, "Carregar mais" (não paginação numérica)
```
