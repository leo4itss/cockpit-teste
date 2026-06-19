# Cenários de Teste

Estes cenários cobrem os três módulos principais definidos por River. Use o **PersonaSwitcher** (canto inferior direito) para trocar personas sem necessidade de login.

---

## Cenário 1 — DocNix: MaxDoc (Gestão de Documentos)

### Objetivo
Validar o ciclo completo de gerenciamento de acesso ao módulo MaxDoc: atribuição de papéis, seleção de ações, personalização e herança via grupo.

### Pré-condições
- Persona ativa: **Marcelo Ribeiro** (`usr-marcelo-c`) — Org Admin da DocNix/Comgas
- Conta: **Comgas** (`acc-comgas`)
- Instância: **MaxDoc Comgas** (`inst-comgas-maxdoc`)
- Entitlement `maxdoc.use` ativo na conta Comgas

### Passo a Passo

#### 1.1 — Acessar o objeto MaxDoc

1. Trocar para persona **Marcelo Ribeiro** (PersonaSwitcher)
2. Navegar para **Acessos** no sidebar
3. Verificar que a conta **Comgas** está selecionada no dropdown
4. Clicar na aba **Objetos**
5. Localizar **MaxDoc Comgas** na lista
6. **Verificar:** O objeto aparece sem badge de "Capability inativa" (entitlement ativo)

#### 1.2 — Adicionar usuário com papel Editor

1. Clicar em **MaxDoc Comgas** → InstanciaDetailSheet abre
2. Clicar em **"Adicionar Membro"**
3. **[Passo 1 — Wizard]** Digitar "Fernando" no campo de busca → clicar em **Fernando** (`usr-fernando`) nos resultados
4. **[Passo 2 — Wizard]** Clicar no card **Editor** no seletor de papel
5. **Verificar:** Ações pré-selecionadas (9 ações): Visualizar, Criar Documento, Editar, Nova Versão, Mover, Cancelar Edição, Baixar Documento, Imprimir, Visualizar Histórico de Versões
6. **Verificar:** Ações de Aprovador (Aprovar Documento, Rejeitar Documento) NÃO estão selecionadas
7. Clicar em **Confirmar**

#### 1.3 — Alterar papel para Revisor

1. Com InstanciaDetailSheet aberta, clicar em **Ações** ao lado de Fernando
2. PermissoesMembroSheet abre
3. Clicar no card **Revisor** no seletor de papel
4. **Verificar:** Ações atualizam automaticamente para (4 ações): Visualizar, Revisar Documento, Submeter para Aprovação, Solicitar Revisão
5. **Verificar:** Criar Documento e Editar NÃO estão (o sistema apaga as permissões do papel anterior e aplica as do novo)
6. Salvar

#### 1.4 — Adicionar grupo com papel Aprovador

1. Voltar para InstanciaDetailSheet do MaxDoc Comgas
2. **"Adicionar Membro"**
3. **[Passo 1 — Wizard]** Digitar o nome do grupo (ex: Grupo AQ Comgas) → clicar no resultado
4. **[Passo 2 — Wizard]** Selecionar papel **Aprovador** nos cards → clicar em **Confirmar**
5. **Verificar:** Ações pré-selecionadas incluem: Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Baixar Documento, Imprimir, Assinatura Eletrônica, Revisar Documento, Aprovar Documento, Rejeitar Documento, Aprovador Documento, Aprovador Substituto Documento, Obsoletetar Documento, Emitir Cópia Controlada, Emitir Cópia Não Controlada, Cópia Controlada Anexos, Ciclo de Aprovação Documentos
6. **Verificar:** Aprovador NÃO tem Criar Documento nem Editar (papel diferente de Editor)
7. Salvar

#### 1.5 — Verificar ações personalizadas

1. Abrir PermissoesMembroSheet de **Fernando**
2. Ativar toggle **"Personalizado"**
3. Desmarcar "Submeter para Aprovação" e marcar "Criar Documento"
4. **Verificar:** Papel muda para "Personalizado" no selector
5. Salvar
6. Fechar e reabrir PermissoesMembroSheet de Fernando
7. **Verificar:** Seleção personalizada persiste (Revisar + Criar Documento, sem Submeter para Aprovação)

#### 1.6 — Verificar acesso por objeto

1. Em Acessos > Usuários, localizar **Fernando**
2. Clicar → UsuarioDetailAccountSheet
3. Na seção **Ações > POR OBJETO**, verificar:
   - **"Gestão Documental Comgas"** aparece **uma única vez** com o badge do papel atual
   - O badge mostra "Personalizado" se as ações foram customizadas
4. Clicar em **"Editar"** ao lado do objeto para abrir o painel de ações e ver as ações selecionadas individualmente

### Resultados Esperados

| Verificação | Esperado |
|------------|---------|
| Papel Editor tem 9 ações | Visualizar, Criar Documento, Editar, Nova Versão, Mover, Cancelar Edição, Baixar Documento, Imprimir, Visualizar Histórico de Versões |
| Revisor tem conjunto próprio (4 ações) | Visualizar, Revisar Documento, Submeter para Aprovação, Solicitar Revisão — sem Criar Documento ou Editar |
| Aprovador tem conjunto próprio (17 ações) | Inclui Aprovar Documento, Rejeitar Documento — sem Criar Documento ou Editar |
| Personalizado persiste ao reabrir | Seleção manual mantida |
| Herança de grupo visível | Ações via grupo marcadas como read-only (verde) |
| `component_permissions.acao` | String com nome da ação (ex: `"Visualizar"`) — nunca UUID |

---

## Cenário 2 — DocNix: DocAction (Módulo de Ações de Qualidade)

### Objetivo
Validar a gestão de ocorrências de qualidade via DocAction: papéis independentes, ações distintas por papel, e papel Personalizado.

### Pré-condições
- Persona ativa: **Marcelo Ribeiro** (`usr-marcelo-c`) — Org Admin DocNix
- Conta: **Comgas** (`acc-comgas`)
- Instância: **DocAction Comgas** (`inst-comgas-docaction`)
- Entitlement `docaction.use` ativo na conta Comgas

### Passo a Passo

#### 2.1 — Adicionar Analista

1. Navegar para Acessos > Objetos > **DocAction Comgas**
2. **"Adicionar Membro"** → **[Passo 1]** buscar e selecionar **Neide** (`usr-neide`) → **[Passo 2]** selecionar papel **Analista** → **Confirmar**
4. **Verificar:** Ações pré-selecionadas (11): Visualizar, Criar Ocorrência, Criar Ocorrência 8D, Editar Ocorrência, Vincular Ocorrência, Acompanhar Ocorrência, Categorizar Ocorrência, Analisar Causa, Criar Plano de Ação, Verificar Eficácia, Encaminhar Ocorrência
5. **Verificar:** Ações de Aprovador (Aprovar Análise de Causa, Encerrar Ocorrência, Reprogramar Prazo/Responsável) NÃO estão selecionadas
6. Salvar

#### 2.2 — Adicionar Aprovador (usuário diferente)

1. **"Adicionar Membro"** → **[Passo 1]** buscar e selecionar **Leo** (`usr-leo`) → **[Passo 2]** selecionar papel **Aprovador** → **Confirmar**
3. **Verificar:** 14 ações selecionadas — todas as 11 do Analista (Visualizar, Criar Ocorrência, Criar Ocorrência 8D, Editar Ocorrência, Vincular Ocorrência, Acompanhar Ocorrência, Categorizar Ocorrência, Analisar Causa, Criar Plano de Ação, Verificar Eficácia, Encaminhar Ocorrência) **mais** as 3 exclusivas do Aprovador: Aprovar Análise de Causa, Encerrar Ocorrência, Reprogramar Prazo/Responsável
4. **Verificar:** Criar Ocorrência e Analisar Causa **estão** selecionadas (Aprovador é cumulativo — inclui todas as ações do Analista)
5. Salvar

#### 2.3 — Verificar independência dos papéis

1. Abrir PermissoesMembroSheet de **Neide** → confirmar papel Analista com suas 11 ações
2. Abrir PermissoesMembroSheet de **Leo** → confirmar papel Aprovador com suas 14 ações
3. **Verificar:** Neide NÃO tem Aprovar Análise de Causa, Encerrar Ocorrência, Reprogramar Prazo/Responsável
4. **Verificar:** Leo tem todas as ações do Analista + as 3 acima (Aprovador é cumulativo)

#### 2.4 — Alterar Neide para papel Personalizado

1. PermissoesMembroSheet de Neide
2. Ativar **"Personalizado"**
3. Manter apenas: **Visualizar** + **Analisar Causa** + **Verificar Eficácia** (desmarcar todo o resto)
4. Salvar
5. Reabrir sheet → **Verificar:** Apenas Visualizar + Analisar Causa + Verificar Eficácia estão marcadas

#### 2.5 — Verificar persistência em banco

Usando Drizzle Studio (`npm run db:studio`):
1. Abrir tabela `component_permissions`
2. Filtrar por `instancia_id = 'inst-comgas-docaction'` e `entidade_id = 'usr-neide'`
3. **Verificar:** Entradas com `acao = 'Visualizar'`, `acao = 'Analisar Causa'`, `acao = 'Verificar Eficácia'`
4. **Verificar:** Nenhuma entrada com UUID no campo `acao`

### Resultados Esperados

| Verificação | Esperado |
|------------|---------|
| Analista (11 ações) | Visualizar, Criar Ocorrência, Criar Ocorrência 8D, Editar Ocorrência, Vincular Ocorrência, Acompanhar Ocorrência, Categorizar Ocorrência, Analisar Causa, Criar Plano de Ação, Verificar Eficácia, Encaminhar Ocorrência |
| Aprovador (14 ações) | Todas as do Analista + Aprovar Análise de Causa, Encerrar Ocorrência, Reprogramar Prazo/Responsável |
| Aprovador é cumulativo | Inclui Criar Ocorrência e Analisar Causa — papéis são independentes por membro, não por ação |
| Personalizado para Neide | Apenas Visualizar + Analisar Causa + Verificar Eficácia |
| Persistência | `acao` é string, não UUID |
| `instancia_membro_atribuicoes` | Não recebe novas escritas (modelo FGA puro) |

---

## Cenário 3 — Assistente de IA

### Objetivo
Validar as regras de acesso ao Assistente IA: papéis simples (Viewer/User/Admin), herança via grupo, e bloqueio por entitlement.

### Pré-condições
- Persona ativa: **Carla Santos** (`4`) — Account Admin da Santacruz
- Conta: **Santacruz** (`a2`)
- Instância: **Assistente Suporte** (`inst-a2-suporte`) — componente Assistente IA
- Entitlement `assistant.use` ativo na conta Santacruz

### Passo a Passo

#### 3.1 — Adicionar usuário com papel Membro

1. Trocar para persona **Carla Santos** (PersonaSwitcher)
2. Navegar para Acessos > Objetos > **Assistente Suporte**
3. **"Adicionar Membro"** → **[Passo 1]** buscar e selecionar **Lucas Oliveira** (`usr-lucas`) → **[Passo 2]** selecionar papel **Membro** → **Confirmar**
5. **Verificar:** Ações pré-selecionadas (4): Usar o assistente, Compartilhar resultados, Ver fontes consultadas, Upload de fontes RAG
6. **Verificar:** NÃO incluídas: Criar assistente, Configurar agentes, Gerenciar cenários de negócio, Gerenciar usuários
7. Salvar

#### 3.2 — Adicionar Admin (todas as ações)

1. **"Adicionar Membro"** → **[Passo 1]** buscar e selecionar **Beatriz Lima** (`usr-beatriz`) → **[Passo 2]** selecionar papel **Admin** → **Confirmar**
3. **Verificar:** Todas as 8 ações estão selecionadas
4. Salvar

#### 3.3 — Testar herança via grupo

> **Conceito validado aqui:** no modelo FGA, pertencer a um grupo **não concede acesso automaticamente** a nenhum objeto. O grupo precisa ser **adicionado explicitamente ao objeto** para que seus membros herdem as ações naquele objeto específico.

> **Setup:** Lucas Oliveira (`usr-lucas`) já foi adicionado como **Membro** em 3.1 (entrada direta). Lucas pertence ao grupo **Farmacêuticos** (`grp-santa-farma`), verificável em Acessos > Grupos.

1. Em Acessos > **Grupos**, confirmar que **Lucas Oliveira** aparece como membro de **Farmacêuticos**
2. Ainda em Acessos > **Objetos** > **Assistente Suporte** → **"Adicionar Membro"**
3. No campo **"Buscar usuário ou grupo..."**, buscar **"Farmacêuticos"** → selecionar → papel **Visualizador**
4. **Verificar:** Ação "Usar o assistente" pré-selecionada para o grupo
5. Confirmar
6. **Verificar:** Farmacêuticos aparece na seção "Grupos" da instância com badge **Visualizador**
7. Na lista de membros, clicar em **Lucas Oliveira** → PermissoesMembroSheet abre
8. **Verificar:** Banner verde "Ações marcadas via grupo — são somente leitura" aparece no topo
9. **Verificar:** A ação "Usar o assistente" aparece com badge verde **Farmacêuticos** (herdada — não editável diretamente)

> **Comportamento esperado:** antes do passo 2 (adicionar Farmacêuticos ao objeto), Lucas **não herda nada** do grupo neste objeto — mesmo sendo membro de Farmacêuticos. A herança só acontece objeto a objeto, explicitamente. Isso é por design: o mesmo grupo pode ter papéis diferentes em objetos diferentes, ou não ter acesso a alguns objetos.

> **Nota:** A herança é visível no **PermissoesMembroSheet** (clicando no usuário na InstanciaDetailSheet, ou via Acessos > Usuários > Editar ao lado do objeto). A seção "POR OBJETO" do painel do usuário exibe apenas membros diretos — acesso exclusivamente via grupo não aparece nessa listagem. Para ver a origem de cada ação (direto vs via grupo), usar **"Ver permissões efetivas"** nos três pontinhos da linha do usuário.

#### 3.4 — Testar bloqueio por entitlement

1. Trocar para persona **Ana Lima** (`2`) — Org Admin Apple
2. Navegar para Acessos → selecionar conta **Apple** (`a1`)
3. Aba **Objetos**
4. **Verificar:** MaxDoc **não aparece** na lista — Apple não tem `maxdoc.use`, portanto não há objetos MaxDoc criados para esta conta
5. Os únicos objetos visíveis são os módulos efetivamente contratados pela Apple (PAS Core, Knowledge Base, Assistente)

> **Como funciona:** a aba Objetos exibe apenas instâncias existentes. Sem entitlement, não é possível criar instâncias do módulo, então ele simplesmente não aparece. O badge "Capability inativa" é exibido na seção de permissões globais (GLOBAIS — NÍVEL DE CONTA) quando se tenta atribuir ações de um componente sem entitlement.

#### 3.5 — Testar o PersonaSwitcher com todos os papéis

| Persona | Papel | O que deve aparecer no Sidebar |
|---------|-------|-------------------------------|
| Leonardo (`1`) | platform_admin | Organizações, Acessos, Componentes, Canvas Org, Canvas, Schema |
| Ana Lima (`2`) | org_admin | Organizações, Acessos, Canvas |
| Marcelo Gomes (`3`) | pas_architect | Componentes apenas |
| Carla Santos (`4`) | account_admin | Acessos, Canvas |
| Marcelo Ribeiro (`usr-marcelo-c`) | org_admin | Organizações, Acessos, Canvas |

### Resultados Esperados

| Verificação | Esperado |
|------------|---------|
| Papel Membro tem 4 ações | Usar o assistente, Compartilhar resultados, Ver fontes consultadas, Upload de fontes RAG |
| Papel Membro não tem admin | Criar assistente, Configurar agentes ausentes |
| Papel Admin tem 8 ações | Todas marcadas sem exceção |
| Herança via grupo | "Usar o assistente" aparece com badge verde (via grupo) no PermissoesMembroSheet de Lucas |
| Entitlement inativo | Badge "Capability inativa" bloqueia atribuição |
| PersonaSwitcher | Sidebar correto para cada papel |

---

## Cenário 4 — Fluxo Completo: Criar Usuário e Atribuir Acesso

### Objetivo
Testar o fluxo de onboarding de novo usuário: criar conta, adicionar à conta, atribuir papel em objeto.

### Passo a Passo

1. Trocar para persona **Marcelo Ribeiro** (`usr-marcelo-c`)
2. Navegar para Acessos > Usuários > **"Criar Usuário"**
3. Preencher:
   - Nome: `João Teste`
   - Username: `joao.teste`
   - E-mail: `joao.teste@comgas.com.br`
   - Papel na conta: `member`
4. Salvar → **Verificar:** Usuário criado sem erro
5. Tentar criar novamente com o mesmo e-mail:
   - **Verificar:** Mensagem "Este e-mail já está cadastrado na plataforma." (não raw SQL)
6. Tentar criar com mesmo username:
   - **Verificar:** Mensagem "Este nome de usuário já está em uso."
7. Com usuário criado, ir para Acessos > Objetos > MaxDoc Comgas
8. Adicionar **João Teste** como **Leitor**
9. **Verificar:** Ações de Leitor pré-selecionadas (6 ações): Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Baixar Documento, Imprimir
10. Salvar

---

## Cenário 5 — Modal de Onboarding Contextual (Acessos)

### Objetivo
Validar que o botão "Sobre" em Acessos exibe o texto correto para cada aba ativa e que o modal fecha corretamente.

### Pré-condições
- Qualquer persona com acesso a Acessos

### Passo a Passo

**CT-01 — Aba Usuários**
1. Navegar para Acessos > aba **Usuários**
2. Clicar em **"Sobre"** (canto superior direito, ao lado da busca)
3. **Verificar:** modal abre com título "Sobre esta aba — Usuários"
4. **Verificar:** texto descreve papéis Membro e Administrador da Conta e menciona a aba Objetos e "Ver permissões efetivas"

**CT-02 — Aba Grupos**
1. Clicar na aba **Grupos**
2. Clicar em **"Sobre"**
3. **Verificar:** título "Sobre esta aba — Grupos"; texto descreve escopo Organização vs. Conta

**CT-03 — Aba Objetos**
1. Clicar na aba **Objetos**
2. Clicar em **"Sobre"**
3. **Verificar:** título "Sobre esta aba — Objetos"; texto descreve papéis predefinidos e permissões herdadas em verde

**CT-04 — Fechar o modal**
1. Abrir o modal (qualquer aba)
2. Clicar em **"Entendi"** → modal fecha ✓
3. Reabrir → clicar no **X** → modal fecha ✓
4. Reabrir → pressionar **Esc** → modal fecha ✓

---

## Cenário 6 — Modal de Onboarding do Canvas

### Objetivo
Validar que o botão "Sobre" no Canvas exibe a legenda do grafo.

**CT-05**
1. Navegar para **Canvas**, selecionar conta Santacruz
2. Clicar em **"Sobre"** (header, ao lado do toggle claro/escuro)
3. **Verificar:** modal abre com título "Sobre o Canvas de Permissões"
4. **Verificar:** texto descreve linha sólida (membro de grupo) e linha tracejada (acesso ao objeto)
5. Clicar em **"Entendi"** → fecha

---

## Cenário 7 — Painel de Grupo no Canvas (Atribuição por Objeto)

### Objetivo
Validar que o painel de grupo no Canvas lista objetos com papel atual e permite atribuir permissões por objeto (não por componente global).

### Pré-condições
- Persona: **Carla Santos** (Account Admin, Santacruz)
- Canvas > Santacruz selecionada

**CT-06 — Listar objetos no painel do grupo**
1. Clicar no nó **Farmacêuticos** no Canvas
2. **Verificar:** painel lateral mostra seção **Objetos (N)** com todas as instâncias da conta
3. **Verificar:** instâncias onde o grupo tem acesso mostram o papel atual (ex: "Viewer" em Assistente Suporte)
4. **Verificar:** instâncias sem acesso mostram cadeado dimmed

**CT-07 — Atribuir permissão a um objeto pelo Canvas**
1. No painel do grupo Farmacêuticos, clicar no cadeado ao lado de **Base Regulatório**
2. **Verificar:** `AtribuirPermissoesSheet` abre em modo instância para "Farmacêuticos / Base Regulatório"
3. **Verificar:** NÃO aparecem outros componentes (sheet restrito à instância clicada)
4. Fechar sem salvar → **Verificar:** Canvas NÃO recarrega

---

## Cenário 8 — Painel de Usuário no Canvas (Acesso Direto + Via Grupo + Outros)

### Objetivo
Validar as três seções de objetos no painel de usuário do Canvas.

### Pré-condições
- Canvas > Santacruz, persona Account Admin

**CT-08 — Seções corretas para Lucas Oliveira**
1. Clicar no nó **Lucas Oliveira**
2. **Verificar:** seção **Acesso direto** lista Assistente Suporte com papel e cadeado ativo
3. **Verificar:** seção **Via grupo** lista Assistente Farmacêutico com badge "Farmacêuticos"
4. **Verificar:** seção **Outros objetos** lista instâncias sem nenhum acesso com cadeado dimmed

**CT-09 — Editar permissão direta pelo Canvas**
1. No painel de Lucas, clicar no cadeado em **Assistente Suporte** (Acesso direto)
2. **Verificar:** sheet abre em modo instância para "Lucas Oliveira / Assistente Suporte"
3. Salvar uma alteração → **Verificar:** Canvas recarrega após salvar
4. Fechar sem salvar → **Verificar:** Canvas NÃO recarrega

**CT-10 — Adicionar usuário a novo objeto pelo Canvas**
1. No painel de Lucas, clicar no cadeado dimmed em um objeto na seção **Outros objetos**
2. **Verificar:** sheet abre em modo instância para "Lucas Oliveira / [nome do objeto]"
3. Atribuir papel e salvar → **Verificar:** o objeto migra de "Outros objetos" para "Acesso direto" após reload

---

## Cenário 9 — Permissões Efetivas com Herança e DisplayName

### Objetivo
Validar que "Ver permissões efetivas" mostra a origem correta (grupo com nome, não ID).

**CT-11 — DisplayName do grupo na origem**
1. Em Acessos > Usuários, nos três pontinhos de **Lucas Oliveira** → "Ver permissões efetivas"
2. **Verificar:** Assistente Suporte aparece com ação "Viewer" e badge de fonte mostrando **"Farmacêuticos"** (nome do grupo, não ID)
3. **Verificar:** Assistente Suporte (acesso direto de Lucas) mostra papel sem badge de grupo

**CT-12 — Acesso direto de Beatriz**
1. "Ver permissões efetivas" de **Beatriz Lima**
2. **Verificar:** Assistente Suporte aparece como acesso direto sem badge de grupo (foi adicionada individualmente)
