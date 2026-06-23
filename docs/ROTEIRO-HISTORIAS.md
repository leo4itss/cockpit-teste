# Roteiro de Teste — Histórias de Usuário

**Formato:** narrativa guiada para apresentação a stakeholders  
**Duração estimada:** 25–35 min  
**Personas envolvidas:** Marcelo Ribeiro (Org Admin), Carla Santos (Account Admin), Lucas Oliveira (Membro)  
**URL:** preview Vercel — branch `feature/grupos-permissoes-docnix-variation`

---

## Contexto da história

A **Comgas** e a **Santacruz** acabaram de contratar a suite PAS da ITSS. O Cockpit é a plataforma que os gestores de TI usam para configurar quem pode fazer o quê dentro de cada produto. Vamos acompanhar dois gestores — **Marcelo** (Comgas) e **Carla** (Santacruz) — ao longo de um dia de trabalho real.

---

## Ato 1 — Marcelo entra no sistema pela primeira vez

> **Como** Org Admin da Comgas,  
> **Quero** ter uma visão geral de quem tem acesso a quê na minha organização,  
> **Para que** eu possa entender o estado atual antes de fazer qualquer configuração.

**Passos:**

1. Abrir o PersonaSwitcher (canto inferior direito) → selecionar **Marcelo Ribeiro (Org Admin DocNix)**
2. Sidebar → **Canvas**
3. Selecionar a conta **Comgas**

**O que mostrar:**
- Nós coloridos: conta (laranja), grupos (azul), usuários (verde), objetos/instâncias (roxo)
- Arestas sólidas: usuário é membro do grupo
- Arestas tracejadas: grupo ou usuário tem acesso a um objeto

> _"Antes de editar qualquer coisa, Marcelo quer entender o mapa. O Canvas mostra graficamente toda a estrutura de permissões da conta — quem pertence a qual grupo, e quais grupos ou usuários têm acesso a quais objetos."_

4. Clicar no botão **"Sobre"** no cabeçalho do Canvas
5. Ler brevemente o modal explicativo → fechar

> _"O botão 'Sobre' é o ponto de partida para gestores novos — explica a legenda, o que cada cor representa e como navegar."_

**Resultado esperado:** o Canvas carrega sem erros, a legenda de cores é visível, o modal "Sobre" abre e fecha corretamente.

---

## Ato 2 — Marcelo integra um novo colaborador ao MaxDoc

> **Como** Org Admin da Comgas,  
> **Quero** criar um novo usuário e dar acesso ao módulo de gestão documental,  
> **Para que** ele possa trabalhar nos documentos da empresa a partir de hoje.

### Cena 2.1 — Criar o usuário

**Passos:**

1. Sidebar → **Acessos** → aba **Usuários**
2. Clicar no botão **"Sobre"** → ler o contexto da aba → fechar
3. Botão **"Criar Usuário"**
4. Preencher:
   - Nome: `João Teste`
   - Username: `joao.teste`
   - E-mail: `joao.teste@comgas.com.br`
   - Papel na conta: `Membro`
5. Salvar
6. ✅ João aparece na lista de usuários

> _"O fluxo de criação de usuário já associa automaticamente o usuário à conta selecionada — dois registros, uma operação."_

### Cena 2.2 — Testar proteção contra duplicidade

**Passos:**

1. Tentar criar novamente com o mesmo e-mail (`joao.teste@comgas.com.br`)
2. ✅ Mensagem amigável: _"Este e-mail já está cadastrado na plataforma."_
3. Tentar criar com mesmo username (`joao.teste`) e e-mail diferente
4. ✅ Mensagem amigável: _"Este nome de usuário já está em uso."_

> _"O sistema não expõe erros técnicos — a mensagem já indica exatamente o que o gestor precisa fazer."_

### Cena 2.3 — Atribuir João ao MaxDoc com papel Editor

**Passos:**

1. Aba **Objetos** → clicar em **MaxDoc Comgas**
2. **"Adicionar Membro"**
3. **Passo 1 do wizard:** digitar "João" → clicar no resultado
4. **Passo 2 do wizard:** selecionar papel **Editor**
5. ✅ Mostrar as 9 ações pré-selecionadas automaticamente:
   - Visualizar, Criar Documento, Editar, Nova Versão, Mover, Cancelar Edição, Baixar Documento, Imprimir, Visualizar Histórico de Versões
6. ✅ Confirmar que *Aprovar Documento* e *Rejeitar Documento* **não estão** selecionados
7. Clicar em **Confirmar**

> _"O papel funciona como atalho: o gestor não precisa marcar ação por ação. As ações do Editor são pré-selecionadas automaticamente. O sistema garante que Editor não herda as ações de Aprovador — são papéis independentes."_

**Resultado esperado:** João aparece na lista de membros do MaxDoc Comgas com papel Editor.

---

## Ato 3 — Marcelo ajusta as permissões de Fernando (papel existente)

> **Como** Org Admin da Comgas,  
> **Quero** promover o Fernando de Editor para Revisor no MaxDoc,  
> **Para que** ele passe a participar do ciclo de revisão dos documentos.

**Passos:**

1. No painel do MaxDoc Comgas, clicar em **Ações** ao lado de **Fernando Costa**
2. O painel de ações do membro abre (PermissoesMembroSheet)
3. Observar o banner verde no topo: _"Algumas ações estão marcadas via grupo — são somente leitura"_
4. Clicar no card **Revisor**
5. ✅ As ações **diretas** de Editor são substituídas pelas de Revisor: Visualizar, Revisar Documento, Submeter para Aprovação, Solicitar Revisão
6. ✅ Algumas ações como *Criar Documento* e *Editar* **permanecem marcadas** — mas com o badge verde **"Analistas de Qualidade"**: são herdadas do grupo, não do papel direto
7. ✅ Essas ações herdadas aparecem desabilitadas (não podem ser desmarcadas individualmente) — para removê-las seria necessário remover o grupo do objeto
8. Salvar

> _"Trocar o papel atualiza apenas as permissões diretas de Fernando — o sistema apaga tudo que vinha do papel anterior e aplica o que o novo papel define. O que permanece marcado em verde vem do grupo Analistas de Qualidade, que também tem acesso a este objeto. São duas origens distintas, visíveis lado a lado."_

### Cena 3.1 — Usar o modo Personalizado

> **Como** Org Admin,  
> **Quero** dar ao Fernando uma combinação específica de ações que nenhum papel padrão cobre,  
> **Para que** ele possa fazer revisão E criar documentos ao mesmo tempo.

**Passos:**

1. Ainda no painel do Fernando → ativar toggle **"Personalizado"**
2. Marcar: **Revisar Documento** + **Criar Documento** + **Visualizar**
3. Desmarcar: *Submeter para Aprovação* e *Solicitar Revisão*
4. Salvar
5. Fechar o painel → clicar em Fernando novamente
6. ✅ A seleção persiste exatamente como foi salva

> _"Quando nenhum papel padrão serve, o modo Personalizado permite montar o conjunto exato de ações. A configuração é salva por objeto — Fernando pode ter Personalizado no MaxDoc e Leitor em outro objeto."_

---

## Ato 4 — Marcelo gerencia permissões por grupo no MaxDoc

> **Como** Org Admin da Comgas,  
> **Quero** atribuir o papel Aprovador a um grupo inteiro de usuários,  
> **Para que** eu não precise adicionar cada aprovador individualmente.

**Passos:**

1. No painel do MaxDoc Comgas → **"Adicionar Membro"**
2. **Passo 1:** digitar o nome do grupo (ex: **"Vendedores"**) → selecionar o grupo
3. **Passo 2:** selecionar papel **Aprovador**
4. ✅ Mostrar as 17 ações pré-selecionadas (incluindo Aprovar Documento, Ciclo de Aprovação, Emitir Cópia Controlada, etc.)
5. ✅ Confirmar que *Criar Documento* e *Editar* **não estão** — Aprovador não herda ações de Editor
6. Confirmar

> _"Um grupo pode ter um papel em um objeto. Todos os membros do grupo herdam automaticamente as ações daquele papel naquele objeto específico — sem configuração individual."_

### Cena 4.1 — Verificar a herança no PermissoesMembroSheet

**Passos:**

1. Na lista de membros, clicar em um usuário do grupo Vendedores (ex: **Pedro Henrique**)
2. Mostrar o PermissoesMembroSheet
3. ✅ Banner verde: _"Ações marcadas via grupo — são somente leitura"_
4. ✅ As ações herdadas do grupo aparecem com badge verde **"Vendedores"**
5. ✅ As ações diretas (se houver) aparecem sem badge (azul)
6. ✅ Não é possível desmarcar individualmente ações herdadas — é necessário editar pelo grupo

> _"A herança fica visível e auditável. O gestor vê, para cada ação, se veio diretamente ou via grupo — e qual grupo. Não existe permissão 'mágica' sem origem rastreável."_

---

## Ato 5 — Carla configura o Assistente IA para a Santacruz

> **Como** Account Admin da Santacruz,  
> **Quero** configurar quem pode usar o Assistente de IA da minha conta,  
> **Para que** apenas a equipe autorizada tenha acesso ao assistente e seus recursos avançados.

**Passos:**

1. Switcher → **Carla Santos (Account Admin Santacruz)**
2. Sidebar → **Acessos** → aba **Objetos**
3. Clicar em **Assistente Suporte**

### Cena 5.1 — Adicionar Lucas como Membro (acesso básico)

**Passos:**

1. **"Adicionar Membro"** → **Passo 1:** selecionar **Lucas Oliveira** → **Passo 2:** papel **Membro**
2. ✅ 4 ações pré-selecionadas: Usar o assistente, Compartilhar resultados, Ver fontes consultadas, Upload de fontes RAG
3. ✅ Ausentes: Criar assistente, Configurar agentes, Gerenciar cenários de negócio, Gerenciar usuários
4. Confirmar

> _"O papel Membro dá o mínimo necessário para um usuário final operar o assistente. Funcionalidades administrativas ficam reservadas ao papel Admin."_

### Cena 5.2 — Adicionar Beatriz como Admin (acesso total)

**Passos:**

1. **"Adicionar Membro"** → **Passo 1:** selecionar **Beatriz Lima** → **Passo 2:** papel **Admin**
2. ✅ Todas as 8 ações selecionadas, incluindo Criar assistente, Configurar agentes, Gerenciar usuários
3. Confirmar

> _"O Admin tem controle total sobre o objeto. Dois usuários, dois papéis diferentes — o controle é granular por pessoa."_

---

## Ato 6 — Carla adiciona um grupo ao Assistente e Lucas herda acesso

> **Como** Account Admin da Santacruz,  
> **Quero** conceder acesso ao Assistente a toda a equipe de Farmacêuticos de uma vez,  
> **Para que** eu não precise adicionar os 12 membros individualmente.

### Cena 6.1 — Confirmar que Lucas está no grupo

**Passos:**

1. Sidebar → **Acessos** → aba **Grupos**
2. Localizar o grupo **Farmacêuticos** → clicar nele
3. ✅ Lucas Oliveira aparece na lista de membros do grupo

> _"Pertencer ao grupo não concede nenhum acesso automaticamente. O passo seguinte é adicionar o grupo a um objeto."_

### Cena 6.2 — Adicionar o grupo Farmacêuticos ao Assistente Suporte

**Passos:**

1. Aba **Objetos** → clicar em **Assistente Suporte**
2. **"Adicionar Membro"** → digitar **"Farmacêuticos"** → selecionar o grupo → papel **Visualizador**
3. ✅ Farmacêuticos aparece na lista com badge Visualizador

### Cena 6.3 — Verificar a herança no painel do Lucas

**Passos:**

1. Na lista de membros do Assistente Suporte, clicar em **Lucas Oliveira**
2. ✅ Banner verde: _"Ações marcadas via grupo — são somente leitura"_
3. ✅ A ação **"Usar o assistente"** exibe badge verde **"Farmacêuticos"**
4. ✅ As demais ações do Membro (Compartilhar resultados, Ver fontes, Upload RAG) aparecem em azul — são diretas

> _"Lucas agora tem dois tipos de acesso ao Assistente Suporte: ações diretas (papel Membro, atribuído individualmente) e ações herdadas (papel Visualizador, via grupo Farmacêuticos). O sistema exibe as duas origens lado a lado."_

---

## Ato 7 — Auditoria: verificando o que Lucas pode fazer e de onde veio cada permissão

> **Como** Account Admin da Santacruz,  
> **Quero** ver um relatório completo de tudo que Lucas pode fazer e de onde veio cada permissão,  
> **Para que** eu possa auditar e justificar os acessos em caso de revisão de segurança.

**Passos:**

1. Aba **Usuários** → localizar **Lucas Oliveira**
2. Clicar nos **três pontinhos** (coluna Ações) → **"Ver permissões efetivas"**
3. Mostrar a tabela com colunas: **Ação**, **Componente / Instância**, **Origem**
4. ✅ Ações com origem **"Direto"** — badge azul
5. ✅ Ações com origem **"Via Grupo · Farmacêuticos"** — badge verde
6. ✅ Cada linha mostra o objeto a que a permissão pertence

> _"Este painel responde a pergunta mais difícil de qualquer auditoria: 'por que esse usuário tem esse acesso?' Cada ação tem uma origem rastreável — e se veio de um grupo, o grupo está identificado."_

### Cena 7.1 — Verificar o detalhe do usuário na conta

**Passos:**

1. Clicar em **Lucas Oliveira** (nome) → abre o detalhe do usuário
2. Seção **Ações** → lista de objetos onde Lucas é membro direto com o papel em cada um
3. Clicar em **Editar** ao lado de Assistente Suporte
4. ✅ PermissoesMembroSheet abre novamente confirmando ações diretas + herdadas

---

## Ato 8 — Carla verifica um objeto sem contrato ativo

> **Como** Account Admin da Santacruz,  
> **Quero** entender por que um módulo não aparece na lista de objetos,  
> **Para que** eu possa confirmar se é uma questão de contrato ou de configuração.

**Passos:**

1. Switcher → **Ana Lima (Org Admin Apple)**
2. Sidebar → **Acessos** → aba **Objetos**
3. ✅ MaxDoc **não aparece** na lista
4. Navegar para **Acessos** → aba **Grupos** → observar que os grupos existem, mas não há objetos MaxDoc criados

> _"A conta Apple não tem o entitlement `maxdoc.use`. Sem licença, não existe instância — e sem instância, não há o que gerenciar. A aba Objetos exibe somente o que a conta efetivamente contratou e configurou."_

---

## Ato 9 — Visão gráfica: Canvas encerra a história

> **Como** Org Admin,  
> **Quero** ver o estado final das permissões após todas as configurações,  
> **Para que** eu possa validar visualmente que a estrutura está correta antes de liberar o acesso.

**Passos:**

1. Switcher → **Marcelo Ribeiro** ou **Carla Santos**
2. Sidebar → **Canvas** → selecionar a conta

### Cena 9.1 — Painel do Grupo

1. Clicar no nó do grupo **Farmacêuticos** (azul)
2. Painel lateral abre com: escopo, papel e lista de membros
3. Seção **Objetos** — lista todos os objetos da conta com o papel atual do grupo em cada um
4. ✅ O cadeado ao lado de cada objeto permite abrir o AtribuirPermissoesSheet sem sair do Canvas

> _"O painel do grupo centraliza tudo: quem são os membros e em quais objetos o grupo tem acesso. O cadeado permite editar sem precisar voltar para a página de Acessos."_

### Cena 9.2 — Painel do Usuário

1. Clicar no nó de **Lucas Oliveira** (verde)
2. Mostrar as 4 seções do painel:
   - **Grupos (N)** — grupos dos quais Lucas é membro
   - **Acesso direto (N)** — objetos com acesso individual (cadeado para editar)
   - **Via grupo (N)** — objetos acessíveis por herança (somente leitura)
   - **Outros objetos (N)** — objetos sem nenhum acesso; cadeado dimmed para adicionar

> _"O painel do usuário no Canvas é o mapa individual de acesso. Em uma tela, o gestor vê tudo: grupos, acessos diretos, heranças e o que ainda está em aberto. Editar é um clique no cadeado."_

### Cena 9.3 — Editar permissão diretamente pelo Canvas

1. No painel do Lucas, clicar no cadeado de um objeto em **Acesso direto**
2. ✅ O AtribuirPermissoesSheet abre em modo instância (para aquele objeto específico)
3. Alterar o papel → Salvar
4. ✅ O Canvas só recarrega os dados após salvar — fechar sem salvar não dispara reload

> _"O Canvas não é só visualização — é um ponto de controle. As edições feitas aqui refletem exatamente na aba Acessos e vice-versa."_

---

## Resumo da história

| Ato | Persona | Cenário coberto |
|-----|---------|-----------------|
| 1 | Marcelo | Canvas — visão geral + botão "Sobre" |
| 2 | Marcelo | Criar usuário, duplicidade, atribuir ao MaxDoc (papel Editor) |
| 3 | Marcelo | Trocar papel (Editor → Revisor), modo Personalizado |
| 4 | Marcelo | Atribuir grupo ao MaxDoc, herança no PermissoesMembroSheet |
| 5 | Carla | Assistente IA — papéis Membro e Admin |
| 6 | Carla | Grupo Farmacêuticos → Assistente, herança de Lucas |
| 7 | Carla | PermissoesEfetivasSheet — auditoria de origem por ação |
| 8 | Ana | Conta sem entitlement — objeto não existe |
| 9 | Marcelo/Carla | Canvas — painel de grupo, painel de usuário, edição inline |

---

## Critérios de aceite consolidados

| # | Critério | Ato |
|---|---------|-----|
| CA-01 | Canvas carrega sem erro; legenda visível; botão "Sobre" abre modal | 1 |
| CA-02 | Criar usuário funciona; e-mail duplicado → mensagem amigável; username duplicado → mensagem amigável | 2 |
| CA-03 | Adicionar membro ao MaxDoc com papel Editor pré-seleciona exatamente 9 ações | 2 |
| CA-04 | Trocar papel Editor → Revisor atualiza ações automaticamente sem acumular | 3 |
| CA-05 | Modo Personalizado persiste após fechar e reabrir o painel | 3 |
| CA-06 | Grupo com papel Aprovador pré-seleciona 17 ações; *Criar Documento* ausente | 4 |
| CA-07 | Ações herdadas de grupo aparecem em verde com badge do grupo; não editáveis individualmente | 4, 6 |
| CA-08 | Assistente — papel Membro tem 4 ações; Admin tem 8 | 5 |
| CA-09 | Adicionar grupo ao objeto → membros do grupo herdam ações imediatamente | 6 |
| CA-10 | PermissoesEfetivasSheet exibe origem de cada ação (Direto / Via Grupo + nome do grupo) | 7 |
| CA-11 | Conta sem entitlement não exibe objetos do módulo na aba Objetos | 8 |
| CA-12 | Canvas — painel de grupo lista objetos com papel e cadeado; painel de usuário mostra 4 seções | 9 |
| CA-13 | Editar permissão pelo Canvas abre AtribuirPermissoesSheet em modo instância; Canvas só recarrega após salvar | 9 |
