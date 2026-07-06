/**
 * AtribuirGrupoEmMassaSheet — atribui N usuários selecionados a um grupo de uma vez.
 *
 * Fluxo: escolher o grupo destino → confirmar → o cliente envia os userIds em
 * chunks para POST /api/grupos/:id/membros/bulk (idempotente), exibindo barra
 * de progresso — projetado para seleções de milhares de usuários.
 *
 * A atribuição gera exatamente as mesmas tuplas usuario_grupos (user member group)
 * que a atribuição individual — herança e permissões efetivas não mudam.
 */

import { useState, useMemo, useEffect } from 'react'
import { Search, Users, CheckCircle2 } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetDescription,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import type { Grupo } from '@/types'

// Tamanho do chunk enviado por request — mantém cada chamada rápida e permite
// progresso incremental em seleções de dezenas de milhares de usuários.
const CHUNK_SIZE = 500

interface Props {
  open: boolean
  onClose: () => void
  /** Usuários selecionados na listagem */
  userIds: string[]
  /** Grupos candidatos (ativos, do escopo visível na tela) */
  grupos: Grupo[]
  /** Chamado ao concluir com sucesso — o pai recarrega o mapa usuário→grupos */
  onSuccess?: (grupo: Grupo) => void
}

export function AtribuirGrupoEmMassaSheet({ open, onClose, userIds, grupos, onSuccess }: Props) {
  const [search, setSearch]               = useState('')
  const [grupoId, setGrupoId]             = useState<string | null>(null)
  const [saving, setSaving]               = useState(false)
  const [progresso, setProgresso]         = useState({ enviados: 0, total: 0 })
  const [resultado, setResultado]         = useState<{ adicionados: number; jaExistiam: number } | null>(null)
  const [erro, setErro]                   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setGrupoId(null)
    setSaving(false)
    setProgresso({ enviados: 0, total: 0 })
    setResultado(null)
    setErro(null)
  }, [open])

  const gruposAtivos = useMemo(() => {
    const q = search.trim().toLowerCase()
    return grupos
      .filter(g => g.status === 'Ativo')
      .filter(g => !q || g.nome.toLowerCase().includes(q) || (g.descricao ?? '').toLowerCase().includes(q))
  }, [grupos, search])

  const grupoSelecionado = grupos.find(g => g.id === grupoId) ?? null

  async function handleAtribuir() {
    if (!grupoId || userIds.length === 0) return
    setSaving(true)
    setErro(null)
    setProgresso({ enviados: 0, total: userIds.length })

    let adicionados = 0
    let jaExistiam  = 0
    try {
      for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
        const chunk = userIds.slice(i, i + CHUNK_SIZE)
        const res = await api.addGrupoMembrosBulk(grupoId, chunk)
        adicionados += res.adicionados
        jaExistiam  += res.jaExistiam
        setProgresso({ enviados: Math.min(i + CHUNK_SIZE, userIds.length), total: userIds.length })
      }
      setResultado({ adicionados, jaExistiam })
      if (grupoSelecionado) onSuccess?.(grupoSelecionado)
    } catch (err: unknown) {
      // O endpoint é idempotente: repetir a operação retoma de onde parou
      // sem duplicar vínculos.
      setErro(err instanceof Error ? err.message : 'Erro ao atribuir. Tente novamente — a operação pode ser repetida com segurança.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    if (saving) return // evita fechar no meio da operação
    onClose()
  }

  const pct = progresso.total > 0 ? Math.round((progresso.enviados / progresso.total) * 100) : 0

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[480px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Atribuir a grupo</NestedSheetTitle>
        <NestedSheetDescription>
          {userIds.length === 1
            ? <>Adicionar <strong>1 usuário</strong> a um grupo.</>
            : <>Adicionar <strong>{userIds.length.toLocaleString('pt-BR')} usuários</strong> a um grupo em uma única ação.</>}
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody noPadding>
        <div className="h-full px-6 py-5 flex flex-col gap-4">

          {resultado ? (
            /* ── Resultado final ── */
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-sm font-medium text-[#030712]">
                {resultado.adicionados.toLocaleString('pt-BR')} {resultado.adicionados === 1 ? 'usuário adicionado' : 'usuários adicionados'} ao grupo{' '}
                <strong>{grupoSelecionado?.nome}</strong>
              </p>
              {resultado.jaExistiam > 0 && (
                <p className="text-xs text-[#6b7280]">
                  {resultado.jaExistiam.toLocaleString('pt-BR')} já {resultado.jaExistiam === 1 ? 'era membro' : 'eram membros'} — nenhum vínculo duplicado.
                </p>
              )}
              <p className="text-xs text-[#6b7280] max-w-[320px]">
                Os membros herdam automaticamente as Ações do grupo, exatamente como em uma atribuição individual.
              </p>
            </div>
          ) : saving ? (
            /* ── Progresso ── */
            <div className="flex flex-col gap-3 py-10">
              <p className="text-sm text-[#030712] text-center">
                Adicionando ao grupo <strong>{grupoSelecionado?.nome}</strong>…
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-[#6b7280] text-center">
                {progresso.enviados.toLocaleString('pt-BR')} de {progresso.total.toLocaleString('pt-BR')} usuários processados
              </p>
            </div>
          ) : (
            /* ── Seleção do grupo destino ── */
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] shrink-0">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar grupo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
                />
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                {gruposAtivos.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">Nenhum grupo encontrado.</p>
                ) : gruposAtivos.map(g => (
                  <label
                    key={g.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50',
                      grupoId === g.id && 'bg-blue-50/60 hover:bg-blue-50',
                    )}
                  >
                    <input
                      type="radio"
                      name="grupo-destino"
                      checked={grupoId === g.id}
                      onChange={() => setGrupoId(g.id)}
                      className="w-4 h-4 accent-blue-600 shrink-0"
                    />
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 shrink-0 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#030712] truncate">{g.nome}</p>
                      {g.descricao && <p className="text-xs text-[#6b7280] truncate">{g.descricao}</p>}
                    </div>
                    {g.escopo === 'org'
                      ? <Badge variant="info">Organização</Badge>
                      : <Badge variant="default" className="bg-violet-50 text-violet-700 border border-violet-200">Conta</Badge>}
                  </label>
                ))}
              </div>
            </>
          )}

        </div>
      </NestedSheetBody>

      <NestedSheetFooter>
        {erro && <p className="text-xs text-red-600 flex-1 mr-2">{erro}</p>}
        {resultado ? (
          <Button onClick={onClose}>Concluir</Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleAtribuir} disabled={!grupoId || saving || userIds.length === 0}>
              {saving
                ? 'Atribuindo...'
                : `Atribuir ${userIds.length.toLocaleString('pt-BR')} ${userIds.length === 1 ? 'usuário' : 'usuários'}`}
            </Button>
          </>
        )}
      </NestedSheetFooter>
    </NestedSheet>
  )
}
