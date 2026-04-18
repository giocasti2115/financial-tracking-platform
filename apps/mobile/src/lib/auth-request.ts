import { ApiError, apiRequest } from "@/lib/api-client"
import { telemetry } from "@/lib/telemetry"

export type AuthRequestOptions = {
  accessToken: string | null
  refreshSession: () => Promise<string | null>
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryable = (error: unknown) => {
  if (error instanceof ApiError) {
    if (!error.status) return true
    return error.status >= 500
  }
  return error instanceof Error
}

export const authRequest = async <T>(
  path: string,
  auth: AuthRequestOptions,
  options: RequestInit & { retries?: number } = {},
): Promise<T> => {
  const retries = options.retries ?? 2
  const { retries: _retries, ...requestOptions } = options

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiRequest<T>(path, {
        ...requestOptions,
        token: auth.accessToken,
      })
    } catch (error) {
      lastError = error

      if (error instanceof ApiError && error.status === 401) {
        const nextToken = await auth.refreshSession()
        if (nextToken) {
          try {
            return await apiRequest<T>(path, {
              ...requestOptions,
              token: nextToken,
            })
          } catch (retryError) {
            lastError = retryError
          }
        }
      }

      if (attempt < retries && isRetryable(error)) {
        await sleep(250 * (attempt + 1))
        continue
      }

      await telemetry.track("error", "authRequest", error instanceof Error ? error.message : "Unknown request error")
      throw error
    }
  }

  await telemetry.track(
    "error",
    "authRequest",
    lastError instanceof Error ? lastError.message : "Request failed after retries",
  )
  throw lastError instanceof Error ? lastError : new Error("Request failed")
}