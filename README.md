# 🔥 ForgeSites AI

Gerador automático de materiais de venda para negócios locais.

## O que faz

Lê uma planilha CSV com leads → processa cada um → gera via IA:
- **Prompt completo para Lovable** (criação de site)
- **Headline e diferenciais**
- **Script de abordagem para WhatsApp**
- **Script de áudio de 20 segundos**

## Instalação

```bash
# 1. Clone / copie o projeto
cd forgesites-ai

# 2. Instale dependências
npm install

# 3. Configure a chave da OpenAI
cp .env.example .env
# Edite .env e coloque sua OPENAI_API_KEY
```

## Uso

```bash
# Processa o arquivo padrão: input/leads.csv
node index.js

# Processa um arquivo específico
node index.js input/clinicas-sp.csv
```

## Estrutura do CSV

O CSV deve ter as colunas (em qualquer ordem):

| Coluna | Descrição |
|--------|-----------|
| `Nome` | Nome da empresa (pode ter `|` como separador) |
| `Categoria` | Tipo de negócio (pode ter múltiplos separados por `;`) |
| `Classificação` | Nota no Google (ex: `4.7`) |
| `Avaliações` | Número de avaliações (ex: `1170`) |
| `Sites` | URL do site (deixe vazio se não tiver) |
| `Redes sociais` | Links de redes sociais |
| `Telefone` | Telefone da empresa |
| `Bairro` | Bairro |
| `Cidade` | Cidade |

## Resultado

Para cada lead, é criada uma pasta em `/output/`:

```
output/
  ├── 021-dental/
  │   ├── result.txt   ← materiais prontos para usar
  │   └── data.json    ← dados brutos (para debug/reprocessamento)
  ├── sorriso-perfeito-implantes/
  │   ├── result.txt
  │   └── data.json
  └── _relatorio.txt   ← resumo geral da execução
```

## Custos estimados (OpenAI gpt-4o-mini)

- ~1.500 tokens por lead (entrada + saída)
- ~$0.0003 por lead
- 100 leads ≈ $0.03 centavos de dólar

## Configurações avançadas (.env)

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # ou gpt-4o para mais qualidade
```

## Nichos suportados (inferência automática)

- 🦷 Clínica Odontológica
- 🏥 Clínica Médica
- 💪 Fisioterapia
- ✂️ Barbearia / Salão de Beleza
- ✨ Clínica de Estética
- 🍕 Restaurantes / Alimentação
- ⚖️ Advocacia / Contabilidade
- 🏠 Imobiliária
- 🏋️ Academia / Fitness
- ... e muito mais
