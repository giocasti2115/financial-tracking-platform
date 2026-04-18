import Constants from "expo-constants"

type AppEnv = "dev" | "stage" | "prod"

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>

const env = (process.env.EXPO_PUBLIC_APP_ENV ?? extra.EXPO_PUBLIC_APP_ENV ?? "dev") as AppEnv

const fallbackDevUrl = "http://10.0.2.2:4000"

const apiUrlByEnv: Record<AppEnv, string | undefined> = {
  dev: process.env.EXPO_PUBLIC_API_URL_DEV ?? extra.EXPO_PUBLIC_API_URL_DEV,
  stage: process.env.EXPO_PUBLIC_API_URL_STAGE ?? extra.EXPO_PUBLIC_API_URL_STAGE,
  prod: process.env.EXPO_PUBLIC_API_URL_PROD ?? extra.EXPO_PUBLIC_API_URL_PROD,
}

export const appConfig = {
  env,
  apiBaseUrl:
    apiUrlByEnv[env] ?? process.env.EXPO_PUBLIC_API_URL ?? extra.EXPO_PUBLIC_API_URL ?? fallbackDevUrl,
}