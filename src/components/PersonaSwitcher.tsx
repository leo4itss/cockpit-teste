// ── Switcher de Persona (apenas em modo PoC) ────────────────────────────────
// Permite alternar entre os usuários de teste para validar as permissões FGA.
// Remover ou ocultar este componente em produção.

import { useState, useRef, useEffect } from 'react'
import { FlaskConical, Check, ChevronDown } from 'lucide-react'
import { useAuth } from '@/authz/hooks'

export function PersonaSwitcher() {
  const { personas, activePersona, setPersonaId } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed border-amber-400 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
        title="Trocar persona de teste"
      >
        <FlaskConical className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{activePersona.label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Personas de teste (FGA PoC)
            </p>
          </div>
          <div className="p-1">
            {personas.map(persona => {
              const isActive = persona.userId === activePersona.userId
              return (
                <button
                  key={persona.userId}
                  onClick={() => { setPersonaId(persona.userId); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${persona.color} flex items-center justify-center shrink-0`}>
                    <span className="text-white text-xs font-bold">
                      {persona.label.slice(0, 1)}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#030712]">{persona.label}</p>
                    <p className="text-xs text-gray-400 truncate">{persona.description}</p>
                  </div>
                  {/* Check */}
                  {isActive && <Check className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
