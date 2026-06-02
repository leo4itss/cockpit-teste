# Guia Completo — Sistema de Permissões do Cockpit ITSS

**Versão:** 1.0  
**Data:** 02/06/2026  
**Público-alvo:** Qualquer pessoa que precise entender, testar ou usar o sistema de permissões do Cockpit ITSS.

---

## Sumário

1. [O que é o Cockpit ITSS?](#1-o-que-é-o-cockpit-itss)
2. [Como o sistema de permissões funciona](#2-como-o-sistema-de-permissões-funciona)
3. [Personas — quem são os usuários](#3-personas--quem-são-os-usuários)
4. [Tabela de capacidades por persona](#4-tabela-de-capacidades-por-persona)
5. [Jornadas de usuário](#5-jornadas-de-usuário)
6. [Cenários de teste](#6-cenários-de-teste)
7. [Critérios de aceite](#7-critérios-de-aceite)
8. [Como navegar no PoC](#8-como-navegar-no-poc)
9. [Glossário](#9-glossário)
10. [FAQ](#10-faq)

---

## 1. O que é o Cockpit ITSS?

O **Cockpit ITSS** é a plataforma de back-office para gestão de organizações clientes do Grupo ITSS. Por ele é possível:

- Cadastrar e gerenciar **organizações** e suas **contas**
- Configurar **soluções**, **planos** e **contratos**
- Gerenciar **usuários**, **grupos** e suas **permissões de acesso**
- Configurar **componentes** (módulos de software) e suas **instâncias** por conta
- Visualizar o grafo de permissões de uma conta via **Canvas**

### Estrutura hierárquica

```
Organização (ex: Comgas S.A.)
  └── Conta (ex: Comgas — acc-comgas)
        ├── Usuários membros
        ├── Grupos de usuários
        └── Instâncias de componentes
              ├── Assistente Vanessa (Assistente de IA)
              ├── Workspace Vendas (Base de Conhecimento)
              ├── Gestão Documental Comgas (MaxDoc ← DocNix)
              └── Ocorrências Comgas (DocAction ← DocNix)
```

---

## 2. Como o sistema de permissões funciona

### A pergunta central

Todo o sistema responde a uma única pergunta:

> **"Pode o Sujeito X executar a Ação Y sobre o Recurso Z?"**

**Exemplo prático:**
> Pode o usuário *Fernando Costa* executar a ação *Aprovar Documento* sobre a instância *Gestão Documental Comgas*?

### Dois modelos de permissão

O cockpit suporta dois modelos, dependendo do tipo de componente:

#### Modelo FGA (Assistente de IA, Base de Conhecimento, Analytics)

Usa **níveis de acesso coarse-grained** (amplos):

| Nível | O que pode fazer |
|-------|-----------------|
| **Viewer** | Apenas leitura — visualiza o conteúdo |
| **Member** | Uso padrão — usa o componente com ações básicas |
| **Admin** | Acesso completo — configura, gerencia usuários, administra |

Cada nível habilita um conjunto fixo de ações no FGA (ex: `can_use_assistant`, `can_upload_rag_sources`).

#### Modelo DocNix (MaxDoc, DocAction)

Usa **atribuições granulares** — cada usuário recebe exatamente as ações que precisa:

**MaxDoc (12 ações disponíveis):**
Criar Documento · Editar Documento · Excluir Documento · Revisar Documento · Aprovar Documento · Obsoletetar Documento · Ler Todos os Documentos · Imprimir · Cópia Controlada · Emitir Cópia Não Controlada · Tabelas Administrativas · Administrar MaxDoc

**DocAction (8 ações disponíveis):**
Criar Ocorrência · Categorizar Ocorrência · Analisar Causa · Aprovar Análise · Criar Plano de Ação · Verificar Eficácia · Encerrar Ocorrência · Administrar DocAction

### Regra de acesso efetivo

Para um usuário acessar uma instância, **duas condições** devem ser verdadeiras simultaneamente:

```
Acesso liberado = Capacidade ativa na conta  AND  Membro da instância
```

1. **Capacidade (Entitlement):** a conta precisa ter a capability ativa (ex: `maxdoc.use`). Configurado em **Detalhes da Conta → Capacidades**.
2. **Membro da instância:** o usuário ou grupo do usuário deve estar na lista de membros da instância com pelo menos uma ação atribuída.

> ⚠️ Habilitar uma capacidade **não cria instâncias** nem dá acesso automático. É apenas um pré-requisito.

### Herança via Grupos

Um usuário herda as ações de todos os grupos dos quais faz parte:

```
Fernando Costa
  ├── Ações diretas: [Criar Ocorrência, Categorizar Ocorrência]
  ├── Herdadas do Grupo "Analistas de Qualidade": [Analisar Causa, Aprovar Análise]
  └── Ações Efetivas: [Criar, Categorizar, Analisar, Aprovar]
```

---

## 3. Personas — quem são os usuários

O sistema tem 5 perfis de acesso. No PoC, é possível alternar entre eles pelo **PersonaSwitcher** (botão no canto inferior direito).

### Platform Admin
**Quem é:** Equipe interna do Grupo ITSS. Acesso irrestrito a tudo.  
**Usuário de teste:** `usr-platform` (Leo Ferreira)  
**O que faz:** Cadastra organizações, componentes, tipos de licença. Gerencia tudo.

### PAS Architect
**Quem é:** Arquiteto de soluções ITSS. Configura componentes técnicos.  
**Usuário de teste:** `usr-pas` (Marcelo Gomes)  
**O que faz:** Define componentes, catálogo de atribuições DocNix, lê organizações.

### Org Admin
**Quem é:** Administrador da organização cliente. Gerencia a org e suas contas.  
**Usuário de teste:** `usr-marcelo-c` (Marcelo Ribeiro — Org Admin Docnix/Comgas)  
**O que faz:** Gerencia contas, usuários, grupos, contratos e soluções da organização.

### Account Admin
**Quem é:** Administrador de uma conta específica dentro da organização.  
**Usuário de teste:** `usr-carla` (Carla Santos — Account Admin Santacruz)  
**O que faz:** Gerencia usuários e grupos da sua conta, configura membros de instâncias.

### Member
**Quem é:** Usuário final com acesso básico à sua conta.  
**Usuário de teste:** `usr-fernando` (Fernando Costa — Comgas)  
**O que faz:** Visualiza informações da própria conta. Não gerencia nada.

---

## 4. Tabela de capacidades por persona

### Navegação (Sidebar)

| Seção | Platform Admin | PAS Architect | Org Admin | Account Admin | Member |
|-------|:-:|:-:|:-:|:-:|:-:|
| Organizações | ✅ | ✅ | ✅ (só a sua) | ❌ | ❌ |
| Acessos | ✅ | ❌ | ✅ | ✅ | ✅ |
| Componentes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Canvas | ✅ | ❌ | ✅ | ✅ (só a sua conta) | ❌ |
| Canvas Org | ✅ | ❌ | ❌ | ❌ | ❌ |
| Schema | ✅ | ❌ | ❌ | ❌ | ❌ |

### Organizações

| Ação | Platform Admin | PAS Architect | Org Admin | Account Admin |
|------|:-:|:-:|:-:|:-:|
| Ver lista de organizações | ✅ todas | ✅ todas | ✅ só a sua | ❌ |
| Criar organização | ✅ | ❌ | ❌ | ❌ |
| Editar organização | ✅ | ❌ | ✅ (a sua) | ❌ |
| Inativar organização | ✅ | ❌ | ❌ | ❌ |
| Ver contas da org | ✅ | ✅ | ✅ | ❌ |

### Contas

| Ação | Platform Admin | Org Admin | Account Admin |
|------|:-:|:-:|:-:|
| Criar conta | ✅ | ✅ | ❌ |
| Ver detalhes da conta | ✅ | ✅ | ✅ (a sua) |
| Gerenciar capacidades | ✅ | ✅ | ❌ |
| Promover Account Admin | ✅ | ✅ | ❌ |

### Usuários

| Ação | Platform Admin | Org Admin | Account Admin | Member |
|------|:-:|:-:|:-:|:-:|
| Ver lista de usuários da org | ✅ | ✅ | ❌ | ❌ |
| Criar usuário | ✅ | ❌ | ❌ | ❌ |
| Convidar usuário para conta | ✅ | ✅ | ✅ | ❌ |
| Remover usuário da conta | ✅ | ✅ | ✅ | ❌ |
| Atribuir Ações a usuário | ✅ | ✅ | ✅ | ❌ |

### Grupos

| Ação | Platform Admin | Org Admin | Account Admin |
|------|:-:|:-:|:-:|
| Criar grupo (escopo Org) | ✅ | ✅ | ❌ |
| Criar grupo (escopo Conta) | ✅ | ✅ | ✅ |
| Adicionar membros ao grupo | ✅ | ✅ | ✅ |
| Atribuir Ações ao grupo | ✅ | ✅ | ✅ |
| Excluir grupo | ✅ | ✅ | ✅ (só os da conta) |

### Instâncias

| Ação | Platform Admin | Org Admin | Account Admin |
|------|:-:|:-:|:-:|
| Ver instâncias da conta | ✅ | ✅ | ✅ |
| Adicionar membro à instância | ✅ | ✅ | ✅ |
| Remover membro da instância | ✅ | ✅ | ✅ |
| Configurar Fases (DocNix) | ✅ | ✅ | ✅ |
| Configurar Fluxo Padrão (DocNix) | ✅ | ✅ | ✅ |
| Configurar Perfil de Objeto (DocNix) | ✅ | ✅ | ✅ |

### Componentes

| Ação | Platform Admin | PAS Architect | Outros |
|------|:-:|:-:|:-:|
| Ver componentes | ✅ | ✅ | ❌ |
| Criar componente | ✅ | ✅ | ❌ |
| Editar componente | ✅ | ✅ | ❌ |
| Inativar componente | ✅ | ✅ | ❌ |
| Gerenciar catálogo de atribuições | ✅ | ✅ | ❌ |

---

## 5. Jornadas de usuário

### Jornada 1 — Org Admin configura acesso de uma nova conta

**Persona:** Org Admin (ex: Marcelo Ribeiro)  
**Objetivo:** Configurar uma nova conta para começar a usar o MaxDoc

**Passos:**
1. Acesse **Organizações** → clique na sua organização
2. Na aba **Contas**, clique em **+ Nova conta**
3. Preencha os dados e salve
4. Abra o detalhe da conta → aba **Capacidades**
5. Habilite `maxdoc.use` (e `docaction.use` se necessário)
6. Acesse **Acessos** → aba **Usuários**
7. Convide os usuários que farão parte da conta
8. Acesse a aba **Instâncias** → localize a instância MaxDoc
9. Adicione cada usuário com as atribuições corretas (ex: Aprovar Documento)
10. ✅ Conta configurada. Usuários já podem acessar o MaxDoc com as ações corretas.

---

### Jornada 2 — Account Admin gerencia membros de uma instância DocNix

**Persona:** Account Admin (ex: Carla Santos — Santacruz)  
**Objetivo:** Adicionar Beatriz Lima como revisora no MaxDoc Santacruz

**Passos:**
1. Acesse **Acessos** → aba **Instâncias**
2. Localize **Gestão Documental Santacruz** (MaxDoc)
3. Clique no ícone 🔍 para abrir o detalhe
4. Na aba **Membros**, clique em **+ Adicionar membro**
5. Busque "Beatriz Lima" no campo de busca
6. Selecione as atribuições: `Revisar Documento`, `Ler Todos os Documentos`
7. Clique em **Adicionar**
8. ✅ Beatriz agora aparece na lista com suas atribuições.

---

### Jornada 3 — Org Admin atribui Ações a um grupo inteiro

**Persona:** Org Admin  
**Objetivo:** Dar à equipe "Analistas de Qualidade" acesso ao DocAction

**Passos:**
1. Acesse **Acessos** → aba **Grupos**
2. Localize o grupo "Analistas de Qualidade"
3. Abra o detalhe do grupo
4. Clique em **Atribuir Ações ao grupo**
5. Na sheet que abrir, marque as ações desejadas no DocAction:
   - `Categorizar Ocorrência`, `Analisar Causa`, `Verificar Eficácia`
6. Clique em **Salvar Ações**
7. ✅ Todos os membros do grupo herdam essas ações automaticamente.

---

### Jornada 4 — Account Admin visualiza o Canvas

**Persona:** Account Admin  
**Objetivo:** Ter uma visão geral de quem tem acesso ao quê na conta

**Passos:**
1. Acesse **Canvas** no menu lateral
2. O canvas abre automaticamente na sua conta (sem opção de trocar)
3. Visualize:
   - Grupos e seus membros (linhas sólidas)
   - Instâncias e quem tem acesso (linhas tracejadas)
   - Instâncias DocNix marcadas com badge **DocNix**
4. Clique em um nó para ver detalhes no painel lateral
5. Clique em **Atribuir Ações** para ajustar diretamente pelo Canvas

---

### Jornada 5 — PAS Architect cadastra um novo componente

**Persona:** PAS Architect  
**Objetivo:** Adicionar o componente "DocAudit" ao catálogo

**Passos:**
1. Acesse **Componentes**
2. Clique em **+ Adicionar componente**
3. Preencha: Nome, Descrição, Modelo de autorização (`DocNix`)
4. Salve o componente
5. Abra o detalhe do componente
6. Na seção **Atribuições do Componente**, adicione as ações disponíveis:
   - Ex: "Criar Auditoria", "Executar Auditoria", "Aprovar Relatório"
7. ✅ O componente já aparece disponível para ser instanciado nas contas.

---

### Jornada 6 — Verificar Permissões Efetivas de um usuário

**Persona:** Org Admin ou Account Admin  
**Objetivo:** Ver exatamente quais ações Fernando Costa tem no MaxDoc Comgas

**Passos:**
1. Acesse **Acessos** → aba **Usuários**
2. Localize "Fernando Costa"
3. Clique no ícone 👁 **Ver Permissões Efetivas**
4. Selecione a instância "Gestão Documental Comgas"
5. Veja a tabela com:
   - Ações atribuídas **diretamente** ao usuário
   - Ações herdadas **via grupos** (com nome do grupo exibido)
6. ✅ Visão completa e auditável do acesso efetivo.

---

## 6. Cenários de teste

### CT-001 — Visibilidade do Sidebar por perfil

| # | Persona | Deve ver | Não deve ver |
|---|---------|----------|--------------|
| 1 | Platform Admin | Organizações, Acessos, Componentes, Canvas, Canvas Org, Schema | — |
| 2 | PAS Architect | Organizações, Componentes | Acessos, Canvas |
| 3 | Org Admin | Organizações, Acessos, Canvas | Componentes |
| 4 | Account Admin | Acessos, Canvas | Organizações, Componentes |
| 5 | Member | Acessos | Organizações, Componentes, Canvas |

**Como testar:** No PersonaSwitcher (canto inferior direito), alterne entre as personas e verifique o sidebar.

---

### CT-002 — Acesso direto por URL

| # | URL | Persona | Resultado esperado |
|---|-----|---------|-------------------|
| 1 | `/componentes` | Org Admin | Redireciona para `/home` |
| 2 | `/componentes` | Account Admin | Redireciona para `/home` |
| 3 | `/organizacoes` | Account Admin | Redireciona para `/acessos` |
| 4 | `/componentes` | PAS Architect | Carrega normalmente ✅ |
| 5 | `/organizacoes` | Org Admin | Mostra apenas a sua org |
| 6 | `/organizacoes` | Platform Admin | Mostra todas as orgs |

---

### CT-003 — Filtro de organizações

| # | Persona | Resultado esperado |
|---|---------|-------------------|
| 1 | Platform Admin | Lista todas as 6 orgs |
| 2 | Org Admin (Docnix) | Lista apenas "Docnix" |
| 3 | Org Admin (Apple) | Lista apenas "Apple" |

---

### CT-004 — Atribuições DocNix no componente

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 1 | Abrir detalhe do MaxDoc (PAS Architect) | Exibe 12 atribuições ativas |
| 2 | Abrir detalhe do DocAction (PAS Architect) | Exibe 8 atribuições ativas |
| 3 | Adicionar atribuição "Criar Relatório" ao MaxDoc | Aparece na lista imediatamente |
| 4 | Inativar atribuição | Sai da lista (não aparece como opção ao adicionar membro) |

---

### CT-005 — Adicionar membro com atribuições (DocNix)

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 1 | Abrir instância MaxDoc → aba Membros | Exibe lista de membros existentes |
| 2 | Clicar em "+ Adicionar membro" | Exibe busca de usuários/grupos |
| 3 | Selecionar usuário → ver seletor | Exibe multi-select com as 12 atribuições do MaxDoc |
| 4 | Marcar "Revisar Documento" e "Aprovar Documento" → Adicionar | Usuário aparece na lista com as 2 atribuições |
| 5 | Abrir instância FGA → aba Membros | Exibe dropdown viewer/member/admin (não multi-select) |

---

### CT-006 — Herança de Ações via grupo

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 1 | Grupo "Analistas de Qualidade" tem `Analisar Causa` | Fernando (membro do grupo) herda a ação |
| 2 | Abrir Atribuir Ações para Fernando | A ação herdada aparece com badge do grupo, não pode ser desmarcada |
| 3 | Fernando tem `Criar Ocorrência` direta + herda `Analisar Causa` | Permissões Efetivas mostram ambas com origens distintas |

---

### CT-007 — Capacidades (Entitlements) vs Instâncias

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 1 | Conta sem `maxdoc.use` → abrir "Atribuir Ações" | MaxDoc aparece com badge "Capability inativa" e ações bloqueadas |
| 2 | Habilitar `maxdoc.use` na conta → reabrir sheet | MaxDoc desbloqueado, ações editáveis |
| 3 | Desabilitar `maxdoc.use` com membros já atribuídos | Membros existentes mantidos, mas novos bloqueados na sheet |

---

### CT-008 — Canvas Account Admin

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 1 | Account Admin acessa /canvas | Canvas carrega automaticamente a conta do admin |
| 2 | Dropdown de contas | Exibe apenas 1 opção (a própria conta) — sem poder trocar |
| 3 | Platform Admin acessa /canvas | Dropdown mostra todas as contas |
| 4 | Instância DocNix no Canvas | Exibe badge "DocNix" no card da instância |

---

### CT-009 — Seed do banco

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 1 | Rodar `npm run db:seed` | Executa sem erros |
| 2 | Verificar saída | 9 accounts, 20 atribuições, 16 instâncias, 30 membros de instância |
| 3 | Abrir MaxDoc em Componentes | Exibe 12 atribuições ativas |
| 4 | Abrir Acessos → Instâncias (Org Admin Docnix) | Exibe MaxDoc e DocAction para Comgas |

---

## 7. Critérios de aceite

### CA-001 — Controle de acesso por perfil
- ✅ Cada persona vê apenas as seções autorizadas no sidebar
- ✅ Acessar URL não autorizada redireciona (não exibe erro em branco)
- ✅ Org Admin vê apenas sua própria organização na lista
- ✅ Account Admin não acessa a página de Organizações
- ✅ Account Admin no Canvas vê apenas sua conta

### CA-002 — Modelo FGA
- ✅ Instâncias FGA exibem apenas a aba "Membros"
- ✅ Ao adicionar membro FGA, exibe dropdown viewer/member/admin
- ✅ Nível de acesso pode ser alterado inline após adição
- ✅ Remoção de membro funciona e reflete na contagem

### CA-003 — Modelo DocNix
- ✅ Instâncias DocNix exibem 4 abas: Membros, Fases, Fluxo Padrão, Perfil de Objeto
- ✅ Ao adicionar membro DocNix, exibe multi-select de atribuições do catálogo
- ✅ Atribuições bloqueadas (capability inativa) aparecem com aviso visual
- ✅ Ações herdadas via grupo aparecem como somente leitura no seletor
- ✅ Sheet "Atribuir Ações" para componentes DocNix sem catálogo exibe mensagem orientativa

### CA-004 — Catálogo de atribuições
- ✅ MaxDoc possui 12 atribuições ativas após `npm run db:seed`
- ✅ DocAction possui 8 atribuições ativas após `npm run db:seed`
- ✅ PAS Architect pode adicionar/remover atribuições pelo detalhe do componente
- ✅ Atribuição inativada não aparece como opção ao adicionar membro

### CA-005 — Grupos
- ✅ Grupo com escopo "Conta" aparece apenas na conta correspondente
- ✅ Grupo com escopo "Org" aparece em todas as contas da org
- ✅ Ações atribuídas ao grupo são herdadas por todos os membros
- ✅ Remover usuário do grupo remove a herança

### CA-006 — Canvas
- ✅ Exibe conta, grupos, usuários e instâncias em grafo interativo
- ✅ Instâncias DocNix exibem badge "DocNix"
- ✅ Clique em nó abre painel lateral com detalhes
- ✅ Modo dark/light persiste entre navegações
- ✅ Account Admin não vê dropdown de troca de conta

### CA-007 — Seed
- ✅ `npm run db:seed` restaura 100% dos dados sem erros
- ✅ Executar duas vezes consecutivas não causa erros de FK
- ✅ Não é necessário rodar nenhum outro arquivo de seed

---

## 8. Como navegar no PoC

### Troca de persona

No canto inferior direito da tela existe o **PersonaSwitcher**. Clique nele para alternar entre as personas disponíveis:

| Badge | Persona |
|-------|---------|
| 🟠 PA | Platform Admin |
| 🟣 PAS | PAS Architect |
| 🟡 OA | Org Admin (Apple ou Docnix) |
| 🟢 AA | Account Admin (Santacruz) |

### Dados disponíveis para teste

**Organizações:** Apple, Santacruz, Margatastiltda, Nadapedra, Agropocereal, Docnix

**Contas com instâncias DocNix:**
- `acc-comgas` (Comgas / org-docnix): MaxDoc + DocAction + instâncias FGA
- `a2` (Santacruz): MaxDoc + DocAction + instâncias FGA

**Contas sem instâncias DocNix:**
- `a1` (Apple): apenas instâncias FGA (Assistente de Design, Base de Conhecimento Tech)

**Usuários de teste:**

| Nome | Email | Conta | Papel |
|------|-------|-------|-------|
| Carla Santos | carla.santos@grupoitss.com.br | Santacruz | account_admin |
| Lucas Oliveira | lucas.oliveira@santacruz.com.br | Santacruz | member |
| Beatriz Lima | beatriz.lima@santacruz.com.br | Santacruz | member |
| Thiago Martins | thiago.martins@santacruz.com.br | Santacruz | member |
| Fernando Costa | fernando.costa@comgas.com.br | Comgas | member |
| Neide Oliveira | neide.oliveira@comgas.com.br | Comgas | member |
| Marcelo Ribeiro | marcelo.ribeiro@comgas.com.br | Comgas | org_admin |

### Restaurar dados do banco

Se algo estiver errado ou ausente no banco, basta rodar:

```bash
npm run db:seed
```

Isso limpa e recria todos os dados (organizações, contas, usuários, grupos, componentes, atribuições, instâncias, membros).

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| **Sujeito** | Quem solicita acesso — um usuário ou grupo |
| **Recurso** | O objeto que está sendo acessado — uma instância (ex: MaxDoc Comgas) |
| **Ação** | O que o sujeito quer fazer — ex: "Aprovar Documento" |
| **Decisão** | O resultado da avaliação: `permitido` ou `negado` |
| **Capacidade (Entitlement)** | Licença que habilita um tipo de componente na conta (ex: `maxdoc.use`) |
| **Instância** | Uma implantação específica de um componente dentro de uma conta |
| **Componente** | O módulo de software (MaxDoc, DocAction, Assistente de IA…) |
| **Atribuição** | Uma ação específica que pode ser concedida a um membro (modelo DocNix) |
| **Nível de acesso** | viewer / member / admin (modelo FGA) |
| **Permissões Efetivas** | A soma de todas as ações de um usuário: diretas + herdadas via grupos |
| **Modelo FGA** | Modelo de autorização coarse-grained com viewer/member/admin |
| **Modelo DocNix** | Modelo de autorização granular com atribuições individuais por ação |
| **Modelo de autorização** | A estratégia de controle de acesso do componente: `fga` ou `docnix` |
| **Herança de grupo** | Ações que o usuário recebe por ser membro de um grupo |
| **Persona** | Perfil de acesso do usuário no sistema |
| **Org Admin** | Administrador da organização |
| **Account Admin** | Administrador de uma conta dentro da organização |
| **PAS Architect** | Arquiteto de soluções — configura componentes técnicos |
| **Platform Admin** | Administrador da plataforma ITSS — acesso irrestrito |
| **Canvas** | Visualização gráfica interativa das permissões de uma conta |
| **Fase** | Etapa de um fluxo documental (ex: Minuta → Revisão → Aprovação → Vigente) |
| **Fluxo Padrão** | Configuração de responsáveis padrão por fase em uma instância DocNix |
| **Perfil de Objeto** | Slots configuráveis por instância (ex: Revisores, Aprovadores, Leitores) |
| **Seed** | Processo de popular o banco de dados com dados de teste |

---

## 10. FAQ

**P: Por que habilitei todas as capacidades mas o usuário ainda não consegue acessar?**  
R: Habilitar uma capacidade é apenas o pré-requisito. O usuário também precisa estar adicionado como **membro da instância** com pelo menos uma ação atribuída.

**P: Qual a diferença entre Grupos de Org e Grupos de Conta?**  
R: Grupos de **Org** são criados pelo Org Admin e aparecem em todas as contas da organização. Grupos de **Conta** existem apenas dentro de uma conta específica.

**P: Posso atribuir ações a um grupo para uma instância específica?**  
R: Sim. Adicione o grupo como membro da instância e selecione as atribuições. Todos os membros do grupo herdarão essas ações naquela instância.

**P: O que acontece se eu rodar `npm run db:seed` novamente?**  
R: Todos os dados são limpos e recriados do zero. Qualquer dado inserido manualmente (via UI) será perdido.

**P: Como vejo quais ações um usuário tem de verdade (diretas + herdadas)?**  
R: Acesse **Acessos → Usuários**, clique no ícone 👁 **Ver Permissões Efetivas** do usuário e selecione a instância.

**P: Por que o PAS Architect não vê o menu "Acessos"?**  
R: O PAS Architect gerencia componentes técnicos na plataforma — não gerencia usuários ou grupos de contas. Isso é responsabilidade do Org Admin e Account Admin.

**P: Posso ter o mesmo usuário em duas contas diferentes?**  
R: Sim. Um usuário pode ser `member` em uma conta e `account_admin` em outra. As permissões são sempre avaliadas no contexto da conta.

**P: Por que instâncias DocNix têm mais abas que as FGA?**  
R: Componentes DocNix (MaxDoc, DocAction) têm um modelo de permissões mais sofisticado que exige configurar Fases, Fluxo Padrão e Perfil de Objeto por instância. Componentes FGA usam apenas papéis simples e não precisam dessas configurações.

**P: Como adicionar uma nova organização?**  
R: Apenas o **Platform Admin** pode criar organizações. Acesse **Organizações → + Nova organização**.

**P: Duas branches estão disponíveis — qual a diferença?**  
R: `feature/grupos-permissoes-docnix-variation` usa a nomenclatura atual (viewer/member/admin, "Permissões"). `feature/nomenclatura-authzen` usa a nomenclatura alinhada com AuthZEN (Visualizador/Membro/Administrador, "Ações"). O conteúdo funcional é idêntico.
