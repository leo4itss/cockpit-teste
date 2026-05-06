# Retrospectiva do Projeto — Cockpit ITSS
**Versão:** 1.0  
**Data:** 06/05/2026  
**Autor:** PO + Claude (IA)  
**Destinatário:** Equipe de desenvolvimento (handoff)

---

## Sumário

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Módulos Implementados](#2-módulos-implementados)
3. [Regras de Negócio Consolidadas](#3-regras-de-negócio-consolidadas)
4. [Decisões Pendentes](#4-decisões-pendentes)
5. [Alterações de Terminologia](#5-alterações-de-terminologia)
6. [Reversões e Mudanças de Decisão](#6-reversões-e-mudanças-de-decisão)
7. [Arquivos e Estrutura do Projeto](#7-arquivos-e-estrutura-do-projeto)
8. [O Que Ainda Não Foi Implementado](#8-o-que-ainda-não-foi-implementado)
9. [Glossário](#9-glossário)

---

## 1. Visão Geral do Produto

O **Cockpit ITSS** é uma plataforma de back-office para gestão comercial e operacional das organizações clientes do grupo ITSS. É usado internamente pelos arquitetos PAS para provisionar, configurar e acompanhar contratos, soluções tecnológicas e usuários de cada organização.

### Propósito central

Permitir que a equipe ITSS gerencie o ciclo de vida completo de uma organização cliente — desde o cadastro inicial, passando pela configuração de soluções e planos, até a formalização de contratos — em uma interface unificada.

### Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend API (dev) | Hono rodando em `server/index.ts` (Node.js) |
| Backend API (prod) | Hono adaptado para serverless Vercel (`api/index.ts`) |
| ORM | Drizzle ORM |
| Banco de dados | Neon PostgreSQL (serverless) |
| Hospedagem | Vercel |
| Design system | PRIZM (Figma) |

### Arquitetura de deployment

O projeto usa **dois arquivos de servidor paralelos** que precisam ser mantidos em sincronia:

- `server/index.ts` — servidor local para desenvolvimento (`npm run dev`)
- `api/index.ts` — handler serverless para produção na Vercel (funções `/api/*`)

> ⚠️ **Atenção:** toda alteração de regra de negócio ou endpoint no backend deve ser replicada nos dois arquivos. O esquecimento desta sincronia foi fonte de bugs no passado.

### Fallback de dados

O frontend sempre tenta a API real. Em caso de falha (ex.: preview Vercel sem backend ativo), cai automaticamente nos dados de `src/data/mock.ts`. Isso permite demonstrações offline mas pode mascarar erros de API em ambiente de preview.

---

## 2. Módulos Implementados

### 2.1 Organizações

**Página:** `OrganizacoesPage.tsx`  
**Detalhe:** `OrganizacaoDetailPage.tsx`  
**Sheets:** `NewOrganizationSheet.tsx`, `EditOrganizationSheet.tsx`

Entidade raiz do sistema. Representa uma empresa cliente contratante.

**Campos principais:**
- Nome, Razão Social, Tipo de documento (CNPJ/CPF/Outro), Número do documento
- Domínio, Segmento de negócio, Setor de atividade
- Endereço completo (País, Estado, Cidade, CEP, Endereço, Complemento)
- Site oficial, Arquiteto PAS responsável
- Status: `Ativo` | `Inativo`
- Contatos (lista de nome, cargo, telefone e e-mail)
- Contadores derivados: `qtdContas`, `qtdSolucoes`, `qtdContratos`

**Comportamento de criação:**  
Ao criar uma organização, o backend automaticamente cria uma **conta padrão** (`isDefault: true`) usando o nome e o domínio da organização. Caso a criação da conta falhe, a organização é removida (compensação manual, pois o Neon HTTP não suporta transações nativas).

**Listagem:**  
- Tabela com todas as organizações ativas
- Checkbox "Exibir organizações inativadas" — aparece habilitado apenas se houver registros inativos

**Inativação:**  
Organizações não são deletadas — são marcadas como `Inativo`. O ícone de ação na tabela alterna entre "Inativar" (lixeira âmbar) e "Ativar" (círculo verde) conforme o status atual.

**Exclusão permanente:**  
Existe endpoint `DELETE /api/organizations/:id`, mas ele verifica dependências bloqueantes: contas ativas ou contratos ativos. Se houver dependências, retorna `422`. A exclusão real faz cascata em contas, contratos e soluções da organização.

---

### 2.2 Contas

**Sheet:** `NewAccountSheet.tsx`, `EditAccountSheet.tsx`, `AccountDetailSheet.tsx`

Uma organização pode ter múltiplas contas. Cada conta representa uma unidade operacional ou tenant dentro da organização.

**Campos principais:**
- Nome, Razão Social, Tipo/Número de documento
- Subdomínio (utilizado para provisioning)
- Segmento de negócio, Site oficial
- Endereço completo, País
- Arquiteto PAS, Descrição, Logo
- Status: `Criado` | `Ativo` | `Inativo`
- Provisioning status: `PENDING` | `IN_PROGRESS` | `COMPLETED` | `FAILED`
- `isDefault` — indica se é a conta padrão criada automaticamente com a org
- `deletedAt` — campo de soft delete / quarentena

**Soft Delete (Quarentena):**  
Contas não são excluídas fisicamente. Ao "excluir" uma conta, o campo `deletedAt` é preenchido com o timestamp atual. A conta entra em **quarentena** e fica oculta na listagem padrão.

**Restauração:**  
Há endpoint `PATCH /api/accounts/:id/restaurar` que limpa o campo `deletedAt`, retirando a conta da quarentena.

**Filtro na listagem:**  
A API por padrão retorna apenas contas com `deletedAt IS NULL`. Para incluir contas em quarentena, passa o parâmetro `?include_deleted=true`.

**Provisioning:**  
O componente `ProvisioningDots.tsx` exibe um indicador visual animado do status de provisionamento. O status de provisioning não é atualizado automaticamente pelo sistema — integração com sistema externo ainda não implementada.

---

### 2.3 Soluções

**Sheet:** `NewSolutionSheet.tsx`, `EditSolutionSheet.tsx`, `SolutionDetailSheet.tsx`

Representa uma solução tecnológica oferecida pela ITSS a uma organização. Uma solução é composta por componentes e possui planos de licenciamento.

**Campos principais:**
- Nome da instância, Descrição
- Arquiteto PAS responsável
- Status: `Criado` | `Ativo` | `Inativo`
- Lista de Componentes vinculados (`componenteIds[]`)
- Lista de Planos
- Marketplace: ativo/inativo, Links 01 e 02 (com títulos), Status do marketplace

**Vínculo com Componentes:**  
Uma solução **deve ter ao menos 1 componente vinculado**. Essa regra é validada tanto no frontend (botão "Salvar" desabilitado) quanto no backend (retorna `422` se `componenteIds` for vazio).

**Seleção de componentes:**  
- Se há ≤ 5 componentes cadastrados: seletor inline multi-select (`ComponenteSelector.tsx`)
- Se há > 5 componentes: botão que abre sheet de seleção (`ComponenteSelecaoSheet.tsx`) com chips para os selecionados

**Marketplace:**  
Toggle para ativar. Quando ativado, exige preenchimento de Link 01, Título do Link 01, Link 02, Título do Link 02 e Status do marketplace. Todos obrigatórios enquanto o toggle estiver ativo.

**Exclusão:**  
Não é permitida se a solução estiver vinculada a contratos. O backend verifica nos objetos de contrato se algum referencia o nome da solução. Se houver, retorna `422` com `error: 'linked_to_contracts'`. O frontend exibe mensagem orientando a inativar ao invés de excluir.

---

### 2.4 Componentes

**Página:** `ComponentesPage.tsx`  
**Sheet:** `ComponenteSheet.tsx`, `ComponenteDetailSheet.tsx`

Componentes são módulos ou serviços que compõem uma solução. São entidades globais (não vinculadas a uma organização específica) e são reutilizáveis entre soluções.

**Campos principais:**
- Nome, Descrição
- URL de Metadata (opcional)
- Tipos de Licença vinculados (lista de IDs)

**URL de Metadata:**  
Endpoint externo que o sistema pode consultar (via `POST /api/componentes/validate-metadata`) para obter dinamicamente os tipos de licença disponíveis para aquele componente. O retorno esperado:

```json
{
  "componentId": "string",
  "name": "string",
  "version": "string",
  "tiposLicenca": [
    { "id": "string", "nome": "string", "unidade": "string" }
  ]
}
```

A validação verifica a presença de `tiposLicenca` como array não-vazio.

---

### 2.5 Tipos de Licença

Entidade independente que descreve uma dimensão de licenciamento (ex.: "Usuário nominal", "Tamanho de banco de dados", "Tokens de IA").

**Campos:** Nome, Descrição, Unidade (ex: "usuários", "GB", "unidades", "tokens")

Não são enums fixos no código — são cadastrados no banco e referenciados pelo `id`. Isso permite extensibilidade sem alterar o código.

---

### 2.6 Planos

Planos são definidos dentro de uma Solução e não existem como entidade independente.

**Campos do Plan:**
- Nome, Descrição
- Lista de Licensings (licenciamentos)

**Campos de Licensing:**
- `tipoLicencaId` — FK para TipoLicenca
- `tipoLicencaNome`, `tipoLicencaUnidade` — denormalizados para exibição
- `valorMinimo`, `valorMaximo` — limites de quantidade (opcional)
- `valor` — valor livre por licença
- `definirPreco` — boolean
- `precoAnual`, `descontoMensal`, `precoMes`

**Versionamento de Planos (PlanoVersao):**  
Ao editar uma solução, o backend aplica versionamento automático nos planos:

- Planos **novos** recebem `versao: 1`, `statusVersao: 'ativo'`, `criadoEm: now`
- Planos **alterados** têm a versão atual marcada como `statusVersao: 'inativo'` e uma nova versão é criada com o número incrementado
- Planos **removidos** (não enviados pelo frontend) são marcados como `statusVersao: 'inativo'` — nunca excluídos
- O histórico de versões inativas é preservado indefinidamente no campo `plans` da solução (JSONB)

O frontend exibe apenas os planos com `statusVersao: 'ativo'` (ou sem esse campo).

---

### 2.7 Contratos

**Sheet:** `NewContractSheet.tsx`, `EditContractSheet.tsx`, `ContractDetailSheet.tsx`

Formaliza o vínculo comercial entre uma organização contratante e as soluções/planos adquiridos.

**Campos principais:**
- Conta contratante (dropdown com contas ativas da organização)
- Objetos do contrato (lista de `ObjetoContrato`)
- Data de início, Data de término
- Tipo de renovação: `Automática` | `Manual` | `Anual`
- Status: `Ativo` | `Inativo` | `Pendente`

**Objeto de Contrato (`ObjetoContrato`):**  
Cada objeto define uma combinação de:
- Solução (nome)
- Organização contratada
- Plano (nome)
- Licenciamento (tipo)
- Quantidade contratada
- `planoVersao` — número da versão do plano vigente no momento da assinatura

**Regras:**
- Um contrato deve ter ao menos 1 objeto
- A quantidade contratada é editável diretamente na listagem de objetos (campo `<Input type="number">`)
- Contratos inativos ficam em modo somente-leitura (todos os campos desabilitados, botão "Salvar" oculto)
- Contratos inativos têm botão "Ativar contrato" no footer do sheet

---

### 2.8 Usuários / Acessos

**Página:** `AcessosPage.tsx`  
**Sheet:** `NewUserSheet.tsx`, `EditUserSheet.tsx`, `UserDetailSheet.tsx`

Gestão de usuários com acesso ao cockpit.

**Campos principais:**
- Nome completo, Nome de usuário (único), E-mail (único), Senha
- País, Telefone, Área, Cargo, Papel
- Etiquetas, Formato de data, Formato de hora, Fuso horário
- Status: `Ativo` | `Inativo`
- Último acesso, Avatar

> ⚠️ Autenticação real ainda não implementada. O módulo de usuários existe como CRUD mas não está integrado a nenhum sistema de auth/SSO.

---

## 3. Regras de Negócio Consolidadas

### Organizações
| # | Regra |
|---|-------|
| RN-01 | Toda organização criada gera automaticamente uma conta padrão (`isDefault: true`) com o mesmo nome e domínio |
| RN-02 | Se a criação da conta padrão falhar, a organização é removida (rollback por compensação) |
| RN-03 | Organização com contas ativas ou contratos ativos não pode ser excluída |
| RN-04 | Organizações são inativadas (soft), não excluídas, exceto via exclusão explícita sem dependências |
| RN-05 | A exclusão de uma organização faz cascata em contas, contratos e soluções vinculados |

### Contas
| # | Regra |
|---|-------|
| RN-06 | Contas são soft-deletadas via campo `deletedAt` (quarentena) |
| RN-07 | A API oculta contas em quarentena por padrão; `?include_deleted=true` as inclui |
| RN-08 | Contas em quarentena podem ser restauradas via `PATCH /restaurar` |
| RN-09 | A conta padrão (`isDefault`) é criada automaticamente e não pode ser criada manualmente |

### Soluções
| # | Regra |
|---|-------|
| RN-10 | Uma solução deve ter ao menos 1 componente vinculado (validado em frontend e backend) |
| RN-11 | Soluções vinculadas a contratos não podem ser excluídas — devem ser inativadas |
| RN-12 | O vínculo entre solução e contratos é verificado pelo nome da solução (não por ID) |
| RN-13 | Quando marketplace está ativo, todos os 4 campos de link (Link01, Título01, Link02, Título02) são obrigatórios |

### Planos (Versionamento)
| # | Regra |
|---|-------|
| RN-14 | Planos novos recebem versão 1 |
| RN-15 | Planos alterados têm a versão atual marcada como inativa e uma nova versão é criada |
| RN-16 | Planos removidos pelo usuário são marcados como inativos — nunca excluídos |
| RN-17 | O frontend exibe apenas planos com `statusVersao: 'ativo'` (ou ausente) |
| RN-18 | O histórico completo de versões é preservado no banco em formato JSONB |

### Contratos
| # | Regra |
|---|-------|
| RN-19 | Um contrato deve ter ao menos 1 objeto |
| RN-20 | Contratos inativos são somente leitura — não é possível salvar edições |
| RN-21 | Contratos inativos exibem botão "Ativar contrato" no lugar de "Salvar" |
| RN-22 | O objeto de contrato registra a versão do plano no momento da assinatura (`planoVersao`) |
| RN-23 | Novos contratos são criados com status `Ativo` |

### Tipos de Licença e Componentes
| # | Regra |
|---|-------|
| RN-24 | Tipos de licença são entidades cadastradas — não são enums fixos no código |
| RN-25 | Os tipos de licença disponíveis para um plano dependem dos componentes selecionados para a solução |
| RN-26 | Se nenhum componente estiver selecionado, todos os tipos de licença ficam disponíveis |
| RN-27 | A URL de metadata de um componente deve retornar um objeto com `tiposLicenca` como array não-vazio |

---

## 4. Decisões Pendentes

| # | Tema | Descrição | Impacto |
|---|------|-----------|---------|
| DP-01 | Autenticação | Nenhum sistema de autenticação foi implementado. O módulo de usuários existe como CRUD mas não está conectado a SSO, JWT ou qualquer mecanismo de sessão | Alto — sem auth, qualquer pessoa com a URL tem acesso |
| DP-02 | Provisioning real | O status de provisionamento de contas (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`) é definido manualmente. Não há integração com sistema externo de provisionamento | Alto |
| DP-03 | Upload de ícone/logo | O botão "Escolher imagem" nas sheets de solução e conta existe na UI mas não persiste nada. O campo `logo` existe no schema mas o fluxo de upload não foi implementado | Médio |
| DP-04 | Arquiteto PAS | O campo "Arquiteto PAS responsável" é uma lista fixa hardcoded no frontend (`marcelo` e `ana`). Precisa ser um cadastro dinâmico ou integrado ao módulo de usuários | Médio |
| DP-05 | Página de Marketplace | A aba "Marketplace" existe na `OrganizacaoDetailPage` mas seu conteúdo não foi implementado | Médio |
| DP-06 | Etiquetas de usuário | O campo `etiquetas` existe no schema e na UI mas não há sistema de gerenciamento de etiquetas definido | Baixo |
| DP-07 | Contadores derivados | `qtdContas`, `qtdSolucoes` e `qtdContratos` na entidade Organization são campos persistidos no banco, não calculados dinamicamente. Podem ficar desatualizados se não houver trigger ou atualização manual | Alto |
| DP-08 | Relatórios e dashboards | A HomePage existe mas não tem conteúdo de dashboard implementado | Baixo |

---

## 5. Alterações de Terminologia

Ao longo do projeto, alguns termos foram redefinidos. A tabela abaixo documenta as mudanças para evitar confusão:

| Termo antigo / inicial | Termo atual | Contexto |
|------------------------|-------------|---------|
| "Conta" (no sentido de organização) | **Organização** | A entidade principal é "Organização"; "Conta" agora é uma subentidade de organização |
| "Subdomínio" | **Subdomínio** | Mantido, mas refere-se ao campo da _conta_, não da organização |
| "Versão do contrato" / ContractVersion | *(removido)* | Ver seção 6 |
| "Versão do plano" | **PlanoVersao** | Campo dentro do objeto `Plan`: `versao`, `statusVersao`, `criadoEm` |
| "Excluir conta" | **Quarentena** (soft delete) | Contas "excluídas" entram em quarentena via `deletedAt`; não são removidas do banco |
| "Tipo de licença" | **TipoLicenca** | Entidade independente — antes era tratado como enum fixo |
| "Módulo" | **Componente** | Módulos/serviços que compõem uma solução passaram a ser chamados de Componentes |
| "Objeto do contrato" | **ObjetoContrato** | Combinação de solução + plano + licenciamento + qtd dentro de um contrato |

---

## 6. Reversões e Mudanças de Decisão

### 6.1 Remoção de ContractVersion

**Decisão original:** Contratos teriam versões formalizadas (entidade `ContractVersion`) com campos como número de versão, data de assinatura e histórico de alterações.

**Decisão revertida:** A entidade `ContractVersion` foi **completamente removida** do sistema.

**O que foi removido:**
- Tabela `contract_versions` do schema Drizzle (`server/schema.ts`)
- Todos os endpoints REST relacionados (`GET/POST/PUT/DELETE /api/contracts/:id/versions`)
- Tipo TypeScript `ContractVersion` de `src/types/index.ts`
- UI de listagem/criação de versões em `ContractDetailSheet.tsx`
- Commit: `4a62c97 Remove ContractVersion — tabela, schema, tipos, endpoints e UI`

**Motivo:** A complexidade operacional de gerenciar versões de contratos foi considerada prematura para o estágio atual do produto.

**O que foi mantido como alternativa:** O versionamento de _planos_ dentro de soluções continua existindo (PlanoVersao — ver RN-14 a RN-18). Contratos em si não têm versionamento.

---

### 6.2 Padronização Visual dos Callouts

**Decisão original:** Callouts informativos nas sheets usavam estilos variados (fundo cinza, texto cinza, ícone pequeno).

**Decisão atual:** Todos os callouts seguem o padrão único derivado do Design System PRIZM:

```jsx
<div className="flex items-center gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
  <CircleAlert className="w-5 h-5 text-blue-700 shrink-0" />
  <p className="text-sm font-medium text-blue-700 leading-5">...</p>
</div>
```

**Sheets atualizadas:**
- `NewOrganizationSheet.tsx`
- `NewSolutionSheet.tsx` (via componente `InfoBox`)
- `EditSolutionSheet.tsx`
- `NewContractSheet.tsx`
- `EditContractSheet.tsx`

---

### 6.3 Validação de Componente Mínimo

**Decisão original:** Uma solução poderia ser criada sem componentes vinculados.

**Decisão atual:** Mínimo de 1 componente obrigatório, validado em frontend (botão desabilitado) e backend (HTTP 422).

---

## 7. Arquivos e Estrutura do Projeto

```
cockpit-teste-prod/
├── api/
│   └── index.ts              # Handler serverless para Vercel (produção)
│
├── server/
│   ├── db.ts                 # Conexão com Neon PostgreSQL via Drizzle
│   ├── index.ts              # Servidor Hono local (desenvolvimento)
│   ├── schema.ts             # Schema do banco — tabelas Drizzle ORM
│   └── seed.ts               # Dados de seed para desenvolvimento
│
├── src/
│   ├── api/
│   │   └── client.ts         # Funções de acesso à API REST (fetch wrapper)
│   │
│   ├── components/
│   │   ├── ui/               # Componentes base do Design System
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Popover.tsx
│   │   │   ├── ProfileModal.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── SettingsMenu.tsx
│   │   │   ├── Sheet.tsx     # Painel lateral deslizante (base)
│   │   │   └── AppsMenu.tsx
│   │   │
│   │   ├── AccountDetailSheet.tsx      # Detalhe de conta (leitura)
│   │   ├── AddAdminDialog.tsx
│   │   ├── AddContatoDialog.tsx        # Adicionar contato à organização
│   │   ├── AddObjetoDialog.tsx         # Adicionar objeto ao contrato
│   │   ├── ComponenteDetailSheet.tsx   # Detalhe de componente
│   │   ├── ComponenteSelecaoSheet.tsx  # Sheet de seleção de componentes (> 5)
│   │   ├── ComponenteSelector.tsx      # Seletor inline de componentes (≤ 5)
│   │   ├── ComponenteSheet.tsx         # Criar/editar componente
│   │   ├── ConfirmDeleteModal.tsx      # Modal de confirmação genérico
│   │   ├── ContractDetailSheet.tsx     # Detalhe de contrato (leitura)
│   │   ├── DetailLayout.tsx            # Layout base para páginas de detalhe
│   │   ├── EditAccountSheet.tsx        # Editar conta
│   │   ├── EditContractSheet.tsx       # Editar contrato
│   │   ├── EditOrganizationSheet.tsx   # Editar organização
│   │   ├── EditSolutionSheet.tsx       # Editar solução
│   │   ├── EditUserSheet.tsx           # Editar usuário
│   │   ├── EtiquetaDialog.tsx          # Gerenciar etiquetas de usuário
│   │   ├── Layout.tsx                  # Layout global com sidebar
│   │   ├── MetadataUrlInput.tsx        # Input com validação de URL de metadata
│   │   ├── NewAccountSheet.tsx         # Criar conta
│   │   ├── NewContactDialog.tsx        # Criar contato (dialog)
│   │   ├── NewContractSheet.tsx        # Criar contrato
│   │   ├── NewOrganizationSheet.tsx    # Criar organização
│   │   ├── NewPlanDialog.tsx           # Criar plano (dialog dentro de solução)
│   │   ├── NewSolutionSheet.tsx        # Criar solução
│   │   ├── NewUserSheet.tsx            # Criar usuário
│   │   ├── PlanCard.tsx                # Card de exibição de plano
│   │   ├── ProvisioningDots.tsx        # Indicador visual de status de provisioning
│   │   ├── Sidebar.tsx                 # Navegação lateral
│   │   ├── SolutionDetailSheet.tsx     # Detalhe de solução (leitura)
│   │   ├── TopBar.tsx                  # Barra superior
│   │   └── UserDetailSheet.tsx         # Detalhe de usuário
│   │
│   ├── context/
│   │   └── ComponentesContext.tsx      # Context global para lista de componentes
│   │
│   ├── data/
│   │   └── mock.ts                     # Dados mock para fallback offline
│   │
│   ├── pages/
│   │   ├── AcessosPage.tsx             # Gestão de usuários / acessos
│   │   ├── ComponentesPage.tsx         # Gestão de componentes globais
│   │   ├── HomePage.tsx                # Dashboard (sem conteúdo implementado)
│   │   ├── OrganizacaoDetailPage.tsx   # Detalhe de organização (tabs: conta, soluções, contrato, marketplace)
│   │   └── OrganizacoesPage.tsx        # Listagem de organizações
│   │
│   └── types/
│       └── index.ts                    # Todos os tipos TypeScript do projeto
│
├── RETROSPECTIVA.md          # Este documento
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── drizzle.config.ts
```

### Tabelas no banco de dados

| Tabela | Entidade |
|--------|---------|
| `organizations` | Organizações |
| `accounts` | Contas |
| `solutions` | Soluções (inclui planos como JSONB) |
| `contracts` | Contratos (inclui objetos como JSONB) |
| `users` | Usuários |
| `componentes` | Componentes |
| `tipos_licenca` | Tipos de Licença |

### Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/organizations` | Listar organizações |
| GET | `/api/organizations/:id` | Buscar organização |
| POST | `/api/organizations` | Criar organização (+ conta padrão) |
| PUT | `/api/organizations/:id` | Atualizar organização |
| DELETE | `/api/organizations/:id` | Excluir organização (verifica dependências) |
| GET | `/api/accounts?orgId=&include_deleted=` | Listar contas |
| GET | `/api/accounts/:id` | Buscar conta |
| POST | `/api/accounts` | Criar conta |
| PUT | `/api/accounts/:id` | Atualizar conta |
| DELETE | `/api/accounts/:id` | Soft delete (quarentena) |
| PATCH | `/api/accounts/:id/restaurar` | Restaurar conta da quarentena |
| GET | `/api/solutions?orgId=` | Listar soluções |
| GET | `/api/solutions/:id` | Buscar solução |
| POST | `/api/solutions` | Criar solução |
| PUT | `/api/solutions/:id` | Atualizar solução (com versionamento de planos) |
| DELETE | `/api/solutions/:id` | Excluir solução (verifica contratos) |
| GET | `/api/contracts?orgId=` | Listar contratos |
| GET | `/api/contracts/:id` | Buscar contrato |
| POST | `/api/contracts` | Criar contrato |
| PUT | `/api/contracts/:id` | Atualizar contrato |
| DELETE | `/api/contracts/:id` | Excluir contrato |
| GET | `/api/users` | Listar usuários |
| GET | `/api/users/:id` | Buscar usuário |
| POST | `/api/users` | Criar usuário |
| PUT | `/api/users/:id` | Atualizar usuário |
| DELETE | `/api/users/:id` | Excluir usuário |
| GET | `/api/tipos-licenca` | Listar tipos de licença |
| POST | `/api/tipos-licenca` | Criar tipo de licença |
| PUT | `/api/tipos-licenca/:id` | Atualizar tipo de licença |
| DELETE | `/api/tipos-licenca/:id` | Excluir tipo de licença |
| GET | `/api/componentes` | Listar componentes |
| POST | `/api/componentes` | Criar componente |
| PUT | `/api/componentes/:id` | Atualizar componente |
| DELETE | `/api/componentes/:id` | Excluir componente |
| POST | `/api/componentes/validate-metadata` | Validar URL de metadata |

---

## 8. O Que Ainda Não Foi Implementado

### 8.1 Funcionalidades de produto

| # | Feature | Prioridade estimada |
|---|---------|---------------------|
| F-01 | **Autenticação e autorização** — login, sessão, controle de acesso por papel | 🔴 Crítico |
| F-02 | **Integração de provisioning** — status real de criação de conta no sistema externo | 🔴 Crítico |
| F-03 | **Dashboard (HomePage)** — métricas, indicadores, KPIs | 🟡 Médio |
| F-04 | **Aba Marketplace** na página de detalhe da organização | 🟡 Médio |
| F-05 | **Upload de imagens** — logo de conta e ícone de solução | 🟡 Médio |
| F-06 | **Cadastro dinâmico de Arquitetos PAS** — hoje é lista hardcoded no frontend | 🟡 Médio |
| F-07 | **Paginação e busca** nas listagens (organizações, usuários, etc.) | 🟡 Médio |
| F-08 | **Contadores derivados sincronizados** — `qtdContas`, `qtdSolucoes`, `qtdContratos` | 🟡 Médio |
| F-09 | **Gestão de etiquetas** de usuário | 🟢 Baixo |
| F-10 | **Exportação de dados** (contratos, soluções, etc.) | 🟢 Baixo |
| F-11 | **Histórico de auditoria** — log de quem alterou o quê e quando | 🟢 Baixo |
| F-12 | **Notificações de vencimento de contratos** | 🟢 Baixo |

### 8.2 Débitos técnicos

| # | Débito | Descrição |
|---|--------|-----------|
| DT-01 | **Sincronização server/api** — duplicação manual | Toda alteração de backend deve ser replicada em `server/index.ts` e `api/index.ts`. Risco de divergência. Considerar refactoring para um arquivo compartilhado. |
| DT-02 | **Tipagem fraca na API** — uso de `any` | O `client.ts` usa `any` em todos os retornos. Adicionar tipos explícitos nas funções da API. |
| DT-03 | **Contadores de org não-calculados** | `qtdContas`, `qtdSolucoes`, `qtdContratos` são persistidos manualmente. Não há garantia de consistência. Considerar views ou triggers no banco. |
| DT-04 | **Dados mock como fallback** | O fallback para `mock.ts` em caso de erro de API pode mascarar bugs reais em ambientes de preview. Adicionar diferenciação clara entre dev/prod. |
| DT-05 | **Sem testes automatizados** | Nenhum teste unitário, de integração ou E2E foi escrito no projeto. |

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| **Arquiteto PAS** | Profissional da ITSS responsável por uma organização ou solução. Campo presente em organizações, contas e soluções. |
| **Cockpit** | Nome do produto — painel de controle interno da ITSS para gestão de clientes. |
| **Componente** | Módulo ou serviço tecnológico que compõe uma Solução. Entidade global, reutilizável. Possui lista de Tipos de Licença que suporta. |
| **Conta** | Subentidade de uma Organização. Representa um tenant ou unidade operacional. Possui subdomínio para provisionamento. |
| **Conta padrão** | Conta criada automaticamente junto com a organização, com `isDefault: true`. |
| **ContractVersion** | Entidade que existia para versionar contratos. **REMOVIDA** do projeto (ver seção 6.1). |
| **Contratante** | Conta (dentro de uma organização) que assina um contrato. Selecionada no momento da criação do contrato. |
| **Drizzle ORM** | ORM TypeScript usado para interagir com o banco PostgreSQL. Schema definido em `server/schema.ts`. |
| **Hono** | Framework web minimalista para Node.js/serverless. Usado no backend. |
| **isDefault** | Campo booleano em `Account` que indica se é a conta padrão da organização. |
| **Licenciamento** | Uma configuração de licença dentro de um Plano — define tipo de licença, limites e preços. |
| **Marketplace** | Funcionalidade opcional de uma Solução que expõe links externos para aquisição/visualização. |
| **Neon PostgreSQL** | Banco de dados serverless PostgreSQL usado em produção. Não suporta transações nativas via HTTP driver. |
| **ObjetoContrato** | Item dentro de um Contrato — combina Solução + Plano + Licenciamento + Organização contratada + Quantidade. |
| **Organização** | Entidade principal — empresa cliente contratante. Contém Contas, Soluções e Contratos. |
| **Plano** | Configuração de produto dentro de uma Solução. Define nome, descrição e licenciamentos disponíveis. |
| **PlanoVersao** | Sistema de versionamento automático de planos. Cada alteração de conteúdo cria uma nova versão numerada. |
| **PRIZM** | Design System da ITSS no Figma. Usado como referência visual para todos os componentes de UI. |
| **Provisioning** | Processo de criação/ativação de uma conta no sistema externo. Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` / `FAILED`. |
| **Quarentena** | Estado de uma conta após "exclusão" — `deletedAt` preenchido, mas registro preservado no banco. Pode ser restaurada. |
| **Soft delete** | Exclusão lógica — o registro não é removido do banco, apenas marcado como excluído (via `deletedAt`). |
| **statusVersao** | Campo em `Plan`: `'ativo'` = versão vigente, `'inativo'` = versão histórica. |
| **TipoLicenca** | Entidade que define uma dimensão de licenciamento (ex: "Usuários", "GB de armazenamento"). Cadastrada no banco, não hardcoded. |
| **Vercel** | Plataforma de hospedagem. O backend roda como Serverless Functions em `api/index.ts`. |

---

*Documento gerado em 06/05/2026. Para dúvidas, consulte o PO do projeto.*
