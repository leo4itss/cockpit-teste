# Provisionamento — recuperação da Fase 2 (25/08/2026)

**Origem:** conversa com o time de desenvolvimento sobre os pontos 2 e 3 da análise do PO ·
**Branch:** `PAS-2409-provisionamento` · **Status:** implementado e verificado em preview local

> **Para que serve este arquivo.** Consolida o que mudou nesta rodada para atualizar a documentação de
> handoff no Figma (página *📆 30.07.2026 - Detalhes de Provisionamento*). Fecha o beco sem saída
> operacional que existia quando uma solução falhava ao provisionar.

---

## Resumo

Três decisões foram tomadas na conversa com o time e as três estão implementadas:

| # | Decisão | O que mudou |
|---|---|---|
| 1 | Motivo do erro visível no detalhe do contrato | O detalhe, que antes só dizia "uma ou mais soluções falharam", agora mostra **qual** solução e por quê |
| 2 | Botão "Tentar novamente" | Cada solução em falha ganha um botão próprio, que reexecuta só ela |
| 3 | Remover "Ver runbook" | A ação e o campo que a alimentava foram removidos por inteiro |

Além disso, foi criado um **cenário de erro fixo**: antes, a única forma de ver a Fase 2 falhando era digitar um comando no console do navegador. Agora existe uma conta com um contrato em falha, visível ao simplesmente abrir a tela.

---

## 1. Botão "Tentar novamente" — por solução, não por contrato

Aparece dentro do próprio bloco de erro, junto do código e da mensagem da falha.

**Por que por solução, e não por contrato.** A ideia de "reprovisionar contrato" já tinha sido descartada antes por conflitar com as regras de edição e inativação. Reexecutar uma solução não tem esse conflito: não altera vigência, licenciamento nem objetos do contrato — é repetir um trabalho, não editar o contrato.

**Quem pode usar:** Platform Admin e Org Admin. Mesma régua de "Visualizar logs" — mexe em infraestrutura, mas não é destrutivo como reprovisionar a conta inteira (que continua só Platform Admin).

**O que acontece ao clicar:**
1. A solução volta a "Em andamento";
2. O contrato, que estava em "Falha no provisionamento", volta a "Provisionando";
3. A tela se atualiza sozinha até a solução concluir;
4. Ao concluir, se não sobrar nenhuma solução com problema, o contrato vira "Ativo" — sem precisar sair da tela nem recarregar.

**Texto do toast ao acionar:**

> Reexecução solicitada para «Nome da solução».
> Acompanhe o status nesta tela.

**Texto do toast em caso de erro:**

> Não foi possível reexecutar o provisionamento desta solução.
> Tente novamente.

---

## 2. Motivo do erro no detalhe do contrato

Antes, o detalhe do contrato em falha mostrava só um aviso genérico. Agora mostra, para cada solução com problema, o mesmo bloco de erro que já existia na Fase 1: código, mensagem, número de tentativas, horário e resposta técnica.

**Texto do aviso, no topo:**

> Uma solução deste contrato falhou ao provisionar.
> *(com duas ou mais: "N soluções deste contrato falharam ao provisionar")*

Com o link **"Ver detalhes e tentar novamente"**, que leva à tela de provisionamento do tenant — é lá que o botão de ação vive. O detalhe do contrato **diagnostica**; quem **age** é a tela de provisionamento.

---

## 3. Remoção do "Ver runbook"

O link só aparecia condicionalmente e não tinha para onde apontar — a relação entre tipo de erro e procedimento de resolução nunca chegou a ser montada. Em vez de construir esse mapeamento, o time decidiu remover a ação.

**O que sai da tela:** o link "Ver runbook" some do bloco de erro, tanto na Fase 1 quanto na Fase 2. Nenhuma outra informação do bloco muda.

---

## 4. O que atualizar no Figma

Página *📆 30.07.2026 — Detalhes de Provisionamento*:

| Onde | O que atualizar |
|---|---|
| Bloco de erro (Fase 1 e Fase 2) | Remover o link "Ver runbook" de todos os mockups que o mostram |
| Linha da solução em falha (Fase 2) | Acrescentar o botão "Tentar novamente" |
| Mockup do detalhe do contrato | Trocar o aviso genérico por: motivo por solução + link "Ver detalhes e tentar novamente" |
| Seção Feedback | Acrescentar os 2 novos toasts do retry (sucesso e erro) |
| Bloco Doc da tela de detalhe | Regra de negócio: recuperação é sempre por solução, nunca por contrato; permissão do retry |

---

## 5. Como validar na aplicação

Existe um cenário fixo — não precisa de comando de console:

1. Abrir a conta **Apple** → Provisionamento. A Fase 2 mostra a solução **PAS Flow** em falha, com o motivo do erro.
2. Clicar em **"Tentar novamente"** na linha da solução.
3. Acompanhar: a solução vai para "Em andamento" e depois "Criado"; o contrato passa por "Provisionando" e chega a "Ativo" — tudo na mesma tela, sem recarregar.
4. Abrir o contrato correspondente pela aba Contrato da organização Apple e confirmar que, enquanto em falha, ele mostrava o motivo e o link para a tela de provisionamento.
5. Trocar para uma persona sem permissão (ex.: Arquiteto PAS) e confirmar que a falha e o motivo continuam visíveis, mas o botão "Tentar novamente" não aparece.

**Para repetir o teste**, resetar o cenário:
```
sessionStorage.removeItem('pas.fase2.simulacao')
```
e recarregar a página.

---

## Verificação realizada

Ciclo completo cronometrado em preview local: Falha no provisionamento → Provisionando (imediato) → Ativo
(~25s), a partir do clique no botão, sem sair da tela e sem recarregar. Testado também o gate de
permissão — a persona Arquiteto PAS vê a falha e o motivo, mas não vê o botão. Typecheck e build limpos;
nenhuma menção a "runbook" ou ao campo removido restante no código.

**Limitação assumida, registrada no código:** no ambiente de demonstração a reexecução sempre conclui
com sucesso — é proposital, para o cenário ser demonstrável. Quem decide se uma reexecução falha de novo
é o serviço de provisionamento real, ainda não integrado.
