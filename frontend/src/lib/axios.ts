/**
 * Axios instance with request/response interceptors
 * Handles token attachment, 401 refresh flow, and error normalization
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'
import { ApiError } from '@/types/api'

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request interceptor: Attach access token from localStorage
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

interface RetryableAxiosConfig extends AxiosRequestConfig {
  _retry?: boolean
}

const AUTH_ENDPOINTS = [
  '/api/auth/login/',
  '/api/auth/register/',
  '/api/auth/token/refresh/',
]

const shouldSkipRefresh = (url?: string): boolean => {
  if (!url) {
    return false
  }

  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))
}

const getLocaleAwareLoginPath = (): string => {
  const currentPath = window.location.pathname
  if (currentPath.startsWith('/en/')) {
    return '/en/login'
  }
  return '/vi/login'
}

/**
 * Response interceptor:
 * - 401 → attempt refresh token flow → retry original request
 * - Other errors → normalize to ApiError
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableAxiosConfig

    // 401 Unauthorized — attempt refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest.url)
    ) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          // No refresh token — redirect to login
          const event = new CustomEvent('auth:logout', { detail: 'No refresh token' })
          window.dispatchEvent(event)
          window.location.href = getLocaleAwareLoginPath()
          return Promise.reject(error)
        }

        // Attempt refresh
        const refreshResponse = await axios.post(
          '/api/auth/token/refresh/',
          {
            refresh: refreshToken,
          },
          {
            baseURL: process.env.NEXT_PUBLIC_API_URL,
          }
        )

        const { access, refresh } = refreshResponse.data
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)

        // Update authorization header and retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`
        }
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed — clear tokens and redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        const event = new CustomEvent('auth:logout', { detail: 'Token refresh failed' })
        window.dispatchEvent(event)
        window.location.href = getLocaleAwareLoginPath()
        return Promise.reject(refreshError)
      }
    }

    // Other errors — normalize to ApiError
    const apiError: ApiError =
      ((typeof error.response?.data === 'object' &&
      error.response?.data !== null &&
      'detail' in error.response.data)
        ? error.response.data
        : { detail: error.message }) as ApiError
    return Promise.reject(apiError)
  }
)

export default apiClient
