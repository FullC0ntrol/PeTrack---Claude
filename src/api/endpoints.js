import { request } from './client.js'

const json = (method) => (path, body) => request(path, { method, body })
const post = json('POST')
const patch = json('PATCH')
const del = (path) => request(path, { method: 'DELETE' })

export const authApi = {
  me: () => request('/auth/me'),
  start: (email, next) => post('/auth/start', { email, next }),
  verifyCode: (email, code) => post('/auth/verify-code', { email, code }),
  verifyLink: (token) => post('/auth/verify-link', { token }),
  demo: (next) => post('/auth/demo', { next }),
  logout: () => post('/auth/logout'),
  logoutAll: () => post('/auth/logout-all'),
  updateMe: (data) => patch('/me', data),
}

export const petsApi = {
  list: () => request('/pets'),
  get: (id) => request(`/pets/${id}`),
  create: (data) => post('/pets', data),
  update: (id, data) => patch(`/pets/${id}`, data),
  remove: (id) => del(`/pets/${id}`),
  uploadPhoto: (id, blob) => request(`/pets/${id}/photo`, { method: 'PUT', raw: blob }),
  removePhoto: (id) => del(`/pets/${id}/photo`),
  events: (id) => request(`/pets/${id}/events`),
  markRead: (id) => post(`/pets/${id}/events/read`),
  reportLost: (id, data) => post(`/pets/${id}/lost`, data),
  updateLost: (id, data) => patch(`/pets/${id}/lost`, data),
  found: (id) => post(`/pets/${id}/found`),
  vetShares: (id) => request(`/pets/${id}/vet-shares`),
  createVetShare: (id, duration) => post(`/pets/${id}/vet-shares`, { duration }),
  revokeVetShare: (shareId) => del(`/vet-shares/${shareId}`),
}

export const tagsApi = {
  claim: (code, petId) => post('/tags/claim', { code, petId }),
  unassign: (code) => del(`/tags/${code}`),
}

export const publicApi = {
  visit: (code, { source, preview } = {}) => post(`/public/tags/${encodeURIComponent(code)}/visit`, { source, preview }),
  shareLocation: (scanId, coords) => post(`/public/scans/${scanId}/location`, coords),
  sendMessage: (code, data) => post(`/public/tags/${encodeURIComponent(code)}/messages`, data),
  vetCard: (token) => request(`/public/vet/${encodeURIComponent(token)}`),
}
