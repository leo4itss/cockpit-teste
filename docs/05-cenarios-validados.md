# 05 — Cenários validados

Os dois cenários apresentados e validados que comprovam o modelo FGA. Cada um traz passos reproduzíveis (via
`PersonaSwitcher` + seed) e **critérios de aceite** verificáveis. Termos conforme [glossario.md](./glossario.md).

> ⚠️ As contagens de membros refletem o ambiente de demonstração, que **acumula** membros de validações
> anteriores. Para contagens "limpas", rode o seed correspondente. Os dados são **placeholders** que validam o
> modelo — ver [01-visao-e-escopo.md](./01-visao-e-escopo.md).

---

# Cenário A — DocNix multi-empresa (Hospital Elfa)

**Objetivo:** demonstrar que o PAS/OpenFGA resolve nativamente a limitação mais crítica do DocNix atual — um
**mesmo usuário** ter papéis **distintos** em empresas diferentes, com o mesmo login. No PAS o papel é atribuído
ao nível do **Objeto** (instância), não do usuário.

| Conceito DocNix | Conceito PAS |
|---|---|
| Empresa (multi-empresa) | Objeto / Instância MaxDoc |
| Atribuição | Ação granular |
| Grupo | Grupo (com papel por objeto) |
| Usuário compartilhado | Usuário com papéis distintos por instância |

### Dados
- Org **Docnix** (`org-docnix`) · Conta **Hospital Elfa** (`acc-elfa`) · Componente **MaxDoc** (`comp-maxdoc`)
- Objetos: `inst-elfa-central` (Hospital Central, sede), `inst-elfa-norte` (Unidade Norte), `inst-elfa-sul` (Unidade Sul)
- Usuários: Carlos Mendes (`usr-carlos-elfa`, Admin da Conta), Beatriz Santos (`usr-beatriz-elfa`), João Pereira (`usr-joao-elfa`)
- Grupos: Editores Docnix (`grp-elfa-editores`, Beatriz), Aprovadores Corporativos (`grp-elfa-aprovadores`, João)

**Distribuição de papéis (o coração do cenário):**

| Sujeito | Hospital Central | Unidade Norte | Unidade Sul |
|---|---|---|---|
| Carlos Mendes | **Administrador** | **Leitor** | — sem acesso — |
| Grupo Editores Docnix | Editor | Editor | — |
| Grupo Aprovadores Corporativos | Aprovador | Aprovador | — |
| Beatriz Santos (direto) | *(via grupo)* | *(via grupo)* | **Leitor** |

**Acesso:** PersonaSwitcher → **Account Admin (Hospital Elfa) — Carlos Mendes** → sidebar **Acessos** (conta
Hospital Elfa selecionada automaticamente).

### A.1 — Mesmo usuário, papéis diferentes (aba Objetos)
1. **Hospital Central** → Carlos com badge **Administrador**; em **Ações**, papel Administrador e **47 ações** marcadas.
2. **Unidade Norte** → Carlos com badge **Leitor**; em **Ações**, apenas **2**: Leitor Documento e Imprimir.
3. **Unidade Sul** → Carlos **não aparece**; só Beatriz (Leitor).

### A.2 — Papéis de grupo por empresa
- Editores Docnix = **Editor** no Central e no Norte; **não aparece** no Sul.
- Beatriz: **via grupo** (Editor) no Central/Norte; **direto** (Leitor) no Sul.

### A.3 — Ações efetivas por empresa (aba Usuários → "Ver permissões efetivas")
- Carlos no Central → todas as ações com badge **Direto**; no Norte → 2 (Leitor Documento, Imprimir); no Sul → nenhuma.
- João no Central → 5 ações com badge **Via Grupo · Aprovadores Corporativos** (Aprovar Documento, Aprovador
  Documento, Obsoletetar Documento, Emitir Cópia Controlada, Emitir Cópia Não Controlada); no Sul → nenhuma.

### A.4 — Alterar papel numa empresa sem afetar outras
- Elevar Carlos a **Editor** na Unidade Norte (3 ações: Criar Documento, Editor Documento, Imprimir) → **Salvar**.
- Confirmar Hospital Central **inalterado** (Administrador, 47 ações).

### A.5 — Adicionar usuário em empresas selecionadas (Wizard)
- Adicionar João ao Hospital Central com papel **Revisor** (wizard: buscar → escolher papel → confirmar; 3 ações
  diretas). João **não** ganha acesso automático a Norte/Sul.
- Nota: reabrir **Ações** de João soma direto + herdado via grupo (herdado = verde, somente leitura); o **wizard**
  só lida com a atribuição direta que está sendo criada.

### A.6 — Visão estrutural (Canvas Org — trocar para Org Admin Docnix)
- Persona **Org Admin (Docnix) — Marcelo Ribeiro** (Account Admin não acessa Canvas Org) → **Canvas Org** →
  expandir Hospital Elfa → 3 objetos MaxDoc; Carlos aparece **Administrador** no Central e **Leitor** no Norte.

### Critérios de aceite — Cenário A
| Verificação | Esperado |
|---|---|
| Carlos no Central | badge Administrador, 47 ações |
| Carlos no Norte | badge Leitor, 2 ações diretas |
| Carlos no Sul | não aparece |
| Editores Docnix | Editor no Central/Norte; ausente no Sul |
| Beatriz | via grupo (Editor) no Central/Norte; direto (Leitor) no Sul |
| João no Central (efetivas) | 5 ações via grupo Aprovadores |
| Alterar Norte | não afeta Central (isolamento por objeto) |

**Seed:** `npx tsx server/seed-docnix-multiempresa.ts` (contagem limpa: Central=3, Norte=3, Sul=1).

---

# Cenário B — Grupos em massa

**Objetivo:** demonstrar que um Account Admin consegue, a partir da listagem de usuários, **filtrar → selecionar em
massa → atribuir a um grupo** de uma vez, de forma fluida em alto volume — e o inverso (a partir do grupo). O
resultado é idêntico à atribuição individual (mesmas tuplas `usuario_grupos`; herança e efetivas inalteradas).

**Acesso:** PersonaSwitcher → **Account Admin** → **Acessos** → aba **Usuários**.

### B.1 — Massa de dados sintética (para exercitar volume/paginação)
```bash
npx tsx server/seed-massa-usuarios.ts a1 150        # gera 150 usuários sintéticos na conta Apple (a1)
npx tsx server/seed-massa-usuarios.ts --limpar a1    # remove tudo depois
```
→ ~156 usuários na conta → 4 páginas a 50/página.

### B.2 — Coluna Grupo, filtros e colunas configuráveis
- A aba Usuários exibe a coluna **Grupo** (badges) no lugar de "Papel" (Papel vira coluna opcional).
- Filtros: **Grupo**, **Objetos**, **Papel**, **Status**. Botão **Colunas** liga/desliga colunas (preferência
  persistida em `localStorage`).

### B.3 — Paginação + itens por página
- Rodapé "Exibindo X–Y de N usuários" + seletor **Por página** (10/20/50/100, padrão 50) + Anterior/Próxima.

### B.4 — Seleção em massa → atribuir a grupo
- Checkbox no cabeçalho = seleciona a página; link **"Selecionar todos os N resultados do filtro"** = seleciona a
  base inteira atravessando páginas.
- Barra de ação → **Atribuir a grupo** → sheet `AtribuirGrupoEmMassaSheet`: escolher grupo destino → confirmar →
  envio em **chunks de 500** com barra de progresso → resultado `{ adicionados, jaExistiam }`. A coluna Grupo
  atualiza na hora.

### B.5 — Sentido inverso (a partir do grupo)
- Detalhes do Grupo → **Adicionar membro** → busca com checkboxes + **"Selecionar todos os N resultados da busca"**
  → **Adicionar selecionados (N)** (mesmo endpoint bulk).

### Critérios de aceite — Cenário B
| Verificação | Esperado |
|---|---|
| Paginação | "Exibindo 1–50 de 156"; trocar Por página recalcula (50→100 = 2 páginas; 10 = 16 páginas) |
| Selecionar todos do filtro | barra mostra "156 usuários selecionados" |
| Atribuir em massa | "N usuários adicionados ao grupo X"; N vínculos persistidos |
| Idempotência | repetir o bulk retorna `{ adicionados: 0, jaExistiam: N }` |
| Coluna Grupo | atualiza imediatamente após atribuição |
| Herança preservada | atribuição em massa gera as mesmas tuplas da individual |

Endpoints: `POST /api/grupos/:id/membros/bulk`, `GET /api/accounts/:id/usuario-grupos` — ver
[07-api-e-contratos.md](./07-api-e-contratos.md). Telas e regras de interação em
[fluxos/01-usuarios.md](./fluxos/01-usuarios.md) e [fluxos/02-grupos.md](./fluxos/02-grupos.md).
