# 08 — Decisões técnicas & pendências

Decisões arquiteturais tomadas e questões abertas a **validar com o River Alves Valadão** antes de qualquer
implementação do backend real. Cada item indica contexto, estado atual e o que precisa ser decidido.

---

## [DT-001] Hierarquia de grupos — modelo plano por decisão de produto

**Data:** 18/06/2026 · **Reunião:** "Permissões Granulares" · **Validar com:** River Alves Valadão ·
**Status:** Pendente (decisão de produto)

### Situação atual
O Cockpit implementa um modelo **plano e direto** usuário → grupo → objeto. Isso é **decisão de produto**, não
limitação do OpenFGA (que suporta hierarquias aninhadas nativamente).

- `server/schema.ts` — `usuario_grupos` guarda apenas `(userId, grupoId)`.
- `grupos.parentId` existe, mas historicamente era usado só para a árvore visual e validação anti-ciclo em
  `PUT /api/grupos/:id`.
- **Já implementado:** o endpoint `permissoes-efetivas` passou a expandir ancestrais via `parentId` (traversal
  in-memory anti-ciclo) em `server/index.ts` **e** `api/index.ts` — a assimetria com o engine mock
  (`getGrupoAncestors`) foi resolvida nesse ponto.

### Questão aberta — `displayName` da origem em hierarquia
Se um grupo "Farmacêuticos Sênior" (filho de "Farmacêuticos") herdar acesso pela cadeia, **qual nome aparece no
badge de origem** em Permissões Efetivas?

| Opção | Exibe | Semântica |
|---|---|---|
| Grupo imediato | "Farmacêuticos Sênior" | onde o usuário está cadastrado |
| Grupo com papel no objeto | "Farmacêuticos" | quem de fato detém a relação com o objeto (melhor trail de auditoria) |

Atualmente exibe o **grupo que detém a permissão no objeto**. **Sem resposta certa sem decisão de produto** —
validar com o River. Sem alteração de schema (`parentId` já existe).

---

## [DT-002] Modelo unificado — tudo por Objeto

**Data:** 19/06/2026 · **Status:** Implementado

Todos os componentes gerenciados na aba Objetos usam `acessoViaInstancia: true` (`src/authz/mock.ts`). Não existe
"permissão de conta inteira" — permissão é sempre `entidade → papel → objeto`. Consequências: `AtribuirPermissoesSheet`
sempre abre em modo instância; `UsuarioDetailAccountSheet` só exibe objetos; no Canvas, botões globais viram lista
de objetos com cadeado por instância.

```
Componente (tipo de recurso)  →  Instância (objeto)
Analytics                     →  Dashboard Comercial
Assistente de IA              →  Assistente Suporte / Farmacêutico
```

---

## Pendências para viabilizar a arquitetura FGA

| # | Pendência | Detalhe |
|---|---|---|
| P1 | **Backend OpenFGA real** | Provisionar serviço + store; substituir `engine.ts` por `fga.check`/`fga.write` (ver [02-arquitetura-fga.md](./02-arquitetura-fga.md) §6). |
| P2 | **`authorization-model.fga` não commitado** | O modelo referenciado em código **não existe** no repo. Escrever e versionar (esboço no §5 do 02 e no antigo mapeamento FGA). |
| P3 | **Enforcement do entitlement** | Regra `permission AND entitlement` documentada e `account_entitlements` existe, mas o *gate* pleno na checagem final ainda não está ligado. |
| P4 | **Sync DB → FGA** | Banco é fonte de verdade; tuplas FGA são derivadas. Definir mecanismo (event-driven ou reconciliation job). |
| P5 | **Sync dos dois arquivos de API** | Todo endpoint deve existir em `server/index.ts` **e** `api/index.ts` — hoje é disciplina manual, sem verificação automática. |
| P6 | **Granularidade por documento** | FGA hoje concede por *instância*. MaxDoc pode exigir permissão por *documento* (ex.: só o autor edita) → tipo `documento` no modelo FGA. |
| P7 | **Atribuições passivas** | Ações "passiva" (ex.: Leitor Documento) filtram nomeação em slot — é query no banco, não check FGA. Deixar explícito na implementação. |
| P8 | **Nomenclatura `papel` → `relacao`/`role`** | Baixo risco; alinhar vocabulário (ver [glossario.md](./glossario.md)) antes de refatorar colunas/tipos. |

---

## Divergências design ↔ implementação

Divergências entre o Figma (fonte de design, `node-id=31496-45955`) e o comportamento implementado devem ser
registradas nos docs de fluxo ([docs/fluxos/](./fluxos/)) e consolidadas aqui conforme forem sendo alinhadas.
