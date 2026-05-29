# Mapeamento DocNix → OpenFGA

**Data:** 2026-05-29  
**Contexto:** Este documento descreve como o modelo de permissões DocNix (atribuições granulares por instância) se traduziria para relações OpenFGA quando o PoC evoluir para produção.

> **Hoje (PoC):** autorização é mockada em `src/authz/engine.ts`.  
> **Produção:** as funções do engine seriam substituídas por chamadas ao SDK do OpenFGA. A interface de hooks (`src/authz/hooks.ts`) não muda.

---

## Conceitos lado a lado

| Conceito DocNix (cockpit) | Conceito OpenFGA |
|---|---|
| `instancia_membro_atribuicoes` (linha por membro+atribuição) | **Tuple** `(user:X, can_Y, instancia:Z)` |
| `instancia_membros` com grupo + atribuições do grupo | **Tuple** `(grupo:G#member, can_Y, instancia:Z)` |
| `grupos.parentId` (hierarquia pai→filho) | **Tuple** `(grupo:filho, parent, grupo:pai)` + herança via `member from parent` |
| `instancia.restringirAcesso = true` | Condição na relação `viewer`: restrita a `membros` em vez de toda a conta |
| `canActWithAtribuicao(userId, instanceId, atribuicaoId)` | `fga.check({ user, relation: "can_X", object: instancia })` |
| `getInstanciaAtribuicoes(userId, instanceId)` | `fga.listRelations({ user, object: instancia })` |
| Permissão efetiva (merge direto + grupos + hierarquia) | Calculado nativamente pelo FGA via expansão de tuplas |

---

## O que vai para o FGA vs o que fica no banco

| Dado | FGA (tuplas) | Banco de dados |
|---|---|---|
| "Usuário X pode Criar Documento na instância Y" | ✅ | origem: `instancia_membro_atribuicoes` |
| "Grupo G tem hierarquia sob Grupo P" | ✅ | origem: `grupos.parentId` |
| Fases configuradas de uma instância | ❌ | `instancia_fases` |
| Responsável padrão por fase | ❌ | `fase_responsaveis` |
| Slot de perfil (Revisor, Aprovador…) | ❌ | `instancia_perfil_slots` |
| Nomeações por slot | ❌ | `instancia_perfil_slot_nomeacoes` |
| Catálogo de atribuições disponíveis | ❌ | `componente_atribuicoes` |

**Regra geral:** FGA responde "quem pode fazer o quê". Configuração operacional (fases, fluxo, perfil de objeto) fica no banco e é processada pelo backend do DocNix, não pelo FGA.

---

## Modelo de autorização OpenFGA (.fga)

```
model
  schema 1.1

type user

type grupo
  relations
    define parent: [grupo]
    define member: [user, grupo#member] or member from parent

type instancia
  relations
    define membro: [user, grupo#member]

    # ── MaxDoc — atribuições granulares ─────────────────────────
    define can_criar_documento:          [user, grupo#member]
    define can_editar_documento:         [user, grupo#member]
    define can_excluir_documento:        [user, grupo#member]
    define can_aprovar_documento:        [user, grupo#member]
    define can_revisar_documento:        [user, grupo#member]
    define can_obsoletetar_documento:    [user, grupo#member]
    define can_submeter_aprovacao:       [user, grupo#member]
    define can_nova_versao:              [user, grupo#member]
    define can_proteger_documento:       [user, grupo#member]
    define can_distribuicao:             [user, grupo#member]
    define can_ler_todos:                [user, grupo#member]
    define can_acessar_todos:            [user, grupo#member]
    define can_comprovante_leitura:      [user, grupo#member]
    define can_imprimir:                 [user, grupo#member]
    define can_download_documento:       [user, grupo#member]
    define can_upload_documento:         [user, grupo#member]
    define can_emitir_copia_ctrl:        [user, grupo#member]
    define can_emitir_copia_nctrl:       [user, grupo#member]
    define can_assinatura_eletronica:    [user, grupo#member]
    define can_criar_anexo:              [user, grupo#member]
    define can_editar_anexo:             [user, grupo#member]
    define can_excluir_anexo:            [user, grupo#member]
    define can_criar_registro:           [user, grupo#member]
    define can_excluir_registro:         [user, grupo#member]
    define can_criar_modelos:            [user, grupo#member]
    define can_anexar_arquivos:          [user, grupo#member]
    # ... (demais 20 MaxDoc — ver ATRIBUICOES_DOCNIX_CATALOGO.md)

    # Admins MaxDoc herdam tudo
    define admin_maxdoc: [user, grupo#member]
    define can_criar_documento: can_criar_documento or admin_maxdoc
    # (repetir para cada relação acima)

    # ── DocAction — atribuições granulares ──────────────────────
    define can_criar_ocorrencia:         [user, grupo#member]
    define can_categorizar_ocorrencia:   [user, grupo#member]
    define can_analisar_causa:           [user, grupo#member]
    define can_aprovar_analise_causa:    [user, grupo#member]
    define can_criar_plano_acao:         [user, grupo#member]
    define can_verificar_eficacia:       [user, grupo#member]
    define can_encerrar_ocorrencia:      [user, grupo#member]
    define can_editar_ocorrencia:        [user, grupo#member]
    define can_excluir_ocorrencia:       [user, grupo#member]
    # ... (demais 10 DocAction)

    # ── Visibilidade (restringirAcesso) ─────────────────────────
    # restringirAcesso = false (padrão): viewer = todos da conta
    # restringirAcesso = true:           viewer = somente membros com atribuição
    define viewer: membro
```

---

## Fluxo de sincronização DB → FGA (produção)

Quando uma ação ocorre no cockpit, o backend precisaria escrever/deletar tuplas no FGA:

### Adicionar membro com atribuições
```
POST /api/instancias/:id/membros
→ INSERT instancia_membros
→ fga.write({ tuple: (user:X, membro, instancia:Y) })

POST /api/instancias/:id/membros/:membroId/atribuicoes
→ INSERT instancia_membro_atribuicoes
→ fga.write({ tuple: (user:X, can_criar_documento, instancia:Y) })
```

### Remover atribuição
```
DELETE /api/instancias/:id/membros/:membroId/atribuicoes/:atribuicaoId
→ DELETE instancia_membro_atribuicoes
→ fga.delete({ tuple: (user:X, can_criar_documento, instancia:Y) })
```

### Hierarquia de grupos
```
PUT /api/grupos/:id { parentId: "grupo-pai" }
→ UPDATE grupos SET parent_id = ...
→ fga.write({ tuple: (grupo:filho, parent, grupo:pai) })
```

### Check de permissão (substituição do engine.ts)
```typescript
// Hoje (mock):
canActWithAtribuicao(userId, instanceId, 'atrib-maxdoc-criar-doc', relations)

// Produção (OpenFGA SDK):
await fgaClient.check({
  user: `user:${userId}`,
  relation: 'can_criar_documento',
  object: `instancia:${instanceId}`,
})
```

---

## Convenção de nomes de relação

| Atribuição (cockpit) | Relação FGA |
|---|---|
| `atrib-maxdoc-criar-doc` | `can_criar_documento` |
| `atrib-maxdoc-aprovar-doc` | `can_aprovar_documento` |
| `atrib-docaction-criar-ocorrencia` | `can_criar_ocorrencia` |
| `atrib-maxdoc-admin-modulo` | `admin_maxdoc` |
| `atrib-docaction-admin-modulo` | `admin_docaction` |

**Regra:** `can_` + slug snake_case do nome da atribuição. Admin vira `admin_{modulo}` e concede todas as relações do módulo via composição.

---

## O que NÃO vai para o FGA

| Conceito | Por quê fica no banco |
|---|---|
| Fases e fluxo de aprovação | São configuração operacional do fluxo de trabalho, não autorização estática |
| Responsável por fase | Define "quem faz" em runtime, não "quem pode" em policy |
| Perfil de objeto (slots) | São metadados do documento, não tuplas de permissão |
| Elegibilidade de slot | É derivada das atribuições (query no banco), não uma relação FGA independente |
| Catálogo de atribuições | Metadado de configuração do componente |

---

## Gaps que precisariam ser resolvidos antes da produção

1. **Granularidade por objeto:** hoje o FGA concede permissão por *instância*. MaxDoc pode precisar de permissão por *documento individual* (ex: só o autor pode editar seu documento). Isso exigiria tipo `documento` no modelo FGA.

2. **Condicionais de atribuição passiva:** atribuições do tipo "passiva" (ex: Leitor Documento) filtram quem pode ser nomeado em um slot — isso é uma query no banco, não um check FGA. Precisa ficar claro na implementação.

3. **Sincronização eventual:** o banco é a fonte de verdade. As tuplas FGA são derivadas. Um mecanismo de sync (event-driven ou reconciliation job) precisaria garantir consistência.

4. **Escopo de instância vs componente:** atribuições são por instância (uma empresa pode ter duas instâncias MaxDoc com membros diferentes). O modelo FGA deve sempre incluir `instancia:` como objeto, nunca `componente:`.
