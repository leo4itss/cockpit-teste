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
3. Buscar usuário **Fernando** (`usr-fernando`)
4. Selecionar papel **Editor**
5. **Verificar:** Ações pré-selecionadas (9 ações): Visualizar, Criar Documento, Editar, Nova Versão, Mover, Cancelar Edição, Baixar Documento, Imprimir, Visualizar Histórico de Versões
6. **Verificar:** Ações de Aprovador (Aprovar Documento, Rejeitar Documento) NÃO estão selecionadas
7. Salvar

#### 1.3 — Alterar papel para Revisor

1. Com InstanciaDetailSheet aberta, clicar em **Fernando**
2. PermissoesMembroSheet abre
3. Trocar papel de **Editor** para **Revisor** no selector
4. **Verificar:** Ações atualizam para apenas (4 ações): Visualizar, Revisar Documento, Submeter para Aprovação, Solicitar Revisão
5. **Verificar:** Criar Documento e Editar NÃO estão selecionadas (Revisor tem conjunto próprio, independente do Editor)
6. Salvar

#### 1.4 — Adicionar grupo com papel Aprovador

1. Voltar para InstanciaDetailSheet do MaxDoc Comgas
2. **"Adicionar Membro"**
3. No campo **"Buscar usuário ou grupo..."**, digitar o nome do grupo (ex: Grupo AQ Comgas)
4. Selecionar papel **Aprovador**
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

#### 1.6 — Verificar acesso por instância

1. Em Acessos > Usuários, localizar **Fernando**
2. Clicar → UsuarioDetailAccountSheet
3. Na seção **Ações > POR INSTÂNCIA**, verificar:
   - **"Gestão Documental Comgas"** aparece **uma única vez** com o badge do papel atual
   - O badge mostra "Personalizado" se as ações foram customizadas
4. Clicar em **"Editar"** ao lado da instância para abrir o painel de ações e ver as ações selecionadas individualmente

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
2. **"Adicionar Membro"** → buscar **Neide** (`usr-neide`)
3. Selecionar papel **Analista**
4. **Verificar:** Ações pré-selecionadas (11): Visualizar, Criar Ocorrência, Criar Ocorrência 8D, Editar Ocorrência, Vincular Ocorrência, Acompanhar Ocorrência, Categorizar Ocorrência, Analisar Causa, Criar Plano de Ação, Verificar Eficácia, Encaminhar Ocorrência
5. **Verificar:** Ações de Aprovador (Aprovar Análise de Causa, Encerrar Ocorrência, Reprogramar Prazo/Responsável) NÃO estão selecionadas
6. Salvar

#### 2.2 — Adicionar Aprovador (usuário diferente)

1. **"Adicionar Membro"** → buscar **Leo** (`usr-leo`)
2. Selecionar papel **Aprovador**
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
3. Manter apenas: **Analisar Causa** + **Verificar Eficácia** (desmarcar todo o resto exceto esses dois)
4. Salvar
5. Reabrir sheet → **Verificar:** Apenas Analisar Causa + Verificar Eficácia estão marcadas

#### 2.5 — Verificar persistência em banco

Usando Drizzle Studio (`npm run db:studio`):
1. Abrir tabela `component_permissions`
2. Filtrar por `instancia_id = 'inst-comgas-docaction'` e `entidade_id = 'usr-neide'`
3. **Verificar:** Entradas com `acao = 'Visualizar'`, `acao = 'Analisar Causa'`, `acao = 'Verificar Eficácia'`
4. **Verificar:** Nenhuma entrada com UUID no campo `acao`

### Resultados Esperados

| Verificação | Esperado |
|------------|---------|
| Analista vs Aprovador | Conjuntos de ações distintos e independentes |
| Personalizado para Neide | Apenas Analisar Causa + Verificar Eficácia |
| Persistência | `acao` é string, não UUID |
| `instancia_membro_atribuicoes` | Não recebe novas escritas (modelo FGA puro) |

---

## Cenário 3 — Assistente de IA

### Objetivo
Validar as regras de acesso ao Assistente IA: papéis simples (Viewer/User/Admin), herança via grupo, e bloqueio por entitlement.

### Pré-condições
- Persona ativa: **Carla Santos** (`4`) — Account Admin da Santacruz
- Conta: **Santacruz** (`a2`)
- Instância: **Atendimento** (`inst-a2-atend`) — componente Assistente IA
- Entitlement `assistant.use` ativo na conta Santacruz

### Passo a Passo

#### 3.1 — Adicionar usuário com papel User

1. Trocar para persona **Carla Santos** (PersonaSwitcher)
2. Navegar para Acessos > Objetos > **Atendimento**
3. **"Adicionar Membro"** → buscar **Lucas Oliveira** (`usr-lucas`)
4. Selecionar papel **User**
5. **Verificar:** Ações pré-selecionadas: `can_use_assistant`, `can_share_conversation_results`, `can_view_consulted_sources`, `can_upload_rag_sources`
6. **Verificar:** NÃO incluídas: `can_create_assistant`, `can_configure_agents`, `can_customize_ai`, `can_manage_users`
7. Salvar

#### 3.2 — Adicionar Admin (todas as ações)

1. **"Adicionar Membro"** → buscar **Beatriz Lima** (`usr-beatriz`)
2. Selecionar papel **Admin**
3. **Verificar:** Todas as 8 ações estão selecionadas
4. Salvar

#### 3.3 — Testar herança via grupo

1. Navegar para Acessos > Papéis
2. Selecionar/criar grupo com **Thiago Martins** (`usr-thiago`)
3. Em Acessos > Objetos > Atendimento > **"Adicionar Membro"**
4. No campo **"Buscar usuário ou grupo..."**, buscar o grupo de Thiago → selecionar → papel **Visualizador**
5. **Verificar:** Ação `can_use_assistant` atribuída ao grupo
6. Salvar
7. Em Acessos > Usuários, clicar em **Thiago** → UsuarioDetailAccountSheet
8. Na seção **Ações**:
   - **Verificar:** `can_use_assistant` aparece com badge verde (via grupo)
   - **Verificar:** Sem ação direta para Thiago

#### 3.4 — Testar bloqueio por entitlement

1. Trocar para persona **Ana Lima** (`2`) — Org Admin Apple
2. Navegar para Acessos → selecionar conta **Apple Main** (`a1`)
3. Aba **Objetos**
4. **Verificar:** MaxDoc **não aparece** na lista — Apple Main não tem `maxdoc.use`, portanto não há objetos MaxDoc criados para esta conta
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
| Papel User tem 4 ações | can_use_assistant, can_share, can_view_sources, can_upload_rag |
| Papel User não tem admin | can_create_assistant, can_configure_agents ausentes |
| Papel Admin tem 8 ações | Todas marcadas sem exceção |
| Herança via grupo | can_use_assistant de Thiago aparece como "via grupo" (verde) |
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
