# Provisionamento — adendo à revisão do PR #3

**Origem:** revisão externa do PR, em três rodadas (26 e 27/08/2026) ·
**Branch:** `PAS-2409-provisionamento` · **Situação:** cinco achados corrigidos e verificados

> **Resumo em uma linha.** Da revisão saíram **8 achados** ao todo: **5 eram defeitos reais e estão
> corrigidos** (dois bem mais graves do que a revisão supôs, um deles achado pela própria revisora ao
> se corrigir), **1 é falso positivo**, e **2 são comportamento consciente** que só muda por decisão de
> produto. A revisora também corrigiu, por conta própria, dois achados dela mesma de rodadas
> anteriores (ver seção 7). Cinco itens do roteiro continuam sem validação independente.

---

## 1. Corrigidos nesta rodada

### A trava de solução duplicada bloqueava o contrato errado

**Era muito maior do que o relatado.** A revisão classificou como *"é copy, não lógica"* — que a
mensagem mentiria se duas soluções dividissem um componente. O problema é que elas **dividem**:

| Componente | Soluções que o usam |
|---|---|
| `comp-1` | PAS Flow, Assistente de Design, Conta 01 - PAS Core |
| `comp-maxdoc` | Teste componente - solução 01, solução 02 |
| `comp-analytics` | Base de Conhecimento PAS, afdadsf |

Como `PAS Flow` e `Assistente de Design` dividem `comp-1`, adicionar uma ao rascunho bloqueava a
outra. E o contrato da conta **Apple Developer Tools tem as duas juntas** — ou seja, a trava tornou
impossível remontar pela interface um contrato que existe na base agora.

São duas regras diferentes que estavam sendo tratadas como uma:

- **entre contratos**, o que não pode repetir é o **componente** provisionado na conta;
- **dentro de um contrato**, o que não faz sentido é a **mesma solução** duas vezes, porque não há
  como dizer qual plano vale.

O servidor sempre checou por nome. Era o front que divergia — e era o mais restritivo dos dois. O selo
da linha tinha o mesmo defeito: dizia "Em uso nesta conta" para item do próprio rascunho; agora diz
"Já neste contrato".

**Verificado:** com "Teste componente - solução 01" no rascunho, ela fica bloqueada com o aviso certo
e a "solução 02" — mesmo componente, solução diferente — segue selecionável.

### Data em formato técnico na listagem de contratos

**A revisão está certa, e a imprecisão foi minha.** O retorno anterior (ponto 13) afirma que "tudo
passou a usar o mesmo formato". Na listagem da organização, não passou: o código imprimia
`dataInicio`/`dataTermino` crus, sem passar por `formatarData`, contra a regra registrada no
`CLAUDE.md`.

Como o banco guarda os dois formatos — ISO nos contratos criados pela tela, `dd/mm/aaaa` nos dados de
demonstração —, a mesma coluna mostrava `2026-08-14` e `24/03/2026` uma embaixo da outra. Corrigido;
a coluna agora sai inteira em `dd/mm/aaaa`.

### Plano divergente entre a Fase 2 e o contrato

O registro da conta `a1` trazia "Assistente de Design" com plano **Pro**, enquanto o contrato ativo
mantido na curadoria traz **Basic** — *Pro* é o plano do contrato **inativado**. O comentário da
curadoria afirma que os dois são par, então ou o comentário ou o dado estava errado. Alinhei o dado.

### A coluna "Provisionamento" só por bolinha colorida — certo pelo motivo errado

A revisão diz que "não há texto em lugar nenhum da célula". Há — num *tooltip* com Status, Etapa,
Início e Fim. Só que o componente de tooltip respondia **apenas ao passar do mouse**: não tinha
`onFocus`, `tabIndex` nem `role`.

O defeito era real e mais específico do que o relatado: **a informação existia, mas só chegava no
hover** — inacessível a teclado, leitor de tela e toque. Achei o risco de mexer nele exagerado depois
de conferir: é usado num único lugar (`ProvisioningDots`), então corrigi.

**Verificado:** os elementos ganharam `tabIndex={0}`, `onFocus`/`onBlur`, e o balão ganhou
`role="tooltip"`. Confirmado por evento de foco sintético (equivalente ao que a tecla Tab dispara de
verdade) que o balão abre ao ganhar foco e fecha ao perdê-lo, igual ao mouse.

---

## 2. Falso positivo — verificado ao vivo

### "Arquiteto PAS tem Verificar saúde"

**Não tem.** Troquei para a persona e li o estado real do botão: ele renderiza **desabilitado**, e o
painel diz *"Você não tem permissão para executar o health check deste tenant."* A regra libera
Platform Admin, Org Admin e Account Admin — o arquiteto não está em nenhum. A documentação de
permissões **não** está sendo contrariada.

O que a revisão captou de verdade é que três ações (`Tentar novamente`, `Reprovisionar`,
`Visualizar logs`) **somem** para quem não pode, e uma (`Verificar saúde`) **aparece desabilitada com
explicação** — foi essa diferença de comportamento que fez presença ser lida como permissão. Não é
inconsistência a corrigir, como registro na seção 5: `Verificar saúde` mora num painel fixo da tela,
não numa linha de lista, e esconder o painel tiraria informação que vale ver mesmo sem poder disparar
checagem nova.

---

## 3. Comportamento consciente — muda por decisão, não por correção

### "Concluído" em verde com uma solução em falha logo abaixo

Coerente com o modelo: o topo fala **só da Fase 1**, que de fato concluiu. A leitura arriscada é real,
mas separar as duas fases foi decisão de produto — juntá-las num indicador único é outra decisão, não
um conserto.

### Abrir a tela de provisionamento pode gravar sozinha

Já registrado no próprio PR: **quem grava o status final hoje é o navegador**. É provisório e some
quando o worker assumir. Enquanto durar, o status depende de alguém ter a tela aberta na hora certa.

### "Soluções vinculadas" mistura "Criado" e "Ativo"

**Não é defeito.** `Criado` é valor legítimo de `Solution.status` no modelo de dados
(`'Criado' | 'Ativo' | 'Inativo'`) — não é vocabulário de etapa de provisionamento vazando. A colisão
de palavra com o estado das etapas é infeliz e vale renomear um dos dois, mas é mudança de domínio.

---

## 4. Correção factual sobre o ambiente

A revisão afirma que *"o ambiente foi re-semeado"*. **Não foi.** O comando de seed **não** foi
executado — ele apaga todas as tabelas, inclusive usuários, grupos, permissões e organizações. A
limpeza foi cirúrgica, contrato a contrato via API.

Isso importa: quem assumir que houve seed vai desconfiar de dados que estão intactos.

Vale registrar o incômodo real: o preview aponta para o **mesmo banco** do ambiente de
desenvolvimento, então a curadoria dos dados mudou o ambiente **durante** a revisão. É a explicação de
a organização Apple ter saído de 17 contratos para 5 no meio do trabalho.

---

## 5. O que continua aberto

### Sem validação independente — cinco itens

Todos dependem de **escrita** no ambiente, e a revisão corretamente se recusou a escrever num banco
compartilhado:

1. contrato nasce "Provisionando"
2. reexecutar solução em falha
3. renomear conta com propagação para os contratos
4. renomear para nome já usado na organização (recusa esperada)
5. a regra nova de solução duplicada

**Todos os cinco foram verificados no ambiente local**, com prova em banco. O que falta é confirmação
por outra pessoa. O caminho barato é instalar o Node e pedir a credencial do banco ao time — liberar
escrita no preview compartilhado repete exatamente o problema do item 5 acima.

### Decisões de produto

- se o topo da tela deve sinalizar falha da Fase 2 ou continuar falando só da Fase 1;
- renomear `Criado` em `Solution.status` ou o `criado` das etapas, para acabar com a colisão.

**Revi um item que eu mesmo tinha proposto como decisão de produto e retirei da lista:** unificar o
padrão de "sumir" vs. "desabilitar com explicação" entre `Verificar saúde` e as outras três ações. Não
é inconsistência a decidir — `Verificar saúde` mora num painel fixo da tela ("Saúde do tenant"), não
numa linha de lista; esconder o botão deixaria o painel vazio sem nunca poder ser preenchido, e esconder
o painel inteiro tiraria informação que vale ver mesmo sem poder disparar checagem nova. As outras três
são ações soltas numa linha, onde sumir é a opção natural. É diferença estrutural, não inconsistência.

### Dívida técnica já registrada

A chave estrangeira `contracts.accountId` continua sendo o certo. O que entrou é paliativo consciente,
agora com recusa explícita quando o modelo não consegue distinguir contas de mesmo nome.

---

## 6. Pendências de processo — fechadas em 27/08

- **"Avisar quem trabalhou na PAS-240"** — não havia quem avisar. Os únicos autores dos commits
  exclusivos daquela branch são as duas identidades git do próprio autor deste PR; não existe PR
  separado para ela. Item encerrado sem ação.
- **Rótulo "Provisionando" (ponto V-2 do handoff de 19/08)** — decidido: **mantém**. Marcado como
  resolvido em `docs/provisionamento-atualizacoes-19-08-2026.md`.
- **Apagar a branch `PAS-240-discovery-solucao-contrato` e a tag `pre-merge-pas240`** — confirmado que
  a branch está 100% contida nesta (zero commits fora). Ação fica para **depois** do merge deste PR;
  apagar antes seria prematuro.

---

## 7. Terceira rodada — a revisora conferiu as correções e achou mais um

Depois das correções da seção 1, a revisão voltou para verificar cada afirmação uma a uma — inclusive
as duas em que ela discordava de mim. O rigor valeu: ela corrigiu a si mesma duas vezes, e achou um
defeito real que eu não tinha visto.

### Ela se corrigiu duas vezes, com verificação própria

- **"Não houve re-seed"** — ela tinha inferido re-seed pela queda de 17 para 5 contratos. Foi conferir:
  as contas Nexora Tecnologia, Vértice Digital e Mateus Gandi não existem nos dados de carga — um seed
  as teria apagado, e as três seguem no ambiente. Confirmou que a limpeza foi contrato a contrato, como
  eu tinha descrito, e retirou a inferência.
- **"Arquiteto PAS tem Verificar saúde"** — ela testou de novo e confirmou: o botão está desabilitado,
  com a explicação certa. O teste anterior dela tinha checado só a presença do botão, não o estado.
  Retirou o achado.

### O achado novo: dois elementos focáveis para uma única ação

Tentando verificar o fix do tooltip, ela não conseguiu confirmar por foco de teclado — a aba dela nunca
recebe foco real do sistema operacional, então `.focus()` programático muda `document.activeElement`
sem disparar o evento que o React escuta. Em vez de reportar "não funciona", ela **identificou a causa
como limitação do próprio ambiente de teste e descartou o resultado** — mesma disciplina que apliquei
nos meus testes desta rodada.

Sem depender de foco ao vivo, ela leu a estrutura da página e achou o problema de verdade: o
`<div tabIndex="0">` que o Tooltip renderiza ficava **dentro de um `<button>`**, na listagem de contas
da organização (`ProvisioningDots` é usado dentro de um botão que navega para o detalhe de
provisionamento ao clicar). Consequência prática: duas paradas de Tab para uma única ação, e nenhuma
forma de saber por qual delas um leitor de tela passaria.

**Corrigido.** `Tooltip` ganhou `tabIndexed`/`focused`: com `tabIndexed={false}` o wrapper não declara
`tabIndex` nem `onFocus`/`onBlur` próprios, e quem controla a exibição do balão passa a ser o `focused`
vindo de fora. O `<button>` inline em `OrganizacaoDetailPage` virou um componente próprio
(`ProvisioningDotsButton`) com seu próprio estado de foco, repassado para baixo. O outro consumidor do
Tooltip (`ContractDetailSheet`, fora de botão) não muda.

**Verificado no ambiente local:** zero elementos com `tabIndex` dentro do `<button>` (antes: um); foco
no botão abre o balão e fecha ao perdê-lo; hover no elemento correto continua funcionando (testado com
`mouseover`/`mouseout`, os eventos que o React realmente escuta — `mouseenter`/`mouseleave` nativos não
borbulham, e foi aí que meu primeiro teste desta rodada deu falso negativo antes de eu corrigir o
próprio teste).

### Situação final dos achados dela

| # | Achado | Situação |
|---|---|---|
| 1 | Solução duplicada bloqueava combinação válida | ✅ corrigido |
| 2 | Data em formato técnico | ✅ corrigido |
| 3 | Plano divergente (Pro × Basic) | ✅ corrigido |
| 4 | Tooltip só no hover | ✅ corrigido |
| 5 | Dois elementos focáveis dentro do botão | ✅ corrigido (achado na 3ª rodada) |
| 6 | Arquiteto PAS com Verificar saúde | retirado por ela — falso positivo |
| 7 | Ambiente re-semeado | retirado por ela — inferência errada |
| 8 | "Concluído" + falha da Fase 2 / `Criado` em `Solution.status` | decisão de produto, não defeito |

Não sobra nenhum defeito de código aberto vindo desta revisão. O que falta é só cobertura: os cinco
fluxos de escrita (contrato nascer "Provisionando", reexecutar solução, os dois casos de renomear
conta, a regra de solução duplicada) seguem sem validação por alguém fora deste ambiente — ver seção 5.
