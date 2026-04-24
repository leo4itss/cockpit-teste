import 'dotenv/config'
import { db } from './db'
import { users } from './schema'

const AREAS = ['Tecnologia', 'Comercial', 'Arquitetura', 'Suporte', 'Financeiro', 'RH', 'Jurídico', 'Operações']
const CARGOS = ['Analista', 'Coordenador', 'Gerente', 'Diretor', 'Especialista', 'Consultor', 'Assistente', 'Arquiteto PAS']
const FUSOS = ['America/Sao_Paulo', 'America/Fortaleza', 'America/Manaus', 'America/Recife']
const STATUS: ('Ativo' | 'Inativo')[] = ['Ativo', 'Ativo', 'Ativo', 'Ativo', 'Inativo'] // 80% ativos

const NOMES = [
  ['Ana', 'Lima'], ['Bruno', 'Souza'], ['Carla', 'Mendes'], ['Diego', 'Oliveira'], ['Elisa', 'Costa'],
  ['Fábio', 'Rocha'], ['Gabriela', 'Ferreira'], ['Henrique', 'Alves'], ['Isabela', 'Nunes'], ['João', 'Martins'],
  ['Karen', 'Barbosa'], ['Lucas', 'Carvalho'], ['Marina', 'Dias'], ['Nicolas', 'Santos'], ['Olivia', 'Ribeiro'],
  ['Paulo', 'Gomes'], ['Quincy', 'Araújo'], ['Renata', 'Pereira'], ['Sérgio', 'Cardoso'], ['Tatiana', 'Melo'],
  ['Ulisses', 'Teixeira'], ['Vanessa', 'Monteiro'], ['Wagner', 'Correia'], ['Ximena', 'Faria'], ['Yuri', 'Nascimento'],
  ['Zara', 'Borges'], ['André', 'Castro'], ['Beatriz', 'Vieira'], ['Caio', 'Lopes'], ['Daniela', 'Moreira'],
]

function slug(nome: string, sobrenome: string, i: number) {
  const base = `${nome}${sobrenome}`.toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '')
  return i > 0 ? `${base}${i}` : base
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR')
}

async function seedUsers() {
  console.log('Inserindo 30 usuários de teste...')

  const novosUsers = NOMES.map(([nome, sobrenome], i) => {
    const usuario = slug(nome, sobrenome, 0)
    const area = pick(AREAS, i * 3)
    const cargo = pick(CARGOS, i * 7)
    const fuso = pick(FUSOS, i * 2)
    const status = pick(STATUS, i)
    const diasAtras = Math.floor(i * 3.5)
    const ultimoAcesso = formatDate(new Date(Date.now() - diasAtras * 86400000))
    const createdAt = formatDate(new Date('2025-01-01'))

    return {
      id: crypto.randomUUID(),
      nomeCompleto: `${nome} ${sobrenome}`,
      usuario,
      email: `${usuario}@grupoitss.com.br`,
      pais: 'Brasil',
      telefone: `(${11 + (i % 89)}) 9 ${9000 + i}-${1000 + i}`,
      area,
      cargo,
      etiquetas: '',
      formatoData: 'DD/MM/YYYY',
      formatoHora: '24h',
      fusoHorario: fuso,
      status,
      ultimoAcesso,
      createdAt,
    }
  })

  await db.insert(users).values(novosUsers).onConflictDoNothing()
  console.log(`✓ ${novosUsers.length} usuários inseridos`)
  console.log('Concluído!')
  process.exit(0)
}

seedUsers().catch(e => { console.error(e); process.exit(1) })
