import { httpDelete, httpGet, httpPatch, httpPost } from './httpClient'

const AUTH_STORAGE_KEY = 'subastas_auth_session'

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export async function registerUser(payload) {
  return httpPost('/auth/register', payload)
}

export async function loginUser(payload) {
  return httpPost('/auth/login', payload)
}

export async function getCurrentUser(token) {
  return httpGet('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function updateCurrentUser(token, payload) {
  return httpPatch('/auth/me', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchAdminUsers(token) {
  return httpGet('/auth/admin/users', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchAdminUserDetail(token, username) {
  return httpGet(`/auth/admin/users/${username}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function resetAdminUserPassword(token, username, payload) {
  return httpPatch(`/auth/admin/users/${username}/reset-password`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function deleteAdminUser(token, username) {
  return httpDelete(`/auth/admin/users/${username}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
