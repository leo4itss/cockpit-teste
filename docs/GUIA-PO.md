# Cockpit ITSS — Guia do Product Owner

**Versão:** PoC (Proof of Concept)
**Data:** Junho 2026
**Repositório:** `cockpit-teste-prod` — branch `feature/grupos-permissoes-docnix-variation`

---

## Índice

1. [O que é o Cockpit ITSS](#1-o-que-é-o-cockpit-itss)
2. [Como acessar e navegar](#2-como-acessar-e-navegar)
3. [Papéis de usuário — quem é quem](#3-papéis-de-usuário--quem-é-quem)
4. [Estrutura da plataforma — entidades principais](#4-estrutura-da-plataforma--entidades-principais)
5. [Módulos da plataforma](#5-módulos-da-plataforma)
   - 5.1 MaxDoc — Gestão de Documentos
   - 5.2 DocAction — Módulo de Ações de Qualidade
   - 5.3 Assistente de IA
6. [Como as permissões funcionam](#6-como-as-permissões-funcionam)
7. [Cenários de teste — passo a passo](#7-cenários-de-teste--passo-a-passo)
   - Cenário 1: MaxDoc — ciclo completo
   - Cenário 2: DocAction — ocorrências de qualidade
   - Cenário 3: Assistente de IA — regras simples
   - Cenário 4: Criar usuário e atribuir acesso
8. [Critérios de aceite](#8-critérios-de-aceite)
9. [Dados de teste disponíveis](#9-dados-de-teste-disponíveis)
10. [Glossário](#10-glossário)

---

## 1. O que é o Cockpit ITSS

O **Cockpit ITSS** é a plataforma de gerenciamento da suite PAS. Ele centraliza tudo que envolve **quem tem acesso a quê** dentro dos módulos contratados por cada cliente.

Em termos práticos, o Cockpit permite:

- **Cadastrar e gerenciar organizações e suas contas** (cada cliente é uma organização que pode ter uma ou mais contas — ex: matriz e filiais)
- **Gerenciar usuários**: criar, editar, atribuir papéis e controlar acesso
- **Definir permissões granulares** em cada módulo: quem pode visualizar, criar, aprovar, administrar
- **Controlar quais módulos cada conta tem direito de usar** (entitlements/licenças)
- **Visualizar graficamente** a estrutura de permissões (Canvas) e o modelo de dados (Schema)

> **Esta é uma versão PoC.** Os dados de autenticação e relações de permissão são mockados — não há login real. Use o PersonaSwitcher (explicado na seção 2) para trocar entre perfis de teste.

---

## 2. Como acessar e navegar

### Acesso

- **URL de produção:** `https://cockpit-teste-prod-5je8hkkjk-grupo-itsss-projects.vercel.app`
- **URL de desenvolvimento local:** `http://localhost:5173`

### PersonaSwitcher — como trocar de perfil

O Cockpit não tem login real nesta versão PoC. No **canto inferior direito** da tela há um botão flutuante com o ícone de usuário — o **PersonaSwitcher**.

Clique nele para escolher qual perfil (persona) você quer simular. A página atualiza automaticamente com as permissões daquele perfil.

**Personas disponíveis para teste:**

| Persona | Nome | Perfil | O que vê |
|---------|------|--------|---------|
| 1 | Leonardo Lins | Platform Admin | Tudo |
| 2 | Ana Lima | Org Admin (Apple) | Organizações, Acessos, Canvas |
| 3 | Marcelo Gomes | PAS Architect | Apenas Componentes |
| 4 | Carla Santos | Account Admin (Santacruz) | Acessos, Canvas |
| Marcelo Ribeiro | Org Admin (Comgas/DocNix) | Organizações, Acessos, Canvas |

> **Para testar DocNix (MaxDoc e DocAction):** use a persona **Marcelo Ribeiro** — ela é o Org Admin da organização Comgas, que tem os dois módulos contratados.
>
> **Para testar o Assistente:** pode usar **Carla Santos** (Santacruz) ou **Marcelo Ribeiro** (Comgas).

### Navegação pelo Sidebar

O sidebar lateral mostra apenas as seções que o perfil ativo tem permissão de ver:

| Seção | O que é |
|-------|---------|
| **Organizações** | CRUD de organizações e contas |
| **Acessos** | Central de permissões — usuários, papéis, objetos |
| **Componentes** | Módulos da plataforma (gerenciado pela ITSS) |
| **Canvas Org** | Visualização gráfica da estrutura da organização |
| **Canvas** | Visualização gráfica das permissões de uma conta |
| **Schema** | Visualizador do modelo de banco de dados |

---

## 3. Papéis de usuário — quem é quem

Existem **5 papéis de plataforma**, do mais ao menos privilegiado:

### Platform Admin
- **Quem é:** Equipe interna da ITSS
- **O que pode:** Tudo. Gerenciar todas as organizações, componentes, arquitetos
- **Exemplo de teste:** Leonardo Lins (persona 1)

### Org Admin
- **Quem é:** Gestor da organização cliente (ex: TI ou Administração da empresa)
- **O que pode:** Gerenciar sua organização — criar contas, adicionar usuários, criar grupos, gerenciar contratos
- **Exemplo de teste:** Ana Lima (Apple), Marcelo Ribeiro (Comgas)

### PAS Architect
- **Quem é:** Arquiteto técnico da ITSS
- **O que pode:** Gerenciar componentes da plataforma; pode visualizar organizações mas não edita dados de clientes
- **Exemplo de teste:** Marcelo Gomes (persona 3)

### Account Admin
- **Quem é:** Gestor de uma conta específica dentro de uma organização
- **O que pode:** Gerenciar usuários e permissões dentro da sua conta
- **Exemplo de teste:** Carla Santos (Santacruz, persona 4)

### Member
- **Quem é:** Usuário final
- **O que pode:** Acesso básico de leitura à sua conta

---

## 4. Estrutura da plataforma — entidades principais

Entender estas entidades é fundamental para navegar no Cockpit:

```
Organização (ex: Comgas)
  └── Conta (ex: Comgas Principal)
        ├── Usuários membros da conta
        ├── Grupos (para atribuição coletiva de permissões)
        ├── Entitlements (quais módulos a conta pode usar)
        └── Objetos / Instâncias (módulos configurados)
               └── Membros do objeto (com papel e ações)
```

### Organização
É o cliente da ITSS. Exemplo: *Comgas*, *Santacruz*, *Apple*.

### Conta
Uma organização pode ter múltiplas contas — por exemplo, uma matriz e filiais, ou departamentos separados. Cada conta tem seus próprios usuários, permissões e módulos contratados.

### Usuário
Pode ser membro de múltiplas contas. O papel dele pode ser diferente em cada conta.

### Grupo
Agrupamento de usuários. Útil para atribuir permissões a várias pessoas de uma vez. Grupos podem ser:
- **Escopo org:** criados pelo Org Admin, herdados por todas as contas da organização
- **Escopo conta:** exclusivos de uma conta, gerenciados pelo Account Admin

### Objeto (Instância)
É um módulo configurado para uma conta específica. Exemplo: *"MaxDoc Comgas"* é uma instância do componente MaxDoc dentro da conta Comgas. Um módulo pode ter várias instâncias em contas diferentes.

### Entitlement (Capability)
Define quais módulos uma conta tem **direito de usar**. Se a conta não tem o entitlement, o módulo aparece como bloqueado na interface.

| Entitlement | Módulo |
|-------------|--------|
| `assistant.use` | Assistente de IA |
| `maxdoc.use` | MaxDoc |
| `docaction.use` | DocAction |
| `knowledge.use` | Base de Conhecimento |
| `analytics.use` | Analytics |

---

## 5. Módulos da plataforma

### 5.1 MaxDoc — Gestão de Documentos

MaxDoc é o módulo de gestão documental da plataforma DocNix. Controla quem pode criar, revisar, aprovar e publicar documentos.

**4 papéis disponíveis:**

| Papel | Ações incluídas |
|-------|----------------|
| **Leitor** | Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Download Documento, Imprimir |
| **Editor** | Leitor + Criar Documento, Editar Documento, Nova Versão, Upload Documento, Editor Documento, Criar Anexo, Editar Anexo, Anexar Arquivos |
| **Revisor** | Editor + Revisar Documento, Submeter para Aprovação, Revisor Documento, Revisar como Substituto Documento |
| **Aprovador** | Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Download Documento, Imprimir, Assinatura Eletrônica, Revisar Documento, Aprovar Documento, Aprovador Documento, Aprovador Substituto Documento, Obsoletetar Documento, Emitir Cópia Controlada, Emitir Cópia Não Controlada, Cópia Controlada Anexos, Ciclo de Aprovação Documentos |
| **Administrador** | Todas as 27 ações |

**Regra importante:** Aprovador não herda as ações de Editor — ele tem seu próprio conjunto. Para um usuário ter capacidades de múltiplos papéis, use o modo **Personalizado** (seleção manual de ações).

**27 ações disponíveis** (selecionáveis individualmente no modo Personalizado):
Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Download Documento, Imprimir, Criar Documento, Editar Documento, Nova Versão, Upload Documento, Editor Documento, Criar Anexo, Editar Anexo, Anexar Arquivos, Assinatura Eletrônica, Revisar Documento, Submeter para Aprovação, Revisor Documento, Revisar como Substituto Documento, Aprovar Documento, Aprovador Documento, Aprovador Substituto Documento, Obsoletetar Documento, Emitir Cópia Controlada, Emitir Cópia Não Controlada, Cópia Controlada Anexos, Ciclo de Aprovação Documentos.

---

### 5.2 DocAction — Módulo de Ações de Qualidade

DocAction gerencia ocorrências de qualidade (não conformidades) e o ciclo de vida das ações corretivas.

**4 papéis disponíveis:**

| Papel | Ações incluídas |
|-------|----------------|
| **Colaborador** | Visualizar, Criar Ocorrência, Criar Ocorrência 8D, Editar Ocorrência, Vincular Ocorrência, Acompanhar Ocorrência |
| **Analista** | Colaborador + Categorizar Ocorrência, Analisar Causa, Criar Plano de Ação, Verificar Eficácia, Encaminhar Ocorrência |
| **Aprovador** | Analista + Aprovar Análise de Causa, Encerrar Ocorrência, Reprogramar Prazo/Responsável |
| **Administrador** | Todas as 14 ações |

**14 ações disponíveis** (selecionáveis individualmente no modo Personalizado):
Visualizar, Criar Ocorrência, Criar Ocorrência 8D, Editar Ocorrência, Vincular Ocorrência, Acompanhar Ocorrência, Categorizar Ocorrência, Analisar Causa, Criar Plano de Ação, Verificar Eficácia, Encaminhar Ocorrência, Aprovar Análise de Causa, Encerrar Ocorrência, Reprogramar Prazo/Responsável.

---

### 5.3 Assistente de IA

Módulo de assistente inteligente. Controla quem pode usar, configurar e administrar o assistente.

**3 papéis disponíveis:**

| Papel | Ações incluídas |
|-------|----------------|
| **Visualizador** | `can_use_assistant` |
| **Usuário** | `can_use_assistant`, `can_share_conversation_results`, `can_view_consulted_sources`, `can_upload_rag_sources` |
| **Administrador** | Todas as 8 ações |

**8 ações disponíveis** (selecionáveis individualmente no modo Personalizado):
`can_use_assistant` (Usar o assistente), `can_share_conversation_results` (Compartilhar resultados), `can_view_consulted_sources` (Ver fontes consultadas), `can_upload_rag_sources` (Upload de fontes RAG), `can_create_assistant` (Criar assistente), `can_configure_agents` (Configurar agentes), `can_manage_business_scenarios` (Gerenciar cenários de negócio), `can_manage_users` (Gerenciar usuários).

---

## 6. Como as permissões funcionam

### Modelo geral

Permissões no Cockpit seguem o modelo **FGA (Fine-Grained Authorization)** — cada permissão é um registro de:

> **Quem** (usuário ou grupo) **pode fazer o quê** (ação) **em qual módulo/objeto**

### Dois escopos de permissão

| Escopo | O que significa |
|--------|----------------|
| **Global (nível conta)** | A permissão vale para TODOS os objetos daquele módulo na conta |
| **Específico (nível objeto)** | A permissão vale apenas para aquele objeto específico |

**Exemplo:** Um usuário com ação `can_use_assistant` no escopo global acessa TODOS os assistentes da conta. Um usuário com a mesma ação apenas no objeto "Assistente Vanessa" só acessa aquele assistente.

### Herança via grupo

Quando uma ação é atribuída a um **grupo**, todos os membros do grupo herdam aquela ação automaticamente. Na interface:
- Ações **diretas** aparecem em **azul**
- Ações **herdadas de grupo** aparecem em **verde** (read-only — não podem ser desmarcadas individualmente)

### Papel vs. Ação vs. Personalizado

- **Papel:** conjunto predefinido de ações (ex: Editor = Visualizar + Criar + Editar + ...)
- **Ação:** capacidade individual (ex: "Aprovar Documento")
- **Personalizado:** quando nenhum papel predefinido é adequado — o administrador seleciona as ações manualmente

### Onde verificar permissões

- **PermissoesMembroSheet:** abre ao clicar em um membro dentro de um objeto — mostra as ações daquele usuário naquele objeto específico
- **UsuarioDetailAccountSheet → seção Ações:** mostra todas as ações do usuário na conta (diretas + via grupos)
- **PermissoesEfetivasSheet:** lista completa com a origem de cada ação (direto / via grupo)

---

## 7. Cenários de teste — passo a passo

> **Antes de começar:** Acesse a URL da aplicação e verifique se o PersonaSwitcher está visível no canto inferior direito.

---

### Cenário 1 — MaxDoc: ciclo completo de permissões

**Objetivo:** Validar atribuição de papéis, troca de papel, personalização de ações e herança via grupo no MaxDoc.

**Setup inicial:**
1. Abrir o PersonaSwitcher → selecionar **Marcelo Ribeiro** (Org Admin DocNix)
2. Navegar para **Acessos** no sidebar
3. Confirmar que a conta **Comgas** está selecionada no dropdown no topo da página

---

**1.1 — Verificar que o módulo está disponível**

1. Clicar na aba **Objetos**
2. Localizar **"MaxDoc Comgas"** na lista
3. ✅ **Esperado:** O objeto aparece sem nenhum ícone de bloqueio (entitlement `maxdoc.use` está ativo)

---

**1.2 — Adicionar usuário com papel Editor**

1. Clicar no objeto **MaxDoc Comgas**
2. No painel que abre, clicar em **"Adicionar Membro"**
3. Buscar e selecionar o usuário **Fernando**
4. Selecionar o papel **Editor** no dropdown
5. ✅ **Verificar antes de salvar:** As ações pré-selecionadas devem incluir: *Visualizar, Criar Documento, Editar, Nova Versão, Mover, Cancelar Edição, Baixar Documento, Imprimir, Visualizar Histórico de Versões*
6. ✅ **Verificar:** As ações de Aprovador (*Aprovar Documento, Rejeitar Documento*) **não** estão selecionadas
7. Clicar em **Salvar**

---

**1.3 — Trocar o papel do usuário para Revisor**

1. Com o painel do MaxDoc Comgas aberto, clicar no nome de **Fernando**
2. O painel de ações do membro abre
3. Trocar o papel de **Editor** para **Revisor** no selector
4. ✅ **Verificar:** As ações atualizam automaticamente — aparecem: *Visualizar, Revisar Documento, Submeter para Aprovação, Solicitar Revisão*
5. ✅ **Verificar:** *Criar Documento* e *Editar* **não** aparecem mais
6. Salvar

---

**1.4 — Adicionar grupo com papel Aprovador**

1. No painel do MaxDoc Comgas, clicar em **"Adicionar Membro"**
2. No campo **"Buscar usuário ou grupo..."**, digitar o nome do grupo desejado
3. Selecionar o grupo nos resultados
4. Selecionar o papel **Aprovador**
5. ✅ **Verificar:** Ações pré-selecionadas: Visualizar, Ler Todos, Leitor Documento, Leitor Anexos, Download Documento, Imprimir, Assinatura Eletrônica, Revisar Documento, Aprovar Documento, Aprovador Documento, Aprovador Substituto Documento, Obsoletetar Documento, Emitir Cópia Controlada, Emitir Cópia Não Controlada, Cópia Controlada Anexos, Ciclo de Aprovação Documentos
6. ✅ **Verificar:** Aprovador NÃO tem Criar Documento nem Editar Documento
7. Salvar

---

**1.5 — Testar modo Personalizado**

1. Clicar em **Fernando** no painel do MaxDoc → painel de ações abre
2. Ativar o toggle **"Personalizado"**
3. Desmarcar "Submeter para Aprovação" e marcar "Criar Documento"
4. ✅ **Verificar:** O seletor de papel mostra "Personalizado"
5. Salvar
6. Fechar o painel e clicar em **Fernando** novamente
7. ✅ **Verificar:** A seleção personalizada persiste — *Revisar Documento + Criar Documento* marcados, *Submeter para Aprovação* desmarcado

---

**1.6 — Verificar acesso por instância**

1. Ir para **Acessos > Usuários**
2. Clicar em **Fernando**
3. Na seção **Ações > POR INSTÂNCIA**, verificar:
4. ✅ **"Gestão Documental Comgas"** aparece uma única vez com o badge do papel atual (ex: "Personalizado", "Revisor")
5. ✅ Clicar em **"Editar"** ao lado da instância para abrir o painel de ações e ver quais ações estão selecionadas
6. ✅ No painel de ações do membro, as ações herdadas via grupo aparecem desabilitadas (não podem ser desmarcadas individualmente)

---

### Cenário 2 — DocAction: ocorrências de qualidade

**Objetivo:** Validar que os papéis de Analista e Aprovador são independentes, e que o modo Personalizado persiste corretamente.

**Setup inicial:**
- Persona: **Marcelo Ribeiro** (Org Admin DocNix)
- Conta: Comgas

---

**2.1 — Adicionar Analista**

1. Acessos > Objetos > clicar em **"DocAction Comgas"**
2. **"Adicionar Membro"** → selecionar **Neide**
3. Papel: **Analista**
4. ✅ **Verificar ações pré-selecionadas:** Visualizar, Criar Ocorrência, Analisar Causa, Criar Plano de Ação, Atribuir Responsável, Comentar
5. ✅ **Verificar que NÃO estão:** Aprovar Análise de Causa, Encerrar
6. Salvar

---

**2.2 — Adicionar Aprovador (usuário diferente)**

1. **"Adicionar Membro"** → selecionar **Leo**
2. Papel: **Aprovador**
3. ✅ **Verificar ações:** Visualizar, Aprovar Análise de Causa, Aprovar Plano de Ação, Encerrar
4. ✅ **Verificar que NÃO estão:** Criar Ocorrência, Analisar Causa
5. Salvar

---

**2.3 — Confirmar independência dos papéis**

1. Clicar em **Neide** → verificar papel Analista com suas ações
2. Clicar em **Leo** → verificar papel Aprovador com suas ações
3. ✅ **Verificar:** Alterar o papel de Neide não afeta o papel de Leo, e vice-versa

---

**2.4 — Personalizar ações de Neide**

1. Clicar em **Neide** → ativar **"Personalizado"**
2. Manter apenas: **Analisar Causa** + **Verificar Eficácia**
3. Desmarcar todo o resto
4. Salvar
5. Fechar e reabrir o painel de Neide
6. ✅ **Verificar:** Apenas *Visualizar + Analisar Causa + Verificar Eficácia* marcados

---

### Cenário 3 — Assistente de IA

**Objetivo:** Validar papéis (User sem acesso admin), herança via grupo, e bloqueio quando o módulo não está contratado.

**Setup inicial:**
- Persona: **Carla Santos** (Account Admin Santacruz, persona 4)
- Conta: Santacruz

---

**3.1 — Adicionar usuário com papel User**

1. Acessos > Objetos > clicar em **"Atendimento"** (instância do Assistente IA)
2. **"Adicionar Membro"** → selecionar **Lucas Oliveira**
3. Papel: **User**
4. ✅ **Verificar 4 ações:** `can_use_assistant`, `can_share_conversation_results`, `can_view_consulted_sources`, `can_upload_rag_sources`
5. ✅ **Verificar que NÃO estão:** `can_create_assistant`, `can_configure_agents`, `can_customize_ai`, `can_manage_users`
6. Salvar

---

**3.2 — Adicionar Admin (todas as ações)**

1. **"Adicionar Membro"** → selecionar **Beatriz Lima**
2. Papel: **Admin**
3. ✅ **Verificar:** Todas as 8 ações estão selecionadas
4. Salvar

---

**3.3 — Herança via grupo**

1. Navegar para **Acessos > Papéis**
2. Verificar se **Thiago Martins** está em algum grupo. Se não, criar um grupo e adicioná-lo
3. Voltar para Acessos > Objetos > Atendimento > **"Adicionar Membro"**
4. No campo **"Buscar usuário ou grupo..."**, buscar o grupo de Thiago → selecionar → papel **Visualizador**
5. Salvar
6. Ir para **Acessos > Usuários** → clicar em **Thiago Martins**
7. ✅ **Verificar na seção Ações:** `can_use_assistant` aparece em verde ("via grupo: [nome do grupo]")
8. ✅ **Verificar:** Nenhuma ação direta para Thiago — a ação vem do grupo

---

**3.4 — Verificar bloqueio por entitlement ausente**

1. Trocar para persona **Ana Lima** (persona 2, Org Admin Apple)
2. Navegar para Acessos → conta **Apple Main**
3. Aba **Objetos**
4. ✅ **Verificar:** Se algum componente MaxDoc aparecer, deve ter badge de "Capability inativa" (Apple Main não tem `maxdoc.use`)
5. Tentar clicar para atribuir permissão → ✅ **Verificar:** Seleção está bloqueada

---

**3.5 — Verificar sidebar por papel**

Trocar o PersonaSwitcher para cada persona e verificar o sidebar:

| Persona | Sidebar esperado |
|---------|----------------|
| Leonardo (1) | Organizações, Acessos, Componentes, Canvas Org, Canvas, Schema |
| Ana Lima (2) | Organizações, Acessos, Canvas |
| Marcelo Gomes (3) | Componentes (apenas) |
| Carla Santos (4) | Acessos, Canvas |
| Marcelo Ribeiro | Organizações, Acessos, Canvas |

---

### Cenário 4 — Criar usuário e atribuir acesso (onboarding)

**Objetivo:** Testar o fluxo completo de onboarding: criar usuário, tratar erros de duplicidade, e atribuir ao módulo.

**Setup inicial:**
- Persona: **Marcelo Ribeiro** (Org Admin DocNix)

---

**4.1 — Criar usuário com sucesso**

1. Acessos > Usuários > **"Criar Usuário"**
2. Preencher todos os campos:
   - Nome: `João Teste`
   - Username: `joao.teste`
   - E-mail: `joao.teste@comgas.com.br`
   - Papel na conta: `member`
3. Salvar
4. ✅ **Verificar:** Usuário criado sem nenhuma mensagem de erro

---

**4.2 — Testar duplicidade de e-mail**

1. Tentar criar novamente com o mesmo e-mail: `joao.teste@comgas.com.br`
2. ✅ **Verificar:** Mensagem de erro amigável: *"Este e-mail já está cadastrado na plataforma."*
3. ✅ **Verificar que NÃO aparece:** código SQL, stack trace ou mensagem técnica em inglês

---

**4.3 — Testar duplicidade de username**

1. Tentar criar um usuário com username `joao.teste` mas e-mail diferente
2. ✅ **Verificar:** Mensagem de erro: *"Este nome de usuário já está em uso."*

---

**4.4 — Atribuir usuário ao MaxDoc**

1. Acessos > Objetos > **MaxDoc Comgas**
2. **"Adicionar Membro"** → buscar **João Teste**
3. Papel: **Leitor**
4. ✅ **Verificar ações pré-selecionadas:** Visualizar, Baixar Documento, Imprimir, Visualizar Histórico de Versões
5. Salvar
6. ✅ **Verificar:** João Teste aparece na lista de membros do MaxDoc Comgas

---

## 8. Critérios de aceite

### MaxDoc

| # | Critério | Como verificar |
|---|---------|----------------|
| MX-01 | Papel **Leitor** tem exatamente 4 ações: Visualizar, Baixar, Imprimir, Ver Histórico | Adicionar membro com papel Leitor e conferir seleção |
| MX-02 | Papel **Editor** não inclui Aprovar ou Publicar | Adicionar membro com papel Editor e conferir ausência |
| MX-03 | Trocar papel atualiza ações automaticamente | Mudar Editor → Revisor e verificar mudança |
| MX-04 | Modo Personalizado persiste ao reabrir | Salvar seleção manual, fechar e reabrir |
| MX-05 | Grupo com papel Aprovador concede ações a todos os membros | Adicionar grupo, verificar herança para membro do grupo |
| MX-06 | Ações via grupo aparecem em verde (read-only) | Abrir PermissoesMembroSheet de usuário com herança de grupo |
| MX-07 | Origem de cada ação visível (Direto / Via Grupo) | Verificar seção Ações no detalhe do usuário |

### DocAction

| # | Critério | Como verificar |
|---|---------|----------------|
| DA-01 | Papel **Analista** não inclui Aprovar ou Encerrar | Adicionar Analista e conferir ações |
| DA-02 | Papel **Aprovador** não inclui Criar Ocorrência ou Analisar Causa | Adicionar Aprovador e conferir ações |
| DA-03 | Alterar papel de Neide não afeta o papel de Leo | Conferir PermissoesMembroSheet de cada um |
| DA-04 | Papel Personalizado em DocAction persiste | Salvar seleção, fechar, reabrir |

### Assistente de IA

| # | Critério | Como verificar |
|---|---------|----------------|
| AS-01 | Papel **User** tem exatamente 4 ações | Verificar seleção ao adicionar membro com papel User |
| AS-02 | Papel **User** não tem `can_create_assistant` nem `can_configure_agents` | Confirmar ausência |
| AS-03 | Papel **Admin** tem todas as 8 ações | Adicionar Admin e verificar |
| AS-04 | Herança via grupo funciona | Thiago herda `can_use_assistant` do grupo (verde) |
| AS-05 | Entitlement inativo bloqueia o componente | Acessar conta sem `assistant.use` e verificar badge |

### Gerais

| # | Critério | Como verificar |
|---|---------|----------------|
| GE-01 | Criar usuário funciona sem erro técnico | Criar usuário e verificar ausência de erros |
| GE-02 | E-mail duplicado → mensagem amigável em português | Tentar criar com e-mail já existente |
| GE-03 | Username duplicado → mensagem amigável em português | Tentar criar com username já existente |
| GE-04 | Sidebar correto para cada papel | Testar cada persona no PersonaSwitcher |
| GE-05 | Canvas Org carrega sem erro | Trocar para Leonardo (persona 1) → Canvas Org |
| GE-06 | Canvas carrega sem erro | Navegar para Canvas com qualquer org admin |
| GE-07 | Conta em quarentena não aparece na listagem padrão | Deletar conta e verificar que sumiu da lista |

---

## 9. Dados de teste disponíveis

### Organizações

| Nome | ID | Módulos |
|------|----|---------|
| Comgas (DocNix) | `org-docnix` | MaxDoc, DocAction, Assistente |
| Santacruz | `2` | MaxDoc, DocAction, Assistente, Analytics |
| Apple | `1` | Assistente, Base de Conhecimento, Analytics |

### Usuários de teste (Comgas)

| Nome | Papel atual |
|------|-------------|
| Fernando | Membro |
| Neide | Membro |
| Leo | Membro |

### Usuários de teste (Santacruz)

| Nome | Papel atual |
|------|-------------|
| Lucas Oliveira | Membro |
| Beatriz Lima | Membro |
| Thiago Martins | Membro |

### Instâncias (objetos) disponíveis

| Nome | Módulo | Conta |
|------|--------|-------|
| MaxDoc Comgas | MaxDoc | Comgas |
| DocAction Comgas | DocAction | Comgas |
| Assistente Vanessa | Assistente IA | Comgas |
| Assistente CEO | Assistente IA | Comgas |
| MaxDoc Santacruz | MaxDoc | Santacruz |
| DocAction Santacruz | DocAction | Santacruz |
| Atendimento | Assistente IA | Santacruz |

---

## 10. Glossário

| Termo | Significado |
|-------|-------------|
| **Cockpit** | Esta plataforma de gerenciamento da ITSS |
| **PAS** | Plataforma ITSS — a suite completa de produtos |
| **Organização** | Um cliente da ITSS (ex: Comgas, Santacruz) |
| **Conta** | Divisão dentro de uma organização (ex: matriz, filial) |
| **Entitlement / Capability** | Licença que habilita um módulo para uma conta |
| **Componente** | Módulo da plataforma (MaxDoc, DocAction, Assistente, etc.) |
| **Instância / Objeto** | Um componente configurado para uma conta específica |
| **Papel** | Conjunto predefinido de ações (ex: Editor, Revisor) |
| **Ação** | Capacidade individual (ex: "Aprovar Documento") |
| **Personalizado** | Modo de seleção manual de ações, sem usar papel predefinido |
| **FGA** | Fine-Grained Authorization — modelo de permissões granulares |
| **Escopo Global** | Permissão que vale para todos os objetos de um módulo na conta |
| **Escopo Objeto** | Permissão que vale apenas para um objeto específico |
| **Herança de grupo** | Membro de grupo recebe automaticamente as ações atribuídas ao grupo |
| **PersonaSwitcher** | Componente (canto inferior direito) para trocar entre perfis de teste |
| **PoC** | Proof of Concept — versão de validação, sem autenticação real |
| **DocNix** | Produto da ITSS que engloba MaxDoc e DocAction |
