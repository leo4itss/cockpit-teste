import { useState, useEffect, useMemo } from 'react'
import { Check, Shield, Layers, Lock } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Button } from '@/components/ui/Button'
import { AtribuirPermissoesSheet } from '@/components/permissoes/AtribuirPermissoesSheet'
import { PermissoesMembroSheet } from '@/components/instancias/PermissoesMembroSheet'
import { NIVEIS_CONTA, getComponenteConfig } from '@/authz/mock'
import { cn } from '@/lib/utils'
import { api } from '@/api/client'
import type { User, Instancia, InstanciaMembro, UserAccountMembership } from '@/types'

// ── Helpers ───────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6 pb-3">{children}</p>
}

function Field({ label, value, required }: { label: string; value?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#030712]">
        {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <div className="h-9 px-3 flex items-center bg-[#f3f4f6] rounded-md text-sm text-[#6b7280] overflow-hidden">
        <span className="truncate">{value || 'Não informado'}</span>
      </div>
    </div>
  )
}

/** Badge de papel de instância — colorido por componente. */
function InstanciaPapelBadge({ papel, componenteNome }: { papel: string; componenteNome: string }) {
  const config = getComponenteConfig(componenteNome)
  const def = config.papeis.find(p => p.value === papel)
  if (!def) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        {papel}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', def.cls)}>
      {def.label}
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  open:         boolean
  onClose:      () => void
  user:         User | null
  accountId:    string
  accountNome?: string
  onEdit:       (user: User) => void
}

// ── Componente ────────────────────────────────────────────────

export function UsuarioDetailAccountSheet({
  open, onClose, user, accountId, accountNome, onEdit,
}: Props) {
  const [showPermissoes, setShowPermissoes]   = useState(false)

  // Dados de acesso à conta
  const [membership, setMembership]           = useState<UserAccountMembership | null>(null)

  // Instâncias onde o usuário é membro
  const [instancias, setInstancias]           = useState<Instancia[]>([])
  const [membroInstancias, setMembroInstancias] = useState<InstanciaMembro[]>([])
  const [componenteNomes, setComponenteNomes] = useState<Record<string, string>>({})
  const [loadingAcesso, setLoadingAcesso]     = useState(false)

  // Permissões por componente (nível conta — FGA, instancia_id null)
  const [permComponentes, setPermComponentes] = useState<{ compId: string; compNome: string; papel: string }[]>([])

  // Permissões de instância selecionada
  const [instanciaAberta, setInstanciaAberta] = useState<{
    instancia: Instancia
    membro: InstanciaMembro
  } | null>(null)

  // Recarrega dados de acesso — chamado no mount e após salvar permissões
  async function reloadAcesso(insts?: Instancia[]) {
    if (!user) return
    setLoadingAcesso(true)
    try {
      const [membros, fetchedInsts, comps, contaPerms] = await Promise.all([
        api.getAccountMembros(accountId).catch(() => [] as any[]),
        insts ? Promise.resolve(insts) : api.getInstancias({ accountId }).catch(() => [] as Instancia[]),
        api.getComponentes().catch(() => [] as any[]),
        api.getPermissions({ entidade_tipo: 'user', entidade_id: user.id, instancia_id: null }).catch(() => [] as any[]),
      ])

      const m = (membros as any[]).find((mb: any) => mb.userId === user.id)
      setMembership(m ?? null)

      const nomesMap: Record<string, string> = {}
      for (const c of comps as any[]) nomesMap[c.id] = c.nome
      setComponenteNomes(nomesMap)

      const activeInsts = (fetchedInsts as Instancia[])
      if (!insts) setInstancias(activeInsts)

      // Membros das instâncias — carrega em paralelo
      const todosOsMembros: InstanciaMembro[] = []
      await Promise.all(
        activeInsts.map(inst =>
          api.getInstanciaMembros(inst.id).then(mems => {
            for (const mb of mems as InstanciaMembro[]) {
              if (mb.entidadeId === user.id && mb.entidadeTipo === 'user') {
                todosOsMembros.push(mb)
              }
            }
          }).catch(() => {})
        )
      )
      setMembroInstancias(todosOsMembros)

      // ── Infere papeis de component_permissions (nível conta) ──
      const permsByComp: Record<string, Set<string>> = {}
      for (const p of contaPerms as any[]) {
        const cid = p.componenteId ?? p.componente_id
        if (!cid) continue
        if (!permsByComp[cid]) permsByComp[cid] = new Set()
        permsByComp[cid].add(p.acao)
      }
      const inferedComps: { compId: string; compNome: string; papel: string }[] = []
      for (const [cid, acoes] of Object.entries(permsByComp)) {
        const compNome = nomesMap[cid]
        if (!compNome) continue
        const cfg = getComponenteConfig(compNome)
        if (cfg.permissaoMode !== 'component_permissions') continue
        let papelLabel = 'Personalizado'
        for (const p of cfg.papeis) {
          const papelSet = new Set(p.defaultAcoes ?? [])
          if (papelSet.size === acoes.size && [...papelSet].every(a => acoes.has(a))) {
            papelLabel = p.label; break
          }
        }
        inferedComps.push({ compId: cid, compNome, papel: papelLabel })
      }
      setPermComponentes(inferedComps)

    } finally {
      setLoadingAcesso(false)
    }
  }

  useEffect(() => {
    if (!open || !user) return
    reloadAcesso()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, accountId])

  // Instâncias onde o usuário é membro, com dados unidos
  const instanciasComAcesso = useMemo(() => {
    return membroInstancias.map(mb => ({
      membro: mb,
      instancia: instancias.find(i => i.id === mb.instanciaId),
    })).filter(x => x.instancia !== undefined) as { membro: InstanciaMembro; instancia: Instancia }[]
  }, [membroInstancias, instancias])

  if (!user) return null

  const nivelDef = NIVEIS_CONTA.find(n => n.value === membership?.papel)

  function handleClose() {
    setShowPermissoes(false)
    setInstanciaAberta(null)
    setMembership(null)
    setInstancias([])
    setMembroInstancias([])
    setPermComponentes([])
    onClose()
  }

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[640px]">
      <NestedSheetHeader
        onClose={handleClose}
        action={
          <Button variant="outline" size="sm" onClick={() => onEdit(user)}>Editar</Button>
        }
      >
        <NestedSheetTitle>Detalhes do Usuário</NestedSheetTitle>
      </NestedSheetHeader>

      <NestedSheetBody>
        <div className="flex flex-col gap-8">

          {/* Identificação */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e5e7eb] shrink-0 flex items-center justify-center text-sm font-semibold text-[#6b7280] overflow-hidden">
              {user.avatar
                ? <img src={user.avatar} alt={user.nomeCompleto} className="w-full h-full object-cover" />
                : user.nomeCompleto.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-[#030712] leading-6 truncate">{user.nomeCompleto}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16a34a]">
                <span className="w-4 h-4 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                </span>
                Criado
              </span>
            </div>
          </div>

          <Divider />

          {/* Informações básicas */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Informações básicas</SectionTitle>
            <Field label="Nome completo" value={user.nomeCompleto} required />
            <Field label="Usuário/login" value={user.usuario} required />
            <Field label="E-mail" value={user.email} required />
            <div className="grid grid-cols-2 gap-4">
              <Field label="País / Região" value={user.pais} required />
              <Field label="Número" value={user.telefone} required />
            </div>
          </div>

          <Divider />

          {/* Contatos */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Contatos</SectionTitle>
            <Field label="Telefone" value={user.telefone} required />
            <Field label="E-mail" value={user.email} required />
          </div>

          <Divider />

          {/* Informações Profissionais */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Informações Profissionais</SectionTitle>
            <Field label="Área" value={user.area} required />
            <Field label="Cargo" value={user.cargo} required />
            <Field label="Etiquetas de classificação" value={user.etiquetas} required />
          </div>

          <Divider />

          {/* Configurações regionais */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Configurações regionais</SectionTitle>
            <Field label="Formato de data" value={user.formatoData} />
            <Field label="Formato de hora (12/24)" value={user.formatoHora} />
            <Field label="Fuso horário pessoal" value={user.fusoHorario} />
          </div>

          <Divider />

          {/* ── Acesso ao Cockpit nesta conta ─────────────────── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#6b7280] shrink-0" />
              <SectionTitle>Perfil no Cockpit{accountNome ? ` — ${accountNome}` : ''}</SectionTitle>
            </div>
            {loadingAcesso ? (
              <p className="text-sm text-[#6b7280]">Carregando…</p>
            ) : nivelDef ? (
              <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex-1 min-w-0">
                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', nivelDef.cls)}>
                    {nivelDef.label}
                  </span>
                  <p className="text-xs text-[#6b7280] mt-1.5">{nivelDef.desc}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#6b7280]">Sem vínculo direto com esta conta.</p>
            )}
            <p className="text-xs text-[#9ca3af]">
              A alteração de perfil é feita pelo Org Admin.
            </p>
          </div>

          <Divider />

          {/* ── Acesso às soluções (instâncias) ──────────────── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#6b7280] shrink-0" />
              <SectionTitle>Acesso às soluções</SectionTitle>
            </div>

            {loadingAcesso ? (
              <p className="text-sm text-[#6b7280]">Carregando…</p>
            ) : instanciasComAcesso.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-gray-200 bg-gray-50">
                <p className="text-sm text-[#6b7280]">
                  Sem acesso a instâncias nesta conta. Use "Atribuir permissões" ou adicione-o
                  diretamente nas instâncias desejadas.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {instanciasComAcesso.map(({ instancia, membro }) => {
                  const compNome = componenteNomes[instancia.componenteId] ?? ''
                  return (
                    <div
                      key={instancia.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#030712] truncate">{instancia.nome}</p>
                        {compNome && (
                          <p className="text-xs text-[#6b7280]">{compNome}</p>
                        )}
                      </div>
                      <InstanciaPapelBadge papel={membro.papel} componenteNome={compNome} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInstanciaAberta({ instancia, membro })}
                      >
                        Editar permissões
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Permissões por componente (FGA, nível conta) ── */}
          {!loadingAcesso && permComponentes.length > 0 && (
            <>
              <div className="border-t border-gray-100" />
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#6b7280] shrink-0" />
                  <SectionTitle>Permissões por componente</SectionTitle>
                </div>
                <div className="flex flex-col gap-1.5">
                  {permComponentes.map(({ compId, compNome, papel }) => (
                    <div
                      key={compId}
                      className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 bg-white"
                    >
                      <p className="text-sm font-medium text-[#030712]">{compNome}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                        {papel}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#9ca3af]">
                  Atribuídas a nível de conta — válidas em todas as instâncias deste componente.
                </p>
              </div>
            </>
          )}

        </div>

        {/* Sheet nível 2 — AtribuirPermissoes */}
        <AtribuirPermissoesSheet
          open={showPermissoes}
          onClose={() => setShowPermissoes(false)}
          entityType="usuario"
          entityId={user.id}
          entityNome={user.nomeCompleto}
          accountId={accountId}
          accountNome={accountNome}
          onSuccess={() => reloadAcesso(instancias)}
        />

        {/* Sheet nível 2 — PermissoesMembroSheet por instância */}
        {instanciaAberta && (
          <PermissoesMembroSheet
            open={!!instanciaAberta}
            onClose={() => setInstanciaAberta(null)}
            instanciaId={instanciaAberta.instancia.id}
            instanciaNome={instanciaAberta.instancia.nome}
            componenteId={instanciaAberta.instancia.componenteId}
            componenteNome={componenteNomes[instanciaAberta.instancia.componenteId] ?? ''}
            membro={instanciaAberta.membro}
            onSaved={() => {
              reloadAcesso(instancias)
              setInstanciaAberta(null)
            }}
          />
        )}
      </NestedSheetBody>

      <NestedSheetFooter>
        <Button variant="outline" onClick={handleClose}>Cancelar</Button>
        <Button onClick={() => setShowPermissoes(true)}>Atribuir permissões</Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
