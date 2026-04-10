# Lovable Prompt — ForgeSites Admin Panel

```
Crie um painel administrativo SaaS completo chamado "ForgeSites Admin" para um admin que gerencia dois produtos diferentes: FarmaZap (sites para farmácias) e PedeZap (sites para delivery/restaurantes). Stack: React + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query. Dark mode padrão com toggle light/dark. Fonte Inter. Sidebar colapsável.

---

## AUTH
- Tela de login: e-mail + senha
- POST {VITE_API_URL}/auth/login → { token, user }
- JWT salvo em localStorage
- Proteção de todas as rotas — redirect para /login se não autenticado
- Header: avatar + nome do admin + badge "Super Admin" + logout

---

## LAYOUT
- Sidebar fixa colapsável à esquerda
- Header com breadcrumb dinâmico + toggle dark/light + notificações
- Skeleton loading em todas as páginas (nunca spinner puro)
- Toasts de sucesso/erro em todas as ações
- Responsive: sidebar vira drawer no mobile

---

## SIDEBAR — NAVEGAÇÃO
```
Dashboard
FarmaZap
  └─ Sites FarmaZap
  └─ Usuários FarmaZap
PedeZap
  └─ Sites PedeZap
  └─ Usuários PedeZap
Gerar Site
CRM / Cobranças
Pedidos
Clientes WhatsApp
Fila de Mensagens
Billing / Stripe
Configurações
```

---

## PÁGINA: DASHBOARD
4 cards no topo (2 colunas — FarmaZap | PedeZap):
- Sites Ativos FarmaZap | Sites Ativos PedeZap
- Usuários FarmaZap | Usuários PedeZap
- Receita FarmaZap (MRR) | Receita PedeZap (MRR)
- Adimplentes | Inadimplentes (total geral, badge vermelho se >0 inadimplente)

Abaixo:
- Gráfico de linha: Sites gerados por dia (últimos 30 dias) — separados por produto (2 linhas: azul=FarmaZap, laranja=PedeZap) — recharts
- Tabela "Últimas atividades": timestamp | ação | usuário | produto

Endpoints:
- GET {VITE_API_URL}/admin/revenue
- GET {VITE_API_URL}/sites

---

## PÁGINA: SITES FARMAZAP / SITES PEDEZAP
(Mesma estrutura, filtrada por nicho)

Tabela com colunas:
- Cliente (nome do negócio)
- Usuário dono (e-mail)
- Versão do template (FarmaZap v1 / v2 / v3 — ou PedeZap)
- URL (link externo com ícone)
- Status — toggle switch ON/OFF inline (ativa/desativa o site com um clique)
- Plano (Free / Starter / Pro)
- Adimplência — badge: Em dia (verde) | Atrasado (vermelho) | Trial (amarelo)
- Criado em
- Ações: Editar | Ver Site | Republicar | Excluir

Filtros acima da tabela:
- Busca por nome ou URL
- Filtro por status: Todos / Ativos / Inativos
- Filtro por adimplência: Todos / Em dia / Atrasados / Trial
- Filtro por versão do template (apenas FarmaZap: v1 / v2 / v3)

Toggle de status:
- PATCH {VITE_API_URL}/sites/:id → { active: true/false }
- Ao desativar: confirmação rápida "Desativar site de [nome]?" com botão vermelho
- Feedback imediato com toast

Paginação: 15 por página

Botão "Gerar Novo Site" no canto superior direito → navega para /gerar-site

Endpoints:
- GET {VITE_API_URL}/sites?niche=farmazap (ou pedezap)
- PATCH {VITE_API_URL}/sites/:id

---

## MODAL: EDITAR SITE (abre ao clicar em Editar na tabela)
Sheet lateral larga (80vw, max 900px) com abas:

Aba 1 — Dados do Site:
- Nome do Negócio (input)
- Telefone WhatsApp (input com máscara)
- Cidade (input)
- Slug (input — avisa se já existe)
- Nicho / Versão do template (select — apenas versões do produto)
- Dono do site (select de usuários existentes — permite transferir)

Aba 2 — Conteúdo Gerado:
- Textarea grande com o JSON de content (pages, slogans, etc.) — editável
- Botão "Regenerar com IA" → POST {VITE_API_URL}/ai/regenerate/:id
- Botão "Salvar conteúdo"

Aba 3 — Imagens:
- Grid com previews das imagens do site (banner_1 a banner_5, promo_card_1 a promo_card_6)
- Cada imagem: preview + input de URL + botão trocar
- Botão "Salvar imagens"

Aba 4 — Publicação:
- URL atual do site (com botão copiar)
- Status do deploy: Publicado / Com erros / Nunca publicado
- Botão "Republicar agora" → POST {VITE_API_URL}/publish/:id
- Progress inline durante republicação (3 etapas: Renderizando → Enviando → ✅ No ar)
- Histórico de deploys: tabela com data + status + URL do deploy

Aba 5 — Domínio:
- Domínio customizado atual (se houver)
- Input para adicionar domínio customizado
- Status de DNS: Verificando / Ativo / Erro
- Botão "Verificar DNS" + botão "Vincular domínio"

Endpoints:
- GET {VITE_API_URL}/sites/:id
- PUT {VITE_API_URL}/site
- POST {VITE_API_URL}/publish
- GET {VITE_API_URL}/domain

---

## PÁGINA: USUÁRIOS FARMAZAP / USUÁRIOS PEDEZAP
(Mesma estrutura, filtrada por produto)

Tabela:
- E-mail | Nome | Sites (quantidade, clicável) | Plano | Adimplência | Último acesso | Status da conta | Ações

Ações por linha:
- Ver sites do usuário (abre modal com lista dos sites)
- Editar usuário (drawer lateral)
- Suspender / Reativar conta (toggle)
- Resetar senha (gera nova senha aleatória, exibe em modal para copiar)
- Excluir (confirmação dupla)

Drawer editar usuário:
- E-mail, Nome, Telefone
- Plano (select: Free / Starter / Pro)
- Data de vencimento do plano (date picker)
- Notas internas do admin (textarea)
- Botão salvar

Endpoints:
- GET {VITE_API_URL}/admin/users?product=farmazap
- PUT {VITE_API_URL}/admin/users/:id
- POST {VITE_API_URL}/admin/users/:id/suspend
- POST {VITE_API_URL}/admin/users/:id/reset-password

---

## PÁGINA: GERAR SITE (Individual)
Card centralizado, max-width 680px.

Step 1 — Proprietário do Site:
Radio com 2 opções:
  [A] Usuário Existente
    - Select de busca (searchable) de todos os usuários cadastrados
    - Ao selecionar: mostra card com e-mail, nome, plano e sites atuais do usuário
  [B] Novo Usuário
    - Input: Nome completo
    - Input: E-mail
    - Input: Telefone
    - Input: Plano (select: Free / Starter / Pro)
    - Senha gerada automaticamente (exibida em campo readonly com botão copiar)
    - Checkbox: "Enviar credenciais por WhatsApp" (se marcado, envia via /ai ou whatsapp.service)

Step 2 — Dados do Site:
- Nome do Negócio (input)
- Produto (select, determina quais versões aparecem):
    • FarmaZap
    • PedeZap
- Versão/Template (select condicional):
    • Se FarmaZap: Clássica v1 | Moderna v2 | Premium v3
    • Se PedeZap: Padrão
- Telefone WhatsApp do negócio (input com máscara, diferente do dono)
- Cidade (input)
- Slug (auto-gerado a partir do nome, editável — valida disponibilidade em tempo real)

Step 3 — Confirmação:
- Resumo: usuário dono + dados do site + template escolhido
- Botão "Gerar e Publicar"

Progress de geração (aparece ao confirmar):
[ Criando usuário... ] → [ Gerando conteúdo com IA... ] → [ Renderizando template... ] → [ Publicando no Vercel... ] → ✅ Site no ar!

Resultado:
- Card verde com URL do site + botão "Copiar link" + botão "Ver site"
- Link "Gerar outro site" | Link "Ver todos os sites"

Endpoints:
- GET {VITE_API_URL}/admin/users (busca de usuários)
- POST {VITE_API_URL}/auth/register (criar novo usuário)
- POST {VITE_API_URL}/generate (gerar site)

---

## PÁGINA: CRM / COBRANÇAS
Esta é a página mais importante do admin — visão de saúde financeira da base de clientes.

Topo — 4 cards:
- Total de clientes pagantes | Em dia (verde) | Atrasados (vermelho) | Trial expirando em 7 dias (amarelo)

Tabela principal:
Colunas: Cliente | E-mail | Produto | Plano | Valor | Vencimento | Status | Dias atraso | Ações

Status em badge:
- Em dia → verde
- Atrasado 1-7 dias → laranja
- Atrasado 8-30 dias → vermelho
- Atrasado >30 dias → vermelho escuro "CRÍTICO"
- Trial → amarelo com countdown (ex: "Trial — 5 dias")
- Cancelado → cinza

Filtros:
- Produto: Todos / FarmaZap / PedeZap
- Status: Todos / Em dia / Atrasados / Trial / Cancelados
- Plano: Free / Starter / Pro

Ações por linha:
- Marcar como pago (abre modal: valor pago, data, forma de pagamento → confirma)
- Suspender site (desativa site imediatamente com confirmação)
- Enviar lembrete WhatsApp (abre modal com mensagem pré-preenchida editável → envia via /whatsapp ou enqueueMessage)
- Ver histórico de cobranças (drawer com lista de pagamentos)
- Ver sites do cliente

Ação em massa:
- Selecionar múltiplos → "Enviar lembrete para selecionados" | "Suspender selecionados"

Endpoints:
- GET {VITE_API_URL}/admin/billing/crm
- POST {VITE_API_URL}/admin/billing/mark-paid/:userId
- POST {VITE_API_URL}/admin/billing/send-reminder/:userId

---

## PÁGINA: PEDIDOS
(Pedidos do sistema PedeZap — lojas de delivery)

Tabela: ID | Loja | Cliente | Itens (resumo) | Total | Status | Canal | Criado em | Ações

Status badge: Pendente (amarelo) | Confirmado (azul) | Em preparo (laranja) | Saiu pra entrega (roxo) | Entregue (verde) | Cancelado (vermelho)

Filtros: Loja | Status | Período (date range)

Ao clicar → drawer com:
- Itens do pedido (nome, variação, addon, qty, preço unit, subtotal)
- Total com breakdown
- Endereço de entrega
- Histórico de status (timeline)
- Select de status + botão "Atualizar"

Endpoints:
- GET {VITE_API_URL}/admin/orders
- PATCH {VITE_API_URL}/orders/:id/status

---

## PÁGINA: CLIENTES WHATSAPP
Tabela: Telefone | Nome | Loja/Site | Último contato | Pedidos | Ações

Drawer ao clicar:
- Informações do cliente
- Histórico de pedidos
- Histórico de mensagens (timeline de conversas)

Endpoints:
- GET {VITE_API_URL}/admin/customers

---

## PÁGINA: FILA DE MENSAGENS
Cards no topo: Pendentes | Enviadas hoje | Falhas | Worker status (🟢 Ativo / 🔴 Parado)

Tabela: Telefone | Mensagem (truncada) | Status | Tentativas | Criado em | Enviado em | Último erro

Status: Pending (cinza) | Processing (azul pulsante) | Sent (verde) | Failed (vermelho)

Filtros: Status | Período

Ações:
- Reprocessar mensagem falha individualmente
- Botão "Reprocessar todas as falhas"
- Auto-refresh a cada 5 segundos (badge animado no header da página)

Endpoints:
- GET {VITE_API_URL}/admin/message-queue
- POST {VITE_API_URL}/admin/message-queue/retry/:id
- POST {VITE_API_URL}/admin/message-queue/retry-all

---

## PÁGINA: BILLING / STRIPE
Cards: MRR Total | MRR FarmaZap | MRR PedeZap | Churn do mês | Novas assinaturas

Tabela de assinaturas: Usuário | Produto | Plano | Status | Próxima cobrança | Valor | Link Stripe

Status: Active (verde) | Past Due (vermelho) | Trialing (amarelo) | Canceled (cinza)

Endpoints:
- GET {VITE_API_URL}/billing

---

## PÁGINA: CONFIGURAÇÕES
Tabs:

Tab 1 — Imagens do Template:
- Sub-tabs: FarmaZap v1 | FarmaZap v2 | FarmaZap v3 | PedeZap
- Grid 2 colunas: Banners (1-5) + Promo Cards (1-6)
- Cada slot: preview da imagem + input URL + botão trocar + label
- Botão "Salvar imagens" por template

Tab 2 — Nichos Atendidos:
- Lista editável de nichos disponíveis para geração
- Cada nicho: nome, slug, templates disponíveis, ativo/inativo

Tab 3 — Integrações:
- WHAPI_BASE_URL + WHAPI_TOKEN (mascarado) + botão "Testar conexão"
- VERCEL_TOKEN (mascarado)
- OPENAI_API_KEY (mascarado)
- SUPABASE_URL + SUPABASE_KEY (mascarados)
- Cada integração: status de saúde (🟢 OK / 🔴 Erro) + botão "Testar"

Tab 4 — Geral:
- Nome da plataforma
- Logo (URL)
- Timezone padrão

---

## DESIGN TOKENS
- Background: #09090b | Surface: #18181b | Border: #27272a
- Light: bg=#fafafa | surface=#ffffff | border=#e4e4e7
- Primary: #6366f1 (indigo-500)
- FarmaZap accent: #10b981 (emerald — farmácia)
- PedeZap accent: #f97316 (orange — delivery)
- Success: #22c55e | Warning: #f59e0b | Danger: #ef4444
- Radius: 8px | Font: Inter

---

## REGRAS GLOBAIS
- TanStack Query em todas as chamadas (cache 30s, retry 2x, staleTime 10s)
- Todas as mutations invalidam as queries relacionadas automaticamente
- Erros 401 → logout automático + redirect /login
- Loading states: skeleton (nunca spinner puro exceto dentro de botões)
- Confirmações destrutivas: sempre Dialog com texto da ação + botão vermelho
- Tabelas com mais de 5 colunas: horizontal scroll no mobile
- Não usar mock data — todas as chamadas vão para VITE_API_URL real
- Variável de ambiente: VITE_API_URL (sem trailing slash)
- Authorization header em todas as chamadas: "Bearer " + token do localStorage
```
