async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  // Organizations
  getOrganizations: () => request<any[]>('/api/organizations'),
  getOrganization: (id: string) => request<any>(`/api/organizations/${id}`),
  createOrganization: (data: any) => request<any>('/api/organizations', { method: 'POST', body: JSON.stringify(data) }),
  updateOrganization: (id: string, data: any) => request<any>(`/api/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrganization: (id: string) => request<any>(`/api/organizations/${id}`, { method: 'DELETE' }),

  // Accounts
  getAccounts: (orgId?: string, includeDeleted = false) => {
    const params = new URLSearchParams()
    if (orgId) params.set('orgId', orgId)
    if (includeDeleted) params.set('include_deleted', 'true')
    const qs = params.toString()
    return request<any[]>(`/api/accounts${qs ? `?${qs}` : ''}`)
  },
  getAccount: (id: string) => request<any>(`/api/accounts/${id}`),
  createAccount: (data: any) => request<any>('/api/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: any) => request<any>(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: string) => request<any>(`/api/accounts/${id}`, { method: 'DELETE' }),
  restoreAccount: (id: string) => request<any>(`/api/accounts/${id}/restaurar`, { method: 'PATCH' }),

  // Solutions
  getSolutions: (orgId?: string) => request<any[]>(`/api/solutions${orgId ? `?orgId=${orgId}` : ''}`),
  getSolution: (id: string) => request<any>(`/api/solutions/${id}`),
  createSolution: (data: any) => request<any>('/api/solutions', { method: 'POST', body: JSON.stringify(data) }),
  updateSolution: (id: string, data: any) => request<any>(`/api/solutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSolution: (id: string) => request<any>(`/api/solutions/${id}`, { method: 'DELETE' }),

  // Contracts
  getContracts: (orgId?: string) => request<any[]>(`/api/contracts${orgId ? `?orgId=${orgId}` : ''}`),
  getContract: (id: string) => request<any>(`/api/contracts/${id}`),
  createContract: (data: any) => request<any>('/api/contracts', { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (id: string, data: any) => request<any>(`/api/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContract: (id: string) => request<any>(`/api/contracts/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: () => request<any[]>('/api/users'),
  getUser: (id: string) => request<any>(`/api/users/${id}`),
  createUser: (data: any) => request<any>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request<any>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request<any>(`/api/users/${id}`, { method: 'DELETE' }),

  // Tipos de Licença
  getTiposLicenca: () => request<any[]>('/api/tipos-licenca'),
  getTipoLicenca: (id: string) => request<any>(`/api/tipos-licenca/${id}`),
  createTipoLicenca: (data: any) => request<any>('/api/tipos-licenca', { method: 'POST', body: JSON.stringify(data) }),
  updateTipoLicenca: (id: string, data: any) => request<any>(`/api/tipos-licenca/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTipoLicenca: (id: string) => request<any>(`/api/tipos-licenca/${id}`, { method: 'DELETE' }),

  // Componentes
  getComponentes: () => request<any[]>('/api/componentes'),
  getComponente: (id: string) => request<any>(`/api/componentes/${id}`),
  createComponente: (data: any) => request<any>('/api/componentes', { method: 'POST', body: JSON.stringify(data) }),
  updateComponente: (id: string, data: any) => request<any>(`/api/componentes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteComponente: (id: string) => request<any>(`/api/componentes/${id}`, { method: 'DELETE' }),

  // Valida URL de metadata de um componente.
  // Retorna { ok: true, data: {...} } ou { ok: false, error: string }
  validateMetadataUrl: (url: string) =>
    request<{ ok: boolean; data?: Record<string, unknown>; error?: string }>(
      '/api/componentes/validate-metadata',
      { method: 'POST', body: JSON.stringify({ url }) }
    ),

  // Importa objetos de permissionamento do metadata do componente
  importarObjetosComponente: (componenteId: string) =>
    request<{ ok: boolean; importados: number }>(`/api/componentes/${componenteId}/importar-objetos`, { method: 'POST' }),

  // Objetos de componentes disponíveis para permissionamento
  getComponenteObjetos: (componenteId?: string) =>
    request<any[]>(`/api/componente-objetos${componenteId ? `?componenteId=${componenteId}` : ''}`),

  // Grupos
  getGrupos: () => request<any[]>('/api/grupos'),
  getGrupo: (id: string) => request<any>(`/api/grupos/${id}`),
  createGrupo: (data: any) => request<any>('/api/grupos', { method: 'POST', body: JSON.stringify(data) }),
  updateGrupo: (id: string, data: any) => request<any>(`/api/grupos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGrupo: (id: string) => request<any>(`/api/grupos/${id}`, { method: 'DELETE' }),

  // Membros de um grupo
  getMembrosGrupo: (grupoId: string) => request<any[]>(`/api/grupos/${grupoId}/membros`),
  addMembroGrupo: (grupoId: string, userId: string) =>
    request<any>(`/api/grupos/${grupoId}/membros`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeMembroGrupo: (grupoId: string, userId: string) =>
    request<any>(`/api/grupos/${grupoId}/membros/${userId}`, { method: 'DELETE' }),

  // Grupos de um usuário
  getGruposUser: (userId: string) => request<any[]>(`/api/users/${userId}/grupos`),

  // Permissões de um grupo sobre objetos de componentes
  getPermissoesGrupo: (grupoId: string) => request<any[]>(`/api/grupos/${grupoId}/permissoes`),
  salvarPermissaoGrupo: (grupoId: string, data: { componenteObjetoId: string; permissoesAtivas: string[] }) =>
    request<any>(`/api/grupos/${grupoId}/permissoes`, { method: 'POST', body: JSON.stringify(data) }),
  removerPermissaoGrupo: (grupoId: string, permissaoId: string) =>
    request<any>(`/api/grupos/${grupoId}/permissoes/${permissaoId}`, { method: 'DELETE' }),
}
