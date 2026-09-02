import { useState, useRef, useLayoutEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  content: ReactNode
  children: ReactNode
  /** Largura do balão em classes Tailwind (ex: 'w-52'). */
  width?: string
  /**
   * `false` quando o próprio elemento pai já é o alvo de foco real — por
   * exemplo, este Tooltip envolvido por um `<button>`. Nesse caso o wrapper
   * não recebe `tabIndex` próprio: um segundo elemento focável dentro do
   * mesmo controle criaria duas paradas de Tab para uma única ação, e
   * ambíguo saber por qual delas um leitor de tela deveria passar. Controle
   * a exibição de fora repassando `focused` a partir do onFocus/onBlur do
   * elemento pai. Default `true` preserva o comportamento standalone.
   */
  tabIndexed?: boolean
  /** Usado com `tabIndexed={false}`: mostra o balão quando o pai está focado. */
  focused?: boolean
}

/**
 * Tooltip em portal, posicionado acima do elemento filho e centralizado.
 * Extraído de ProvisioningDots — mesmo comportamento visual.
 */
export function Tooltip({ content, children, width = 'w-52', tabIndexed = true, focused = false }: Props) {
  const [hovered, setHovered] = useState(false)
  const show = hovered || focused
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (show && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const tip = tooltipRef.current
      // Balão centralizado no alvo, mas preso à viewport — sem isso um alvo
      // encostado na borda (ex.: botão no canto do rodapé de um Sheet) fica
      // com metade do texto fora da tela. A meia-largura real só existe depois
      // do 1º render do balão; até lá usa uma estimativa segura.
      const meiaLargura = tip ? tip.offsetWidth / 2 : 128
      const centro = rect.left + window.scrollX + rect.width / 2
      const min = window.scrollX + meiaLargura + 8
      const max = window.scrollX + window.innerWidth - meiaLargura - 8
      const left = Math.min(Math.max(centro, min), max)
      if (!pos || pos.top !== rect.top + window.scrollY || pos.left !== left) {
        setPos({ top: rect.top + window.scrollY, left })
      }
    }
  }, [show, pos])

  const portalContent = show && pos && createPortal(
    <div
      role="tooltip"
      className={`fixed bg-[#1f2937] rounded-md px-3 py-1.5 text-xs text-[#f9fafb] ${width} z-[9999] shadow-lg border border-gray-700 whitespace-normal`}
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        transform: 'translate(-50%, -100%) translateY(-8px)',
        pointerEvents: 'none' as const,
      }}
    >
      {content}
    </div>,
    document.body,
  )

  return (
    <>
      {/* tabIndex + onFocus/onBlur: só onMouseEnter deixava o conteúdo
          inacessível a quem navega por teclado, leitor de tela ou toque —
          a única forma de ver o conteúdo era passar o mouse por cima.
          Omitidos quando `tabIndexed=false` — ver comentário do prop. */}
      <div
        ref={containerRef}
        className="inline-flex items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...(tabIndexed ? { tabIndex: 0, onFocus: () => setHovered(true), onBlur: () => setHovered(false) } : {})}
      >
        {children}
      </div>
      {portalContent}
    </>
  )
}
