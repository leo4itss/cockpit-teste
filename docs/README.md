# Entrega — Permissões Granulares (v1)

Documentação canônica da entrega de **permissões granulares** do Cockpit — arquitetura baseada no modelo **FGA**
(OpenFGA / AuthZEN). É, ao mesmo tempo, um **handoff técnico** (o que construir para tornar o FGA real) e de
**produto/design** (escopo, cenários validados e telas do Account Admin).

> **Escopo:** foco profundo na **1ª entrega** — perfil **Account Admin** + cenários **DocNix multi-empresa** e
> **grupos em massa** — com cobertura de referência do restante necessário para viabilizar. Ver
> [01-visao-e-escopo.md](./01-visao-e-escopo.md).

> ⚠️ **Dados de teste.** Os objetos/contas/usuários deste ambiente são **placeholders** que aproximam objetos
> reais, usados para **validar o modelo FGA na estrutura**. O que a entrega comprova é o **comportamento da
> arquitetura**, não os dados em si.

> 🎨 **Fonte de design:** Figma `PRIZM / Coockpit` → **"🟠 [2.0] - Acesso e permissões"**
> ([abrir](https://www.figma.com/design/r99TlyiVEOYLKa3rTkkzbm/-PRIZM--Coockpit?node-id=31496-45955)).

---

## Trilhas de leitura

- **Engenharia** — [02 Arquitetura FGA](./02-arquitetura-fga.md) → [03 Modelo de dados](./03-modelo-de-dados.md) →
  [07 API & contratos](./07-api-e-contratos.md) → [08 Decisões & pendências](./08-decisoes-e-pendencias.md)
- **Produto / River** — [01 Visão & escopo](./01-visao-e-escopo.md) → [05 Cenários validados](./05-cenarios-validados.md) →
  [08 Decisões & pendências](./08-decisoes-e-pendencias.md)
- **Design / Front** — [04 Account Admin](./04-account-admin.md) → [Fluxos de tela](./fluxos/)
- **QA** — [05 Cenários validados](./05-cenarios-validados.md) (critérios de aceite) → [06 Catálogo de ações](./06-catalogo-acoes.md)

## Índice

| Doc | Conteúdo |
|---|---|
| [01-visao-e-escopo.md](./01-visao-e-escopo.md) | O que é, por que FGA, escopo IN/OUT da 1ª entrega, disclaimer de dados |
| [02-arquitetura-fga.md](./02-arquitetura-fga.md) | ReBAC 2 camadas, tuplas, dois sistemas paralelos, `permission AND entitlement`, **do PoC ao real** |
| [03-modelo-de-dados.md](./03-modelo-de-dados.md) | Tabelas do schema, hierarquia de domínio, terminologia UI↔código |
| [04-account-admin.md](./04-account-admin.md) | Persona, matriz de capacidades, sheets, índice dos fluxos |
| [fluxos/01-usuarios.md](./fluxos/01-usuarios.md) | Telas & interações — aba Usuários (coluna Grupo, filtros, massa, Ações, combinar papéis, efetivas) |
| [fluxos/02-grupos.md](./fluxos/02-grupos.md) | Telas & interações — aba Grupos (criar, detalhe, adicionar/remover em lote) |
| [fluxos/03-objetos.md](./fluxos/03-objetos.md) | Telas & interações — aba Objetos (detalhe, Ações, wizard) |
| [fluxos/04-canvas.md](./fluxos/04-canvas.md) | Telas & interações — Canvas (sheets de grupo/usuário/objeto) |
| [05-cenarios-validados.md](./05-cenarios-validados.md) | DocNix multi-empresa + grupos em massa, com critérios de aceite |
| [06-catalogo-acoes.md](./06-catalogo-acoes.md) | Ações e papéis por componente (MaxDoc 47, DocAction 19, …) |
| [07-api-e-contratos.md](./07-api-e-contratos.md) | Endpoints REST, regra do arquivo duplo, tuplas FGA em produção |
| [08-decisoes-e-pendencias.md](./08-decisoes-e-pendencias.md) | Decisões (DT-001/002) e pendências a validar com o River |
| [glossario.md](./glossario.md) | Vocabulário FGA/AuthZEN — fonte de termos |

## Rodar localmente

```bash
npm install
npm run dev          # frontend Vite (5173)
npm run dev:server   # backend Hono (3001) — rodar simultaneamente
npm run db:push      # aplica schema (Neon)
npm run db:seed      # popula dados de teste
```

Trocar de perfil no PoC: **PersonaSwitcher** (canto inferior direito). Orientação de desenvolvimento no
[CLAUDE.md](../CLAUDE.md) da raiz.
