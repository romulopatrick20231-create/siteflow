# Admin — Configuração de Agentes IA + WhatsApp (Lovable Prompt Complementar)

```
Adicione ao painel admin existente uma seção completa de configuração de Agentes IA e WhatsApp por cliente/loja.
Esta seção fica em: Admin → Configurações do Cliente → Agente & WhatsApp.

Stack: React + TypeScript + Tailwind + shadcn/ui + TanStack Query.
Base URL: VITE_API_URL. Authorization: Bearer {token} em todas as chamadas.

---

## PÁGINA: /admin/clientes/:storeId/agente

Sheet ou página dedicada por cliente. Dividida em 3 abas:
[🔌 WhatsApp] [🤖 Agente IA] [🔄 Follow-up]

---

## ABA: 🔌 WhatsApp

### Seleção de provedor (dropdown visual)
Select estilizado com ícone + nome + descrição:
- **Whapi** — "Não oficial · Simples · Recomendado"
- **Evolution API** — "Não oficial · Self-hosted · Avançado"
- **Z-API** — "Não oficial · Fácil de usar"
- **API Oficial Meta (WABA)** — "Oficial · Requer aprovação Meta"

Ao selecionar o provedor, o formulário abaixo muda dinamicamente com os campos corretos
(buscar campos em GET {VITE_API_URL}/agent-config/provider-fields).

### Campos dinâmicos por provedor:

**Whapi:**
- Token (input password) — "Cole o token gerado no painel Whapi"
- Base URL (input text, placeholder: https://gate.whapi.cloud) — opcional

**Evolution API:**
- URL do servidor (input text) — "Ex: https://api.meuevo.com"
- API Key (input password)
- Nome da instância (input text)

**Z-API:**
- Instance ID (input text)
- Token (input password)
- Client Token (input password)

**API Oficial Meta:**
- Phone Number ID (input text)
- Access Token (input password)
- Verify Token (input text) — "Token para verificar o webhook"

Campos de senha: mostrar/ocultar com botão olho. Campos mascarados ao carregar (ex: "sk-12••••••••").

### URL do Webhook (read-only):
Exibir caixa read-only com botão "Copiar":
`{VITE_API_URL}/whatsapp/webhook/{storeId}`
Label: "Configure esta URL como webhook no painel do seu provedor"

### Número do WhatsApp da loja:
- Input: "+55 (11) 99999-9999" com máscara

### Botão "🔌 Testar conexão":
- POST {VITE_API_URL}/agent-config/stores/{storeId}/test-message
- Body: { phone: "{número da loja}", message: "✅ Teste de conexão ZapFlow — funcionando!" }
- Feedback: toast verde "Mensagem enviada!" ou toast vermelho com o erro exato da API

### Salvar: PUT {VITE_API_URL}/agent-config/stores/{storeId}/whatsapp

---

## ABA: 🤖 Agente IA

### Toggle "Agente IA ativo":
Switch grande. Se OFF: loja não responde automaticamente via IA.

### Tipo do estabelecimento:
Select:
- 💊 Farmácia
- 🍕 Pizzaria
- 🍔 Hamburgueria
- 🍧 Açaíteria
- 🍦 Sorveteria
- 🏪 Genérico

Label: "Define o tom e o conhecimento base do agente"

### Modelo de IA:
Select estilizado com custo estimado por mensagem:
- **GPT-4o Mini** — "~R$0,001/msg · Rápido · Recomendado"
- **GPT-4o** — "~R$0,02/msg · Mais inteligente"
- **GPT-4 Turbo** — "~R$0,04/msg · Máxima capacidade"
- **GPT-3.5 Turbo** — "~R$0,0002/msg · Econômico"

### Nome/Persona do agente:
Input — "Como o agente se apresenta"
Placeholder: "Ex: Mariana da FarmaVida | Pedro da Pizzaria Dom Luigi"

### Criatividade (temperatura):
Slider 0.0 → 1.0 com labels:
- 0.0: "Preciso e consistente"
- 0.5: "Equilibrado" (default)
- 0.85: "Natural e variado" ← padrão recomendado
- 1.0: "Muito criativo"

### System Prompt (o coração do agente):
Textarea grande (mínimo 300px de altura), monospace, com:
- Label: "Instruções do agente — escreva como o agente deve se comportar, o que sabe, como falar"
- Placeholder de exemplo baseado no tipo selecionado (atualiza ao mudar tipo):
  Farmácia: "Você é Mariana, atendente da FarmaVida. Atende com cuidado e empatia. Conhece bem o catálogo de medicamentos e suplementos. Sempre pergunta o que o cliente já tentou antes de sugerir algo. Tom: profissional, acolhedor."
  Pizzaria: "Você é Pedro, atendente da Pizzaria Dom Luigi. Ama pizza e passa esse entusiasmo. Ao pedir, confirma sabor, tamanho, borda e adicionais. Sugere as mais pedidas quando o cliente estiver indeciso."
- Contador de caracteres: "342 / 2000"
- Botão "✨ Sugerir prompt com IA" → POST {VITE_API_URL}/ai/suggest-prompt com { store_type, store_name } → preenche o textarea

### Preview do prompt final:
Acordeão colapsável "Ver prompt completo que será enviado à IA":
- Exibe: [system prompt digitado] + [catálogo injetado automaticamente] + [regras fixas do sistema]
- Fundo cinza escuro, fonte mono, leitura apenas

### Salvar: PUT {VITE_API_URL}/agent-config/stores/{storeId}/agent

---

## ABA: 🔄 Follow-up

Toggle "Follow-up automático ativo".

Se ativo, mostrar:

Label: "Quando o cliente para de responder, o sistema envia mensagens automáticas nos horários abaixo."

### Builder de regras (lista dinâmica):

Cada regra tem:
- **Aguardar**: input número + select (minutos / horas / dias) — ex: "1 hora"
- **Mensagem**: textarea com sugestão baseada no tipo da loja
  Farmácia: "Oi! Ainda posso te ajudar com alguma coisa? Estamos aqui 💊"
  Pizzaria: "Ei, sumiu! 🍕 Ainda tá com fome? Nossa cozinha tá esperando!"
  Hamburgueria: "Fala, sumido(a)! 🍔 Aquele hambúrguer ainda tá te chamando hein"
  Genérico: "Oi! Ainda posso te ajudar com alguma coisa? 😊"
- Botão 🗑 remover regra

Botão "+ Adicionar passo" (máx 3 regras).

Nota informativa: "Se o cliente responder, a sequência é cancelada automaticamente."

### Salvar: PUT {VITE_API_URL}/agent-config/stores/{storeId}/followup

---

## LISTAGEM DE CLIENTES (atualização na tabela existente)

Na tabela de clientes/lojas do admin, adicionar coluna "Agente":
- Badge: "🟢 Ativo" (verde) | "⚪ Inativo" (cinza) | "⚠️ Sem WhatsApp" (amarelo)
- Ícone de provedor ao lado: logotipo pequeno (Whapi/Evolution/Z-API/Meta)
- Botão "⚙️ Configurar" → abre a sheet de configuração

---

## CRM POR CLIENTE (nova aba na sheet do cliente)

Aba "👥 Clientes WhatsApp":
Tabela: Telefone | Nome | Status (Novo/Ativo/Inativo/VIP) | Última conversa | Total msgs | Ações

Status badges:
- 🆕 Novo (verde claro)
- 🔄 Ativo (azul)
- 😴 Inativo (cinza)
- 👑 VIP (dourado)

Ao clicar → drawer: histórico de conversas + notas

GET {VITE_API_URL}/agent-config/stores/{storeId}/crm

---

## DESIGN
- Seguir design system do painel admin existente (dark mode, emerald/orange primary)
- Campos de senha: sempre mascarados, botão olho para revelar
- Toasts para todas as ações (salvo, erro, testado)
- Skeleton loading nas abas
- Confirmação ao sair com mudanças não salvas: "Você tem alterações não salvas. Deseja sair mesmo assim?"
```
