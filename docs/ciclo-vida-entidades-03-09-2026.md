# Ciclo de vida de entidades — o que foi feito após a reunião de 03/09/2026

**Reunião:** "Definições em aberto do UH de Contratos" — 03/09/2026 (Neide, River, Leonardo, Pedro Vitor, Mateus Gandi) ·
**Branch:** `PAS-2507-Regras-ativacao` · **Situação:** implementado e verificado no protótipo; 1 hipótese ainda aberta, 1 desvio consciente da reunião a validar

> **Resumo em uma linha.** As regras de inativação, reativação e exclusão das quatro entidades
> (Organização → Conta → Solução → Contrato) foram unificadas num modelo **bottom-up** (nunca cascata),
> a **quarentena de 30 dias foi revertida** (decisão da reunião: exclusão de conta volta a ser hard delete),
> e a precondição de exclusão física foi invertida — **só entidade ativa que nunca teve contrato pode ser
> excluída**. Front, backend e Figma estão sincronizados. Falta o critério de "entidade nunca usada"
> (depende do River) e há um ponto onde segui instrução do Leonardo contra o combinado da reunião (seção 6).

---

## 1. O que a reunião definiu

Modelo **uniforme para as quatro entidades** — condição colocada pelo River. Três operações:

| Operação | Regra | Confirmação |
|---|---|---|
| **Inativação** | Bottom-up. Só inativa quando **não há nenhum filho ativo** (`status !== 'Inativo'`) no nível de baixo. O bloqueio mostra a lista dos filhos; o usuário inativa item a item e volta. Nunca cascateia. | Sem diálogo forte, sem palavra de segurança |
| **Reativação** | Sempre manual, item a item. Nunca em bloco (reativar em bloco destruiria o estado misto ativo/inativo que existia antes). | Sem confirmação |
| **Exclusão física** | Hard delete — mecanismo de correção de erro operacional, exclusivo de **Platform Admin**. Também bottom-up. Exige as **três condições simultâneas** abaixo. | Digitação do nome para confirmar |

**As três condições da exclusão física:**

1. `jaTeveContrato === false` — nunca teve contrato vinculado, **nem já finalizado**
2. zero itens vinculados — filhos diretos, de qualquer status
3. `status !== 'Inativo'` — se foi inativada, esteve em uso, e "em uso" não é correção de erro

**Contrato nunca é excluível fisicamente**, em perfil nenhum — é registro jurídico e fiscal.

### "Contrato válido" tem três leituras que não se misturam

| Leitura | Significado | Efeito |
|---|---|---|
| `contratoAtivo(c)` | `status !== 'Inativo'` | Bloqueia a **inativação** do pai |
| `jaTeveContrato(...)` | Qualquer contrato na história, de qualquer status | Bloqueia a **exclusão física**, permanentemente |
| `dataTermino` | Data de término do contrato | **Nenhum** efeito em ciclo de vida. Contrato vencido por data continua "válido" enquanto o status não for `Inativo` (Marcelo: preservar para negociação; churn é quando o cliente sai e o contrato é inativado) |

---

## 2. O que mudou desde a entrega anterior

A entrega anterior (commit `a4e0ae1`, "quarentena de 30 dias") foi construída sobre um modelo que a
reunião **substituiu**. As mudanças:

| Antes (pré-reunião) | Agora (pós-reunião) |
|---|---|
| Conta excluída ia para **quarentena de 30 dias** (`deletedAt`), com countdown, "Cancelar exclusão" e aba "Exibir contas excluídas" | **Hard delete real** — a conta e o vínculo dos usuários somem na hora. Sem quarentena, sem tela de recuperação |
| Exclusão física era permitida em entidade **inativa** ("já inativou, agora limpa") | Exclusão física **só em entidade ativa**. Uma vez inativada, nunca mais é excluível |
| Usuários e componentes vinculados **bloqueavam** a exclusão | Usuários **não bloqueiam nada** — o vínculo é apenas removido (Regra 7). Componente também não bloqueia (não é filho da hierarquia) |
| Precondição: "não pode ter contrato **ativo**" | Precondição: "não pode ter contrato **nenhum na história**" — mais restritivo e permanente |
| Cascata em alguns pontos | Nunca cascateia — sempre item a item, de baixo para cima |

Itens removidos do código: `deletedAt` como quarentena, `previsaoExclusaoPermanente`, botão "Cancelar
exclusão", filtro "Exibir contas excluídas", o countdown, e o componente `MenuCicloVida`.

---

## 3. Inativação — o que o usuário vê

Cada nível é barrado pelo nível imediatamente abaixo:

| Inativar… | É barrado por… | Mensagem |
|---|---|---|
| **Organização** | Conta com status ≠ Inativo | "Não é possível inativar esta organização. Existem contas ativas vinculadas. Inative primeiro os itens abaixo:" + lista clicável das contas |
| **Conta** | Contrato ativo vinculado (associação por nome conta↔contratante) | "…Existem contratos ativos vinculados…" + lista dos contratos |
| **Solução** | Contrato ativo que referencia a solução | "…Existem contratos ativos vinculados…" + lista dos contratos |
| **Contrato** | Nada — inativa direto | — |

O diálogo de bloqueio **não confirma nada**: explica a regra, lista os impedimentos, cada item leva
ao registro para resolver. Rodapé com um único botão **Fechar**.

Quando **não há** impedimento, a inativação abre um diálogo de confirmação simples (é reversível) e
emite o toast "X inativada com sucesso.".

---

## 4. Exclusão física — o que o usuário vê

Só aparece para **Platform Admin** (o botão "Excluir" nem renderiza para os outros perfis).

Ordem de verificação e mensagem correspondente:

| Situação | Resultado |
|---|---|
| Perfil ≠ Platform Admin | Botão não existe |
| Entidade **inativa** | "Uma organização/conta/solução inativa não pode ser excluída fisicamente." |
| **Já teve contrato** (qualquer status) | "…já teve contrato vinculado. A exclusão física fica permanentemente indisponível — a única ação possível é a inativação." — sem lista, não há o que resolver |
| **Tem filhos vinculados** (nunca teve contrato) | "A exclusão física exige que não haja nenhum item vinculado. Exclua primeiro as contas/soluções abaixo:" + lista clicável |
| **Nunca usada** (ver seção 7) | Hoje sempre passa — critério não definido |
| Tudo livre | Diálogo de confirmação com **digitação do nome** + toast "X excluída." |

**Solução** só tem um motivo de bloqueio de exclusão: "já teve contrato". Para solução, histórico e
vínculo são o mesmo conjunto (contratos), então nunca cai em "itens vinculados".

**Contrato:** qualquer tentativa de exclusão é recusada — a única ação é inativar.

---

## 5. Reativação

Simétrica à inativação: item a item, sem confirmação. **Novidade desta entrega:** a reativação agora
emite toast de sucesso/erro, como a inativação já fazia. Antes ela fechava a tela em silêncio.

- "Organização/Conta/Solução/Contrato ativada com sucesso."
- "Não foi possível ativar a organização/conta/solução/contrato." → "Tente novamente."

A conta também pode ser reativada pelo ícone ↻ direto na linha da lista de contas inativadas.

---

## 6. Onde ficam os botões — desvio consciente da reunião

**A reunião (Regra 9) definiu:** Inativar / Reativar / Excluir saem do rodapé do "Editar" e vão para o
**cabeçalho da tela de Detalhe** e para a **barra lateral da organização**.

**O que está implementado:** os botões **continuam no rodapé do "Editar"** de cada entidade. O
Leonardo pediu explicitamente para manter assim ("esses botões de ação só vão na tela de edição"),
depois de ver a versão com os botões no Detalhe — na barra lateral de 358px da organização, três
botões espremiam o bloco "Organização / Nome" a zero.

Layout atual do rodapé do Editar:

| Entidade | Estado ativo | Estado inativo |
|---|---|---|
| Organização | `Inativar organização` · `Excluir organização` · Cancelar · Salvar | `Ativar organização` · Cancelar |
| Conta | `Inativar conta` · `Excluir conta` · Cancelar · Salvar | `Ativar conta` · Cancelar |
| Solução | `Inativar solução` · `Excluir solução` · Cancelar · Salvar | `Ativar solução` · Cancelar |
| Contrato | `Inativar contrato` · Cancelar · Revisar/Salvar | `Ativar contrato` · Cancelar |

As telas de Detalhe voltaram a ter só "Editar" no cabeçalho. **Este ponto precisa do teu aval** — é a
única divergência do combinado da reunião.

---

## 7. Pendência que trava produção — "entidade nunca usada" (Hipótese 1)

A terceira condição da exclusão física ("nunca usada") **não tem critério definido**. Na reunião:

- Pedro Vitor mencionou que tabelas são criadas no primeiro acesso à home do tenant;
- River considerou isso insuficiente e sinalizou que pode ser necessário um **histórico/log de uso**
  que ainda não existe.

**Implementação provisória:** `entidadeJaUsada()` retorna sempre `false`. Consequência: hoje o
Platform Admin consegue hard-deletar **qualquer** entidade ativa que nunca teve contrato e não tem
filhos — mesmo que o cliente já tenha usado o ambiente. Está marcado no código como `// HIPÓTESE 1` e
**não deve ir para produção sem a definição do River**.

O que precisa ser respondido: *o que conta como "entidade usada"?* (primeiro login de usuário?
primeiro objeto configurado? qualquer registro no tenant?) e *de onde vem esse dado?*

---

## 8. Backend

Os handlers `DELETE` foram reescritos em **`server/index.ts` e `api/index.ts`** (dev e produção
Vercel), espelhando `src/lib/regrasCicloVida.ts`:

- **Organização / Solução:** `422` se inativa, se já teve contrato, ou se tem filhos.
- **Conta:** mesma checagem + `db.delete` real da conta e remoção de `user_account_memberships`. Sem `deletedAt`.
- **Contrato:** `409` sempre — "Contratos não podem ser excluídos. Utilize a inativação."

Ainda é mock/PoC — não há OpenFGA real nem `contracts.accountId` (a associação conta↔contrato
continua por nome, escopada por `orgId`).

---

## 9. Figma — `📆 03.09.2026 - Cookpit (dialog-inativar)`

Sincronizado com o código.

**Diálogos criados (5):** `Excluir organização (já teve contrato)`, `Excluir conta (já teve contrato)`,
`Excluir solução (já teve contrato)`, `Excluir organização (itens vinculados)`, `Excluir conta (itens vinculados)`.

**Diálogos alterados (4):** `Excluir conta` recriado como hard delete (substituiu o de quarentena);
os três de inativação bloqueada tiveram o rodapé reduzido a um único "Fechar".

**Toasts criados (8):** os pares sucesso/erro de reativação para as quatro entidades.

**Toasts alterados (6):** "…excluída com sucesso." → "…excluída."; a descrição do erro de exclusão de
conta virou "Tente novamente."; dois espaços sobrando removidos.

**Rodapés das telas de edição:** os botões de ciclo de vida passaram a conviver no mesmo rodapé
(`Inativar` + `Excluir` quando ativa) e ganharam o estado inativo (`Ativar`, sem "Salvar"), que não
existia. Antes eram dois frames separados, como se fossem telas alternativas.

**Blocos "Doc" das cinco telas** (Editar-organização, Editar-conta, Soluções e planos,
Editar-contrato e Adicionar contrato): descrição e objetivos reescritos e acrescentados de uma seção
**"Regras de ciclo de vida (reunião 03/09/2026)"** com o pré-requisito de cada ação, quem pode fazer,
o que confirma e onde ficam os botões. É a documentação que o time de design e o dev leem direto no
Figma — antes ela dizia apenas "permite inativar ou excluir", sem nenhuma regra.

---

## 10. Fixtures para teste

Dados de demonstração cobrindo cada caminho (todos em `src/data/mock.ts`):

| Fixture | Cenário |
|---|---|
| `org-meridiano` (Meridiano Log) | Org ativa, zero contas, nunca teve contrato → **exclusão física permitida** |
| `org-vega` (Vega Participações) + `acc-vega-matriz` / `acc-vega-filial` | Org com contas → **inativação bloqueada**; após inativar as contas, liberada |
| `s8` (Portal Legado) + `ctr-portal-legado` | Solução com contrato no histórico → **exclusão bloqueada por "já teve contrato"** |
| `a1-com-solucao` | Conta sem contrato mas com solução → **exclusão bloqueada por "itens vinculados"** |
| `a1-legado`, `a2-arquivo`, `ctr-vega-antigo`, `ctr-apple-legado` | Combinações de histórico de contrato inativo |

---

## 11. Fora de escopo desta entrega

- **Confirmação nas telas de acesso** (`/acessos`): há 3 ações destrutivas sem nenhuma confirmação e 5
  usando `confirm()` nativo do browser. Diagnóstico feito; correção adiada por decisão do Leonardo,
  para entrar nesta mesma branch quando aprovada.
- **`authorization-model.fga` / OpenFGA real** — segue pendente, sem relação com esta entrega.
- **`contracts.accountId` (FK real)** — a associação por nome continua; a FK é a correção correta e
  não foi feita aqui.
