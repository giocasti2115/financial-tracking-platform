import { appConfig } from "@/lib/config"

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type RequestOptions = RequestInit & {
  token?: string | null
}

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json()
    return payload?.message ?? response.statusText
  } catch {
    return response.statusText
  }
}

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { token, headers, ...rest } = options
  const finalHeaders = new Headers(headers)

  if (rest.body && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json")
  }

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`)
  }

  let response: Response

  try {
    response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...rest,
      headers: finalHeaders,
    })
  } catch {
    throw new ApiError("No pudimos conectar con el servidor. Verifica tu conexión e intenta nuevamente.")
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status)
  }

  if (response.status === 204) {
    return {} as T
  }

  return (await response.json()) as T
}