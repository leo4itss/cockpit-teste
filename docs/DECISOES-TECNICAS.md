# Decisões e Pendências Técnicas

Registro de decisões arquiteturais tomadas e questões abertas para validação futura.
Cada entrada indica o contexto, o estado atual, e o que precisaria ser decidido antes de qualquer implementação futura.

---

## [DT-001] Hierarquia de Grupos — Modelo Plano por Decisão de Produto

**Data:** 18/06/2026  
**Contexto:** Reunião "Permissões Granulares"  
**Validar com:** River Alves Valadão  
**Status:** Pendente — aguardando decisão de produto

### Situação atual

O Cockpit implementa um modelo **plano e direto** entre usuários e grupos: um usuário pertence a um grupo, e um grupo pode ter papel em um objeto. A relação é sempre:

```
usuário → grupo → objeto
```

Isso é uma **decisão de produto atual**, não uma limitação técnica do OpenFGA — que suporta nativamente hierarquias aninhadas (`usuário → grupo-filho → grupo-pai → objeto`).

**Evidências no código:**

- `server/schema.ts:173–178` — tabela `usuario_grupos` contém apenas `(userId, grupoId)`, sem campo de grupo-pai
- `server/schema.ts:165` — `grupos.parentId` existe, mas é usado exclusivamente para a árvore visual de grupos na UI e para validação anti-ciclo em `PUT /api/grupos/:id` (`server/index.ts:760–784`); **não é lido em nenhuma query de permissão**
- `server/index.ts:1675–1693` / `api/index.ts:1163–1178` — endpoint `permissoes-efetivas` usa `inArray(componentPermissions.entidadeId, grupoIds)` onde `grupoIds` são apenas os grupos diretos do usuário, sem traversal de ancestrais

**Assimetria a observar:** o engine mock de FGA (`src/authz/engine.ts:348–420`) já possui `getGrupoAncestors()` e a usa em `getInstanciaAtribuicoes()` para controles de UI (sidebar, botões). Mas esse engine opera sobre `mockFGARelations` (dados mock do PoC), não sobre o banco real. Os dois sistemas coexistem:

| Camada | Hierarquia suportada | Fonte de dados |
|---|---|---|
| `engine.ts` + `hooks.ts` (controles de UI) | Sim — `getGrupoAncestors()` | `mockFGARelations` (mock PoC) |
| Endpoint `permissoes-efetivas` (painel de auditoria) | Não — só grupos diretos | Banco real (Neon) |

---

### Questão aberta: semântica do `displayName` em cenário de hierarquia

Se o Cockpit vier a adotar hierarquia de grupos no modelo real (DB + endpoint), surgirá uma pergunta de UX que **não existe hoje**:

**Contexto do exemplo:** imagine que exista um grupo "Farmacêuticos Sênior" (filho de "Farmacêuticos"), e "Farmacêuticos" tenha papel Viewer no objeto "Assistente Suporte". Lucas é membro de "Farmacêuticos Sênior".

No modelo hierárquico do OpenFGA, Lucas herdaria o acesso pela cadeia. Ao exibir a origem no painel "Ações Efetivas", qual nome deveria aparecer no badge?

| Opção | Nome exibido | Semântica |
|---|---|---|
| **Grupo imediato** | "Farmacêuticos Sênior" | Onde o usuário está diretamente cadastrado |
| **Grupo com papel no objeto** | "Farmacêuticos" | Quem de fato possui a relação de permissão com o objeto |

Ambas as opções têm justificativa:
- "Grupo imediato" é mais próximo da experiência do administrador que cadastrou Lucas
- "Grupo com papel no objeto" é mais fiel ao trail de auditoria — responde "por que Lucas tem esse acesso?"

**Esta questão é para validação com o River antes de qualquer implementação.** Não há resposta certa sem uma decisão de produto sobre como o modelo de hierarquia deve se comportar no OpenFGA real.

---

### O que seria necessário para implementar hierarquia (se decidido)

1. ~~**Endpoint `permissoes-efetivas`:** adicionar traversal de `grupos.parentId`~~ → **IMPLEMENTADO** em `server/index.ts` e `api/index.ts` via função `expandirComAncestors()` (traversal in-memory com proteção anti-ciclo)
2. **`displayName`:** definir qual nó da cadeia exibir no badge — atualmente exibe o grupo que detém a permissão no objeto (aguarda validação com River)
3. **Sincronizar `engine.ts` com o modelo real:** assimetria resolvida — ambos suportam traversal de ancestrais
4. **Sem alteração de schema:** `grupos.parentId` já existe — nenhuma migração necessária

---

## [DT-002] Modelo de Permissões Unificado — Tudo por Objeto

**Data:** 19/06/2026
**Status:** Implementado

### Decisão

Todos os componentes com instâncias gerenciadas na aba Objetos usam `acessoViaInstancia: true` em `src/authz/mock.ts`. Isso elimina o modo "global de conta inteira" da UI de atribuição de permissões.

**Componentes e flags:**

| Componente | `acessoViaInstancia` | Motivo |
|---|---|---|
| Assistente de IA | `true` | Cada assistente é um objeto independente |
| Base de Conhecimento | `true` | Base Regulatório e Base Operações são contextos distintos |
| Analytics | `true` | Dashboard Comercial é um objeto específico |
| MaxDoc | `true` | Por instância |
| DocAction | `true` | Por instância |

### Impacto

- `AtribuirPermissoesSheet` em modo global não exibe nenhum componente — sempre aberto em modo instância
- `UsuarioDetailAccountSheet`: seção "GLOBAIS — NÍVEL DE CONTA" removida; só exibe objetos
- `GrupoPanel` (Canvas): botão "Atribuir permissões ao grupo" substituído por lista de objetos com cadeado por instância
- `UsuarioPanel` (Canvas): botão "Permissões diretas" removido; cadeado por objeto em "Acesso direto" + seção "Outros objetos"

### Modelo mental resultante

```
Componente (tipo de recurso)  →  Instância (recurso / objeto)
ex: Analytics                 →  Dashboard Comercial
ex: Assistente de IA          →  Assistente Suporte / Assistente Farmacêutico
```

Permissão é sempre: `entidade → papel → objeto`. Não existe permissão de entidade para um componente inteiro.
