import { useState, useRef, useLayoutEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  content: ReactNode
  children: ReactNode
  /** Largura do balão em classes Tailwind (ex: 'w-52'). */
  width?: string
}

/**
 * Tooltip em portal, posicionado acima do elemento filho e centralizado.
 * Extraído de ProvisioningDots — mesmo comportamento visual.
 */
export function Tooltip({ content, children, width = 'w-52' }: Props) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (show && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPos({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2,
      })
    }
  }, [show])

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
          a única forma de ver o conteúdo era passar o mouse por cima. */}
      <div
        ref={containerRef}
        className="inline-flex items-center"
        tabIndex={0}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >
        {children}
      </div>
      {portalContent}
    </>
  )
}
