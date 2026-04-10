# Lovable Prompt — PedeZap Painel do Lojista

```
Crie um painel completo para o lojista (dono de restaurante/delivery) chamado "PedeZap — Painel do Parceiro". É o painel que o dono do estabelecimento usa no dia a dia para gerenciar seu delivery. Inspiração visual: iFood Parceiros + Shopify Admin, com visual mais quente e energético. Stack: React + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Socket.io client. Dark mode padrão com toggle. Fonte Inter.

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
  1. Som de notificação (beep repetido 3x — AudioContext Web API, frequência 880hz, duração 200ms, intervalo 300ms)
  2. Toast gigante fixo no topo: "🛵 NOVO PEDIDO — [nome do cliente] — R$ [valor]" (fundo laranja vibrante, texto branco grande)
  3. Badge contador vermelho no ícone de Pedidos na sidebar
  4. Título da aba: "🛵 (N) Novo pedido! — PedeZap"
  5. Se janela minimizada: Notification API do browser (pede permissão no primeiro acesso)
- Evento "order_status_changed": atualiza lista sem reload
- Notificação persiste até lojista clicar "Ver pedido" ou fechar

---

## LAYOUT
- Sidebar fixa colapsável à esquerda
- Header: nome do estabelecimento + tipo (Pizzaria/Hamburgueria/Açaíteria/Sorveteria) + badge status (Aberto/Fechado) com toggle + notificações
- Toggle Aberto/Fechado: PATCH {VITE_API_URL}/store/status → { open: true/false }
- Skeleton loading em todas as páginas
- Toasts em todas as ações

---

## SIDEBAR
```
Dashboard
Pedidos          ← badge pedidos pendentes
Cardápio
  └─ Produtos
  └─ Categorias
  └─ Importar Cardápio (CSV)
Clientes (CRM)
Financeiro
Minha Loja
  └─ Aparência
  └─ Configurações
```

---

## PÁGINA: DASHBOARD
Topo — cards em tempo real:
- Pedidos Hoje | Pedidos Pendentes (vermelho se >0) | Faturamento Hoje (R$) | Ticket Médio | Tempo médio de entrega

Centro — painel operacional em 2 colunas:
Coluna esquerda — "Pedidos ao Vivo":
Cards de pedidos ativos ordenados por tempo de espera (mais antigo no topo):
- Nome do cliente + itens resumidos + valor + contador ao vivo (mm:ss aguardando)
- Cor do card muda com o tempo: verde (<5min) → amarelo (5-15min) → vermelho (>15min)
- Botões de ação rápida:
  • "✅ Aceitar" → status: confirmado
  • "🍳 Em preparo" → status: preparing + input tempo estimado (ex: 25 min) → envia WhatsApp ao cliente
  • "🛵 Saiu pra entrega" → modal: nome do motoboy (input) → status: delivering → WhatsApp "Seu pedido saiu pra entrega! 🛵"
  • "✔️ Entregue" → status: delivered → WhatsApp "Pedido entregue! Obrigado 😊" + som de conclusão
  • "❌ Cancelar" → modal: motivo → WhatsApp de cancelamento

Coluna direita:
- Gráfico de barras: faturamento últimos 7 dias (recharts)
- Top 5 mais pedidos
- Gráfico de pizza: pedidos por categoria (pizza, hamburguer, bebidas, etc.)
- Status da cozinha: campo livre "Aviso para o site" (ex: "Aceitando pedidos normalmente" ou "Lotados — tempo extra de 30min") → salva em tempo real

---

## PÁGINA: PEDIDOS — VISÃO KANBAN
Colunas: [Novos 🔔] → [Aceitos ✅] → [Em Preparo 🍳] → [Saiu pra Entrega 🛵] → [Entregues ✅] | [Cancelados ❌]

Card de pedido no Kanban:
- #ID + nome do cliente + tempo aguardando (contador ao vivo)
- Resumo dos itens (máx 3 + "e mais N")
- Valor total + forma de pagamento
- Badge: Retirada / Entrega
- Botão de ação principal (próximo status)

Toggle: Kanban | Lista (tabela com filtros)

Drawer de detalhes ao clicar:
- Dados do cliente: nome, telefone, endereço completo + link Google Maps
- Itens detalhados: produto, variação, adicionais, observação do cliente, qty, preço
- Valor total + taxa de entrega + total final
- Forma de pagamento + troco (se dinheiro)
- Campo "Motoboy" (input)
- Campo "Tempo estimado" (input minutos) → aparece no WhatsApp enviado
- Timeline de status com timestamps
- Observações do cliente (campo do pedido)
- Botão "Enviar mensagem WhatsApp" → modal com mensagem editável
- Histórico de mensagens enviadas

---

## PÁGINA: PRODUTOS (CARDÁPIO)
Tabela/grid com: Foto | Nome | Categoria | Preço | Disponível (toggle) | Ações

Toggle "Disponível" inline: produto some do cardápio online imediatamente (PATCH {VITE_API_URL}/products/:id → { available: false })

Filtro por categoria + busca + filtro disponibilidade

MODAL EDITAR/CRIAR PRODUTO (sheet lateral):
Aba 1 — Informações:
- Nome (input) — ex: "Pizza Margherita"
- Descrição (textarea) — ex: "Molho de tomate, muçarela, manjericão fresco"
- Categoria (select)
- Preço base (input moeda)
- Preço promocional (opcional — mostra riscado no site)
- Serve quantas pessoas (select: 1 / 2 / 3-4 / família)
- Tags (chips): #vegano #sem-gluten #picante #destaque

Aba 2 — Foto:
- Upload drag & drop ou URL
- Preview + recorte (crop básico)
- Botão "Buscar foto" → GET {VITE_API_URL}/products/suggest-image?name={nome}

Aba 3 — Tamanhos/Variações:
- Lista dinâmica: tamanho + preço próprio
- Ex Pizzaria: "Brotinho R$25 | Pequena R$35 | Média R$45 | Grande R$55 | Família R$75"
- Ex Açaíteria: "300ml R$12 | 500ml R$18 | 700ml R$25 | 1L R$35"
- Ex Hamburgueria: "Simples R$22 | Duplo R$32 | Triplo R$42"
- Cada variação tem estoque próprio (opcional)

Aba 4 — Adicionais/Complementos:
- Grupos de adicionais com seleção obrigatória ou opcional
- Ex Pizzaria: Grupo "Borda" (obrigatório, escolha 1): Sem borda / Cheddar (+R$6) / Catupiry (+R$6)
- Ex Pizzaria: Grupo "Extras" (opcional, múltipla escolha): Muçarela extra (+R$4) / Ovo (+R$3)
- Ex Açaíteria: Grupo "Frutas" (múltipla, até 3): Banana / Morango / Kiwi / Manga
- Ex Açaíteria: Grupo "Coberturas" (múltipla): Leite em pó / Granola / Paçoca
- Botão "+ Adicionar grupo"

Aba 5 — Disponibilidade:
- Toggle "Disponível no cardápio"
- Disponibilidade por horário: grade de dias/horas (ex: só disponível seg-sex 11h-14h)

---

## PÁGINA: CATEGORIAS
Grid de cards editáveis com drag & drop para reordenar

Categorias padrão por tipo de estabelecimento (detectado pelo nicho):
🍕 Pizzaria: Pizzas Salgadas | Pizzas Doces | Bordas Recheadas | Bebidas | Sobremesas | Combos
🍔 Hamburgueria: Hambúrgueres | Smash Burgers | Hot Dogs | Acompanhamentos | Bebidas | Sobremesas | Combos
🍧 Açaíteria: Açaí | Sorvetes | Vitaminas | Sucos | Frutas | Coberturas Avulsas | Combos
🍦 Sorveteria: Sorvetes | Picolés | Sundaes | Milkshakes | Casquinhas | Combos

Ações: Editar | Reordenar (drag & drop) | Ativar/Desativar | Excluir
Formulário: nome + emoji/ícone (emoji picker) + slug

---

## PÁGINA: IMPORTAR CARDÁPIO (CSV)
Passo 1 — Upload:
- Drag & drop de CSV
- Botão "Baixar modelo" → CSV com: nome, descricao, preco, categoria, tamanho, disponivel, foto_url
- Preview primeiras 5 linhas

Passo 2 — Mapeamento de colunas:
- Detecção automática + tabela editável de mapeamento
- Ex: "PRODUTO" → "nome" | "VALOR" → "preco" | "GRUPO" → "categoria"

Passo 3 — Categorização automática com IA:
- POST {VITE_API_URL}/products/ai-categorize (envia nomes)
- Categorização inteligente por nicho do estabelecimento:
  Pizzaria:
  • "Margherita", "Calabresa", "Frango" → Pizzas Salgadas
  • "Chocolate", "Romeu e Julieta" → Pizzas Doces
  • "Coca-Cola", "Suco", "Água" → Bebidas
  Hamburgueria:
  • "X-Burguer", "Smash", "Veggie" → Hambúrgueres
  • "Batata frita", "Onion rings" → Acompanhamentos
  • "Sorvete", "Brownie" → Sobremesas
  Açaíteria:
  • "Açaí 300ml", "Açaí com banana" → Açaí
  • "Vitamina de morango" → Vitaminas
  • "Granola", "Leite em pó" → Coberturas Avulsas
  Sorveteria:
  • "Chocolate", "Creme", "Morango" → Sorvetes
  • "Picolé de uva" → Picolés
  • "Milkshake" → Milkshakes
- Tabela de resultado editável (select por linha) com % de confiança

Passo 4 — Importar:
- Resumo: X novos | Y atualizados | Z ignorados
- Progress bar por produto
- Relatório: ✅ importados | ❌ erros com motivo

Endpoints:
- POST {VITE_API_URL}/products/import
- POST {VITE_API_URL}/products/ai-categorize
- GET {VITE_API_URL}/products/export

---

## PÁGINA: CLIENTES (CRM)
Tabela: Nome | Telefone | Bairro | Último pedido | Nº pedidos | Total gasto | Tag | Ações

Tags automáticas: VIP (LTV > R$300) | Fiel (>8 pedidos) | Novo (<2 pedidos) | Inativo (>21 dias)

Drawer do cliente:
- Dados + mapa do endereço (iframe Google Maps)
- Histórico de pedidos (timeline com itens)
- Pedidos favoritos (top 3 mais pedidos)
- LTV (lifetime value)
- Notas internas (textarea, salva automático)
- Botão "Enviar promoção WhatsApp" → modal com mensagem editável + preview
- Botão "Oferecer cupom" → gera código de desconto

Endpoints:
- GET {VITE_API_URL}/customers
- GET {VITE_API_URL}/customers/:id/history

---

## PÁGINA: FINANCEIRO
Cards: Faturamento do mês | Faturamento da semana | Pedidos pagos | Ticket médio | Taxa de cancelamento (%)

Gráfico de linha: faturamento diário — mês atual vs anterior (recharts)
Gráfico de barras: faturamento por categoria de produto

Tabela: Data | Pedido | Cliente | Itens | Valor | Entrega | Total | Pagamento

Exportar CSV: GET {VITE_API_URL}/store/revenue/export

Endpoint: GET {VITE_API_URL}/store/revenue

---

## PÁGINA: MINHA LOJA — APARÊNCIA
Permite editar o site gerado sem quebrar nada.

Seção Identidade:
- Nome do estabelecimento + tipo (Pizzaria/Hamburgueria/Açaíteria/Sorveteria)
- Slogan (input)
- Logo (upload ou URL + preview)
- Cor principal (color picker)
- WhatsApp de contato

Seção Banners principais:
- 5 slots de banner — preview + trocar imagem (upload ou URL)

Seção Cards promocionais:
- 6 slots de promo card — preview + trocar

Seção Textos:
- Título principal | Subtítulo | Mensagem de boas-vindas | Horário de funcionamento

Botão "Publicar alterações" → POST {VITE_API_URL}/publish
Progress: Salvando → Renderizando → ✅ Site atualizado!

---

## PÁGINA: CONFIGURAÇÕES
- WhatsApp do negócio
- Endereço completo (rua, número, bairro, cidade, CEP)
- Raio de entrega (km)
- Taxa de entrega (R$ — pode ser grátis acima de X)
- Pedido mínimo (R$)
- Tempo estimado de entrega (minutos)
- Formas de pagamento: checkboxes (Dinheiro, PIX, Débito, Crédito, Vale-refeição)
- Se "Dinheiro": toggle "Aceita troco" + campo valor máximo de troco
- Modalidades: Entrega / Retirada (toggles independentes)
- Horário de funcionamento: grade dias × horários com toggle por dia
- Notificações: toggle som | toggle browser notification

---

## DESIGN TOKENS
- Background: #09090b | Surface: #18181b | Border: #27272a
- Primary: #f97316 (orange — cor do delivery/food)
- Accent: #ea580c
- Success: #22c55e | Warning: #f59e0b | Danger: #ef4444
- Kanban column new: borda laranja pulsante
- Radius: 8px | Font: Inter

## REGRAS TÉCNICAS
- TanStack Query: cache 30s, retry 2x, refetchInterval 15000 para dashboard (mais rápido pq é delivery)
- Socket.io: reconnectionDelay 1000, reconnectionAttempts infinito
- Erros 401 → logout + redirect /login
- Mutations invalidam queries relacionadas
- Skeleton loading em todas as páginas
- Sem mock data — tudo vai para VITE_API_URL real
- VITE_API_URL sem trailing slash
- Paginação: 20 itens por página
- Observação do cliente no pedido: sempre visível em destaque (caixa amarela)
```
