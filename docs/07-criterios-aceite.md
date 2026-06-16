# Critérios de Aceite

Os critérios abaixo são verificáveis manualmente usando o PersonaSwitcher e o Drizzle Studio (`npm run db:studio`). Cada item tem uma fonte de verdade clara.

---

## DocNix — MaxDoc

### Papéis e Ações

- [ ] **CA-MX-01:** Usuário com papel **Leitor** possui exatamente 6 ações: Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Baixar Documento, Imprimir — e nenhuma outra.
- [ ] **CA-MX-02:** Usuário com papel **Editor** possui exatamente 9 ações: Visualizar, Criar Documento, Editar, Nova Versão, Mover, Cancelar Edição, Baixar Documento, Imprimir, Visualizar Histórico de Versões — e NÃO possui Revisar Documento, Aprovar Documento, Rejeitar Documento nem qualquer ação de aprovação/publicação.
- [ ] **CA-MX-03:** Usuário com papel **Revisor** possui exatamente 4 ações: Visualizar, Revisar Documento, Submeter para Aprovação, Solicitar Revisão — e NÃO possui Criar Documento, Editar ou Aprovar Documento.
- [ ] **CA-MX-04:** Usuário com papel **Aprovador** possui exatamente 17 ações: Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Baixar Documento, Imprimir, Assinatura Eletrônica, Revisar Documento, Aprovar Documento, Rejeitar Documento, Aprovador Documento, Aprovador Substituto Documento, Obsoletetar Documento, Emitir Cópia Controlada, Emitir Cópia Não Controlada, Cópia Controlada Anexos, Ciclo de Aprovação Documentos — e NÃO possui Criar Documento, Editar ou Nova Versão.
- [ ] **CA-MX-05:** Usuário com papel **Administrador** possui todas as ações do catálogo MaxDoc (acesso completo).

> **Atenção:** Os papéis do MaxDoc têm conjuntos **independentes** — Revisor não herda ações de Editor, Aprovador não herda de Revisor. Ao adicionar um membro, o sistema limpa quaisquer permissões anteriores antes de aplicar os defaults do papel escolhido.

### Seleção e Persistência

- [ ] **CA-MX-06:** Ao adicionar um novo membro com papel pré-definido, as ações pré-selecionadas no wizard correspondem exatamente ao conjunto do papel escolhido — sem ações residuais de adições anteriores.
- [ ] **CA-MX-07:** Ao trocar o papel em PermissoesMembroSheet, as ações pré-selecionadas atualizam imediatamente para o conjunto correto do novo papel, descartando as ações do papel anterior.
- [ ] **CA-MX-08:** Ativando o toggle "Personalizado", a seleção de ações pode ser alterada livremente sem restrições do papel.
- [ ] **CA-MX-09:** Ao fechar e reabrir PermissoesMembroSheet com papel "Personalizado", a seleção manual persiste exatamente como foi salva.
- [ ] **CA-MX-10:** As permissões são armazenadas em `component_permissions` com `acao` como string (ex: `"Visualizar"`) — nunca como UUID.
- [ ] **CA-MX-11:** A tabela `instancia_membro_atribuicoes` NÃO recebe novas escritas para objetos MaxDoc/DocAction (modelo FGA puro).

### Grupos

- [ ] **CA-MX-12:** Grupo com papel **Aprovador** concede ações de Aprovador para todos os membros do grupo.
- [ ] **CA-MX-13:** Ações herdadas via grupo aparecem como read-only (badge verde) em PermissoesMembroSheet — não podem ser desmarcadas individualmente.
- [ ] **CA-MX-14:** PermissoesEfetivasSheet exibe a origem de cada ação: "Direto" ou "Via Grupo: [nome do grupo]".

---

## DocNix — DocAction

### Papéis e Ações

- [ ] **CA-DA-01:** Usuário com papel **Colaborador** possui exatamente 6 ações: Visualizar, Criar Ocorrência, Criar Ocorrência 8D, Editar Ocorrência, Vincular Ocorrência, Acompanhar Ocorrência — e NÃO possui Analisar Causa, Aprovar Análise de Causa ou Encerrar Ocorrência.
- [ ] **CA-DA-02:** Usuário com papel **Analista** possui exatamente 11 ações: as 6 do Colaborador mais Categorizar Ocorrência, Analisar Causa, Criar Plano de Ação, Verificar Eficácia, Encaminhar Ocorrência — e NÃO possui Aprovar Análise de Causa ou Encerrar Ocorrência.
- [ ] **CA-DA-03:** Usuário com papel **Aprovador** possui exatamente 14 ações: as 11 do Analista mais Aprovar Análise de Causa, Encerrar Ocorrência, Reprogramar Prazo/Responsável. O Aprovador **inclui** Criar Ocorrência e Analisar Causa (papel cumulativo).
- [ ] **CA-DA-04:** Papéis de Analista e Aprovador são **independentes por membro** — atribuir Aprovador a Leo não altera o papel de Neide.

### Persistência

- [ ] **CA-DA-05:** Papel "Personalizado" em DocAction persiste ao reabrir o sheet com a seleção manual intacta.
- [ ] **CA-DA-06:** `component_permissions.acao` armazena string com nome da ação (ex: `"Analisar Causa"`), não UUID.

---

## Assistente de IA

### Papéis e Ações

- [ ] **CA-AS-01:** Papel **Visualizador** possui exatamente 1 ação: `can_use_assistant` (Usar o assistente).
- [ ] **CA-AS-02:** Papel **Membro** possui exatamente 4 ações: `can_use_assistant`, `can_share_conversation_results`, `can_view_consulted_sources`, `can_upload_rag_sources`.
- [ ] **CA-AS-03:** Papel **Membro** NÃO possui: `can_create_assistant`, `can_configure_agents`, `can_manage_business_scenarios`, `can_manage_users`.
- [ ] **CA-AS-04:** Papel **Administrador** possui todas as 8 ações do Assistente sem exceção.

### Entitlements e Bloqueio

- [ ] **CA-AS-05:** Conta sem `assistant.use` ativo: objetos do Assistente não aparecem na aba Objetos (não há instâncias criadas para módulo sem entitlement).
- [ ] **CA-AS-06:** Com entitlement inativo, o badge "Capability inativa" é exibido ao tentar atribuir permissões globais do componente (seção GLOBAIS — NÍVEL DE CONTA).
- [ ] **CA-AS-07:** Conta Apple (`a1`) exibe objetos PAS Core, Knowledge Base e Assistente na aba Objetos — e NÃO exibe MaxDoc (entitlement `maxdoc.use` inativo).

### Herança via Grupo

- [ ] **CA-AS-08:** Usuário sem permissão direta, mas membro de grupo com `can_use_assistant`, herda a ação — verificado em PermissoesMembroSheet (badge verde "via grupo").
- [ ] **CA-AS-09:** PermissoesEfetivasSheet mostra a ação herdada com o nome do grupo de origem.

---

## Gerais (Todos os Módulos)

### Criar Usuário

- [ ] **CA-GE-01:** Criação de usuário completa sem erros — campo `senha` não é enviado ao banco de dados.
- [ ] **CA-GE-02:** Tentativa de criar usuário com e-mail duplicado retorna mensagem em português: "Este e-mail já está cadastrado na plataforma." — não exibe SQL raw.
- [ ] **CA-GE-03:** Tentativa de criar usuário com username duplicado retorna mensagem em português: "Este nome de usuário já está em uso."
- [ ] **CA-GE-04:** Erro genérico de criação exibe mensagem amigável — não expõe stack trace ou mensagem técnica em inglês.

### PersonaSwitcher

- [ ] **CA-GE-05:** Trocar para **Platform Admin** (Leonardo, `1`) → Sidebar exibe: Organizações, Acessos, Componentes, Canvas Org, Canvas, Schema.
- [ ] **CA-GE-06:** Trocar para **Org Admin** (Ana Lima, `2`) → Sidebar exibe: Organizações, Acessos, Canvas. NÃO exibe Componentes nem Schema.
- [ ] **CA-GE-07:** Trocar para **PAS Architect** (Marcelo Gomes, `3`) → Sidebar exibe apenas: Componentes.
- [ ] **CA-GE-08:** Trocar para **Account Admin** (Carla Santos, `4`) → Sidebar exibe: Acessos, Canvas. NÃO exibe Organizações.
- [ ] **CA-GE-09:** Trocar para **Org Admin DocNix** (Marcelo Ribeiro, `usr-marcelo-c`) → Sidebar exibe: Organizações, Acessos, Canvas.
- [ ] **CA-GE-10:** PersonaSwitcher permanece visível e funcional em todas as páginas.

### Modelo de Dados FGA

- [ ] **CA-GE-11:** Permissões granulares em `component_permissions` têm `acao` como string (nome da ação) — nunca UUID.
- [ ] **CA-GE-12:** Permissão de escopo global (`instancia_id = null`) é distinta de permissão de escopo de instância (`instancia_id = <uuid>`).
- [ ] **CA-GE-13:** Deletar uma permissão remove apenas a entrada correspondente — não afeta outras ações do mesmo usuário/grupo.

### Visualizações de Grafo

- [ ] **CA-GE-14:** Canvas Org (`/canvas-org`) carrega e exibe hierarquia: Org → Contas → Usuários/Grupos sem erro JavaScript.
- [ ] **CA-GE-15:** Canvas (`/canvas`) carrega e exibe grafo de permissões da conta selecionada.
- [ ] **CA-GE-16:** Schema Visualizer (`/schema`) renderiza grafo de tabelas sem erro de carregamento.

### Soft-delete e Status

- [ ] **CA-GE-17:** Conta colocada em quarentena (`DELETE /api/accounts/:id`) não aparece na listagem padrão, mas pode ser restaurada via `PATCH /api/accounts/:id/restaurar`.
- [ ] **CA-GE-18:** Componente inativado continua visível na listagem com badge "Inativo" — não é hard-deletado.
- [ ] **CA-GE-19:** Usuário com `status = 'Inativo'` não consegue ser adicionado como membro de conta ou instância.

---

## Checklist Rápido de Smoke Test

Execute antes de cada demo para verificar funcionalidades críticas:

```
[ ] Switch de persona via PersonaSwitcher funciona
[ ] Acessos > Objetos carrega lista de instâncias
[ ] Abrir instância MaxDoc exibe membros e ações
[ ] Criar novo usuário — sem erro técnico
[ ] Adicionar membro com papel Editor → verificar 9 ações (sem Aprovar)
[ ] Trocar papel Editor → Revisor → verificar 4 ações sem Criar Documento
[ ] Salvar permissão FGA — verificar em Drizzle Studio (acao = string)
[ ] Canvas Org carrega sem erro
[ ] Schema Visualizer carrega sem erro
```
