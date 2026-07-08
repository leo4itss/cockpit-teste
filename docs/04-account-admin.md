# 04 — Perfil Account Admin

Foco da 1ª entrega. Este documento descreve a persona **Account Admin**, sua matriz de capacidades e os sheets
envolvidos, e indexa os 4 fluxos de tela (handoff de design) em [docs/fluxos/](./fluxos/). Termos conforme
[glossario.md](./glossario.md).

> **Fonte de design:** Figma `PRIZM / Coockpit` → **"🟠 [2.0] - Acesso e permissões"**
> ([abrir](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31496-45955)),
> organizada pela persona Account Admin + 4 fluxos que espelham esta documentação.

---

## 1. Quem é o Account Admin

Gestor de **uma conta específica**. Gerencia usuários, grupos e o acesso aos objetos **dentro da sua conta** —
não vê outras contas nem administra a organização.

- No código: `isAccountAdminOnly = isAccountAdmin && !isOrgAdmin && !isPlatformAdmin` (`src/pages/AcessosPage.tsx`).
  Fica **fixado na própria conta** (`accountId = rawAccountId`), sem seletor de org/conta e sem modo "Todas as
  contas".
- Escopo de autorização: pode gerenciar usuários e grupos da conta; **não** pode promover outro `account_admin`
  (isso é do Org/Platform Admin) nem gerenciar componentes.
- Personas de teste (PersonaSwitcher): **Carla Santos** (Account Admin de Santacruz) e **Carlos Mendes**
  (Account Admin de Hospital Elfa — usado no cenário multi-empresa).

## 2. Matriz de capacidades em `/acessos`

| Aba | Pode | Não pode |
|---|---|---|
| **Usuários** | listar; filtrar (grupo/objeto/papel/status); colunas configuráveis; ver detalhes; ver permissões efetivas; criar usuário; **seleção em massa → atribuir a grupo**; atribuir Ações por objeto | ver outras contas; promover account_admin de outra conta |
| **Grupos** | criar/editar grupos da conta; detalhes; adicionar/remover membros (individual e em lote); atribuir Ações ao grupo | editar grupos de escopo **Organização** (herdados; só o Org Admin) |
| **Objetos** | ver objetos da conta; gerenciar a lista de membros de cada objeto; papéis e Ações por membro; `restringirAcesso`; wizard de adicionar membro | criar componentes; acessar Canvas Org |
| **Canvas** (`/canvas`) | visão em grafo da conta; abrir sheets de grupo/usuário/objeto | Canvas Org (`/canvas-org`) — restrito a Org/Platform Admin |

## 3. Sheets e componentes envolvidos

| Sheet / componente | Arquivo | Papel |
|---|---|---|
| `AcessosPage` | `src/pages/AcessosPage.tsx` | hub das 3 abas; filtros, colunas, paginação, seleção em massa |
| `UsuarioDetailAccountSheet` | `src/components/usuarios/UsuarioDetailAccountSheet.tsx` | detalhe do usuário: dados, grupos, papel na conta, objetos com acesso |
| `AtribuirPermissoesSheet` | `src/components/permissoes/AtribuirPermissoesSheet.tsx` | sheet **Ações** (por componente/objeto); combinar papéis; herança via grupo |
| `PermissoesMembroSheet` | `src/components/instancias/PermissoesMembroSheet.tsx` | **Ações** de um membro num objeto; combinar papéis; catálogo do banco |
| `InstanciaDetailSheet` | `src/components/instancias/InstanciaDetailSheet.tsx` | detalhe do objeto: membros diretos + via grupo, papéis, `restringirAcesso` |
| `AtribuirGrupoEmMassaSheet` | `src/components/usuarios/AtribuirGrupoEmMassaSheet.tsx` | atribuição em massa a grupo (chunks + progresso) |
| `GrupoDetailSheet` | `src/components/grupos/GrupoDetailSheet.tsx` | detalhe do grupo: objetos com acesso, membros, adicionar em lote |
| `CriarGrupoSheet` / `CriarUsuarioSheet` | `src/components/grupos/` · `usuarios/` | criação com seleção múltipla de membros |
| `PermissoesEfetivasSheet` | `src/components/permissoes/PermissoesEfetivasSheet.tsx` | permissões efetivas (direto + via grupo) por objeto |

## 4. Índice dos fluxos de tela (handoff de design)

Cada fluxo detalha tela a tela: propósito (Descrição/Objetivos do Figma), mapa tela → rota → componente, estados
e **regras de comportamento e interação**.

- **[fluxos/01-usuarios.md](./fluxos/01-usuarios.md)** — Tela de usuários, Detalhes do usuário → Ações → Combinar
  papéis, Ver permissões efetivas, Criar usuário, Atribuição em Massa, Modal Sobre.
- **[fluxos/02-grupos.md](./fluxos/02-grupos.md)** — Tela de Grupos, Criar Grupos, Detalhes do Grupo, Adicionar
  membros (lote), Remover membros, Modal Sobre.
- **[fluxos/03-objetos.md](./fluxos/03-objetos.md)** — Tela de Objetos, Detalhes do objeto → Ações → Combinar
  papéis, Wizard de adicionar membro, Remover membros, Modal Sobre.
- **[fluxos/04-canvas.md](./fluxos/04-canvas.md)** — Tela de Canvas, Sheets de Grupo/Usuário/Objeto, Modal Sobre.
