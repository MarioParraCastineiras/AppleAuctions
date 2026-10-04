const API_BASE_URL = '/api'

export class HttpError extends Error {
  constructor(message, status, code, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  return response.json()
}

async function request(path, options = {}) {
  let response
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const mergedHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: mergedHeaders,
    })
  } catch {
    throw new HttpError(
      'No se pudo conectar con el servidor. Revisa si la API esta encendida.',
      0,
      'NETWORK_ERROR',
      null,
    )
  }

  const payload = await parseJsonResponse(response)

  if (!response.ok) {
    const apiError = payload?.error
    throw new HttpError(
      apiError?.message || 'Error inesperado al consultar la API.',
      response.status,
      apiError?.code || 'HTTP_ERROR',
      apiError?.details || null,
    )
  }

  if (!payload?.success) {
    throw new HttpError(
      'La API respondio con un formato invalido.',
      response.status,
      'INVALID_API_RESPONSE',
      payload,
    )
  }

  return payload.data
}

export async function httpGet(path, options = {}) {
  return request(path, { method: 'GET', ...options })
}

export async function httpPost(path, body, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  return request(path, {
    method: 'POST',
    body: isFormData ? body : JSON.stringify(body),
    ...options,
  })
}

export async function httpPut(path, body, options = {}) {
  return request(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...options,
  })
}

export async function httpPatch(path, body, options = {}) {
  return request(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...options,
  })
}

export async function httpDelete(path, options = {}) {
  return request(path, { method: 'DELETE', ...options })
}
