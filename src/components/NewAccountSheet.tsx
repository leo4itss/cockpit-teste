import { useState, useRef } from 'react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { Plus, Upload } from 'lucide-react'
import type { Account } from '@/types'
import { AddContatoDialog, type Contato } from './AddContatoDialog'
import { AddAdminDialog, type AdminUser } from './AddAdminDialog'


interface Props {
  open: boolean
  onClose: () => void
  orgId: string
  onSave: (account: Omit<Account, 'id'>) => void
}

const DOCUMENT_TYPES = [
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'CPF', label: 'CPF' },
]

const BUSINESS_SEGMENTS = [
  { value: 'varejo', label: 'Varejo' },
  { value: 'industria', label: 'Indústria' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'tecnologia', label: 'Tecnologia' },
]

const STATES = [
  { value: 'SP', label: 'SP' },
  { value: 'RJ', label: 'RJ' },
  { value: 'MG', label: 'MG' },
  { value: 'RS', label: 'RS' },
  { value: 'PR', label: 'PR' },
]

const PAS_ARCHITECTS = [
  { value: 'marcelo', label: 'Marcelo Gomes' },
  { value: 'ana', label: 'Ana Lima' },
]

function SectionLegend({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-3">
      <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
    </div>
  )
}

function Separator() {
  return <div className="border-t border-gray-200 w-full" />
}

function ImageUploadRow({
  description,
  preview,
  onFileSelect,
}: {
  description: string
  preview: string
  onFileSelect: (dataUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onFileSelect(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex items-start gap-7">
      <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0 overflow-hidden border border-[#e5e7eb]">
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-200 rounded-full" />
        }
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <p className="text-sm text-[#6b7280] leading-5">{description}</p>
        {/* input oculto — acionado pelo botão abaixo */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 border border-[#e5e7eb] rounded-md px-4 h-9 text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors self-start"
        >
          <Upload className="w-4 h-4 text-[#6b7280]" />
          Escolher imagem
        </button>
      </div>
    </div>
  )
}

export function NewAccountSheet({ open, onClose, orgId, onSave }: Props) {
  const [showContatoDialog, setShowContatoDialog] = useState(false)
  const [contatos, setContatos] = useState<Contato[]>([])
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [logo, setLogo] = useState('')

  const [form, setForm] = useState({
    name: '',
    razaoSocial: '',
    tipoDocumento: '',
    numeroDocumento: '',
    segmento: '',
    siteOficial: '',
    pais: 'Brasil',
    cep: '',
    enderecoPostal: '',
    complemento: '',
    estado: '',
    cidade: '',
    arquitetoPAS: '',
    subdomain: '',
    descricao: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSave() {
    onSave({
      orgId,
      name: form.name,
      subdomain: form.subdomain,
      arquitetoPAS: form.arquitetoPAS,
      logo: logo || undefined,
      provisioningStatus: 'PENDING',
      status: 'Criado',
      createdAt: new Date().toLocaleDateString('pt-BR'),
    })
    setForm({
      name: '', razaoSocial: '', tipoDocumento: '', numeroDocumento: '',
      segmento: '', siteOficial: '', pais: 'Brasil', cep: '',
      enderecoPostal: '', complemento: '', estado: '', cidade: '',
      arquitetoPAS: '', subdomain: '', descricao: '',
    })
    setLogo('')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nova Conta"
      width="w-[768px]"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-10">

        {/* Imagens */}
        <div className="flex flex-col gap-7">
          <ImageUploadRow description="Insira o logo da organização. Isso ajudará a identificar a organização de forma mais fácil e visual no sistema." />
          <ImageUploadRow description="Insira o favicon da conta. Isso será exibido na aba do navegador. Formato: 64x64 pixels." />
          <ImageUploadRow description="Insira o banner da conta. Isso será exibido na tela de login. Formato: 180x180 pixels." />
          <Separator />
        </div>

        {/* Informações básicas */}
        <div className="flex flex-col gap-7">
          <SectionLegend>Informações básicas</SectionLegend>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome da conta"
              required
              placeholder="Digite o nome da conta"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
            <Input
              label="Razão Social"
              required
              placeholder="Qual a razão social?"
              value={form.razaoSocial}
              onChange={e => set('razaoSocial', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo do documento"
              options={DOCUMENT_TYPES}
              placeholder="Selecione"
              value={form.tipoDocumento}
              onChange={e => set('tipoDocumento', e.target.value)}
            />
            <Input
              label="Número do documento"
              required
              placeholder="Escolha um tipo"
              disabled={!form.tipoDocumento}
              value={form.numeroDocumento}
              onChange={e => set('numeroDocumento', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Segmento de negócio"
              options={BUSINESS_SEGMENTS}
              placeholder="Escolha o segmento"
              value={form.segmento}
              onChange={e => set('segmento', e.target.value)}
            />
            <Input
              label="Site oficial"
              required
              placeholder="http://"
              value={form.siteOficial}
              onChange={e => set('siteOficial', e.target.value)}
            />
          </div>

          <Separator />
        </div>

        {/* Endereço */}
        <div className="flex flex-col gap-7">
          <SectionLegend>Endereço</SectionLegend>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="País / Região"
              options={[{ value: 'Brasil', label: 'Brasil' }]}
              value={form.pais}
              onChange={e => set('pais', e.target.value)}
            />
            <Input
              label="CEP"
              required
              placeholder="Código postal para identificar o endereço"
              value={form.cep}
              onChange={e => set('cep', e.target.value)}
            />
          </div>

          <Input
            label="Endereço postal"
            required
            placeholder="Digite o endereço completo, inclusive número"
            value={form.enderecoPostal}
            onChange={e => set('enderecoPostal', e.target.value)}
          />

          <Input
            label="Complemento"
            required
            placeholder="Complemento do local"
            value={form.complemento}
            onChange={e => set('complemento', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Estado"
              options={STATES}
              placeholder="Selecione"
              value={form.estado}
              onChange={e => set('estado', e.target.value)}
            />
            <Input
              label="Cidade"
              required
              placeholder="Digite a cidade"
              value={form.cidade}
              onChange={e => set('cidade', e.target.value)}
            />
          </div>

          <Separator />
        </div>

        {/* Configuração PAS */}
        <div className="flex flex-col gap-7">
          <SectionLegend>Configuração PAS</SectionLegend>

          <Select
            label="Arquiteto PAS responsável"
            required
            options={PAS_ARCHITECTS}
            placeholder="Escolha o arquiteto"
            value={form.arquitetoPAS}
            onChange={e => set('arquitetoPAS', e.target.value)}
          />

          <Input
            label="Subdomínio"
            required
            placeholder="Nome do domínio"
            value={form.subdomain}
            onChange={e => set('subdomain', e.target.value)}
          />

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#030712]">Descrição</label>
            <textarea
              className="w-full min-h-[64px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Digite uma descrição para a conta"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Contatos e Usuário administrador */}
        <div className="flex flex-col gap-4">
          <div className="border border-gray-200 rounded-md flex items-center gap-2.5 px-4 py-3 w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#030712] leading-4">
                Contatos<span className="text-[#dc2626]">*</span>
              </p>
              {contatos.length > 0 && (
                <p className="text-xs text-[#6b7280] mt-1">{contatos.length} contato{contatos.length !== 1 ? 's' : ''} adicionado{contatos.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowContatoDialog(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-[#030712] hover:text-gray-600 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
          <div className="border border-gray-200 rounded-md flex items-center gap-2.5 px-4 py-3 w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#030712] leading-4">
                Usuário administrador<span className="text-[#dc2626]">*</span>
              </p>
              {admins.length > 0 && (
                <p className="text-xs text-[#6b7280] mt-1">{admins.length} usuário{admins.length !== 1 ? 's' : ''} adicionado{admins.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAdminDialog(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-[#030712] hover:text-gray-600 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
        </div>

      </div>

      <AddContatoDialog
        open={showContatoDialog}
        onClose={() => setShowContatoDialog(false)}
        onAdd={c => setContatos(prev => [...prev, c])}
      />
      <AddAdminDialog
        open={showAdminDialog}
        onClose={() => setShowAdminDialog(false)}
        onAdd={a => setAdmins(prev => [...prev, a])}
      />
    </Sheet>
  )
}
