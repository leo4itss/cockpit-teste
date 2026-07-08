# Fluxo 03 — Objetos (Account Admin)

Handoff de design da aba **Objetos** de `/acessos`. Rota: `/acessos?aba=instancias` (rótulo "Objetos") ·
Componentes: `AcessosPage`, `InstanciaDetailSheet`, `PermissoesMembroSheet`. Fonte: seção **03. Fluxo - Objetos**
do Figma. ("Objeto" = `instancias` no código — ver [glossario.md](../glossario.md).)

---

## 1. Tela de Objetos
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31633-91593)

**Propósito (design):** lista os objetos (instâncias de componente) configurados na conta; buscar, filtrar, ver
detalhes e gerenciar. Objetos são agrupados por componente (ex.: MaxDoc → Hospital Central / Unidade Norte / Sul).
**Regras:** cartão/linha por objeto com nome, componente, nº de membros, status. Texto de apoio: o acesso a um
objeto **não** é herdado automaticamente do componente — é gerenciado aqui.

## 2. Detalhes do objeto
[Detalhe](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31628-87878) ·
[Hover Ações/Remover](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31628-88384) ·
`InstanciaDetailSheet`

**Propósito:** propriedades do objeto, membros associados e gerenciamento de acesso.
**Regras:**
- **Restringir acesso** (`restringirAcesso`): inativo = qualquer membro da conta enxerga o objeto; ativo = só
  membros com atribuição.
- Membros separados em **Grupos** (herdam o acesso) e **Usuários** (diretos), cada um com badge de papel por
  objeto (Visualizador/Membro/Administrador ou papéis DocNix). Ações por linha (**Ações**, **Remover**) aparecem
  no hover.
- Botão **Adicionar membro** abre o wizard (§4).

### 2.1 Sheet Ações (por membro)
[Ações](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31561-18269) ·
[Sheet](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31628-89321) ·
[Combinar papéis](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31628-90661) ·
`PermissoesMembroSheet`

**Regras:** igual à sheet de Ações do fluxo Usuários (§3.1/3.2 de [01-usuarios.md](./01-usuarios.md)) — seletor de
papel, catálogo de Ações (preferindo o catálogo do banco `componente_atribuicoes`), **Combinar papéis** com
reconstrução pelo menor subconjunto, herança via grupo (verde, read-only). O papel **Administrador**
(`defaultAcoes: []`) marca todas as Ações do catálogo (ex.: 47 no MaxDoc).

## 3. Remover membros do objeto
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31628-88384)

**Propósito:** desvincular membro(s) do objeto com confirmação, preservando a integridade do objeto.
**Regras:** `DELETE /api/instancias/:id/membros/:membroId` remove a linha de `instancia_membros` **e** limpa
`instancia_membro_atribuicoes` + `component_permissions` da entidade naquele objeto.

## 4. Wizard — Adicionar membro
[Detalhe](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31606-21291) ·
[Buscar](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31606-21587) ·
[Papel](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31606-21940) ·
[Ações](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31606-22845) ·
[Concluído](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31606-23750)

**Propósito:** assistente guiado em etapas para vincular um novo membro ao objeto com o papel/Ações corretos.
**Regras (por passo):**
1. **Selecionar membro** — buscar usuário/grupo; validar antes de avançar.
2. **Papel** — escolher o papel; as Ações do papel são pré-selecionadas (ex.: Revisor → Revisar Documento, Revisor
   Documento, Imprimir). Em "Ver ações ▾" é possível conferir/ajustar as Ações **diretas**.
3. **Resumo/confirmar** — revisar e concluir; feedback do resultado.
- O wizard lida **apenas com a atribuição direta** que está sendo criada; **não** considera heranças de grupo. Ao
  reabrir a sheet **Ações** do membro depois, aparecem também as Ações herdadas via grupo (verde, read-only) somadas
  às diretas.
- Adicionar membro num objeto **não** dá acesso automático a outros objetos (acesso explícito por objeto).

## 5. Modal Sobre
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31633-92029)

**Propósito:** ajuda contextual da aba Objetos.
