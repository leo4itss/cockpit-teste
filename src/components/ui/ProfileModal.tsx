import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

const PROFILE_DURATION = 220

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: () => void
}

export function ProfileModal({ open, onOpenChange, onSave }: ProfileModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), PROFILE_DURATION)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!mounted) return null

  return (
    <div
      className={[
        'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
        'transition-opacity duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      onClick={e => { if (e.target === e.currentTarget) onOpenChange(false) }}
    >
      <div
        className={[
          'bg-white rounded-2xl shadow-[0_10px_15px_0_rgba(0,0,0,0.1),0_4px_6px_0_rgba(0,0,0,0.1)] p-6 w-full max-w-[425px] flex flex-col gap-8 relative',
          'transition-[opacity,transform] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        ].join(' ')}
      >
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-[15px] right-[15px] text-gray-500 hover:text-gray-700 transition-colors opacity-70 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-[#030712] leading-none">Perfil</h2>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-7">
          {/* Foto Section */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#030712]">Insira uma nova foto</label>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-lg font-bold shrink-0">
                M
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-[#030712] bg-white hover:bg-gray-50 transition-colors shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                Mudar foto
              </button>
            </div>
          </div>

          {/* Nome Field */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#030712]">
              Nome <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              defaultValue="Marcelo Gomes"
              className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm text-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
            />
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#030712]">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              defaultValue="marcelo.gomes@grupoitss.com.br"
              className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm text-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 border border-gray-200 rounded-md text-sm font-medium text-[#030712] bg-white hover:bg-gray-50 transition-colors shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="h-9 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
