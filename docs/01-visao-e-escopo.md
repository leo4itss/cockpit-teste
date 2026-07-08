# 01 — Visão geral & escopo da 1ª entrega

## O que é a entrega

**Permissões granulares** no Cockpit: um modelo de autorização baseado em **FGA** (Fine-Grained Authorization,
padrão OpenFGA / AuthZEN) que decide, para cada Objeto, **quem** (Sujeito) pode executar **quais Ações**. Papéis e
Ações são definidos sempre no nível do **Objeto** (instância) — nunca do usuário globalmente.

## Por que FGA

O modelo por Objeto resolve nativamente limitações que os produtos acoplados (a começar pelo DocNix) não
conseguem hoje:

- **Mesmo usuário, papéis diferentes por objeto/empresa** — com o mesmo login (impossível no DocNix atual).
- **Isolamento explícito** — alterar acesso em um objeto não propaga para outros.
- **Herança por grupo com rastreabilidade** — permissões efetivas mostram a origem (direto vs via grupo).
- **Papéis configuráveis** — conjuntos de Ações reutilizáveis, combináveis.

O modelo e o caminho "do PoC ao real" estão em [02-arquitetura-fga.md](./02-arquitetura-fga.md).

---

## Escopo da 1ª entrega

Foco **profundo** na 1ª entrega; cobertura **de referência** do restante necessário para viabilizar.

| Dimensão | DENTRO — foco da 1ª entrega | FORA / próximos passos |
|---|---|---|
| **Perfil** | **Account Admin** na página `/acessos` (ver [04-account-admin.md](./04-account-admin.md)) | Org Admin / PAS Architect — mencionados, não detalhados |
| **Cenários** | **DocNix multi-empresa** e **grupos em massa** ([05-cenarios-validados.md](./05-cenarios-validados.md)) | Novos módulos e objetos reais |
| **Backend FGA** | Modelo mockado + **especificação do que construir** | Backend OpenFGA real implementado + `authorization-model.fga` |
| **Entitlement** | Regra `allow = permission AND entitlement` documentada; `account_entitlements` existe | *Enforcement* pleno na checagem |
| **Dados** | **Placeholders** que aproximam objetos reais | Acoplamento aos objetos reais dos produtos |
| **Design** | Telas do Account Admin detalhadas em [docs/fluxos/](./fluxos/) (fonte: Figma) | Estados fora dos 4 fluxos |

---

## ⚠️ Sobre os dados usados

Os **objetos, contas e usuários** deste ambiente (ex.: MaxDoc — Hospital Central, Unidade Norte/Sul; Assistentes;
grupos) são **dados de teste**. Eles **aproximam objetos reais** que serão acoplados, mas foram criados
exclusivamente para **validar o modelo FGA na estrutura** — exercitar papéis por objeto, herança por grupo,
permissões efetivas, combinação de papéis e atribuição em massa. Nomes, contagens e vínculos podem mudar quando os
produtos reais forem conectados; o que a entrega comprova é o **comportamento da arquitetura**, não os dados em si.

O catálogo de Ações (ex.: MaxDoc = 47, DocAction = 19) é derivado de material real de produto e serve de
referência — ver [06-catalogo-acoes.md](./06-catalogo-acoes.md).

---

## Públicos e trilhas

- **Engenharia** → [02-arquitetura-fga.md](./02-arquitetura-fga.md) → [03-modelo-de-dados.md](./03-modelo-de-dados.md) → [07-api-e-contratos.md](./07-api-e-contratos.md) → [08-decisoes-e-pendencias.md](./08-decisoes-e-pendencias.md)
- **Produto / River** → este doc → [05-cenarios-validados.md](./05-cenarios-validados.md) → [08-decisoes-e-pendencias.md](./08-decisoes-e-pendencias.md)
- **Design / Front** → [04-account-admin.md](./04-account-admin.md) → [docs/fluxos/](./fluxos/)
- **QA** → [05-cenarios-validados.md](./05-cenarios-validados.md) (critérios de aceite) → [06-catalogo-acoes.md](./06-catalogo-acoes.md)
