// ── Módulo de autorização (FGA local) ──────────────────────────────────────
// Ponto único de importação para o restante do projeto.
// Importe APENAS a partir daqui — não importe de engine.ts ou mock.ts diretamente.

export * from './types'
export * from './hooks'
export { mockFGARelations, mockPersonas, MOCK_GROUP_VIEWERS } from './mock'
// engine exportado separado para testes unitários
export * as authzEngine from './engine'
