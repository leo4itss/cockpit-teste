# Provisionamento — retorno da análise dos 18 pontos

**Origem:** análise do PO sobre a entrega do handoff de 19/08/2026 ·
**Branch:** `PAS-2409-provisionamento` · **Situação:** lote de higiene entregue e verificado

> **Resumo em uma linha.** Dos 18 pontos, **4 foram resolvidos** nesta rodada, **1 eu deliberadamente
> não fiz** (e explico por quê), **4 tinham a premissa imprecisa** e precisam de ajuste antes de virar
> tarefa, e **9 continuam abertos** aguardando decisão.

---

## 1. Resolvidos nesta rodada

Foram os que não dependiam de decisão de ninguém. Em três deles, o problema era **maior** do que a
análise indicava.

### Ponto 8 — vocabulário de falha

**Era maior.** Não era uma abreviação: existiam **quatro cópias** do mapa de status espalhadas pelo
código, e elas já haviam divergido entre si. A mesma tela dizia "Falhou", "Erro" e "Com erro" para a
mesma situação — e havia uma quinta inconsistência que a análise não pegou: um ponto dizia
"Em progresso" onde todo o resto dizia "Em andamento".

Agora existe **um único mapa**. Falha é sempre o substantivo **"Falha"**.

**Exceção mantida de propósito:** o contrato continua com "Falha no provisionamento". Ali a palavra
precisa dizer *o que* falhou — o contrato em si não falhou, o provisionamento dele falhou. Registrado
como regra no código.

### Ponto 10 — pluralização

Saiu o `N solução(ões) selecionada(s)`. Agora:

- uma solução → "a solução selecionada **será** provisionada"
- duas ou mais → "as 2 soluções selecionadas **serão** provisionadas"

Verificado nos dois casos, nas telas de novo contrato e de edição. Não sobrou nenhum `(s)` ou `(ões)`
na interface.

### Ponto 13 — datas e fuso

**Era maior.** A tela exibia **três formatos ao mesmo tempo**, incluindo data em formato técnico
(`2026-07-27`) na vigência do contrato. Tudo passou a usar o mesmo formato.

Sobre o fuso, apliquei a recomendação anterior: os horários são do **relógio de quem abre a tela**, e o
fuso é **declarado uma vez por painel** em vez de repetido em cada linha — numa lista de log com dezenas
de horários, repetir viraria ruído. O painel de logs agora abre com "Horários no fuso de quem abre a
tela (BRT)".

**Se a preferência for horário do servidor (UTC), é troca de uma função** — a decisão continua de vocês.

### Ponto 15, segunda parte — conta sem registro

**Era maior.** Não era uma conta, eram **quatro**: Hospital Elfa, Apple Design Studio, Apple Developer
Tools e Comgas. Todas constavam como provisionamento concluído e todas mostravam "Nenhum registro".

Em vez de inventar quatro registros falsos, a tela passou a **derivar o estado a partir do status da
conta**. Apple Design Studio saiu de "Nenhum registro" para a linha do tempo completa.

**Limite proposital:** essa derivação só funciona quando o status diz, sem ambiguidade, o estado de
todas as etapas — concluído (todas criadas) ou pendente (nenhuma iniciada). Para "em andamento" e
"falhou" não dá para saber em qual etapa o processo está ou parou, e chutar seria pior que admitir a
ausência do registro. Nesses casos a tela continua honesta sobre não ter o dado.

---

## 2. O que eu deliberadamente não fiz

### Ponto 15, primeira parte — soluções duplicadas

**Não limpei, e recomendo não limpar ainda.**

São **cinco** contratos com solução repetida, não um — e um deles tem duas duplicatas diferentes. Mas o
ponto importante é outro: **todos foram criados pela própria interface**.

Isso muda a natureza do achado. Não é dado de teste sujo — é **prova de que a regra de duplicidade
segue sem implementação**, que é exatamente a questão em aberto no PAS-2060. Limpar o banco apagaria a
evidência sem corrigir a causa, e os duplicados voltariam no próximo uso da tela.

**Sugestão:** tratar junto com o PAS-2060, usando esses cinco casos como cenário de teste da regra.

---

## 3. Premissas a corrigir antes de virar tarefa

Quatro pontos, do jeito que estão escritos, vão mandar alguém procurar trabalho que já existe.

| Ponto | O que a análise diz | O que é |
|---|---|---|
| **4** | Falta o estado "em andamento" na Fase 1 | **Está implementado e funcionando** — com ícone girando e rótulo próprio. O que falta é o **mockup** no Figma. O mesmo vale para "degradado" na verificação de saúde, que também já funciona. É trabalho de design documentar, não de desenvolvimento construir. |
| **5** | Confirmar se os três casos bloqueiam igual e se o botão fica indisponível | **Já tem resposta.** Os três bloqueiam igual: qualquer conta sem a Fase 1 concluída trava a criação. O botão de avançar fica desabilitado, e o próprio seletor mostra o status ao lado do nome da conta. Falta o Figma cobrir os outros dois casos além de "Falhou". |
| **8** | O selo diz "Falha" mas o estado é "Falha no provisionamento" | Na listagem o texto sempre foi o completo. A abreviação pode estar no mockup. O problema real era outro e maior (ver seção 1). |
| **9** | Hífen na lista, travessão no campo preenchido | **Não localizei o hífen.** No código só existe travessão, nos dois lugares. Pode estar no mockup do Figma — não consegui verificar porque a integração com o Figma precisa ser reautorizada. **Se você souber onde viu, resolvo em minutos.** |

---

## 4. O que falta na análise

Um ponto que ninguém levantou, e que muda a conversa dos itens 1, 2 e 3.

> **O modelo de dados já tem o campo que resolveria os três.**
>
> Cada etapa carrega, desde antes desta entrega, um indicador de **"pode ser reexecutada"**. Ele é
> preenchido e **nunca é lido por nada na interface**.
>
> A discussão sobre o que o reprovisionamento deve refazer (ponto 1) e sobre como recuperar uma solução
> que falhou (ponto 2) parte do princípio de que é preciso projetar tudo do zero. Não é: a estrutura
> existe, só não foi ligada a nada.

Isso também abre uma saída para o ponto 2 que ainda não foi considerada. A objeção que descartou
"reprovisionar contrato" foi o conflito com as regras de edição e inativação. **Essa objeção não se
aplica a um botão "tentar novamente" na linha da própria solução** — reexecutar uma solução não altera
o contrato, não mexe em vigência, licenciamento nem objetos. É reexecutar um trabalho, não editar um
contrato.

**E há uma pergunta que atravessa os pontos 1 e 2 e não foi feita:** o que acontece com o contrato
quando alguém reprovisiona a conta? Hoje a Fase 1 não toca a Fase 2 — então mesmo um reprovisionamento
bem-sucedido deixa as soluções sem provisionar. Sem essa resposta, a decisão sai pela metade.

---

## 5. Triagem sugerida para o restante

Dezoito itens sem hierarquia não são acionáveis. Sugiro reorganizar assim:

| Bloco | Pontos | Por quê |
|---|---|---|
| **Uma decisão só** | 1, 2, 3 + o campo não usado + a pergunta cruzada | Não são quatro pendências — são uma: **qual é o modelo de retentativa**. Envolve risco de perda de dados e um estado do qual não se sai. |
| **Alinhamento com back-end** | 17 | Não espera reunião. Hoje, se ninguém tiver a tela aberta quando o provisionamento terminar, o status **nunca** é gravado — o contrato fica "Provisionando" até alguém abrir a página. É buraco funcional, não fragilidade temporária. |
| **Decisão de produto** | 6, 14 | O time não avança sem resposta. O 14 dá para fechar hoje: o nome descritivo **já existe** nos títulos da tela ("Fase 1 — Provisionamento da conta"). Tirar o prefixo "Fase N —" encerra o item sem inventar vocabulário. |
| **Design system** | 4, 5, 7, 16 | Sai da mesa do designer. No 7, vale reenquadrar: não é "o provisionamento tem um problema de estilo", é "os avisos de erro do Cockpit inteiro não se distinguem dos de sucesso, inclusive em acessibilidade". |
| **Registrar** | 11, 12, 18 | Risco conhecido, sem urgência nesta entrega. |
| **Fechado** | 8, 10, 13, 15(b) | Entregue nesta rodada. |
| **Aguardando você** | 9, 15(a) | Preciso de uma informação (9) e de uma decisão (15a). |

---

## 6. Estado da entrega

Tudo verificado na aplicação rodando, não apenas no código:

- Vocabulário unificado — conferido nas telas de conta concluída, em andamento e com falha
- Formato de data único — nenhum formato técnico restante na tela
- Fuso declarado no painel de logs
- Singular e plural conferidos nos dois casos
- Conta que mostrava "Nenhum registro" agora exibe a linha do tempo

Verificações automáticas limpas. A análise estática de qualidade **caiu de 6 para 3 problemas** nos
arquivos tocados — os 3 restantes já existiam antes e são de outro assunto. O saldo do código é de
**29 linhas a menos**, apesar de resolver quatro pontos: o ganho veio de eliminar as cópias duplicadas.

Tudo commitado e enviado para a branch.
