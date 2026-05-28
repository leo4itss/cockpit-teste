import {
  instanciaMembros,
  instanciaMembroAtribuicoes,
  usuarioGrupos,
  users,
  grupos,
} from './schema'
import { eq, inArray } from 'drizzle-orm'

export type ElegivelEntidade = {
  id: string
  nome: string
  tipo: 'user' | 'group'
  origem: 'direto' | 'grupo'
  origemGrupoId?: string
  origemGrupoNome?: string
}

function membroTemAtribuicao(
  membroId: string,
  atribuicaoId: string,
  atribsByMembro: Map<string, Set<string>>,
): boolean {
  return atribsByMembro.get(membroId)?.has(atribuicaoId) ?? false
}

/**
 * Usuários e grupos elegíveis para nomeação em um slot de perfil.
 * Com atribuicaoId: só quem tem essa atribuição na instância (direto ou via grupo membro).
 * Sem atribuicaoId: todos os membros da instância (usuário ou grupo).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getElegiveisParaSlot(
  db: any,
  instanciaId: string,
  atribuicaoId?: string | null,
): Promise<{ usuarios: ElegivelEntidade[]; grupos: ElegivelEntidade[] }> {
  const membros = await db.select().from(instanciaMembros)
    .where(eq(instanciaMembros.instanciaId, instanciaId))

  const membroIds = membros.map(m => m.id)
  const allAtribRows = membroIds.length
    ? await db.select().from(instanciaMembroAtribuicoes)
        .where(inArray(instanciaMembroAtribuicoes.membroId, membroIds))
    : []

  const atribsByMembro = new Map<string, Set<string>>()
  for (const row of allAtribRows) {
    if (!atribsByMembro.has(row.membroId)) atribsByMembro.set(row.membroId, new Set())
    atribsByMembro.get(row.membroId)!.add(row.atribuicaoId)
  }

  const usuariosMap = new Map<string, ElegivelEntidade>()
  const gruposMap = new Map<string, ElegivelEntidade>()

  const userIds = new Set<string>()
  const grupoIds = new Set<string>()

  for (const membro of membros) {
    if (atribuicaoId && !membroTemAtribuicao(membro.id, atribuicaoId, atribsByMembro)) {
      continue
    }
    if (membro.entidadeTipo === 'user') {
      userIds.add(membro.entidadeId)
    } else {
      grupoIds.add(membro.entidadeId)
    }
  }

  // Usuários expandidos a partir de grupos-membro da instância
  if (grupoIds.size > 0) {
    const gIds = [...grupoIds]
    const links = await db.select().from(usuarioGrupos)
      .where(inArray(usuarioGrupos.grupoId, gIds))
    for (const link of links) {
      if (atribuicaoId) {
        const grupoMembro = membros.find(
          m => m.entidadeTipo === 'group' && m.entidadeId === link.grupoId,
        )
        if (!grupoMembro || !membroTemAtribuicao(grupoMembro.id, atribuicaoId, atribsByMembro)) {
          continue
        }
      }
      userIds.add(link.userId)
    }
  }

  const [userRows, grupoRows] = await Promise.all([
    userIds.size
      ? db.select().from(users).where(inArray(users.id, [...userIds]))
      : Promise.resolve([]),
    grupoIds.size
      ? db.select().from(grupos).where(inArray(grupos.id, [...grupoIds]))
      : Promise.resolve([]),
  ])

  const userName = new Map(userRows.map(u => [u.id, u.nomeCompleto]))
  const grupoName = new Map(grupoRows.map(g => [g.id, g.nome]))

  for (const membro of membros) {
    if (atribuicaoId && !membroTemAtribuicao(membro.id, atribuicaoId, atribsByMembro)) continue

    if (membro.entidadeTipo === 'group') {
      if (!gruposMap.has(membro.entidadeId)) {
        gruposMap.set(membro.entidadeId, {
          id: membro.entidadeId,
          nome: grupoName.get(membro.entidadeId) ?? membro.entidadeId,
          tipo: 'group',
          origem: 'direto',
        })
      }
    }
  }

  for (const membro of membros) {
    if (atribuicaoId && !membroTemAtribuicao(membro.id, atribuicaoId, atribsByMembro)) continue

    if (membro.entidadeTipo === 'user') {
      if (!usuariosMap.has(membro.entidadeId)) {
        usuariosMap.set(membro.entidadeId, {
          id: membro.entidadeId,
          nome: userName.get(membro.entidadeId) ?? membro.entidadeId,
          tipo: 'user',
          origem: 'direto',
        })
      }
    }
  }

  // Usuários via grupo (não duplicar direto)
  if (grupoIds.size > 0) {
    const gIds = [...grupoIds]
    const links = await db.select().from(usuarioGrupos)
      .where(inArray(usuarioGrupos.grupoId, gIds))

    for (const link of links) {
      const grupoMembro = membros.find(
        m => m.entidadeTipo === 'group' && m.entidadeId === link.grupoId,
      )
      if (atribuicaoId && grupoMembro && !membroTemAtribuicao(grupoMembro.id, atribuicaoId, atribsByMembro)) {
        continue
      }
      if (usuariosMap.has(link.userId)) continue
      const diretoMembro = membros.find(
        m => m.entidadeTipo === 'user' && m.entidadeId === link.userId,
      )
      if (diretoMembro && atribuicaoId && membroTemAtribuicao(diretoMembro.id, atribuicaoId, atribsByMembro)) {
        continue
      }
      usuariosMap.set(link.userId, {
        id: link.userId,
        nome: userName.get(link.userId) ?? link.userId,
        tipo: 'user',
        origem: 'grupo',
        origemGrupoId: link.grupoId,
        origemGrupoNome: grupoName.get(link.grupoId),
      })
    }
  }

  const usuarios = [...usuariosMap.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const gruposList = [...gruposMap.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  return { usuarios, grupos: gruposList }
}
