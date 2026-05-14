# Pitch — Módulo de Grupos e Permissões Granulares

## Framing

### Problema
O Cockpit não tem um sistema funcional de grupos e permissões granulares. Nenhum dos perfis — internos da Prizm ou clientes — consegue gerenciar autonomamente quem acessa o quê. Não existe hoje a modelagem de autorização, a camada que avalia permissões em tempo real, nem as telas para gerenciá-las.

### Apetite
2 semanas.

### Solução em alto nível
Construir o módulo de grupos e permissões do Cockpit em três camadas:

1. **Modelagem de autorização** — baseada nos princípios do OpenFGA (ReBAC), cobrindo tipos, relações e tuplas para todos os perfis do sistema
2. **Camada de permissionamento** — engine que avalia e aplica as regras em tempo real
3. **Telas de gestão** — grupos, usuários e papéis por componente, com cada perfil vendo e operando apenas o que é relevante para seu nível

Perfis cobertos: **Platform Admin**, **PAS Architect**, **Org Admin** e **Account Admin**.

---

## Breadboarding

### Platform Admin

**Lugares**
- Sidebar → Organizações / Acessos
- OrganizacoesPage → lista todas as orgs
- OrganizacaoDetailPage → detalhe de uma org

**Fluxos**
- Entra no Cockpit → vê todas as organizações
- Clica em uma org → OrganizacaoDetailPage
- `[Criar Org Admin]` → **Sheet** → verifica duplicidade por e-mail (onBlur) → se existe reutiliza, se não existe cria → papel org_admin atribuído → tupla FGA escrita no backend
- `[Criar conta]` → **Sheet** → conta nasce sem contrato (contrato vinculado posteriormente)
- `[Novo contrato]` → **Sheet** → vincula conta a componentes e define licenças

---

### PAS Architect

**Lugares**
- Sidebar → Organizações / Componentes
- ComponentesPage → lista componentes por org e conta

**Fluxos**
- Entra no Cockpit → vê organizações e suas contas
- Navega até uma conta → vê componentes contratados
- `[Configurar componente]` → **Sheet** → define parâmetros técnicos e endpoints de metadata
- Não vê → gestão de usuários, grupos, contratos ou licenças

---

### Org Admin

**Lugares**
- Sidebar → Usuários / Grupos / Contas
- UsuariosPage → lista todos os usuários da organização
- GruposPage → lista grupos da organização
- ContasPage → lista todas as contas da organização

**Fluxos**

**Usuários**
- `[Convidar usuário]` → **Sheet** → lookup por e-mail (onBlur) → se existe reutiliza cadastro, se não existe cria → usuário entra na org sem conta vinculada ainda
- Clica em usuário → **Sheet** de detalhe → vê contas vinculadas → `[Vincular a conta]` → **Dialog** → seleciona conta → define papel (Member ou Account Admin) → tupla FGA escrita no backend

**Grupos**
- `[Criar grupo]` → **Sheet** → nome, descrição, busca e seleção de membros → seleção de escopo: "Organização" (disponível para todas as contas) ou "Conta específica" (seleciona qual conta) → tupla FGA escrita no backend
- Clica em grupo → **Sheet** de detalhe → vê membros → adiciona ou remove usuários

**Contas**
- `[Criar conta]` → **Sheet** → conta nasce sem contrato (contrato é vinculado pelo Platform Admin ou Org Admin posteriormente)
- Clica em conta → **Sheet** de detalhe → vê usuários vinculados à conta → `[Promover a Account Admin]` → **Dialog** → seleciona usuário já vinculado à conta → define papel account_admin → tupla FGA escrita no backend

---

### Account Admin

**Lugares**
- Sidebar → Usuários / Grupos
- AcessosPage → duas abas: Usuários e Grupos

**Fluxos**

**Aba Usuários**
- `[Convidar usuário]` → **Sheet** → lookup por e-mail (onBlur) → se existe na org vincula à conta, se não existe cria e vincula → define papel Member (Account Admin é promovido pelo Org Admin, não no convite)
- Clica em usuário → **Sheet** de detalhe → vê grupos do usuário na conta → `[Atribuir papel]` → **Sheet** aninhada → lista componentes disponíveis → seleciona papel por componente (viewer / user|editor / admin) → tupla FGA escrita no backend
- `[Remover usuário da conta]` → **Dialog** de confirmação → remove vínculo (não exclui da org)

**Aba Grupos**
- Vê dois tipos de grupo com badge visual — grupos herdados da org e grupos locais da conta
- `[Criar grupo]` → **Sheet** → grupo nasce escopado à conta — não aparece em outras contas
- Clica em grupo → **Sheet** de detalhe → vê membros → `[Atribuir papel ao grupo]` → **Sheet** aninhada → atribui papel por componente → todos os membros herdam
- `[Excluir grupo]` → **Dialog** de confirmação

---

## Decisões de Interface

| Perfil | Ação | Padrão |
|---|---|---|
| Platform Admin | Criar organização | Sheet |
| Platform Admin | Criar Org Admin | Sheet |
| Platform Admin | Criar conta | Sheet |
| Platform Admin | Novo contrato | Sheet |
| PAS Architect | Configurar componente | Sheet |
| Org Admin | Convidar usuário | Sheet |
| Org Admin | Detalhe do usuário | Sheet |
| Org Admin | Vincular usuário a conta | Dialog |
| Org Admin | Criar grupo (org ou conta) | Sheet |
| Org Admin | Detalhe do grupo | Sheet |
| Org Admin | Criar conta | Sheet |
| Org Admin | Detalhe da conta | Sheet |
| Org Admin | Promover Account Admin | Dialog |
| Account Admin | Convidar usuário | Sheet |
| Account Admin | Detalhe do usuário | Sheet |
| Account Admin | Atribuir papel por componente | Sheet |
| Account Admin | Criar grupo | Sheet |
| Account Admin | Detalhe do grupo | Sheet |
| Account Admin | Atribuir papel ao grupo por componente | Sheet |
| Account Admin | Confirmar exclusão de grupo | Dialog |
| Account Admin | Confirmar remoção de usuário da conta | Dialog |

---

## Regras de negócio confirmadas

### Criação de conta
Tanto o **Platform Admin** quanto o **Org Admin** podem criar contas dentro de uma organização. O contrato é vinculado à conta posteriormente — a conta nasce sem contrato.

### Escopo de grupos
- **Org Admin** pode criar grupos no nível da organização (disponíveis para todas as contas) ou no nível de uma conta específica (selecionado no momento da criação)
- **Account Admin** só pode criar grupos no nível da conta que administra

### Promoção de Account Admin
Só pode ser Account Admin quem já é usuário vinculado à conta. O fluxo é:
1. Org Admin acessa o detalhe de uma conta
2. Vê a lista de usuários já vinculados àquela conta
3. Seleciona um usuário e promove a Account Admin via Dialog de confirmação

Account Admin **não** é definido no momento do convite — o convite sempre cria um usuário com papel Member.

---



### 1. Verificação de duplicidade de usuário
Verificação feita **onBlur** no campo de e-mail — ao sair do campo, não em tempo real. Evita chamadas excessivas à API e dá feedback claro antes de submeter o formulário.

### 2. Sheets aninhadas
Usar um componente customizado de Sheet que controla z-index por camada. Cada Sheet aninhada recebe um z-index incrementado automaticamente. Não usar o componente padrão do shadcn/ui para sheets aninhadas — ele não gerencia z-index corretamente.

### 3. Escrita de tuplas FGA
Toda mutação de dados (criar grupo, vincular usuário, atribuir papel) escreve as tuplas FGA **no backend**, na mesma operação. O frontend nunca escreve tuplas diretamente — ele chama o endpoint, e o endpoint é responsável por persistir no banco e escrever as tuplas na mesma transação. Garante consistência mesmo se o frontend falhar no meio do fluxo.

---

## O que não entra nessa entrega

- Configuração técnica de componentes (responsabilidade do PAS Architect — já coberta, mas sem aprofundamento de parâmetros avançados)
- Papéis internos da Prizm abaixo do Platform Admin (Operador / Suporte) — não formalizados ainda
- Ferramenta de diagnóstico de acesso (Permission Helper)
- Auditoria de log de permissões
- Remoção de organização

---

## Referências visuais — Benchmark Jira e Atlassian

As telas devem ter inspiração direta nos padrões visuais observados no benchmark. Não é uma cópia — é uma adaptação para o contexto do Cockpit.

### Tela de Usuários
- **Métricas no topo** em cards separados por divisórias verticais: Total de usuários, Usuários ativos, Contas gerenciadas, Administradores da organização
- **Barra de filtros** abaixo das métricas: campo de busca por nome ou e-mail + dropdowns de filtro por Tipo de conta, Função, Apps
- **Tabela** com colunas: Usuário (avatar com iniciais coloridas + nome em negrito + e-mail abaixo em cinza), Status (badge), Visto pela última vez, Ações (ícone `...`)
- **Badges de status** com cores distintas: `ATIVO` (verde), `CONVIDADO` (azul), `SUSPENSO` (cinza)
- **Linha clicável** — toda a linha abre o detalhe, não só um botão

### Tela de Grupos
- **Subtítulo descritivo** abaixo do título da página explicando o propósito dos grupos
- **Tabela** com colunas: Grupo (nome em negrito + descrição abaixo em cinza, truncada), Membros (número), Componentes (número + ícone de info), Escopo (badge), Ações (`...`)
- **Sem avatar** nos grupos — apenas nome e descrição
- **Botão primário** "Criar grupo" alinhado à direita do header da página

### Dialog de criar grupo
- **Modal centralizado** (não sheet lateral) — formulário simples e focado
- Campos: Nome (obrigatório, com helper text "visível para todos na organização"), Descrição (opcional), Usuários (campo de busca com chips removíveis dos selecionados)
- Botões no rodapé: Cancelar (ghost) + Criar (primário)

### Sheet de conceder acesso ao grupo por componente
- **Lista de componentes** com colunas: Componente (ícone + nome + conta), Plano, Funções (dropdown)
- **Dropdown de função** por componente: opções específicas por tipo (Nenhum / viewer / user|editor / admin)
- **Filtros** no topo da lista: busca por nome + filtro por Aplicativo + filtro por Plano
- **Rodapé fixo** com botões Cancelar e Confirmar

### Detalhe do grupo por componente (visão do componente)
- **Cards de métricas** no topo: Total de usuários, Usuários licenciados, Plano
- **Tabela de grupos** com colunas: Grupo (nome + descrição + badge PADRÃO quando aplicável), Membros, Função (dropdown editável inline com tag removível `×`)
- **Função editável inline** — o dropdown de papel fica diretamente na linha da tabela, não em modal separado

### Referência de cores e tipografia
- Nomes de grupo e usuário em **negrito** (`font-medium`)
- Descrições e e-mails em **cinza** (`text-muted-foreground`, tamanho menor)
- Badges de status com bordas arredondadas e fundo sólido (não outline)
- Avatares com iniciais em fundo colorido — cor derivada do nome do usuário para consistência
- Ações (`...`) aparecem apenas no hover da linha — não sempre visíveis

---

## Contexto técnico

- **Stack:** React + TypeScript + Tailwind + shadcn/ui + Drizzle ORM
- **Autorização:** modelagem baseada nos princípios do OpenFGA (ReBAC) — implementada do zero nessa entrega
- **Padrão de escrita FGA:** backend escreve tuplas na mesma transação da mutação de dados
- **Padrão de leitura FGA:** frontend usa hooks de authz para checar permissões antes de renderizar ações
- **Sheets aninhadas:** componente customizado com z-index incremental
- **Lookup de usuário:** onBlur no campo de e-mail
