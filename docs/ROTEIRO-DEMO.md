# Roteiro de Demo — Permissões Granulares

**Público:** Stakeholders  
**Perfis demonstrados:** Org Admin · Account Admin  
**Duração estimada:** 15–20 min  
**URL:** usar o preview do Vercel (branch `feature/grupos-permissoes-docnix-variation`)

---

## Fala de abertura (1 min)

> "O Cockpit controla **quem pode fazer o quê** dentro de cada produto contratado pela empresa. Permissões são definidas por objeto — não por sistema inteiro — e podem ser atribuídas a usuários individuais ou a grupos. Vou mostrar dois perfis de gestão percorrendo os cenários principais."

---

## PARTE 1 — Org Admin: gestão de documentos (MaxDoc)

**Persona:** Org Admin (Docnix) — Marcelo Ribeiro  
**Conta:** Comgas  
**Objeto:** MaxDoc — Gestão Documental Comgas

### Passo 1 · Selecionar persona

- Clicar no switcher de persona (canto inferior direito da tela)
- Selecionar **Org Admin (Docnix)**

> "Estou logado como Marcelo Ribeiro, administrador da organização Docnix. Ele enxerga todas as contas da organização e seus objetos."

---

### Passo 2 · Navegar até o objeto MaxDoc

- Sidebar → **Acessos**
- Aba **Objetos**
- Selecionar **MaxDoc — Gestão Documental Comgas**

> "Aqui vemos todos os usuários e grupos com acesso a este objeto. Cada um tem um papel que define exatamente quais ações pode executar."

---

### Passo 3 · Atribuir papel com ações pré-selecionadas

- Clicar em **Fernando Costa** → abre o painel de permissões
- Mostrar o papel atual e as ações marcadas

> "Quando definimos o papel de **Editor**, o sistema pré-seleciona as ações correspondentes: Visualizar, Criar Documento, Editar, Nova Versão. Não é necessário marcar ação por ação — o papel serve como atalho."

---

### Passo 4 · Trocar papel e ver ações atualizarem

- Ainda no painel do Fernando: trocar para **Revisor**
- Mostrar que as ações mudam: Visualizar, Revisar Documento, Submeter para Aprovação

> "Mudando o papel, as ações se atualizam automaticamente. O gestor pode usar os papéis predefinidos ou personalizar manualmente, marcando só as ações que desejar."

- Fechar sem salvar (ou salvar, dependendo do cenário atual do banco)

---

## PARTE 2 — Grupos e herança de permissões

> "Além de usuários individuais, é possível atribuir permissões a grupos. Todos os membros do grupo herdam as ações automaticamente."

### Passo 5 · Mostrar grupo com papel no objeto

- No mesmo objeto MaxDoc, ir para a aba **Grupos**
- Mostrar o grupo **Vendedores** com papel Aprovador

> "O grupo Vendedores tem papel Aprovador neste objeto. Isso significa que cada membro do grupo pode Aprovar Documento, Ciclo de Aprovação, etc."

---

### Passo 6 · Ações Efetivas: origem de cada permissão

- Na aba **Usuários**, passar o mouse sobre a linha de **Pedro Henrique**
- Clicar nos **três pontinhos** (menu de contexto, coluna Ações) → **Ver permissões efetivas**
- Mostrar a tabela com duas colunas: Ação e Origem

> "Aqui está o painel de auditoria. Cada ação mostra sua origem: **Direto** (badge azul) significa que foi atribuída ao usuário diretamente. **Via Grupo** (badge verde) indica herança pelo grupo Vendedores. Isso permite saber, a qualquer momento, por que um usuário tem acesso a algo."

---

## PARTE 3 — Account Admin: Assistente IA (Santacruz)

**Persona:** Account Admin (Santacruz) — Carla Santos  
**Conta:** Santacruz  
**Objeto:** Assistente Suporte

### Passo 7 · Trocar para Account Admin

- Switcher → **Account Admin (Santacruz)** — Carla Santos

> "Agora estou como Carla, administradora de conta da Santacruz. Diferente do Org Admin, ela só enxerga a sua própria conta — não tem visão da organização inteira."

---

### Passo 8 · Navegar para o objeto Assistente

- Sidebar → **Acessos** → **Objetos**
- Selecionar **Assistente Suporte**

---

### Passo 9 · Papel User: acesso básico

- Abrir **Lucas Oliveira** → mostrar papel **User** com ações:
  - `can_use_assistant`
  - `can_share_conversation_results`
  - `can_view_consulted_sources`
  - `can_upload_rag_sources`

> "Para o Assistente IA, os papéis são mais simples. O papel **User** dá acesso ao uso básico: o usuário pode conversar com o assistente, compartilhar resultados e consultar fontes. Ele **não pode** criar nem configurar assistentes."

---

### Passo 10 · Papel Admin: acesso completo

- Abrir **Beatriz Lima** (ou adicionar alguém como Admin)
- Mostrar todas as 8 ações, incluindo `can_create_assistant`, `can_configure_agents`, `can_manage_users`

> "O papel **Admin** tem acesso irrestrito ao objeto, incluindo criação de assistentes, configuração de agentes e gestão de usuários do objeto."

---

### Passo 11 · Herança via grupo (bônus se o tempo permitir)

- Aba **Grupos** → mostrar **Farmacêuticos** com papel Member
- Abrir Lucas → **Ações Efetivas** → mostrar badge verde "Via Grupo Farmacêuticos"

> "O grupo Farmacêuticos está vinculado a este objeto com papel Member. Lucas é membro do grupo — por isso herda as ações. O painel de Ações Efetivas confirma a origem."

---

## Mensagem de encerramento

> "Em resumo: permissões no Cockpit são **por objeto**, **baseadas em papéis predefinidos** com ações granulares, e podem ser atribuídas a usuários ou grupos. A herança via grupo simplifica a gestão em escala, e o painel de Ações Efetivas garante rastreabilidade completa de todas as permissões."

---

## Pré-requisitos antes da demo

Verificar no banco de dados que os seguintes dados estão presentes:

| O quê | Onde verificar |
|---|---|
| Fernando Costa com papel em MaxDoc Comgas | Acessos → Objetos → MaxDoc (como Org Admin Docnix) |
| Grupo Vendedores vinculado ao MaxDoc Comgas | Aba Grupos no mesmo objeto |
| Pedro Henrique com ações diretas + via Vendedores | Ações Efetivas do Pedro |
| Lucas Oliveira no Assistente Farmacêutico como User | Acessos → Objetos → Assistente (como Account Admin) |
| Beatriz Lima no Assistente como Admin | Mesmo objeto |
| Grupo Farmacêuticos vinculado ao Assistente | Aba Grupos do Assistente |

> **Dica:** rodar `npm run db:seed` antes da demo garante dados limpos e consistentes. Depois basta adicionar manualmente o grupo Farmacêuticos ao Assistente Farmacêutico (dois cliques) para o Passo 11.
