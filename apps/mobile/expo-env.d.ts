/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_APP_ENV?: "dev" | "stage" | "prod"
    EXPO_PUBLIC_API_URL?: string
    EXPO_PUBLIC_API_URL_DEV?: string
    EXPO_PUBLIC_API_URL_STAGE?: string
    EXPO_PUBLIC_API_URL_PROD?: string
  }
}