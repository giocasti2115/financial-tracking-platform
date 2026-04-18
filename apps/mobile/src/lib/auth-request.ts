import { ApiError, apiRequest } from "@/lib/api-client"

export type AuthRequestOptions = {
  accessToken: string | null
  refreshSession: () => Promise<string | null>
}

export const authRequest = async <T>(
  path: string,
  auth: AuthRequestOptions,
  options: RequestInit = {},
): Promise<T> => {
  try {
    return await apiRequest<T>(path, {
      ...options,
      token: auth.accessToken,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const nextToken = await auth.refreshSession()
      if (nextToken) {
        return apiRequest<T>(path, {
          ...options,
          token: nextToken,
        })
      }
    }

    throw error
  }
}