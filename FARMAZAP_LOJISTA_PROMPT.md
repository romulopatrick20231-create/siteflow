# Lovable Prompt — FarmaZap Painel do Lojista

```
Crie um painel completo para o lojista (farmacêutico/dono de farmácia) chamado "FarmaZap — Painel do Parceiro". É o painel que o dono da farmácia usa no dia a dia para gerenciar sua loja online. Inspiração visual: iFood Parceiros + Shopify Admin. Stack: React + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Socket.io client. Dark mode padrão com toggle. Fonte Inter.

---

## AUTH
- Tela de login: e-mail + senha
- POST {VITE_API_URL}/auth/login → { token, store }
- JWT em localStorage com tenant_id e store_id no payload
- Todas as requisições: Authorization: Bearer {token}
- Ao logar: redireciona para /dashboard

---

## ALERTA DE PEDIDO (GLOBAL — MÁXIMA PRIORIDADE)
- Socket.io conectado em tempo real: io(VITE_API_URL, { auth: { token } })
- Evento "new_order": dispara IMEDIATAMENTE:
  1. Som de notificação (beep repetido 3x — usar AudioContext Web API, frequência 880hz, duração 200ms, intervalo 300ms)
  2. Toast gigante fixo no topo da tela: "🔔 NOVO PEDIDO — [nome do cliente]" com botão "Ver pedido" (fundo verde vibrante, texto branco grande)
  3. Badge com contador vermelho no ícone de Pedidos na sidebar
  4. Título da aba do browser muda para "🔔 (N) Novo pedido! — FarmaZap"
- Evento "order_status_changed": atualiza a lista sem reload
- Notificação persiste até o lojista clicar em "Ver pedido" ou fechar manualmente

---

## LAYOUT
- Sidebar fixa colapsável à esquerda
- Header fixo: nome da loja + avatar + badge de status (Aberta/Fechada) com toggle ON/OFF + notificações
- Toggle Aberta/Fechada: PATCH {VITE_API_URL}/store/status → { open: true/false }
- Conteúdo principal com skeleton loading
- Toasts para todas as ações

---

## SIDEBAR
```
Dashboard
Pedidos          ← badge com pedidos pendentes
Catálogo
  └─ Produtos
  └─ Categorias
  └─ Importar Catálogo (CSV)
Clientes (CRM)
Financeiro
Minha Loja
  └─ Aparência
  └─ Configurações
```

---

## PÁGINA: DASHBOARD
Topo — cards em tempo real (atualizam via Socket.io ou polling 30s):
- Pedidos Hoje | Pedidos Pendentes (vermelho se >0) | Faturamento Hoje (R$) | Ticket Médio

Painel central — 2 colunas:
Coluna esquerda:
- "Pedidos em Aberto" — lista ao vivo dos pedidos pendentes/em preparo, cada card mostra:
  - Nome do cliente, itens resumidos, valor total, tempo aguardando (contador ao vivo em minutos)
  - Botões de ação rápida: "Confirmar" | "Em preparo" | "Saiu pra entrega" | "Cancelar"
  - Ao clicar "Saiu pra entrega": modal pergunta nome/moto do entregador (opcional) → atualiza status e envia notificação WhatsApp ao cliente automaticamente (POST {VITE_API_URL}/orders/:id/notify)
  - Ao clicar "Finalizado": atualiza status, envia "Pedido entregue! Obrigado 🙏" por WhatsApp, toca som de conclusão (frequência 440hz)

Coluna direita:
- Gráfico de barras: faturamento dos últimos 7 dias (recharts)
- Top 5 produtos mais vendidos (lista com ranking)
- Mapa de calor de horário de pico (grade 7x24 com intensidade de cor)

Endpoints:
- GET {VITE_API_URL}/store/dashboard
- GET {VITE_API_URL}/orders?status=pending,preparing,delivering
- PATCH {VITE_API_URL}/orders/:id/status

---

## PÁGINA: PEDIDOS
Visão Kanban (colunas arrastáveis) + Visão Lista (toggle)

Colunas Kanban:
[Novos] → [Confirmado] → [Em Preparo] → [Saiu pra Entrega] → [Entregue] | [Cancelados]

Cada card de pedido:
- ID curto (#0042) + nome do cliente + tempo aguardando
- Itens: lista resumida (máx 3 itens + "e mais N")
- Valor total em destaque
- Botão de ação principal (próximo status)
- Botão "Detalhes" → abre drawer lateral

Drawer de detalhes do pedido:
- Informações completas: cliente, telefone, endereço
- Lista de itens: produto, variação, qty, preço unit, subtotal
- Total com breakdown (subtotal + entrega)
- Campo "Entregador" (input livre, opcional)
- Timeline de status com timestamps
- Botão "Enviar mensagem WhatsApp" → modal com mensagem editável → POST {VITE_API_URL}/whatsapp/send
- Histórico de mensagens enviadas para este pedido

Filtros (visão lista):
- Período (date range) | Status | Busca por cliente

Endpoints:
- GET {VITE_API_URL}/orders
- PATCH {VITE_API_URL}/orders/:id/status
- POST {VITE_API_URL}/orders/:id/notify
- POST {VITE_API_URL}/whatsapp/send

---

## PÁGINA: PRODUTOS
Tabela com: Foto | Nome | Categoria | Preço | Estoque | Status | Ações

Ações por produto: Editar | Duplicar | Ativar/Desativar | Excluir

Busca + Filtro por categoria + Filtro por status (Ativo/Inativo/Sem estoque)

Badge de estoque: verde (>10) | amarelo (1-10) | vermelho (0 — "Esgotado")

MODAL EDITAR/CRIAR PRODUTO (sheet lateral larga):
Aba 1 — Informações:
- Nome (input)
- Descrição (textarea com contador de caracteres)
- Categoria (select das categorias cadastradas)
- Preço base (input moeda)
- Preço promocional (input moeda — se preenchido, mostra riscado no site)
- Código de barras / SKU (input)
- Tags (input com chips)

Aba 2 — Estoque:
- Quantidade em estoque (input número)
- Controle de estoque: toggle ON/OFF (se OFF, nunca mostra "esgotado")
- Unidade (un, cx, kg, ml, comprimido, etc.)

Aba 3 — Foto:
- Upload de imagem (drag & drop ou URL)
- Preview da imagem
- Botão "Buscar foto automática" → GET {VITE_API_URL}/products/suggest-image?name={nome} → retorna URL de imagem sugerida

Aba 4 — Variações (ex: tamanho, dosagem):
- Lista dinâmica: Nome da variação + Preço adicional + Estoque próprio
- Exemplos: "500mg (+R$0,00)" | "1000mg (+R$2,50)" | "Frasco 60 comprimidos (+R$8,00)"
- Botão "+ Adicionar variação"

Aba 5 — Adicionais/Complementos:
- Lista dinâmica: Nome + Preço
- Exemplos: "Sacola térmica (+R$1,00)" | "Embrulho para presente (+R$3,00)"
- Botão "+ Adicionar adicional"

Endpoints:
- GET {VITE_API_URL}/products
- POST {VITE_API_URL}/products
- PUT {VITE_API_URL}/products/:id
- DELETE {VITE_API_URL}/products/:id
- GET {VITE_API_URL}/products/suggest-image

---

## PÁGINA: CATEGORIAS
Grid de cards: ícone + nome + quantidade de produtos

Ações: Editar nome/ícone | Reordenar (drag & drop) | Ativar/Desativar | Excluir

Formulário criar/editar: nome + ícone (emoji picker) + slug (auto-gerado)

Categorias padrão FarmaZap (pré-criadas, editáveis):
Medicamentos | Vitaminas e Suplementos | Dermocosméticos | Cabelos | Higiene Pessoal | Bebê e Mamãe | Perfumaria | Ortopedia | Sexual e Preservativos | Homeopatia | Genéricos | Manipulados | Veterinário | Outros

Endpoints:
- GET {VITE_API_URL}/products/categories
- POST {VITE_API_URL}/products/categories
- PUT {VITE_API_URL}/products/categories/:id

---

## PÁGINA: IMPORTAR CATÁLOGO (CSV)
Esta página é fundamental — permite subir a planilha do fornecedor/sistema da farmácia.

Passo 1 — Upload:
- Área drag & drop para CSV
- Botão "Baixar modelo de planilha" → gera CSV exemplo com colunas: nome, descricao, preco, estoque, categoria, codigo_barras, foto_url
- Preview das primeiras 5 linhas após upload

Passo 2 — Mapeamento inteligente de colunas:
- Sistema detecta automaticamente quais colunas do CSV correspondem aos campos
- Exibe tabela de mapeamento editável: coluna do CSV → campo do sistema
- Ex: "DESCRICAO" → "nome" | "VLR_VENDA" → "preco" | "QTD_ESTOQUE" → "estoque"

Passo 3 — Categorização Automática com IA:
- Botão "Categorizar automaticamente com IA"
- POST {VITE_API_URL}/products/ai-categorize (envia lista de nomes)
- Retorna sugestão de categoria para cada produto
- Exibe tabela com: produto | categoria sugerida (editável via select) | confiança (%)
- Lógica de exemplo aplicada automaticamente:
  • "Fluoxetina", "Sertralina", "Rivotril" → Medicamentos
  • "Shampoo", "Condicionador", "Máscara" → Cabelos
  • "Whey", "Creatina", "Vitamina C" → Vitaminas e Suplementos
  • "Fralda", "Pomada Bepantol" → Bebê e Mamãe
  • "Preservativo", "Gel íntimo" → Sexual e Preservativos
- Lojista pode corrigir qualquer categoria antes de importar

Passo 4 — Importar:
- Resumo: X produtos novos | Y atualizados | Z ignorados (duplicados)
- Botão "Confirmar importação"
- Progress bar por produto
- Relatório final: ✅ importados | ❌ erros com motivo

Endpoints:
- POST {VITE_API_URL}/products/import (multipart/form-data, CSV)
- POST {VITE_API_URL}/products/ai-categorize
- GET {VITE_API_URL}/products/export

---

## PÁGINA: CLIENTES (CRM)
Tabela: Nome | Telefone | Último pedido | Total de pedidos | Total gasto (LTV) | Ações

Busca por nome ou telefone

Ao clicar → drawer lateral:
- Informações do cliente
- Histórico completo de pedidos (timeline)
- Total gasto (lifetime value)
- Campo "Notas internas" (textarea salva automaticamente)
- Botão "Enviar mensagem WhatsApp" → modal com template editável
- Tags: VIP (se LTV > R$500) | Frequente (>5 pedidos) | Inativo (>30 dias sem pedido)

Endpoints:
- GET {VITE_API_URL}/customers
- GET {VITE_API_URL}/customers/:id/history

---

## PÁGINA: FINANCEIRO
Cards topo: Faturamento do mês | Faturamento da semana | Pedidos pagos | Ticket médio do mês

Gráfico de linha: faturamento diário do mês atual vs mês anterior (recharts, 2 linhas)

Tabela de transações: Data | Pedido | Cliente | Valor | Status pagamento

Filtros: período (date range) | status

Exportar: botão "Exportar CSV" → GET {VITE_API_URL}/store/revenue/export

Endpoint: GET {VITE_API_URL}/store/revenue

---

## PÁGINA: MINHA LOJA — APARÊNCIA
Permite editar o site gerado sem quebrar nada — mudanças vão para o banco e republicam automaticamente.

Seção Identidade:
- Nome da loja (input)
- Slogan/tagline (input)
- Logo (upload ou URL + preview)
- Cor principal (color picker — aplica ao tema do site)
- Telefone de contato / WhatsApp

Seção Banners:
- Grid com 5 slots de banner
- Cada slot: preview + botão "Trocar imagem" (upload ou URL) + label
- Botão "Salvar banners" → PUT {VITE_API_URL}/site/images

Seção Cards Promocionais:
- Grid com 6 slots de promo card
- Mesmo padrão dos banners

Seção Textos:
- Campos editáveis: título principal, subtítulo, texto do rodapé, horário de funcionamento

Botão "Publicar alterações" → POST {VITE_API_URL}/publish
Progress inline: Salvando → Renderizando → ✅ Site atualizado!

Endpoints:
- GET {VITE_API_URL}/site
- PUT {VITE_API_URL}/site
- PUT {VITE_API_URL}/site/images
- POST {VITE_API_URL}/publish

---

## PÁGINA: CONFIGURAÇÕES
- WhatsApp do negócio (input)
- Endereço completo (inputs separados: rua, número, bairro, cidade, CEP)
- Raio de entrega (km — input numérico)
- Taxa de entrega (R$ — input moeda)
- Pedido mínimo (R$ — input moeda)
- Tempo estimado de entrega (minutos — input)
- Formas de pagamento aceitas (checkboxes: Dinheiro, PIX, Cartão débito, Cartão crédito, Vale farmácia)
- Horário de funcionamento (grade por dia da semana: abre | fecha | fechado toggle)
- Notificações: toggle para som de novos pedidos | toggle para notificação no browser

Endpoint: PUT {VITE_API_URL}/store/settings

---

## DESIGN TOKENS
- Background: #09090b | Surface: #18181b | Border: #27272a
- Primary: #10b981 (emerald — cor da farmácia)
- Accent: #059669
- Success: #22c55e | Warning: #f59e0b | Danger: #ef4444
- Radius: 8px | Font: Inter

## REGRAS TÉCNICAS
- TanStack Query: cache 30s, retry 2x, refetchInterval 30000 para dashboard
- Socket.io: reconectar automaticamente se cair (reconnectionDelay: 1000)
- Erros 401 → logout + redirect /login
- Todas as mutations invalidam queries relacionadas
- Skeleton loading em todas as páginas
- Sem mock data — tudo vai para VITE_API_URL real
- VITE_API_URL sem trailing slash
- Paginação: 20 itens por página com cursor/offset
```
