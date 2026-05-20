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
  // Grupos nos quais o usuário é membro (opcionalmente filtrado por conta)
  getUserGrupos: (userId: string, accountId?: string) => {
    const p = new URLSearchParams()
    if (accountId) p.set('accountId', accountId)
    const qs = p.toString()
    return request<any[]>(`/api/users/${userId}/grupos${qs ? `?${qs}` : ''}`)
  },

  // Tipos de Licença
  getTiposLicenca: () => request<any[]>('/api/tipos-licenca'),
  getTipoLicenca: (id: string) => request<any>(`/api/tipos-licenca/${id}`),
  createTipoLicenca: (data: any) => request<any>('/api/tipos-licenca', { method: 'POST', body: JSON.stringify(data) }),
  updateTipoLicenca: (id: string, data: any) => request<any>(`/api/tipos-licenca/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTipoLicenca: (id: string) => request<any>(`/api/tipos-licenca/${id}`, { method: 'DELETE' }),

  // Componentes
  getComponentes: () => request<any[]>('/api/componentes'),
  getComponente: (id: string) => request<any>(`/api/componentes/${id}`),
  checkComponenteLinked: (id: string) => request<{ linked: boolean }>(`/api/componentes/${id}/linked`),
  createComponente: (data: any) => request<any>('/api/componentes', { method: 'POST', body: JSON.stringify(data) }),
  updateComponente: (id: string, data: any) => request<any>(`/api/componentes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteComponente: (id: string) => request<{ ok: boolean; action: 'excluido' | 'inativado'; componente?: any }>(`/api/componentes/${id}`, { method: 'DELETE' }),
  reativarComponente: (id: string) => request<any>(`/api/componentes/${id}/reativar`, { method: 'PATCH' }),

  // Valida URL de metadata de um componente.
  // Retorna { ok: true, data: {...} } ou { ok: false, error: string }
  validateMetadataUrl: (url: string) =>
    request<{ ok: boolean; data?: Record<string, unknown>; error?: string }>(
      '/api/componentes/validate-metadata',
      { method: 'POST', body: JSON.stringify({ url }) }
    ),

  // Grupos
  getGrupos: (params?: { orgId?: string; accountId?: string }) => {
    const p = new URLSearchParams()
    if (params?.orgId)     p.set('orgId', params.orgId)
    if (params?.accountId) p.set('accountId', params.accountId)
    const qs = p.toString()
    return request<any[]>(`/api/grupos${qs ? `?${qs}` : ''}`)
  },
  getGrupo:     (id: string)           => request<any>(`/api/grupos/${id}`),
  createGrupo:  (data: any)            => request<any>('/api/grupos', { method: 'POST', body: JSON.stringify(data) }),
  updateGrupo:  (id: string, data: any)=> request<any>(`/api/grupos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGrupo:  (id: string)           => request<{ ok: boolean }>(`/api/grupos/${id}`, { method: 'DELETE' }),

  // Membros de grupo
  getGrupoMembros:   (grupoId: string)              => request<any[]>(`/api/grupos/${grupoId}/membros`),
  addGrupoMembro:    (grupoId: string, userId: string) =>
    request<any>(`/api/grupos/${grupoId}/membros`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeGrupoMembro: (grupoId: string, userId: string) =>
    request<any>(`/api/grupos/${grupoId}/membros/${userId}`, { method: 'DELETE' }),

  // Membros de conta
  getAccountMembros:    (accountId: string) => request<any[]>(`/api/accounts/${accountId}/membros`),
  addAccountMembro:     (accountId: string, data: { userId: string; papel: string }) =>
    request<any>(`/api/accounts/${accountId}/membros`, { method: 'POST', body: JSON.stringify(data) }),
  removeAccountMembro:  (accountId: string, userId: string) =>
    request<any>(`/api/accounts/${accountId}/membros/${userId}`, { method: 'DELETE' }),

  // Lookup de usuário por e-mail (busca client-side) — retorna User | null
  lookupUserByEmail: async (email: string): Promise<any | null> => {
    const all = await request<any[]>('/api/users')
    return all.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) ?? null
  },

  // Entitlements por conta (capability:assistant.use etc.)
  // Equivale à tupla FGA: account:<id> enabled_for_tenant capability:<cap>
  getEntitlements: (accountId: string) =>
    request<any[]>(`/api/accounts/${accountId}/entitlements`),
  addEntitlement: (accountId: string, capability: string) =>
    request<any>(`/api/accounts/${accountId}/entitlements`, {
      method: 'POST',
      body: JSON.stringify({ capability }),
    }),
  removeEntitlement: (accountId: string, capability: string) =>
    request<{ ok: boolean }>(`/api/accounts/${accountId}/entitlements/${encodeURIComponent(capability)}`, {
      method: 'DELETE',
    }),

  // Permissões granulares por componente (e opcionalmente por instância)
  getPermissions: (params: { entidade_tipo?: string; entidade_id?: string; componente_id?: string; instancia_id?: string | null }) => {
    const p = new URLSearchParams()
    if (params.entidade_tipo) p.set('entidade_tipo', params.entidade_tipo)
    if (params.entidade_id)   p.set('entidade_id',   params.entidade_id)
    if (params.componente_id) p.set('componente_id', params.componente_id)
    // instancia_id=null → filtra só permissões sem instância; undefined → sem filtro
    if (params.instancia_id !== undefined)
      p.set('instancia_id', params.instancia_id ?? 'null')
    return request<any[]>(`/api/permissions?${p.toString()}`)
  },
  addPermission: (data: { entidade_tipo: string; entidade_id: string; componente_id: string; acao: string; instancia_id?: string }) =>
    request<any>('/api/permissions', { method: 'POST', body: JSON.stringify(data) }),
  removePermission: (data: { entidade_tipo: string; entidade_id: string; componente_id: string; acao: string; instancia_id?: string }) =>
    request<any>('/api/permissions', { method: 'DELETE', body: JSON.stringify(data) }),

  // Instâncias de Componente
  getInstancias: (params?: { componenteId?: string; accountId?: string }) => {
    const p = new URLSearchParams()
    if (params?.componenteId) p.set('componenteId', params.componenteId)
    if (params?.accountId)    p.set('accountId',    params.accountId)
    const qs = p.toString()
    return request<any[]>(`/api/instancias${qs ? `?${qs}` : ''}`)
  },
  getInstancia:    (id: string)             => request<any>(`/api/instancias/${id}`),
  createInstancia: (data: any)              => request<any>('/api/instancias', { method: 'POST', body: JSON.stringify(data) }),
  updateInstancia: (id: string, data: any)  => request<any>(`/api/instancias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInstancia: (id: string)             => request<{ ok: boolean }>(`/api/instancias/${id}`, { method: 'DELETE' }),

  // Membros de instância
  getInstanciaMembros:   (instanciaId: string) =>
    request<any[]>(`/api/instancias/${instanciaId}/membros`),
  addInstanciaMembro:    (instanciaId: string, data: { entidadeTipo: string; entidadeId: string; papel: string }) =>
    request<any>(`/api/instancias/${instanciaId}/membros`, { method: 'POST', body: JSON.stringify(data) }),
  updateInstanciaMembro: (instanciaId: string, membroId: string, papel: string) =>
    request<any>(`/api/instancias/${instanciaId}/membros`, { method: 'POST', body: JSON.stringify({ entidadeTipo: '_update', entidadeId: membroId, papel }) }),
  removeInstanciaMembro: (instanciaId: string, membroId: string) =>
    request<any>(`/api/instancias/${instanciaId}/membros/${membroId}`, { method: 'DELETE' }),
}
