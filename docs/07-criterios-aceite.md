# Critérios de Aceite

Os critérios abaixo são verificáveis manualmente usando o PersonaSwitcher e o Drizzle Studio (`npm run db:studio`). Cada item tem uma fonte de verdade clara.

---

## DocNix — MaxDoc

### Papéis e Ações

- [ ] **CA-MX-01:** Usuário com papel **Leitor** possui exatamente as ações: Visualizar, Baixar Documento, Imprimir, Visualizar Histórico de Versões — e nenhuma outra.
- [ ] **CA-MX-02:** Usuário com papel **Editor** possui as ações de Leitor mais: Criar Documento, Editar, Nova Versão, Mover, Cancelar Edição — e NÃO possui Revisar, Aprovar ou Publicar.
- [ ] **CA-MX-03:** Usuário com papel **Revisor** possui as ações de Leitor mais: Revisar Documento, Submeter para Aprovação, Solicitar Revisão — e NÃO possui Criar Documento ou Aprovar.
- [ ] **CA-MX-04:** Usuário com papel **Aprovador** possui as ações de Leitor mais: Aprovar Documento, Rejeitar Documento, Ciclo de Aprovação Documentos, Emitir Cópia Controlada — e NÃO possui Criar Documento ou Revisar.
- [ ] **CA-MX-05:** Usuário com papel **Administrador** possui todas as 27 ações do catálogo MaxDoc.

### Seleção e Persistência

- [ ] **CA-MX-06:** Ao trocar o papel em PermissoesMembroSheet, as ações pré-selecionadas atualizam imediatamente para o conjunto correto do novo papel.
- [ ] **CA-MX-07:** Ativando o toggle "Personalizado", a seleção de ações pode ser alterada livremente sem restrições do papel.
- [ ] **CA-MX-08:** Ao fechar e reabrir PermissoesMembroSheet com papel "Personalizado", a seleção manual persiste exatamente como foi salva.
- [ ] **CA-MX-09:** As permissões são armazenadas em `component_permissions` com `acao` como string (ex: `"Visualizar"`) — nunca como UUID.
- [ ] **CA-MX-10:** A tabela `instancia_membro_atribuicoes` NÃO recebe novas escritas para objetos MaxDoc/DocAction (modelo FGA puro).

### Grupos

- [ ] **CA-MX-11:** Grupo com papel **Aprovador** concede ações de Aprovador para todos os membros do grupo.
- [ ] **CA-MX-12:** Ações herdadas via grupo aparecem como read-only (badge verde) em PermissoesMembroSheet — não podem ser desmarcadas individualmente.
- [ ] **CA-MX-13:** PermissoesEfetivasSheet exibe a origem de cada ação: "Direto" ou "Via Grupo: [nome do grupo]".

---

## DocNix — DocAction

### Papéis e Ações

- [ ] **CA-DA-01:** Usuário com papel **Colaborador** possui: Visualizar, Criar Ocorrência, Comentar — e NÃO possui Analisar Causa, Aprovar ou Encerrar.
- [ ] **CA-DA-02:** Usuário com papel **Analista** possui as ações de Colaborador mais: Analisar Causa, Criar Plano de Ação, Atribuir Responsável — e NÃO possui Aprovar Análise de Causa ou Encerrar.
- [ ] **CA-DA-03:** Usuário com papel **Aprovador** possui: Visualizar, Aprovar Análise de Causa, Aprovar Plano de Ação, Encerrar — e NÃO possui Criar Ocorrência ou Analisar Causa.
- [ ] **CA-DA-04:** Papéis de Analista e Aprovador são **independentes** — atribuir um não altera o outro (papéis são por membro, não globais).

### Persistência

- [ ] **CA-DA-05:** Papel "Personalizado" em DocAction persiste ao reabrir o sheet com a seleção manual intacta.
- [ ] **CA-DA-06:** `component_permissions.acao` armazena string com nome da ação (ex: `"Analisar Causa"`), não UUID.

---

## Assistente de IA

### Papéis e Ações

- [ ] **CA-AS-01:** Papel **Viewer** possui exatamente: `can_use_assistant`, `can_view_consulted_sources` — 2 ações.
- [ ] **CA-AS-02:** Papel **User** possui exatamente: `can_use_assistant`, `can_view_consulted_sources`, `can_share_conversation_results`, `can_upload_rag_sources` — 4 ações.
- [ ] **CA-AS-03:** Papel **User** NÃO possui: `can_create_assistant`, `can_configure_agents`, `can_customize_ai`, `can_manage_users`.
- [ ] **CA-AS-04:** Papel **Admin** possui todas as 8 ações do Assistente sem exceção.

### Entitlements e Bloqueio

- [ ] **CA-AS-05:** Quando `assistant.use` não está ativo na conta, o componente Assistente aparece com badge "Capability inativa" em Acessos > Objetos.
- [ ] **CA-AS-06:** Com entitlement inativo, a seleção de ações no componente está bloqueada (não é possível atribuir permissões).
- [ ] **CA-AS-07:** Ativar o entitlement `assistant.use` na conta desbloqueia o componente imediatamente (sem necessidade de reload forçado).

### Herança via Grupo

- [ ] **CA-AS-08:** Usuário sem permissão direta, mas membro de grupo com `can_use_assistant`, herda a ação — verificado em UsuarioDetailAccountSheet (badge verde "via grupo").
- [ ] **CA-AS-09:** PermissoesEfetivasSheet mostra a ação herdada com o nome do grupo de origem.

---

## Gerais (Todos os Módulos)

### Criar Usuário

- [ ] **CA-GE-01:** Criação de usuário completa sem erros — campo `senha` não é enviado ao banco de dados.
- [ ] **CA-GE-02:** Tentativa de criar usuário com e-mail duplicado retorna mensagem em português: "Este e-mail já está cadastrado na plataforma." — não exibe SQL raw.
- [ ] **CA-GE-03:** Tentativa de criar usuário com username duplicado retorna mensagem em português: "Este nome de usuário já está em uso."
- [ ] **CA-GE-04:** Erro genérico de criação exibe: "Não foi possível criar o usuário. Tente novamente." — não expõe stack trace.

### PersonaSwitcher

- [ ] **CA-GE-05:** Trocar para **Platform Admin** (Leonardo) → Sidebar exibe: Organizações, Acessos, Componentes, Canvas Org, Canvas, Schema.
- [ ] **CA-GE-06:** Trocar para **Org Admin** (Ana Lima) → Sidebar exibe: Organizações, Acessos, Canvas. NÃO exibe Componentes nem Schema.
- [ ] **CA-GE-07:** Trocar para **PAS Architect** (Marcelo Gomes) → Sidebar exibe apenas: Componentes.
- [ ] **CA-GE-08:** Trocar para **Account Admin** (Carla Santos) → Sidebar exibe: Acessos, Canvas. NÃO exibe Organizações.
- [ ] **CA-GE-09:** PersonaSwitcher permanece visível e funcional em todas as páginas.

### Modelo de Dados FGA

- [ ] **CA-GE-10:** Permissões granulares em `component_permissions` têm `acao` como string (nome da ação) — nunca UUID.
- [ ] **CA-GE-11:** Permissão de escopo global (`instancia_id = null`) é distinta de permissão de escopo de instância (`instancia_id = <uuid>`).
- [ ] **CA-GE-12:** Deletar uma permissão remove apenas a entrada correspondente — não afeta outras ações do mesmo usuário/grupo.

### Visualizações de Grafo

- [ ] **CA-GE-13:** Canvas Org (`/canvas-org`) carrega e exibe hierarquia: Org → Contas → Usuários/Grupos sem erro JavaScript.
- [ ] **CA-GE-14:** Canvas (`/canvas`) carrega e exibe grafo de permissões da conta selecionada.
- [ ] **CA-GE-15:** Schema Visualizer (`/schema`) renderiza grafo de tabelas sem erro de carregamento.

### Soft-delete e Status

- [ ] **CA-GE-16:** Conta colocada em quarentena (`DELETE /api/accounts/:id`) não aparece na listagem padrão, mas pode ser restaurada via `PATCH /api/accounts/:id/restaurar`.
- [ ] **CA-GE-17:** Componente inativado continua visível na listagem com badge "Inativo" — não é hard-deletado.
- [ ] **CA-GE-18:** Usuário com `status = 'Inativo'` não consegue ser adicionado como membro de conta ou instância.

---

## Checklist Rápido de Smoke Test

Execute antes de cada deploy para verificar funcionalidades críticas:

```
[ ] Login/switch de persona via PersonaSwitcher funciona
[ ] Acessos > Objetos carrega lista de instâncias
[ ] Abrir instância MaxDoc exibe membros e ações
[ ] Criar novo usuário — sem erro "Failed query"
[ ] Adicionar membro a instância com papel pré-definido
[ ] Salvar permissão FGA — verificar em Drizzle Studio
[ ] Canvas Org carrega sem erro
[ ] Schema Visualizer carrega sem erro
```
