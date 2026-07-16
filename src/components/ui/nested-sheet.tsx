/**
 * NestedSheet — sistema de sheets empilháveis com z-index incremental.
 *
 * Problema com shadcn/ui Sheet padrão: elementos `position: fixed` dentro de
 * um elemento com `transform` criam um novo stacking context, quebrando o
 * empilhamento correto de overlays e painéis em sheets aninhadas.
 *
 * Solução: Context que rastreia o nível de aninhamento e calcula z-index
 * dinamicamente. Apenas o nível 1 bloqueia scroll do body.
 *
 * z-index por nível:
 *   Nível 1: overlay=49  painel=50
 *   Nível 2: overlay=59  painel=60
 *   Nível 3: overlay=69  painel=70
 *   ...
 *
 * Uso básico:
 * ```tsx
 * <NestedSheet open={open} onClose={close} width="w-[560px]">
 *   <NestedSheetHeader>
 *     <NestedSheetTitle>Título</NestedSheetTitle>
 *   </NestedSheetHeader>
 *   <NestedSheetBody>conteúdo...</NestedSheetBody>
 *   <NestedSheetFooter>
 *     <Button onClick={close}>Salvar</Button>
 *   </NestedSheetFooter>
 * </NestedSheet>
 * ```
 *
 * Sheet aninhada — renderize dentro do NestedSheetBody do pai:
 * ```tsx
 * <NestedSheetBody>
 *   <p>Conteúdo pai</p>
 *   <NestedSheet open={nestedOpen} onClose={closeNested}>
 *     <NestedSheetTitle>Título filho</NestedSheetTitle>
 *     <NestedSheetBody>conteúdo filho...</NestedSheetBody>
 *   </NestedSheet>
 * </NestedSheetBody>
 * ```
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Constantes ────────────────────────────────────────────────

const BASE_Z    = 50  // z-index do painel no nível 1
const Z_STEP    = 10  // incremento por nível
const DURATION  = 320 // ms — deve coincidir com a classe Tailwind abaixo

// ── Context de nível ──────────────────────────────────────────

/**
 * Rastreia o nível de aninhamento atual.
 * 0 = fora de qualquer NestedSheet.
 * 1 = primeiro nível, 2 = segundo, etc.
 */
const NestedSheetLevelContext = createContext<number>(0)

function useSheetLevel() {
  return useContext(NestedSheetLevelContext)
}

// ── NestedSheet ───────────────────────────────────────────────

export interface NestedSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: string
  /** Se true, impede fechar ao clicar no overlay. */
  disableOverlayClose?: boolean
}

export function NestedSheet({
  open,
  onClose,
  children,
  width = 'w-[640px]',
  disableOverlayClose = false,
}: NestedSheetProps) {
  const parentLevel = useSheetLevel()
  const level       = parentLevel + 1

  const panelZ   = BASE_Z + (level - 1) * Z_STEP      // ex: 50, 60, 70
  const overlayZ = panelZ - 1                          // ex: 49, 59, 69

  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)

  // Montagem / desmontagem com animação
  useEffect(() => {
    if (open) {
      flushSync(() => setMounted(true))
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), DURATION)
      return () => clearTimeout(t)
    }
  }, [open])

  // Bloqueia scroll do body apenas no nível 1 (sheet mais externa).
  // Sheets internas não adicionam bloqueio redundante.
  useEffect(() => {
    if (level !== 1) return
    document.body.style.overflow = mounted ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mounted, level])

  if (!mounted) return null

  return (
    <NestedSheetLevelContext.Provider value={level}>
      {/* Overlay — cada nível tem o seu */}
      <div
        style={{ zIndex: overlayZ }}
        className={cn(
          'fixed inset-0 bg-black/40',
          'transition-opacity ease-[cubic-bezier(0.4,0,0.2,1)]',
          `duration-[${DURATION}ms]`,
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={disableOverlayClose ? undefined : onClose}
      />

      {/* Painel — desliza da esquerda, igual ao Sheet existente */}
      <div
        style={{ zIndex: panelZ }}
        className={cn(
          'fixed top-0 left-0 h-full bg-background shadow-xl flex flex-col',
          'transition-transform ease-[cubic-bezier(0.4,0,0.2,1)]',
          `duration-[${DURATION}ms]`,
          visible ? 'translate-x-0' : '-translate-x-full',
          width,
        )}
      >
        {children}
      </div>
    </NestedSheetLevelContext.Provider>
  )
}

// ── Subcomponentes de layout ──────────────────────────────────

// Header ──────────────────────────────────────────────────────

export interface NestedSheetHeaderProps {
  children: ReactNode
  onClose?: () => void
  /** Ação extra no canto direito do header (ex: botão "Excluir"). */
  action?: ReactNode
}

export function NestedSheetHeader({ children, onClose, action }: NestedSheetHeaderProps) {
  return (
    <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
      <div className="flex flex-col gap-1 min-w-0 flex-1 pr-3">
        {children}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Title & Description ─────────────────────────────────────────

export function NestedSheetTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-foreground leading-7">
      {children}
    </h2>
  )
}

export function NestedSheetDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-[#6b7280] leading-5">
      {children}
    </p>
  )
}

// Body ────────────────────────────────────────────────────────

export interface NestedSheetBodyProps {
  children: ReactNode
  className?: string
  /** Se true, remove o padding padrão (útil para listas full-width). */
  noPadding?: boolean
}

export function NestedSheetBody({ children, className, noPadding = false }: NestedSheetBodyProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto',
        !noPadding && 'px-6 py-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

// Footer ──────────────────────────────────────────────────────

export interface NestedSheetFooterProps {
  children: ReactNode
  className?: string
}

export function NestedSheetFooter({ children, className }: NestedSheetFooterProps) {
  return (
    <div
      className={cn(
        'border-t border-[#e5e7eb] px-6 py-4 flex items-center justify-end gap-3 shrink-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ── Hook de nível (escape hatch para casos avançados) ─────────

/**
 * Retorna o nível de aninhamento atual.
 * 0 = fora de qualquer NestedSheet.
 * Útil para ajustar z-index de popovers/dropdowns dentro de sheets aninhadas.
 */
export function useNestedSheetLevel(): number {
  return useSheetLevel()
}
