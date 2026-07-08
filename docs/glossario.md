# Glossário — Permissões Granulares (FGA / AuthZEN)

Fonte de verdade de vocabulário para todo o conjunto de documentação da entrega. Alinha o vocabulário do
Cockpit ao modelo **FGA/OpenFGA** e ao padrão **AuthZEN (OpenID)**. Baseado na reunião Produto & Design de
26/05/2026 (River + Leo) e na especificação [AuthZEN 1.0](https://openid.github.io/authzen/).

> **Regra de ouro:** toda decisão de autorização responde a uma única pergunta —
> **"Pode o *Sujeito* X executar a *Ação* Y sobre o *Recurso* Z (em qual *Contexto*)?"** → **Decisão** `true|false`.

---

## 1. Entidades canônicas (AuthZEN)

| Termo AuthZEN | Pergunta | Descrição |
|---|---|---|
| **Sujeito** (`subject`) | *Quem?* | O usuário ou grupo que solicita acesso |
| **Recurso** (`resource`) | *Sobre o quê?* | O objeto que está sendo acessado |
| **Ação** (`action`) | *Fazendo o quê?* | A operação que o sujeito quer executar |
| **Contexto** (`context`) | *Em que condição?* | Fatores ambientais: fase do fluxo, `restringirAcesso`, horário |
| **Decisão** (`decision`) | *Pode ou não pode?* | O resultado: `true` ou `false` |

---

## 2. Vocabulário da UI ↔ código ↔ FGA

| Conceito | Termo na **UI** | **Código / Banco** | **FGA / AuthZEN** |
|---|---|---|---|
| Sujeito usuário | Usuário | `users` / `user:<id>` | `subject { type: "user" }` |
| Sujeito grupo | Grupo | `grupos` / `usuario_grupos` | `subject { type: "group" }`, tupla `user:X member group:Y` |
| Recurso | **Objeto** | `instancias` / `Instancia` | `resource { type: "instancia" }` / `instancia:<id>` |
| Tipo de recurso | Componente | `componentes` (`tipoModelo`) | define o `type` e o catálogo de relações |
| Operação | **Ação** | `component_permissions.acao`, `componente_acoes`, `componente_atribuicoes` | `action.name` / relação `can_X` |
| Nível de acesso | **Papel** / Nível de acesso | `instancia_membros.papel` (`viewer\|member\|admin`), `componente_papeis.value` | relação (`viewer/member/admin` ou `leitor/editor/...`) |
| Perfil de plataforma | Perfil / Role | `platform_admin\|org_admin\|pas_architect\|account_admin\|member` | relação entre usuário e org/conta |
| Vínculo conta | Administrador da Conta / Membro | `user_account_memberships.papel` (`account_admin\|member`) | `user:X account_admin account:Y` |
| Capacidade do tenant | Licença Ativa / Capability | `account_entitlements.capability` (ex.: `assistant.use`) | gate `allow = permission AND entitlement` |
| Merge de acessos | **Permissões Efetivas** | `GET /api/instancias/:id/permissoes-efetivas` | expansão de tuplas (direto + grupo + ancestrais) |
| Combinação de papéis | **Combinar papéis** / Personalizado | persistido como `papel='personalizado'` | união de `defaultAcoes` (ver `src/authz/combinarPapeis.ts`) |

---

## 3. Termos-chave e como usá-los

- **Objeto** (não "Instância" na UI). No nível de autorização, um Objeto *é* um Recurso com tipo e ID. "Instância"
  permanece só como nome interno de código/banco (`instancias`).
- **Ações** (não "permissões" na UI). Sheets se chamam "Ações — {nome}", botões "Salvar Ações". Nunca usar
  "permissão" como substantivo isolado — qualificar: "Ações disponíveis", "Permissões Efetivas", "atribuir Ação".
- **Papel** tem três usos — desambiguar sempre:
  1. `papel: 'platform_admin' | 'org_admin' | ...` → **Perfil de plataforma / Role**.
  2. `papel: 'viewer' | 'member' | 'admin'` (ou `leitor/editor/...`) → **Nível de acesso** (UX) / **relação** (FGA).
  3. `Grupo.papel` (texto livre) → **Função** do grupo.
- **Administrador (papel de objeto)**: no catálogo, um papel com `defaultAcoes: []` significa **todas as ações do
  catálogo** (ver [06-catalogo-acoes.md](./06-catalogo-acoes.md)).
- **Persona**: identidade de teste do `PersonaSwitcher` (só existe no PoC).
- **Perfil de Objeto** (DocNix): slots de metadado do documento (Revisor, Aprovador, Leitor…) — termo nativo DocNix,
  não confundir com "perfil de plataforma".

---

## 4. Termos a evitar

| ❌ Evitar | ✅ Usar |
|---|---|
| "dar permissão para X" | "atribuir a Ação Y ao Sujeito X sobre o Objeto Z" |
| "permissão" como entidade isolada | "Ação" (operação) ou "Decisão" (resultado) |
| "papel viewer" como entidade | "nível de acesso Visualizador" (UX) / "relação viewer" (FGA) |
| "instância é um componente" | "instância *é uma implantação de* um componente" |
| "perfil do usuário" (quando = role) | "função / role do usuário" |

---

## 5. Como o Cockpit responde à pergunta canônica

```
Modelo padrão (viewer/member/admin):
  Sujeito: user:marcelo | Ação: can_use_assistant (via relação "member")
  Recurso: instancia:assist-ceo | Decisão: true

Modelo DocNix (atribuições granulares):
  Sujeito: user:fernanda | Ação: can_aprovar_documento (atribuição direta)
  Recurso: instancia:maxdoc-comgas | Decisão: true

Com Contexto (fase do fluxo):
  + Contexto: { fase: "em_aprovacao" } → Decisão só válida na fase correta
```

> Gaps de nomenclatura conhecidos no código (baixo risco; alinhar vocabulário antes de refatorar): `papel` em
> `InstanciaMembro`/`UserAccountMembership` e na coluna `instancia_membros.papel` poderiam ser `relacao`/`role`.
> Ver [08-decisoes-e-pendencias.md](./08-decisoes-e-pendencias.md).
