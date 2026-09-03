import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { Popover } from './ui/Popover'

/**
 * Menu "⋯" com as ações de ciclo de vida de uma entidade — Inativar / Ativar /
 * Excluir. Vai no header do detail sheet e na barra lateral da organização
 * (Regra 9: acessível na leitura, sem entrar em edição). Um único gatilho para
 * não estourar a largura do container.
 *
 * `onExcluir` só é passado para platform_admin (Regra 6) — sem ele, o item
 * "Excluir" não aparece.
 */
export function MenuCicloVida({
  status,
  onInativar,
  onAtivar,
  onExcluir,
}: {
  status: 'Criado' | 'Ativo' | 'Inativo'
  onInativar?: () => void
  onAtivar?: () => void
  onExcluir?: () => void
}) {
  const [open, setOpen] = useState(false)
  const inativo = status === 'Inativo'

  const itens: { label: string; onClick: () => void; tone: 'default' | 'warning' | 'danger' }[] = []
  if (inativo) {
    if (onAtivar) itens.push({ label: 'Ativar', onClick: onAtivar, tone: 'default' })
  } else {
    if (onInativar) itens.push({ label: 'Inativar', onClick: onInativar, tone: 'warning' })
    if (onExcluir) itens.push({ label: 'Excluir', onClick: onExcluir, tone: 'danger' })
  }
  if (itens.length === 0) return null

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      content={
        <div className="flex flex-col gap-1 min-w-[152px] -m-2">
          {itens.map(it => (
            <button
              key={it.label}
              type="button"
              onClick={() => { setOpen(false); it.onClick() }}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                it.tone === 'danger'
                  ? 'text-red-600 hover:bg-red-50'
                  : it.tone === 'warning'
                    ? 'text-amber-600 hover:bg-amber-50'
                    : 'text-green-700 hover:bg-green-50'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      }
    >
      <button
        type="button"
        title="Ações"
        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </Popover>
  )
}
