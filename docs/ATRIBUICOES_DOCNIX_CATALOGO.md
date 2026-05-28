# Catálogo de Atribuições DocNix — MaxDoc e DocAction

**Fontes:** transcrição `Atribuições Docnix.docx` (reunião 27/05/2026), prints `BENCH_DOCNIX`, seed `server/seed-docnix-atribuicoes.ts`.

**Componentes:** `comp-maxdoc` (MaxDoc) · `comp-docaction` (DocAction)

---

## Modelo (resumo)

| Camada | O quê |
|--------|--------|
| **Atribuição** | Capacidade no módulo (“pode aprovar documento”). Não é papel global. |
| **Grupo / usuário** | Pacote ou lista direta de atribuições (+ hierarquia pai → filho). |
| **Permissão efetiva** | Merge direto + grupos, sem duplicar. |
| **Objeto (MaxDoc)** | Perfil do documento: Autor, Revisor, Aprovador, Leitor, Editor — só quem tem a atribuição entra no filtro. |
| **Objeto (DocAction)** | Responsável por fase (usuário, grupo, cargo, área); fluxo pré-definido. |

### UI — aba Membros (instância MaxDoc/DocAction)

| Ação | Tela | Observação |
|------|------|------------|
| Conceder atribuições | **Adicionar membro** ou **Atribuições** na linha | Edita vínculos em `instancia_membro_atribuicoes` |
| Ver resultado | **Efetivas** | Somente leitura; origem Direto / Via Grupo |
| Papéis Viewer/Member/Admin | — | Ocultos nestas instâncias (legado FGA) |
| Editar via grupo | **Atribuições** na linha do **grupo** | Usuário herda; badge "Via Grupo" bloqueia edição direta |

### Tipos de comportamento (MaxDoc)

| Tipo | Descrição | Exemplos |
|------|-----------|----------|
| **passiva** | Filtro para nomeação no perfil do documento | Leitor Documento, Editor Documento, Aprovar Documento |
| **ativa** | Basta ter a atribuição para executar | Emitir Cópia Controlada, Imprimir |
| **global** | Acesso amplo; documento pode restringir | Ler Todos, Acessar Todos |
| **admin** | Configuração do módulo / tabelas | Tabelas Administrativas, Administrador Módulo |
| **legado** | Retrocompat cockpit (migração viewer/member/admin) | Visualizar, Usar, Administrar |

---

## MaxDoc — 47 atribuições

| ID | Nome (produto) | Grupo | Tipo | Slot perfil |
|----|----------------|-------|------|-------------|
| `atrib-maxdoc-acesso-ext-xml` | Acesso Externo Exportar XML | Integração | admin | — |
| `atrib-maxdoc-admin-modulo` | Administrador Módulo MaxDoc | Administração | admin | — |
| `atrib-maxdoc-admin-registro` | Administrador Registro | Registro | admin | — |
| `atrib-maxdoc-acessar-todos` | Acessar Todos | Global | global | — |
| `atrib-maxdoc-anexar-arquivos` | Anexar Arquivos | Documento | ativa | — |
| `atrib-maxdoc-aprovar-doc` | Aprovar Documento | Documento | passiva | Aprovador |
| `atrib-maxdoc-aprov-subst-anexo` | Aprovador Substituto Anexo | Substituto | ativa | — |
| `atrib-maxdoc-aprov-subst-doc` | Aprovador Substituto Documento | Substituto | ativa | — |
| `atrib-maxdoc-aprov-subst-reg` | Aprovador Substituto Registro | Substituto | ativa | — |
| `atrib-maxdoc-assinatura-eletronica` | Assinatura Eletrônica | Documento | ativa | — |
| `atrib-maxdoc-ciclo-aprov-anexo` | Ciclo de Aprovação Anexos | Anexo | ativa | — |
| `atrib-maxdoc-ciclo-aprov-doc` | Ciclo de Aprovação Documentos | Documento | ativa | — |
| `atrib-maxdoc-comprovante-leitura` | Comprovante de Leitura | Global | ativa | — |
| `atrib-maxdoc-controle-acesso` | Controle de Acesso | Administração | admin | — |
| `atrib-maxdoc-copia-ctrl-anexo` | Cópia Controlada Anexos | Anexo | ativa | — |
| `atrib-maxdoc-criar-anexo` | Criar Anexo | Anexo | ativa | — |
| `atrib-maxdoc-criar-doc` | Criar Documento | Documento | ativa | — |
| `atrib-maxdoc-criar-modelos` | Criar Modelos | Documento | ativa | — |
| `atrib-maxdoc-criar-registro` | Criar Registro | Registro | ativa | — |
| `atrib-maxdoc-criar-tipos-anexos` | Criar Tipos Anexos | Anexo | admin | — |
| `atrib-maxdoc-distribuicao` | Distribuição | Documento | passiva | — |
| `atrib-maxdoc-download-doc` | Download Documento | Documento | ativa | — |
| `atrib-maxdoc-editar-doc` | Editar Documento | Documento | passiva | Editor |
| `atrib-maxdoc-editar-anexo` | Editar Anexo | Anexo | ativa | — |
| `atrib-maxdoc-emitir-copia-ctrl` | Emitir Cópia Controlada | Cópias | ativa | — |
| `atrib-maxdoc-emitir-copia-nctrl` | Emitir Cópia Não Controlada | Cópias | ativa | — |
| `atrib-maxdoc-excluir-anexo` | Excluir Anexo | Anexo | ativa | — |
| `atrib-maxdoc-excluir-doc` | Excluir Documento | Documento | ativa | — |
| `atrib-maxdoc-excluir-registro` | Excluir Registro | Registro | ativa | — |
| `atrib-maxdoc-imprimir` | Imprimir | Documento | ativa | — |
| `atrib-maxdoc-leitor-anexos` | Leitor Anexos | Anexo | passiva | — |
| `atrib-maxdoc-leitor-doc` | Leitor Documento | Documento | passiva | Leitor |
| `atrib-maxdoc-editor-doc` | Editor Documento | Documento | passiva | Editor |
| `atrib-maxdoc-ler-todos` | Ler Todos | Global | global | — |
| `atrib-maxdoc-nova-versao` | Nova Versão | Documento | ativa | — |
| `atrib-maxdoc-obsoletetar-doc` | Obsoletetar Documento | Documento | ativa | — |
| `atrib-maxdoc-proteger-doc` | Proteger Documento | Documento | ativa | — |
| `atrib-maxdoc-revisar-doc` | Revisar Documento | Documento | passiva | Revisor |
| `atrib-maxdoc-revisar-subst-doc` | Revisar como Substituto Documento | Substituto | ativa | — |
| `atrib-maxdoc-revisor-doc` | Revisor Documento | Documento | passiva | Revisor |
| `atrib-maxdoc-aprovador-doc` | Aprovador Documento | Documento | passiva | Aprovador |
| `atrib-maxdoc-submeter-aprovacao` | Submeter para Aprovação | Documento | ativa | — |
| `atrib-maxdoc-tabelas-admin` | Tabelas Administrativas | Administração | admin | — |
| `atrib-maxdoc-upload-doc` | Upload Documento | Documento | ativa | — |
| `atrib-maxdoc-visualizar` | Visualizar | Legado | legado | — |
| `atrib-maxdoc-usar` | Usar | Legado | legado | — |
| `atrib-maxdoc-administrar` | Administrar | Legado | legado | — |

**Fases sugeridas (instância):** Minuta → Revisão → Aprovação → Vigente → Obsoleto

**Slots sugeridos (perfil de objeto):** Revisor · Aprovador · Leitor · Editor · Autor

---

## DocAction — 19 atribuições

| ID | Nome (produto) | Grupo | Tipo |
|----|----------------|-------|------|
| `atrib-docaction-admin-modulo` | Administrador Módulo DocAction | Administração | admin |
| `atrib-docaction-criar-ocorrencia` | Criar Ocorrência | Ocorrência | ativa |
| `atrib-docaction-criar-ocorrencia-8d` | Criar Ocorrência 8D | Ocorrência | ativa |
| `atrib-docaction-categorizar-ocorrencia` | Categorizar Ocorrência | Tratativa | ativa |
| `atrib-docaction-analisar-causa` | Analisar Causa | Tratativa | ativa |
| `atrib-docaction-aprovar-analise-causa` | Aprovar Análise de Causa | Tratativa | ativa |
| `atrib-docaction-criar-plano-acao` | Criar Plano de Ação | Plano | ativa |
| `atrib-docaction-verificar-eficacia` | Verificar Eficácia | Encerramento | ativa |
| `atrib-docaction-encerrar-ocorrencia` | Encerrar Ocorrência | Encerramento | ativa |
| `atrib-docaction-encaminhar-ocorrencia` | Encaminhar Ocorrência | Fluxo | ativa |
| `atrib-docaction-editar-ocorrencia` | Editar Ocorrência | Ocorrência | ativa |
| `atrib-docaction-excluir-ocorrencia` | Excluir Ocorrência | Ocorrência | ativa |
| `atrib-docaction-reprogramar-prazo` | Reprogramar Prazo/Responsável | Fluxo | ativa |
| `atrib-docaction-vincular-ocorrencia` | Vincular Ocorrência | Fluxo | ativa |
| `atrib-docaction-acompanhar-ocorrencia` | Acompanhar Ocorrência | Fluxo | ativa |
| `atrib-docaction-gerenciar-config` | Gerenciar Configurações | Administração | admin |
| `atrib-docaction-visualizar` | Visualizar | Legado | legado |
| `atrib-docaction-usar` | Usar | Legado | legado |
| `atrib-docaction-administrar` | Administrar | Legado | legado |

**Fases sugeridas (instância):** Aguardando Categorização → Análise de Causa → Plano de Ação → Verificação de Eficácia → Encerrada

---

## Mapeamento seed anterior → catálogo

| ID antigo | Status |
|-----------|--------|
| `atrib-maxdoc-criar-doc` … `controle-acesso` | Mantidos (mesmos nomes onde aplicável) |
| `atrib-docaction-criar-ocorrencia` … `gerenciar-config` | Mantidos |
| Novos IDs | Inseridos pelo seed (ignora se `nome` já existir no banco) |

---

## Como aplicar

```bash
npx tsx server/seed-docnix-atribuicoes.ts
npx tsx server/seed-docnix-instancias.ts   # instâncias + membros demo (opcional)
```

---

## Gap PoC (próximos passos)

| Item | Prioridade | Status |
|------|------------|--------|
| Filtro “só com atribuição X” ao nomear slot no perfil | P0 | ✅ Implementado |
| Editar atribuições diretas do membro (sheet) | P0 | ✅ `MembroAtribuicoesSheet` |
| Ocultar papéis legado na aba Membros (MaxDoc/DocAction) | P1 | ✅ Implementado |
| Fases/slots demo alinhados na instância Comgas | P1 | ✅ Seed instâncias |
| Busca/presets no multi-select de atribuições (adicionar membro) | P2 | Pendente |
| Matriz fase × ação × papel | P2 | Pendente |
| Protege menu / licença módulo | Fora do PoC | — |

### API — membros e perfil

- `GET|POST|DELETE /api/instancias/:id/membros/:membroId/atribuicoes` — vínculos diretos membro ↔ atribuição
- `GET /api/instancias/:id/permissoes-efetivas?userId=` — merge direto + grupos (leitura)
- `GET /api/instancias/:id/elegiveis-slot?atribuicaoId=` — lista usuários/grupos elegíveis para slot
- `POST /api/instancias/:id/perfil-slots/:slotId/nomeacoes` — valida elegibilidade no servidor
- Tabela `instancia_perfil_slot_nomeacoes` — nomeações por slot
