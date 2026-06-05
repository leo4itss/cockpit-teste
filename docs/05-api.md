# Referência da API REST

Todos os endpoints são prefixados com `/api`. Em desenvolvimento, o Vite proxeia `/api/*` para `http://localhost:3001`. Em produção, as requisições vão para a Vercel Edge Function em `api/index.ts`.

> **Nota:** `server/index.ts` (dev) e `api/index.ts` (prod) devem estar sempre sincronizados.

---

## Organizações

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/organizations` | Lista todas as organizações |
| `GET` | `/api/organizations/:id` | Retorna uma organização por ID |
| `POST` | `/api/organizations` | Cria organização + conta padrão (compensating transaction) |
| `PUT` | `/api/organizations/:id` | Atualiza organização |
| `DELETE` | `/api/organizations/:id` | Deleta organização (verifica dependências ativas — retorna 422 se houver contas ou contratos ativos) |

**POST /api/organizations** — body:
```json
{
  "id": "uuid",
  "name": "Nome da Org",
  "docType": "CNPJ",
  "docNumber": "00.000.000/0001-00",
  "domain": "empresa.com.br",
  "activitySector": "Tecnologia",
  "country": "Brasil",
  "state": "SP",
  "city": "São Paulo",
  "arquitetoPAS": "Nome do Arquiteto",
  "status": "Ativo"
}
```

> **Importante:** `POST /api/organizations` automaticamente cria uma conta padrão vinculada à org. Se a criação da conta falhar, a org é deletada (compensação manual — Neon não suporta transações).

---

## Contas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/accounts` | Lista contas. Query: `?orgId=` filtra por org; `?include_deleted=true` inclui quarentenadas |
| `GET` | `/api/accounts/:id` | Retorna uma conta por ID |
| `POST` | `/api/accounts` | Cria conta |
| `PUT` | `/api/accounts/:id` | Atualiza conta |
| `DELETE` | `/api/accounts/:id` | **Soft-delete** — preenche `deletedAt` (quarentena) |
| `PATCH` | `/api/accounts/:id/restaurar` | Restaura conta em quarentena (limpa `deletedAt`) |

---

## Membros de Conta (UserAccountMembership)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/accounts/:id/membros` | Lista usuários membros da conta com seus papéis |
| `POST` | `/api/accounts/:id/membros` | Adiciona usuário à conta |
| `DELETE` | `/api/accounts/:id/membros/:userId` | Remove usuário da conta |

**POST /api/accounts/:id/membros** — body:
```json
{
  "userId": "uuid-do-usuario",
  "papel": "member"  // "member" | "account_admin"
}
```

---

## Entitlements (Capabilities da Conta)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/accounts/:id/entitlements` | Lista capabilities ativas na conta |
| `POST` | `/api/accounts/:id/entitlements` | Adiciona capability à conta |
| `DELETE` | `/api/accounts/:id/entitlements/:capability` | Remove capability da conta |

**POST /api/accounts/:id/entitlements** — body:
```json
{
  "capability": "assistant.use"
  // Valores: "assistant.use" | "maxdoc.use" | "docaction.use" | "knowledge.use" | "analytics.use"
}
```

---

## Soluções

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/solutions` | Lista soluções. Query: `?orgId=` filtra por org |
| `GET` | `/api/solutions/:id` | Retorna solução por ID |
| `POST` | `/api/solutions` | Cria solução (inicializa planos com v1) |
| `PUT` | `/api/solutions/:id` | Atualiza solução com **versionamento automático de planos** |
| `DELETE` | `/api/solutions/:id` | Deleta solução (retorna 422 se vinculada a contratos) |

**Versionamento de planos no PUT:** O frontend envia apenas planos ativos. O backend:
1. Detecta mudanças de conteúdo
2. Marca a versão antiga como `statusVersao: 'inativo'`
3. Cria nova entrada com versão incrementada (`statusVersao: 'ativo'`)
4. Preserva o histórico de versões anteriores

---

## Contratos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/contracts` | Lista contratos. Query: `?orgId=` filtra por org |
| `GET` | `/api/contracts/:id` | Retorna contrato por ID |
| `POST` | `/api/contracts` | Cria contrato |
| `PUT` | `/api/contracts/:id` | Atualiza contrato |
| `DELETE` | `/api/contracts/:id` | Deleta contrato |

---

## Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/users` | Lista todos os usuários |
| `GET` | `/api/users/cargos-distintos` | Lista cargos únicos (para filtros) |
| `GET` | `/api/users/areas-distintas` | Lista áreas únicas (para filtros) |
| `GET` | `/api/users/:id` | Retorna usuário por ID |
| `POST` | `/api/users` | Cria usuário |
| `PUT` | `/api/users/:id` | Atualiza usuário |
| `DELETE` | `/api/users/:id` | Deleta usuário (e suas memberships) |
| `GET` | `/api/users/:id/grupos` | Lista grupos do usuário (com contexto de conta/org) |

**POST /api/users** — body (não inclua `senha`):
```json
{
  "id": "uuid",
  "nomeCompleto": "Nome Completo",
  "usuario": "username",
  "email": "email@empresa.com",
  "pais": "Brasil",
  "telefone": "11999999999",
  "area": "Engenharia",
  "cargo": "Dev",
  "papel": "member",
  "formatoData": "DD/MM/YYYY",
  "formatoHora": "24h",
  "fusoHorario": "America/Sao_Paulo",
  "status": "Ativo"
}
```

**Tratamento de erros no POST /api/users:**
- `409` — E-mail já cadastrado: `{ "error": "Este e-mail já está cadastrado na plataforma." }`
- `409` — Username já em uso: `{ "error": "Este nome de usuário já está em uso." }`
- `500` — Erro genérico: `{ "error": "Não foi possível criar o usuário. Tente novamente." }`

> **Bug corrigido:** O driver Neon HTTP encapsula erros PostgreSQL como `"Failed query: {sql}"`. O código `23505` (unique violation) está em `e.code`, não em `e.message`.

---

## Tipos de Licença

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/tipos-licenca` | Lista todos os tipos de licença |
| `GET` | `/api/tipos-licenca/:id` | Retorna tipo de licença por ID |
| `POST` | `/api/tipos-licenca` | Cria tipo de licença |
| `PUT` | `/api/tipos-licenca/:id` | Atualiza tipo de licença |
| `DELETE` | `/api/tipos-licenca/:id` | Deleta tipo de licença |

---

## Componentes

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/componentes` | Lista componentes. Query: `?status=Ativo` filtra por status |
| `GET` | `/api/componentes/:id` | Retorna componente por ID |
| `GET` | `/api/componentes/:id/linked` | Verifica se componente está vinculado a alguma solução ativa |
| `POST` | `/api/componentes` | Cria componente |
| `PUT` | `/api/componentes/:id` | Atualiza componente |
| `DELETE` | `/api/componentes/:id` | Inativa componente (se vinculado a solução) ou deleta |
| `PATCH` | `/api/componentes/:id/reativar` | Reativa componente inativo |
| `POST` | `/api/componentes/validate-metadata` | Valida URL de metadados de um componente |

---

## Atribuições de Componente (Catálogo de Ações)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/componentes/:id/atribuicoes` | Lista ações disponíveis no catálogo do componente |
| `POST` | `/api/componentes/:id/atribuicoes` | Adiciona ação ao catálogo |
| `PUT` | `/api/componentes/:id/atribuicoes/:atribuicaoId` | Atualiza ação do catálogo |
| `DELETE` | `/api/componentes/:id/atribuicoes/:atribuicaoId` | Remove ação do catálogo |

---

## Grupos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/grupos` | Lista grupos. Query: `?orgId=`, `?accountId=`, `?escopo=org|conta` |
| `GET` | `/api/grupos/:id` | Retorna grupo por ID |
| `POST` | `/api/grupos` | Cria grupo |
| `PUT` | `/api/grupos/:id` | Atualiza grupo (valida hierarquia: impede ciclos, máx 10 níveis) |
| `DELETE` | `/api/grupos/:id` | Deleta grupo |
| `GET` | `/api/grupos/:id/membros` | Lista membros do grupo |
| `POST` | `/api/grupos/:id/membros` | Adiciona usuário ao grupo |
| `DELETE` | `/api/grupos/:id/membros/:userId` | Remove usuário do grupo |

---

## Permissões FGA (component_permissions)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/permissions` | Lista permissões. Query: `?componenteId=`, `?accountId=`, `?instanciaId=`, `?entidadeId=` |
| `POST` | `/api/permissions` | Cria permissão FGA |
| `DELETE` | `/api/permissions` | Remove permissão FGA (por filtros no body) |

**POST /api/permissions** — body:
```json
{
  "id": "uuid",
  "entidadeTipo": "user",         // "user" | "group"
  "entidadeId": "uuid-do-usuario",
  "componenteId": "comp-maxdoc",
  "acao": "Visualizar",           // STRING com nome da ação (NUNCA UUID)
  "instanciaId": "uuid-da-instancia"  // null para permissão global
}
```

---

## Instâncias (Objetos)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/instancias` | Lista instâncias. Query: `?accountId=`, `?componenteId=` |
| `GET` | `/api/instancias/:id` | Retorna instância por ID |
| `POST` | `/api/instancias` | Cria instância |
| `PUT` | `/api/instancias/:id` | Atualiza instância |
| `DELETE` | `/api/instancias/:id` | Deleta instância |

---

## Membros de Instância (InstanciaMembro)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/instancias/:id/membros` | Lista membros da instância com papel e ações |
| `POST` | `/api/instancias/:id/membros` | Adiciona membro à instância |
| `PUT` | `/api/instancias/:id/membros/:membroId` | Atualiza papel do membro |
| `DELETE` | `/api/instancias/:id/membros/:membroId` | Remove membro da instância |
| `GET` | `/api/instancias/:id/membros/:membroId/atribuicoes` | Lista atribuições (legado) do membro |
| `POST` | `/api/instancias/:id/membros/:membroId/atribuicoes` | Adiciona atribuição (legado) |
| `DELETE` | `/api/instancias/:id/membros/:membroId/atribuicoes/:atribuicaoId` | Remove atribuição (legado) |
| `GET` | `/api/instancias/:id/permissoes-efetivas` | Retorna permissões efetivas de um membro (diretas + via grupo) |

> **Nota modelo FGA puro:** Para MaxDoc e DocAction, as ações são armazenadas em `component_permissions`, não em `instancia_membro_atribuicoes`. Os endpoints de atribuições acima são legado.

---

## DocNix — Fases de Workflow

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/instancias/:id/fases` | Lista fases da instância DocNix |
| `POST` | `/api/instancias/:id/fases` | Cria fase |
| `PUT` | `/api/instancias/:id/fases/:faseId` | Atualiza fase |
| `DELETE` | `/api/instancias/:id/fases/:faseId` | Deleta fase |

---

## DocNix — Responsáveis por Fase

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/instancias/:id/fases/:faseId/responsaveis` | Lista responsáveis da fase |
| `POST` | `/api/instancias/:id/fases/:faseId/responsaveis` | Adiciona responsável à fase |
| `DELETE` | `/api/instancias/:id/fases/:faseId/responsaveis/:responsavelId` | Remove responsável |

---

## DocNix — Atribuições Permitidas por Fase

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/instancias/:id/fases/:faseId/atribuicoes-permitidas` | Lista ações permitidas na fase |
| `POST` | `/api/instancias/:id/fases/:faseId/atribuicoes-permitidas` | Adiciona ação permitida |
| `DELETE` | `/api/instancias/:id/fases/:faseId/atribuicoes-permitidas/:atribuicaoId` | Remove ação permitida |

---

## DocNix — Perfil Slots e Nomeações

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/instancias/:id/perfil-slots` | Lista perfil slots da instância (com nomeações) |
| `GET` | `/api/instancias/:id/elegiveis-slot` | Lista usuários elegíveis para nomeação no slot (Query: `?slotId=`) |
| `POST` | `/api/instancias/:id/perfil-slots` | Cria perfil slot |
| `PUT` | `/api/instancias/:id/perfil-slots/:slotId` | Atualiza perfil slot |
| `DELETE` | `/api/instancias/:id/perfil-slots/:slotId` | Remove perfil slot |
| `POST` | `/api/instancias/:id/perfil-slots/:slotId/nomeacoes` | Nomeia usuário para o slot |
| `DELETE` | `/api/instancias/:id/perfil-slots/:slotId/nomeacoes/:nomeacaoId` | Remove nomeação |

---

## Resumo por Recurso

| Recurso | Endpoints |
|---------|----------|
| Organizations | 5 |
| Accounts | 6 |
| Account Membros | 3 |
| Account Entitlements | 3 |
| Solutions | 5 |
| Contracts | 5 |
| Users | 8 |
| Tipos de Licença | 5 |
| Componentes | 8 |
| Componente Atribuições | 4 |
| Grupos | 8 |
| Permissions (FGA) | 3 |
| Instâncias | 5 |
| Instância Membros | 7 |
| DocNix Fases | 4 |
| DocNix Responsáveis | 3 |
| DocNix Atribuições Permitidas | 3 |
| DocNix Perfil Slots + Nomeações | 7 |
| **Total** | **~93** |
