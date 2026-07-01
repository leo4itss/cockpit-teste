# Cenário Docnix — Multi-empresa (Hospital Elfa)

> **Audiência:** time Docnix (produto, comercial e técnico)
> **Objetivo:** demonstrar que o PAS/OpenFGA resolve nativamente a limitação mais crítica do Docnix atual — um mesmo usuário ter papéis **distintos** em empresas diferentes.

---

## Contexto do Problema

No Docnix atual, quando um usuário é compartilhado entre empresas (multi-empresa), ele recebe as mesmas atribuições em **todas** as empresas vinculadas. Não é possível que um usuário seja Administrador na Empresa A e apenas Leitor na Empresa B com o mesmo login.

No PAS, o papel é atribuído ao nível do **objeto** (instância), não do usuário. Isso significa que o mesmo usuário pode ter papéis completamente diferentes por empresa — de forma nativa, sem workarounds.

**Mapeamento Docnix → PAS:**

| Conceito Docnix | Conceito PAS |
|-----------------|-------------|
| Empresa (multi-empresa) | Objeto / Instância MaxDoc |
| Atribuição | Ação granular |
| Grupo | Grupo (com papel por objeto) |
| Usuário compartilhado | Usuário com papéis distintos por instância |

---

## Dados do Cenário

- **Organização:** Docnix (`org-docnix`)
- **Conta:** Hospital Elfa (`acc-elfa`)
- **Componente:** MaxDoc (`comp-maxdoc`)
- **Instâncias (Empresas):**
  - `inst-elfa-central` — MaxDoc — Hospital Central *(empresa principal, sede)*
  - `inst-elfa-norte` — MaxDoc — Unidade Norte *(filial)*
  - `inst-elfa-sul` — MaxDoc — Unidade Sul *(filial)*
- **Usuários:**
  - **Carlos Mendes** (`usr-carlos-elfa`) — Administrador da Conta
  - **Beatriz Santos** (`usr-beatriz-elfa`) — Membro
  - **João Pereira** (`usr-joao-elfa`) — Membro
- **Grupos:**
  - **Editores Docnix** (`grp-elfa-editores`) — Beatriz Santos é membro
  - **Aprovadores Corporativos** (`grp-elfa-aprovadores`) — João Pereira é membro

**Distribuição de papéis (o coração do cenário):**

| Sujeito | Hospital Central | Unidade Norte | Unidade Sul |
|---------|-----------------|---------------|-------------|
| Carlos Mendes | **Administrador** | **Leitor** | — sem acesso — |
| Grupo Editores Docnix | Editor | Editor | — |
| Grupo Aprovadores Corporativos | Aprovador | Aprovador | — |
| Beatriz Santos (direto) | *(via grupo)* | *(via grupo)* | **Leitor** |

> Carlos tem papéis **diferentes** em cada empresa com o mesmo login — impossível no Docnix atual.

---

## Como Acessar o Cenário

1. Abrir o Cockpit
2. No **PersonaSwitcher** (canto inferior direito), trocar para **"Account Admin (Hospital Elfa) — Carlos Mendes"**
3. Navegar para **Acessos** no sidebar
4. A conta **Hospital Elfa** deve estar selecionada automaticamente

---

## Cenário 1 — O Diferencial Principal: Mesmo Usuário, Papéis Diferentes por Empresa

### Objetivo
Demonstrar que Carlos Mendes é Administrador no Hospital Central, Leitor na Unidade Norte e sem acesso na Unidade Sul — com o mesmo login.

### Pré-condições
- Persona: **Account Admin (Hospital Elfa)** — Carlos Mendes
- Rota: Acessos > aba **Objetos**

### Passo a Passo

#### 1.1 — Visualizar os objetos MaxDoc do Hospital Elfa

1. Com Carlos Mendes ativo no PersonaSwitcher, navegar para **Acessos**
2. Confirmar que a conta exibida é **Hospital Elfa**
3. Clicar na aba **Objetos**
4. **Verificar:** Três objetos MaxDoc aparecem na lista:
   - MaxDoc — Hospital Central (4 membros)
   - MaxDoc — Unidade Norte (3 membros)
   - MaxDoc — Unidade Sul (1 membro)

#### 1.2 — Inspecionar o Hospital Central (papel Administrador)

1. Clicar em **MaxDoc — Hospital Central**
2. A `InstanciaDetailSheet` abre
3. **Verificar (Grupos — 2):**
   - **Editores Docnix** com badge **Editor**
   - **Aprovadores Corporativos** com badge **Aprovador**
4. **Verificar (Usuários — 1):**
   - **Carlos Mendes** com badge **Administrador** (vermelho)
5. Clicar em **Editar** ao lado de Carlos Mendes
6. **Verificar:** Papel **Administrador** selecionado (destacado em azul)
7. **Verificar:** **25 ações diretas** — conjunto completo de ações de administração do MaxDoc
8. Fechar sem salvar

#### 1.3 — Inspecionar a Unidade Norte (papel Leitor — mesmo Carlos)

1. Fechar a sheet do Hospital Central → clicar em **MaxDoc — Unidade Norte**
2. **Verificar (Usuários — 1):** Carlos Mendes com badge **Leitor** (cinza)
3. Clicar em **Editar** ao lado de Carlos Mendes
4. **Verificar:** Papel **Leitor** selecionado
5. **Verificar:** Apenas **2 ações** marcadas: **Leitor Documento** e **Imprimir**
6. **Verificar:** Criar Documento, Editor Documento, Aprovar Documento e todas as demais ações **NÃO** estão marcadas
7. Fechar sem salvar

> **Ponto de impacto para o cliente:** o mesmo Carlos Mendes que edita, cria e aprova documentos no Hospital Central não consegue sequer criar um documento na Unidade Norte — tudo com o mesmo login.

#### 1.4 — Inspecionar a Unidade Sul (sem acesso)

1. Fechar → clicar em **MaxDoc — Unidade Sul**
2. **Verificar:** Carlos Mendes **não aparece** na lista de membros
3. **Verificar:** Apenas Beatriz Santos aparece, com badge **Leitor**
4. Fechar

### Resultados Esperados

| Verificação | Esperado |
|------------|---------|
| Carlos no Hospital Central | Badge **Administrador**, 25 ações diretas |
| Carlos na Unidade Norte | Badge **Leitor**, 2 ações diretas (Leitor Documento, Imprimir) |
| Carlos na Unidade Sul | **Não aparece** na lista de membros |
| Separação por objeto | Cada instância tem lista de membros e papéis independentes |

---

## Cenário 2 — Papéis de Grupo por Empresa

### Objetivo
Mostrar que grupos também têm papéis distintos por empresa, e que membros do grupo herdam essas permissões apenas nas empresas onde o grupo foi vinculado.

### Pré-condições
- Persona: **Account Admin (Hospital Elfa)** — Carlos Mendes
- Rota: Acessos > aba **Objetos**

### Passo a Passo

#### 2.1 — Verificar o grupo Editores Docnix nas empresas

1. Abrir **MaxDoc — Hospital Central** → seção **Grupos (2)**
2. **Verificar:** **Editores Docnix** com badge **Editor**
3. Fechar → abrir **MaxDoc — Unidade Norte** → seção **Grupos (2)**
4. **Verificar:** **Editores Docnix** com badge **Editor** (mesmo papel na Unidade Norte)
5. Fechar → abrir **MaxDoc — Unidade Sul**
6. **Verificar:** Editores Docnix **não aparece** — o grupo não tem acesso à Unidade Sul

#### 2.2 — Verificar herança de Beatriz Santos via grupo

1. Em Acessos > aba **Grupos**, localizar **Editores Docnix**
2. Clicar no grupo
3. **Verificar:** Seção **Objetos com acesso (2)**:
   - MaxDoc — Hospital Central com badge **Editor**
   - MaxDoc — Unidade Norte com badge **Editor**
4. **Verificar:** Seção **Membros (1):** Beatriz Santos como membro do grupo
5. Fechar

#### 2.3 — Ver acesso direto vs. via grupo de Beatriz

1. Ir para Acessos > aba **Objetos** > **MaxDoc — Unidade Sul**
2. **Verificar:** Beatriz Santos aparece como membro **direto** com badge **Leitor**
3. Abrir **MaxDoc — Hospital Central**
4. **Verificar:** Beatriz Santos **não aparece** na seção de Usuários individuais
5. **Verificar:** Ela aparece **indiretamente** via grupo **Editores Docnix** (seção Grupos) com papel **Editor**

> **Ponto de impacto:** Beatriz é Editora no Central e Norte (via grupo) mas apenas Leitora no Sul (papel direto, mais restritivo) — novamente impossível no modelo atual do Docnix.

### Resultados Esperados

| Verificação | Esperado |
|------------|---------|
| Editores Docnix no Central e Norte | Badge **Editor** em ambos |
| Editores Docnix no Sul | **Não aparece** |
| Beatriz no Sul | Acesso **direto** como **Leitor** |
| Beatriz no Central/Norte | Acesso **via grupo** como **Editor** |

---

## Cenário 3 — Ações Efetivas por Empresa

### Objetivo
Demonstrar o painel de ações efetivas mostrando exatamente o que cada usuário pode fazer em cada empresa — com a origem (direto ou via grupo).

### Pré-condições
- Persona: **Account Admin (Hospital Elfa)** — Carlos Mendes
- Rota: Acessos > aba **Usuários**

### Passo a Passo

#### 3.1 — Ações efetivas de Carlos no Hospital Central

1. Em Acessos > aba **Usuários**, localizar **Carlos Mendes**
2. Clicar nos três pontinhos (⋯) ou na lupa ao lado de Carlos → selecionar **"Ver permissões efetivas"**
3. No dropdown de objeto, selecionar **MaxDoc — MaxDoc — Hospital Central**
4. **Verificar:** Painel exibe múltiplas ações com badge **Direto** (azul)
5. Ações esperadas incluem: Administrador Módulo MaxDoc, Acessar Todos, Criar Documento, Editar Documento, Aprovar Documento, Revisar Documento, Excluir Documento, Obsoletetar Documento, Controle de Acesso

#### 3.2 — Ações efetivas de Carlos na Unidade Norte

1. No mesmo painel, trocar o dropdown para **MaxDoc — MaxDoc — Unidade Norte**
2. **Verificar:** Apenas **3 ações** com badge **Direto** (azul): Leitor Documento, Leitor Anexos, Ler Todos
3. **Verificar:** Criar Documento, Aprovar Documento e demais ações **não aparecem**

#### 3.3 — Ações efetivas de João Pereira (via grupo Aprovadores)

1. Fechar o painel de Carlos → localizar **João Pereira** → abrir permissões efetivas
2. Selecionar **MaxDoc — MaxDoc — Hospital Central**
3. **Verificar:** Ações aparecem com badge **Via Grupo · Aprovadores Corporativos** (verde)
4. Ações esperadas: Aprovar Documento, Aprovador Substituto Documento, Ciclo de Aprovação Documentos, Obsoletetar Documento, Emitir Cópia Controlada, Assinatura Eletrônica
5. Selecionar **MaxDoc — MaxDoc — Unidade Sul**
6. **Verificar:** Nenhuma ação — João não tem acesso à Unidade Sul

### Resultados Esperados

| Usuário | Empresa | Ações Efetivas |
|---------|---------|----------------|
| Carlos Mendes | Hospital Central | 9 ações diretas (Administrador) |
| Carlos Mendes | Unidade Norte | 3 ações diretas (Leitor) |
| Carlos Mendes | Unidade Sul | Nenhuma |
| João Pereira | Hospital Central | 6 ações via grupo (Aprovadores) |
| João Pereira | Unidade Sul | Nenhuma |

---

## Cenário 4 — Alteração de Papel em Uma Empresa (sem afetar as outras)

### Objetivo
Provar que alterar o papel de Carlos na Unidade Norte não afeta seu papel no Hospital Central — demonstrando isolamento total entre empresas.

### Pré-condições
- Persona: **Account Admin (Hospital Elfa)** — Carlos Mendes
- Rota: Acessos > aba **Objetos**

### Passo a Passo

#### 4.1 — Elevar Carlos para Editor na Unidade Norte

1. Abrir **MaxDoc — Unidade Norte**
2. Clicar em **Editar** ao lado de Carlos Mendes
3. No seletor de papel, clicar em **Editor** (em vez de Leitor)
4. **Verificar:** Ações atualizam para (9 ações): Visualizar, Criar Documento, Editar, Nova Versão, Mover, Cancelar Edição, Baixar Documento, Imprimir, Visualizar Histórico de Versões
5. Clicar em **Salvar**
6. **Verificar:** Badge de Carlos na Unidade Norte muda para **Editor**

#### 4.2 — Confirmar que o Hospital Central não foi alterado

1. Fechar → abrir **MaxDoc — Hospital Central**
2. **Verificar:** Carlos Mendes ainda aparece com badge **Administrador**
3. Clicar em **Editar** ao lado de Carlos
4. **Verificar:** Ainda 32 ações diretas, papel **Administrador** inalterado

> **Ponto de impacto:** no Docnix atual, se você alterasse as atribuições de um usuário em uma empresa, correria o risco de impactar todas as outras. No PAS, cada empresa (objeto) é completamente isolada.

### Resultados Esperados

| Verificação | Esperado |
|------------|---------|
| Carlos na Unidade Norte após edição | Badge **Editor**, 9 ações |
| Carlos no Hospital Central após edição | Badge **Administrador**, 32 ações — **inalterado** |
| Isolamento confirmado | Alteração em uma instância não propaga para outra |

---

## Cenário 5 — Adicionar Novo Usuário em Empresas Selecionadas

### Objetivo
Mostrar que ao adicionar um novo usuário, o administrador escolhe explicitamente em quais empresas (objetos) aquele usuário terá acesso e com qual papel — sem herança automática.

### Pré-condições
- Persona: **Account Admin (Hospital Elfa)** — Carlos Mendes
- Rota: Acessos > aba **Objetos**

### Passo a Passo

#### 5.1 — Adicionar João Pereira com papel Revisor no Hospital Central

1. Abrir **MaxDoc — Hospital Central**
2. Clicar em **"Adicionar membro"**
3. **[Passo 1 — Wizard]** Buscar "João Pereira" → selecionar `usr-joao-elfa`
4. **[Passo 2 — Wizard]** Selecionar papel **Revisor** → clicar em **Confirmar**
5. **Verificar:** Ações pré-selecionadas (4): Visualizar, Revisar Documento, Submeter para Aprovação, Solicitar Revisão
6. **Verificar:** Criar Documento, Aprovar Documento e Editar **não estão** marcadas
7. Salvar
8. **Verificar:** João aparece na lista do Hospital Central com badge **Revisor**

#### 5.2 — Confirmar que João NÃO ganhou acesso automático às demais empresas

1. Fechar → abrir **MaxDoc — Unidade Norte**
2. **Verificar:** João Pereira **não aparece** na seção de Usuários individuais (apenas via grupo Aprovadores Corporativos, que ele já tinha)
3. Fechar → abrir **MaxDoc — Unidade Sul**
4. **Verificar:** João Pereira **não aparece**

> **Ponto de impacto:** no Docnix atual, adicionar um usuário a uma empresa pode implicar em herança em outras. No PAS, o acesso é granular e explícito — sem surpresas.

### Resultados Esperados

| Verificação | Esperado |
|------------|---------|
| João no Hospital Central (direto) | Badge **Revisor**, 4 ações |
| João na Unidade Norte (direto) | **Não aparece** (apenas via grupo Aprovadores) |
| João na Unidade Sul | **Não aparece** |

---

## Cenário 6 — Visão Estrutural pelo Canvas Org

### Objetivo
Mostrar a visão hierárquica da organização Docnix com as contas e seus objetos expandidos.

### Pré-condições
- Persona: **Org Admin (Docnix)** — Marcelo Ribeiro *(trocar no PersonaSwitcher — Account Admin não tem acesso ao Canvas Org)*
- Rota: **Canvas Org** (sidebar)

> **Nota de perfil:** O Canvas Org é restrito a Org Admin e Platform Admin. Account Admin (Carlos Mendes) só vê **Acessos** e **Canvas** (visão de conta). Para esta demonstração, trocar a persona para **Marcelo Ribeiro**.

### Passo a Passo

1. No PersonaSwitcher, trocar para **Org Admin (Docnix) — Marcelo Ribeiro**
2. Navegar para **Canvas Org**
3. Selecionar a organização **Docnix** no dropdown
4. **Verificar:** Duas contas visíveis: **Comgas** e **Hospital Elfa**
5. Expandir **Hospital Elfa**
6. **Verificar:** Três nós de objetos MaxDoc: Hospital Central, Unidade Norte, Unidade Sul
7. Clicar em **Hospital Central**
8. **Verificar:** Painel lateral mostra membros e grupos com papéis
9. **Verificar:** Carlos Mendes aparece como **Administrador**
10. Clicar em **Unidade Norte**
11. **Verificar:** Carlos Mendes aparece como **Leitor** (papel diferente — mesmo usuário)

### Resultados Esperados

| Verificação | Esperado |
|------------|---------|
| Hierarquia no Canvas Org | org-docnix → acc-elfa → 3 instâncias MaxDoc |
| Papel no painel por nó | Correto e independente por instância |
| Acesso ao Canvas Org | Disponível apenas para Org Admin e Platform Admin |

---

## Resumo do Diferencial PAS vs. Docnix Atual

| Capacidade | Docnix Atual | PAS / OpenFGA |
|-----------|-------------|---------------|
| Papéis distintos por empresa (mesmo usuário) | ❌ Não suportado | ✅ Nativo |
| Isolamento de permissão por empresa | ❌ Herança automática | ✅ Explícito e granular |
| Grupos com papéis por empresa | ❌ Limitado | ✅ Por objeto |
| Visibilidade da origem (direto vs. grupo) | ❌ Sem rastreabilidade | ✅ Badge por ação |
| Alteração em uma empresa afeta outras | ⚠️ Risco real | ✅ Isolado por design |
| Auditabilidade granular | ❌ Limitada | ✅ Ação a ação, por objeto |

> O modelo FGA (Fine-Grained Authorization) do PAS define papéis e ações sempre no nível do **objeto** (instância), nunca do usuário globalmente. Isso resolve nativamente a principal limitação levantada na reunião de 26/06/2026 com o time Docnix.
