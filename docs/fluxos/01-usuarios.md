# Fluxo 01 — Usuários (Account Admin)

Handoff de design da aba **Usuários** de `/acessos`. Rota: `/acessos?aba=usuarios` · Componente:
`src/pages/AcessosPage.tsx`. Fonte de design: seção **01. Fluxo - Usuários** do Figma.

> Os frames renderizam a partir de componentes de biblioteca remota (PRIZM/SHADCN), por isso são referenciados por
> deep-link em vez de screenshot embutido.

---

## 1. Tela de usuários
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-46910) ·
`AcessosPage` (aba Usuários)

**Propósito (design):** tela principal de gerenciamento de usuários — lista todos os usuários da conta; permite
buscar, filtrar, ver detalhes e agir de forma individual ou **em lote**.

**Regras de comportamento e interação:**
- Colunas: checkbox de seleção · **Nome** (avatar+nome) · Usuário · E-mail · **Grupo** (badges dos grupos) ·
  Status · Último acesso · Ações (hover). A coluna **Grupo substitui "Papel"**; "Papel" é coluna opcional.
- **Filtros**: Grupo, Objetos, Papel (Membro/Administrador da Conta), Status — combináveis com a busca.
- **Colunas configuráveis** (botão "Colunas"): liga/desliga colunas; preferência persiste em `localStorage`
  (`acessos-usuarios-colunas`).
- **Paginação**: rodapé "Exibindo X–Y de N" + seletor **Por página** (10/20/50/100, padrão 50, persistido) +
  Anterior/Próxima (só aparecem com mais de 1 página).
- **Seleção em massa**: checkbox do cabeçalho seleciona a página (estado indeterminado quando parcial); quando a
  página inteira está marcada, aparece o link **"Selecionar todos os N resultados do filtro"** (atravessa páginas).
  Trocar filtro/conta/itens-por-página limpa a seleção. Linhas selecionadas ficam destacadas.
- Barra de ação (quando há seleção): contagem + **Limpar seleção** + **Atribuir a grupo**.
- Coluna Grupo alimentada por `GET /api/accounts/:id/usuario-grupos` (1 query, sem N+1).

## 2. Dropdown de "Mais opções" (⋮)
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-42347)

**Propósito:** ações contextuais por linha, expostas sob demanda.
**Regras:** ícone (⋮) visível no hover da linha → Popover com: **Editar usuário**, **Ver permissões efetivas**,
**Inativar/Ativar usuário**. Interação sem sair da tela.

## 3. Detalhes do usuário
[Tela](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-43274) ·
[Sheet](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-43788) ·
`UsuarioDetailAccountSheet`

**Propósito:** dados cadastrais, grupos vinculados, papel na conta e objetos com acesso; edição inline.
**Regras:**
- Seções: Informações (básicas/contato/profissionais/regionais) · **Papel no Cockpit** (Membro/Admin da Conta;
  "alteração de perfil é feita pelo Org Admin") · **Grupos** (cards com badge de escopo Organização/Conta) ·
  **Ações** (objetos com acesso, com papel por objeto e botão Editar).
- A seção **Grupos** fica entre "Papel no Cockpit" e "Ações" (grupos são origem de boa parte das Ações).

### 3.1 Sheet Ações (por objeto)
[Ações](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-44006) ·
[Sheet](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-44946) ·
`AtribuirPermissoesSheet` / `PermissoesMembroSheet`

**Regras:** seletor de **Papel** (cards) no topo; lista de **Ações** (checkboxes) que preenche o espaço vertical
disponível. Escolher um papel pré-marca seus `defaultAcoes` (Administrador = todas do catálogo). Editar manualmente
vira **Personalizado**. Ações herdadas via grupo aparecem marcadas, **verdes e somente leitura**. Rodapé mostra
contagem "N ações diretas (+ M via grupo)"; botão **Salvar**. Ao salvar, sincroniza `component_permissions` e
`instancia_membros` (ver [../02-arquitetura-fga.md](../02-arquitetura-fga.md) §3).

### 3.2 Sheet Ações — Combinar papéis
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-45371) ·
`src/authz/combinarPapeis.ts`

**Regras:** toggle **Combinar papéis** transforma os cards de papel em multi-seleção; o draft de Ações vira a
**união** dos `defaultAcoes` dos papéis marcados (Administrador expande para o catálogo inteiro). Salvo como
`papel='personalizado'`. Ao **reabrir**, a combinação é reconstruída pelo **menor subconjunto** de papéis cuja
união bate exatamente com o conjunto salvo (evita ambiguidade quando Administrador está envolvido).

## 4. Ver permissões efetivas
[Tela](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-42652) ·
[Sheet](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-43022) ·
`PermissoesEfetivasSheet`

**Propósito:** consolidar o acesso **real** do usuário — Ações diretas + herdadas de grupos — de forma auditável.
**Regras:** seleção do objeto (rádio) → lista de Ações com badge de origem: **Direto** (azul) vs **Via Grupo ·
{nome}** (verde). Somente leitura. Backend: `GET /api/instancias/:id/permissoes-efetivas?userId=` (une direto +
grupos + **ancestrais** via `grupos.parentId`).

## 5. Criar usuário
[Tela](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-45805) ·
[Sheet](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-46234) ·
`CriarUsuarioSheet`

**Propósito:** cadastro guiado, já com perfil/grupos definidos e validação antes de concluir.
**Regras:** formulário por seções (Informações básicas, Contato, Profissionais — incluindo Etiquetas de
classificação, Regionais); validação obrigatória antes de salvar.

## 6. Atribuição em Massa
[Selecionar todos](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-47558) ·
[Atribuir a grupo](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-47866) ·
`AtribuirGrupoEmMassaSheet`

**Propósito:** com N usuários selecionados (inclusive "todos do filtro"), vinculá-los a um grupo numa única ação;
projetado para alto volume.
**Regras:**
- Sheet: busca do grupo destino → seleção (rádio, com badge de escopo) → resumo ("adicionar N usuários ao grupo X")
  → executar.
- Envio em **chunks de 500** com barra de progresso "X de N processados"; não fecha durante a operação.
- Endpoint `POST /api/grupos/:id/membros/bulk` é **idempotente** (retorna `{ adicionados, jaExistiam }`) — seguro
  para retry (Neon HTTP não tem transação). Gera as **mesmas tuplas** da atribuição individual; herança e efetivas
  inalteradas. Resultado final e atualização imediata da coluna Grupo.

## 7. Modal Sobre
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-47206)

**Propósito:** modal informativo (versão do produto, licença, suporte). Ajuda contextual da tela.
