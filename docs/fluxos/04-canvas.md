# Fluxo 04 — Canvas (Account Admin)

Handoff de design do **Canvas** (visão operacional em grafo de uma conta). Rota: `/canvas` · Componente:
`src/pages/CanvasPermissoesPage.tsx` (grafo com `@xyflow/react`). Fonte: seção **04. Fluxo - Canvas** do Figma.

> O Account Admin acessa o **Canvas** (visão da conta). O **Canvas Org** (`/canvas-org`, visão org→contas) é
> restrito a Org/Platform Admin. As anotações do Figma nesta seção usam texto-modelo genérico; as regras abaixo
> refletem o comportamento implementado.

---

## 1. Tela de Canvas
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31640-92455) ·
`CanvasPermissoesPage`

**Propósito:** visualizar e gerenciar, num grafo interativo, as relações de acesso de uma conta — conta (âncora),
grupos, usuários e objetos, com a herança de grupos visível nas arestas.
**Regras:**
- Seletor de **conta** no topo. Legenda: Conta (âncora) · Grupo · Usuário · Objeto.
- Arestas distinguem **membro de grupo** vs **acesso a objeto**. Clicar num nó abre o painel/sheet lateral
  correspondente. Suporta zoom/fit/pan.

## 2. Sheet de Grupo
[Sheet](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31640-93474) ·
[Ações](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31605-12112)

**Propósito:** gerenciar um grupo a partir do grafo — membros e objetos com acesso.
**Regras:** lista membros e **Objetos** da conta; cadeado por objeto abre **Atribuir Ações ao grupo**
(`AtribuirPermissoesSheet` em modo instância) — mesmo sheet de Ações dos outros fluxos (papel, combinar papéis,
catálogo do banco).

## 3. Sheet de Usuário
[Sheet](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31640-95718) ·
[Ações](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31640-96335)

**Propósito:** gerenciar um usuário a partir do grafo — grupos e acesso direto a objetos.
**Regras:** mostra os objetos com **acesso direto** (cadeado → editar Ações no objeto) e os demais objetos; a
herança via grupo é visível no grafo. Reusa `PermissoesMembroSheet`/`AtribuirPermissoesSheet`.

## 4. Sheet de Objeto
[Sheet](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31640-98983) ·
[Gerenciar membros e permissões](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31640-99563)

**Propósito:** gerenciar um objeto a partir do grafo — membros e Ações.
**Regras:** "Gerenciar membros e permissões" abre a gestão do objeto (membros diretos + via grupo, papéis, Ações),
consistente com [03-objetos.md](./03-objetos.md).

## 5. Modal Sobre
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31640-100568)

**Propósito:** explica a visão **operacional** do Canvas de uma conta (quem acessa o quê, com herança de grupos no
grafo) e a diferença para o Canvas Org (estrutural).

---

> **Nota de design ↔ código:** os sheets do Canvas reutilizam os mesmos componentes de Ações dos fluxos Usuários e
> Objetos. Divergências entre o Figma e o implementado devem ser registradas em
> [../08-decisoes-e-pendencias.md](../08-decisoes-e-pendencias.md).
