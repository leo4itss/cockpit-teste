// Barrel export do módulo de autorização FGA.
// Importar de '@/authz' nos componentes.

export * from './hooks'
export * from './mock'
// engine não é exportado aqui — use os hooks em componentes React.
// Se precisar do engine diretamente (ex: testes), importe de '@/authz/engine'.
