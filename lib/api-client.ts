/**
 * API Client with automatic authentication error handling
 * Automatically redirects to login on 401 Unauthorized responses
 */

interface FetchOptions extends RequestInit {
  skipAuthRedirect?: boolean
}

export class ApiClient {
  /**
   * Wrapper around fetch that handles authentication errors
   */
  static async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const { skipAuthRedirect = false, ...fetchOptions } = options

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      })

      // Check for unauthorized (401) or forbidden (403) responses
      if (!skipAuthRedirect && (response.status === 401 || response.status === 403)) {
        // Clear any client-side session data
        if (typeof window !== 'undefined') {
          // Redirect to login with return url
          const currentPath = window.location.pathname
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`
        }
        throw new Error('Unauthorized')
      }

      return response
    } catch (error) {
      // If it's a network error or other issue, throw it
      if (error instanceof TypeError) {
        console.error('Network error:', error)
      }
      throw error
    }
  }

  /**
   * Convenience method for GET requests that returns JSON
   */
  static async get<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, { ...options, method: 'GET' })
    return response.json()
  }

  /**
   * Convenience method for POST requests
   */
  static async post<T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.json()
  }

  /**
   * Convenience method for PUT requests
   */
  static async put<T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.json()
  }

  /**
   * Convenience method for PATCH requests
   */
  static async patch<T = any>(url: string, data?: any, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.json()
  }

  /**
   * Convenience method for DELETE requests
   */
  static async delete<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const response = await this.fetch(url, { ...options, method: 'DELETE' })
    return response.json()
  }
}

// Export default instance for convenience
export default ApiClient
