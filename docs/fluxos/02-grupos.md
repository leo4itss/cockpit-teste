# Fluxo 02 — Grupos (Account Admin)

Handoff de design da aba **Grupos** de `/acessos`. Rota: `/acessos?aba=grupos` · Componentes:
`AcessosPage`, `CriarGrupoSheet`, `GrupoDetailSheet`. Fonte: seção **02. Fluxo - Grupos** do Figma.

---

## 1. Tela de Grupos
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31561-16115)

**Propósito (design):** lista todos os grupos da conta; buscar, ver detalhes, criar/editar/excluir.
**Regras:**
- Tabela: Grupo (nome+descrição) · Membros · **Escopo** (badge Organização/Conta) · Status · Ações.
- Grupos de escopo **Organização** são criados pelo Org Admin e **herdados** — o Account Admin pode atribuir Ações
  a eles, mas **não editá-los** aqui. Grupos de escopo **Conta** são exclusivos e gerenciados pelo Account Admin.
- Botão **Criar grupo** visível para não-Platform-Admins (Platform Admin não cria grupos).

## 2. Criar grupo
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31616-83989) ·
`CriarGrupoSheet`

**Propósito:** criar um grupo (escopo Conta) e já adicionar membros.
**Regras:**
- Campos: Nome (obrigatório), Descrição, Escopo (read-only "Conta" para Account Admin), **Usuários**.
- Busca de usuários com **checkbox por linha** (compõe um lote entre buscas diferentes) + linha fixa
  **"Selecionar todos os N resultados da busca"** (marca todos que casam com o termo, mesmo fora do recorte
  exibido). Botão **Adicionar selecionados (N)** joga o lote para os chips.
- Membros ainda não persistidos viram **chips removíveis**; só são gravados ao clicar **Criar grupo**.

## 3. Detalhes do Grupo
[Detalhe](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31624-84307) ·
`GrupoDetailSheet`

**Propósito:** ver/editar membros e ver os objetos a que o grupo dá acesso.
**Regras:**
- Seção **Objetos com acesso** (colapsável) — **inicia colapsada** por padrão; mostra objeto · componente · papel.
- Seção **Membros** com avatar/nome/e-mail; badge de papel de conta (Membro / Administrador da Conta) vindo de
  `user_account_memberships` (não do campo livre `users.papel`). Remover membro é ação de hover, com confirmação.
- A busca de **Adicionar membro** aparece **entre o cabeçalho "Membros + Adicionar membro" e a lista** (não abaixo
  da lista), perto do botão que a aciona.

### 3.1 Adicionar membros (lote)
[Adicionar](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31627-85750) ·
[Selecionar todos](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31624-84786) ·
[Adicionar selecionados](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31627-86702)

**Propósito:** localizar e vincular múltiplos usuários; confirmar a seleção antes de concluir.
**Regras:**
- Dropdown de resultados com checkbox por usuário; linha fixa **"Selecionar todos os N resultados da busca"**;
  aviso "+N resultados não exibidos" quando o recorte (30) é menor que o total.
- Clique simples sem seleção mantém o fluxo antigo (adiciona na hora); com seleção em andamento vira toggle.
- **Adicionar selecionados (N)** grava via `POST /api/grupos/:id/membros/bulk` (mesmo endpoint da atribuição em
  massa; idempotente).

### 3.2 Remover membros
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31628-87201)

**Propósito:** desvincular membro(s), com confirmação e possibilidade de cancelar.
**Regras:** ação visível no hover; confirmação antes de desvincular; remove a tupla `usuario_grupos`.

## 4. Modal Sobre
[Figma](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31628-87544)

**Propósito:** ajuda contextual da aba Grupos (como escopo Org × Conta funciona; herança).
