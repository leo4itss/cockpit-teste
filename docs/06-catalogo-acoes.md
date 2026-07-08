# 06 — Catálogo de Ações & Papéis

Referência das Ações e papéis por componente. As Ações (`componente_acoes` / `componente_atribuicoes`) são as
chaves gravadas em `component_permissions.acao`; os papéis (`componente_papeis`) empacotam Ações via `defaultAcoes`
(`[]` = **todas** as Ações do catálogo = Administrador). Termos conforme [glossario.md](./glossario.md).

> ⚠️ **Dados de referência.** As listas abaixo derivam de material real de produto (DocNix) mas os **objetos e
> vínculos do ambiente são placeholders** para validar o modelo — ver [01-visao-e-escopo.md](./01-visao-e-escopo.md).

---

## 1. Papéis por componente (`componente_papeis`)

Cada papel expande para um conjunto de Ações (`defaultAcoes`). Convenção: `[]` = todas as Ações do catálogo.
Papéis genéricos FGA (`viewer/member/admin`) valem para componentes `tipoModelo='fga'`; DocNix usa papéis próprios.

| Componente | Papéis | Administrador (`defaultAcoes: []`) |
|---|---|---|
| MaxDoc | Leitor, Editor, Revisor, Aprovador, **Administrador** | Administrador = 47 Ações |
| DocAction | Colaborador, Analista, Aprovador, **Administrador** | Administrador = 19 Ações |
| Assistente-IA | Viewer, User, **Admin** | Admin = todas (`can_use_assistant`…`can_manage_users`) |
| Base-Conhecimento | Viewer, User, **Admin** | Admin = `pode_ler`…`pode_excluir` |
| Analytics | Viewer, User, **Admin** | Admin = `can_view_dashboards`…`can_manage_analytics` |

Exemplos de contagem de Ações por papel (critérios de aceite em [05-cenarios-validados.md](./05-cenarios-validados.md)):
MaxDoc → Leitor=2 (Leitor Documento, Imprimir), Editor=3, Revisor=3, Aprovador=5, Administrador=47.

A UI para montar/combinar papéis (toggle **Combinar papéis**) persiste combinações como `papel='personalizado'` e
reconstrói o conjunto pelo **menor subconjunto** que bate — ver `src/authz/combinarPapeis.ts` e
[fluxos/01-usuarios.md](./fluxos/01-usuarios.md).

---

## 2. MaxDoc — 47 Ações (`comp-maxdoc`)

Tipos de comportamento: **passiva** (filtra nomeação no Perfil de Objeto), **ativa** (basta ter a atribuição),
**global** (acesso amplo), **admin** (config do módulo), **legado** (retrocompat viewer/member/admin).

| Nome (produto) | Grupo | Tipo | Slot perfil |
|---|---|---|---|
| Acesso Externo Exportar XML | Integração | admin | — |
| Administrador Módulo MaxDoc | Administração | admin | — |
| Administrador Registro | Registro | admin | — |
| Acessar Todos | Global | global | — |
| Anexar Arquivos | Documento | ativa | — |
| Aprovar Documento | Documento | passiva | Aprovador |
| Aprovador Substituto Anexo | Substituto | ativa | — |
| Aprovador Substituto Documento | Substituto | ativa | — |
| Aprovador Substituto Registro | Substituto | ativa | — |
| Assinatura Eletrônica | Documento | ativa | — |
| Ciclo de Aprovação Anexos | Anexo | ativa | — |
| Ciclo de Aprovação Documentos | Documento | ativa | — |
| Comprovante de Leitura | Global | ativa | — |
| Controle de Acesso | Administração | admin | — |
| Cópia Controlada Anexos | Anexo | ativa | — |
| Criar Anexo | Anexo | ativa | — |
| Criar Documento | Documento | ativa | — |
| Criar Modelos | Documento | ativa | — |
| Criar Registro | Registro | ativa | — |
| Criar Tipos Anexos | Anexo | admin | — |
| Distribuição | Documento | passiva | — |
| Download Documento | Documento | ativa | — |
| Editar Documento | Documento | passiva | Editor |
| Editar Anexo | Anexo | ativa | — |
| Emitir Cópia Controlada | Cópias | ativa | — |
| Emitir Cópia Não Controlada | Cópias | ativa | — |
| Excluir Anexo | Anexo | ativa | — |
| Excluir Documento | Documento | ativa | — |
| Excluir Registro | Registro | ativa | — |
| Imprimir | Documento | ativa | — |
| Leitor Anexos | Anexo | passiva | — |
| Leitor Documento | Documento | passiva | Leitor |
| Editor Documento | Documento | passiva | Editor |
| Ler Todos | Global | global | — |
| Nova Versão | Documento | ativa | — |
| Obsoletetar Documento | Documento | ativa | — |
| Proteger Documento | Documento | ativa | — |
| Revisar Documento | Documento | passiva | Revisor |
| Revisar como Substituto Documento | Substituto | ativa | — |
| Revisor Documento | Documento | passiva | Revisor |
| Aprovador Documento | Documento | passiva | Aprovador |
| Submeter para Aprovação | Documento | ativa | — |
| Tabelas Administrativas | Administração | admin | — |
| Upload Documento | Documento | ativa | — |
| Visualizar | Legado | legado | — |
| Usar | Legado | legado | — |
| Administrar | Legado | legado | — |

**Fases sugeridas (instância):** Minuta → Revisão → Aprovação → Vigente → Obsoleto.
**Slots do Perfil de Objeto:** Revisor · Aprovador · Leitor · Editor · Autor.

---

## 3. DocAction — 19 Ações (`comp-docaction`)

| Nome (produto) | Grupo | Tipo |
|---|---|---|
| Administrador Módulo DocAction | Administração | admin |
| Criar Ocorrência | Ocorrência | ativa |
| Criar Ocorrência 8D | Ocorrência | ativa |
| Categorizar Ocorrência | Tratativa | ativa |
| Analisar Causa | Tratativa | ativa |
| Aprovar Análise de Causa | Tratativa | ativa |
| Criar Plano de Ação | Plano | ativa |
| Verificar Eficácia | Encerramento | ativa |
| Encerrar Ocorrência | Encerramento | ativa |
| Encaminhar Ocorrência | Fluxo | ativa |
| Editar Ocorrência | Ocorrência | ativa |
| Excluir Ocorrência | Ocorrência | ativa |
| Reprogramar Prazo/Responsável | Fluxo | ativa |
| Vincular Ocorrência | Fluxo | ativa |
| Acompanhar Ocorrência | Fluxo | ativa |
| Gerenciar Configurações | Administração | admin |
| Visualizar | Legado | legado |
| Usar | Legado | legado |
| Administrar | Legado | legado |

**Fases sugeridas:** Aguardando Categorização → Análise de Causa → Plano de Ação → Verificação de Eficácia → Encerrada.

---

## 4. Componentes FGA (coarse-grained)

Para componentes `tipoModelo='fga'` as Ações são verbos por tipo (definidos em `COMPONENTE_CONFIGS` /
`componente_acoes`):

- **Assistente-IA:** `can_use_assistant`, `can_share_conversation_results`, `can_view_consulted_sources`,
  `can_upload_rag_sources`, `can_create_assistant`, `can_configure_agents`, `can_manage_business_scenarios`,
  `can_manage_users`.
- **Base-Conhecimento:** `pode_ler`, `pode_editar`, `pode_criar_documento`, `pode_enviar_para_aprovacao`,
  `pode_aprovar`, `pode_publicar`, `pode_excluir`.
- **Analytics:** `can_view_dashboards`, `can_export_reports`, `can_manage_analytics`.

---

## 5. Convenção FGA e como aplicar o seed

Nome de relação = `can_` + slug snake_case da Ação; admin de módulo = `admin_<modulo>` (concede todas por
composição). O esboço do `authorization-model.fga` está descrito em [02-arquitetura-fga.md](./02-arquitetura-fga.md).

```bash
npx tsx server/seed-docnix-atribuicoes.ts     # catálogo MaxDoc/DocAction
npx tsx server/seed-docnix-instancias.ts       # instâncias + membros demo (opcional)
```
