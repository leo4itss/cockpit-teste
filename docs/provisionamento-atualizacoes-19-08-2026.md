# Provisionamento — atualizações do handoff de 19/08/2026

**Reunião:** handoff "Tela de Provisionamento" · **Branch:** `PAS-2409-provisionamento` ·
**Status:** implementado e verificado em preview local · **Textos:** validados com River e Neide

> **Para que serve este arquivo.** Consolida o que mudou nesta rodada para que a documentação de handoff no
> Figma (página *📆 30.07.2026 - Detalhes de Provisionamento*) seja atualizada. Cada seção indica o texto final
> aplicado e, quando é o caso, o que ainda depende de decisão.

---

## Resumo

A reunião levantou três problemas. Os três foram resolvidos:

| # | Problema | O que mudou |
|---|---|---|
| 1 | As descrições das etapas da Fase 1 davam a entender que, concluída a autenticação, o cliente já conseguia entrar | Todas as 5 descrições reescritas + nova linha de impacto de falha + nota geral ao final do bloco |
| 2 | A tela de revisão do contrato dizia "Ao confirmar…", mas não existe botão "Confirmar" | Callout reescrito citando o label real do botão, nas duas telas (Novo e Editar contrato) |
| 3 | O contrato aparecia como "Ativo" imediatamente após criado, mesmo com o provisionamento ainda rodando | Novos estados "Provisionando" e "Falha no provisionamento", progresso por solução e atualização automática da tela |

---

## 1. Textos das etapas da Fase 1

**Princípio aplicado:** cada etapa descreve **o recurso que é criado**, nunca **a capacidade que o cliente ganha**.
Nenhuma etapa isolada pode implicar que o cliente já consegue entrar, acessar ou usar a plataforma.

**A ordem das etapas está definida e não muda.** A hipótese levantada na reunião — de que a autenticação
ocorreria mais ao final — foi descartada: a ordem atual é a correta.

| Etapa | Descrição | Se ela falhar |
|---|---|---|
| Autenticação | Cria o espaço de identidade exclusivo da conta, onde os usuários do cliente serão posteriormente cadastrados. | Sem esse espaço, não há onde cadastrar nem autenticar os usuários do cliente. |
| Banco de dados | Cria o armazenamento isolado da conta. As estruturas de dados de cada solução são criadas depois, no provisionamento por contrato. | Não há onde gravar os dados do cliente. |
| Variáveis de ambiente | Registra com segurança as configurações e credenciais de acesso específicas desta conta. | As soluções não conseguirão se conectar aos serviços de que dependem. |
| DNS | Registra o endereço de internet da conta na zona de endereços da plataforma. | O endereço não existe e o navegador não localiza o site. |
| Ingress com TLS | Publica esse endereço com conexão criptografada. | O endereço existe, mas não abre corretamente ou acusa problema de segurança. |

**Nota geral, ao final do bloco da Fase 1:**

> A conclusão do provisionamento da conta prepara a infraestrutura e o endereço de acesso. As soluções que o
> cliente contratou são disponibilizadas no provisionamento por contrato.

**Como cada etapa fica na tela** — três linhas, nesta ordem:

1. A descrição (o recurso criado)
2. `Se ela falhar: …` (a consequência funcional)
3. A nota de escopo global/tenant, que já existia

**Nomes de fornecedor** (Keycloak, PostgreSQL, Infisical, Cloudflare, cert-manager) continuam restritos ao
painel expandido da etapa, nos campos "Recurso global" e "Recurso do tenant" — regra que já valia e foi
preservada.

---

## 2. Copy da tela de revisão do contrato

O callout antigo começava com "Ao confirmar…", mas o botão de ação primária se chama outra coisa. Corrigido nas
duas telas, cada uma citando o seu próprio label.

**Novo Contrato** — botão "Criar contrato":

> Ao criar o contrato, a solução selecionada será provisionada automaticamente no ambiente do cliente.
> Esse processo é executado em segundo plano e pode levar alguns minutos.
>
> *(com duas ou mais: "as N soluções selecionadas serão provisionadas")*

**Editar Contrato** — botão "Salvar contrato":

> Ao salvar o contrato, a solução adicionada será provisionada automaticamente no ambiente do cliente.
> Esse processo é executado em segundo plano e pode levar alguns minutos.
>
> *(com duas ou mais: "as N soluções adicionadas serão provisionadas")*

O texto agora comunica os **dois** efeitos da ação (cria o contrato **e** dispara o provisionamento) e antecipa
a duração.

**Varredura completa do fluxo de contrato:** nenhum outro texto da interface aponta para um botão que não
existe. Um caso parecido foi verificado e está correto — em "Novo plano", o texto *"…direcionado ao clicar em
'Fazer upgrade'"* refere-se a um botão do produto do cliente, não do Cockpit.

---

## 3. Ciclo de vida do contrato

### Os estados

| Status | Quando aparece |
|---|---|
| **Provisionando** | Contrato criado; as soluções estão sendo provisionadas |
| **Ativo** | Todas as soluções do contrato provisionadas com sucesso |
| **Falha no provisionamento** | Uma ou mais soluções falharam |
| **Inativo** | Contrato inativado (inalterado) |
| **Pendente** | Estado anterior a este modelo; mantido para não invalidar contratos antigos |

**Regra central:** um contrato **nunca nasce "Ativo"**. Ele nasce "Provisionando" e só vira "Ativo" quando o
provisionamento de todas as suas soluções conclui.

**O status do contrato é derivado das soluções**, não digitado: qualquer solução em erro → falha; alguma ainda
rodando → provisionando; todas concluídas → ativo.

### Onde o estado aparece

O usuário pode sair da tela e voltar depois, então o estado é consistente em quatro lugares:

- Listagem de contratos da organização
- Detalhe do contrato
- Bloco da Fase 2 na tela de provisionamento do tenant (uma linha por solução)
- Card "Contratos ativos" na tela de provisionamento

O mapeamento estado → cor/ícone passou a ser **único e compartilhado**. Antes, cada tela tinha o seu — e o
detalhe do contrato chegava a exibir "Ativo" para um contrato que estava em outro estado. Esse mascaramento foi
removido.

### Progresso por solução

Cada solução do contrato tem status próprio (Pendente → Em andamento → Criado, ou Erro), porque os tempos são
diferentes: o CMS leva cerca de 4 minutos e a base de conhecimento cerca de 2. As soluções são provisionadas em
sequência, uma de cada vez.

### Quando uma solução falha

A linha da solução exibe o bloco de erro já usado na Fase 1 — código, mensagem funcional, número de tentativas,
horário e resposta técnica — junto de um botão **"Tentar novamente"**, que reexecuta apenas aquela solução. O
detalhe do contrato mostra o mesmo motivo e leva à tela de provisionamento, onde a ação vive.

**Não há recuperação em nível de contrato** — a reexecução é sempre por solução, justamente para não esbarrar
nas regras de edição e inativação do contrato.

### Atualização da tela

A tela se atualiza sozinha a cada 5 segundos enquanto houver provisionamento em andamento, e **para de consultar
assim que o processo termina** (com sucesso ou falha). Não pisca nem volta ao estado de carregamento a cada
atualização. WebSocket foi avaliado e descartado: a comunicação é unidirecional e o projeto não tem suporte.

---

## 4. Precisa de validação

| # | Item | Com quem |
|---|---|---|
| ~~V-1~~ | ~~Os textos das 5 etapas e da nota geral (seção 1)~~ — **validados com River e Neide.** Os textos da seção 1 são os definitivos. | ✅ resolvido |
| ~~V-2~~ | ~~O rótulo "Provisionando"~~ — **mantido.** Decisão de 27/08: fica o termo já implementado em todo o código, docs e telas; trocar depois continua sendo troca de uma palavra, sem risco. | ✅ resolvido |
| V-3 | **Mantido em 5 segundos.** Hoje não custa nada (simulado no navegador, sem rede) e o polling para sozinho ao concluir — no máximo ~60 requisições por provisionamento. Reenquadrado: a pergunta real não é de UX, é de capacidade — *o endpoint do worker aguenta uma requisição a cada 5s por tela aberta?* Decidir na integração, não agora. | Back-end, na integração |
| ~~V-4~~ | ~~Permissões diferentes no mesmo bloco de ações~~ — **confirmado como intencional.** Reprovisionar é destrutivo e fica restrito a Platform Admin; verificar saúde é só leitura e libera também Org Admin e Account Admin. | ✅ resolvido |

---

## 5. Lacunas reportadas

Coisas que não são bug desta entrega, mas que a PO precisa registrar:

**L-1 · Não existe componente de tabela no design system.** O DS não tem `Table` — todas as tabelas do Cockpit
são marcação crua dentro de cada página. Por isso não existe "estado de linha em processamento" para reutilizar.
O contrato provisionando usa o mesmo padrão de badge com ícone girando que a Fase 1 já usa, sem inventar
componente novo. **Tratar no design system.**

**L-2 · Não existe mecanismo de polling neste repositório.** O mecanismo de 5s que consulta o Temporal vive no
`pas-cockpit-worker`, outro projeto. Foi criado um equivalente no front, alinhado ao mesmo intervalo.

**L-3 · Quem grava o status final hoje é o navegador.** Ao detectar que o provisionamento terminou, a tela grava
o novo status do contrato. Quando o worker real entrar, **quem deve escrever isso é ele**, não o front. Ponto de
alinhamento com o backend.

**L-4 · O vínculo entre conta e contrato é por nome.** Não há chave estrangeira: o sistema compara o campo
"Contratante" do contrato com o nome da conta, texto com texto.

Investigando isso, descobrimos que **não era risco teórico — era bug alcançável**. O nome da conta é editável na
tela e o rename não propagava para os contratos, então renomear uma conta ativa órfãos seus contratos no instante
seguinte. E o pior não era a tela ficar errada: as travas que dependem desse vínculo passavam a **não encontrar
nada e liberar o que deveriam bloquear** — inativar conta com contrato ativo, e contratar o mesmo componente duas
vezes na mesma conta. Falha em aberto, sem nenhum erro visível.

**Corrigido:** renomear uma conta agora arrasta os contratos junto, e os guards passaram a filtrar por
organização (nome de conta não é único no banco, então contas homônimas de orgs diferentes casavam entre si).
Reproduzido e verificado: antes, conta renomeada era inativada com 2 contratos ativos; agora é bloqueada com 422.

**A chave estrangeira continua sendo o certo** e segue como tarefa à parte — o que existe hoje é um paliativo
consciente que impede o pior enquanto `contracts.accountId` não existe.

**L-5 · Simulação temporária.** Enquanto o worker não expõe status por contrato, o provisionamento é simulado no
navegador com tempo comprimido para caber numa sessão de validação. É código descartável e está marcado como tal.

**L-6 · Inconsistência nos dados de teste.** A conta "Apple Design Studio" consta como provisionamento concluído,
mas não tem registro de provisionamento — a tela mostra "Nenhum registro". Problema dos dados de teste,
anterior a esta entrega.

---

## 6. Fora de escopo

Não implementado, conforme combinado na reunião:

- **Reprovisionar contrato** — existe apenas reprovisionamento de **conta** (Fase 1), restrito a Platform Admin.
  Reprovisionamento em nível de contrato não foi decidido e conflita com as regras de edição/inativação de
  contrato. Nada durante a implementação exigiu essa ação.
- **Persistência de logs** — os logs vivem no Temporal e expiram; pré-requisito de outra tarefa.
- **Informação de billing/custo** na tela de revisão — necessidade validada, mas sem escopo nem dado definido.
- **Correção do datepicker** divergente do design system — tarefa separada.
- **Renomear "Fase 1 / Fase 2"** para nomenclatura descritiva — discutido, sem decisão; nomenclatura mantida.

---

## 7. O que atualizar no Figma

Página *📆 30.07.2026 - Detalhes de Provisionamento*:

| Onde | O que atualizar |
|---|---|
| Mockups da tela de detalhe | Texto das 5 etapas (seção 1) + nova linha "Se ela falhar" + nota geral ao final do bloco da Fase 1 |
| Mockup "Novo Contrato" → revisão | Texto do callout (seção 2) |
| Mockup "Editar Contrato" → revisão | Texto do callout (seção 2) |
| Bloco Doc da tela de detalhe | Regras de negócio: estados do contrato, derivação a partir das soluções, atualização automática e encerramento |
| Listagem de contratos | Novos badges "Provisionando" e "Falha no provisionamento" |
| Detalhe do contrato | Aviso de provisionamento em andamento e aviso de falha com link "Ver detalhes da falha" |
| Seção Feedback | O toast de criação passou a ser "Contrato criado com sucesso. / As soluções estão sendo provisionadas." |

---

## 8. Como validar na aplicação

1. Criar um contrato para uma conta com Fase 1 concluída.
2. Conferir que ele aparece como **Provisionando**, nunca Ativo.
3. Abrir a tela de provisionamento do tenant e acompanhar a Fase 2 — cada solução muda de estado sozinha, em
   sequência.
4. Sair da tela, navegar e voltar: o estado se mantém.
5. Ao terminar, o contrato vira **Ativo** sozinho, sem recarregar a página.

**Para ver o caminho de falha** sem precisar de um desenvolvedor, no console do navegador:

```
sessionStorage.setItem('pas.fase2.falhas', JSON.stringify(['PAS Flow']))
```

A partir daí a solução "PAS Flow" falha ao provisionar, o contrato vai para **Falha no provisionamento** e o
detalhe passa a mostrar o link para o diagnóstico. Para desfazer:

```
sessionStorage.removeItem('pas.fase2.falhas')
```

---

## Verificação realizada

Todo o comportamento descrito na seção 3 foi executado e conferido em preview local: contrato nascendo
"Provisionando", transição automática para "Ativo", persistência ao navegar e voltar, status por solução com
provisionamento sequencial, caminho de falha com link para diagnóstico, e encerramento do polling ao final
(uma única gravação, sem requisições depois).
