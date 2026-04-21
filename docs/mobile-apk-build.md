# Build APK para testing interno

## Objetivo
Generar un APK instalable de `Aurea Finanzas` para pruebas en 2 dispositivos Android.

## Requisitos
- Cuenta en Expo / EAS
- Login activo en CLI: `corepack pnpm dlx eas-cli login`
- Variables públicas configuradas para mobile si aplica:
  - `EXPO_PUBLIC_API_BASE_URL_DEV`
  - `EXPO_PUBLIC_API_BASE_URL_STAGE`
  - `EXPO_PUBLIC_API_BASE_URL_PROD`

## Configuración incluida
- Archivo: `apps/mobile/eas.json`
- Perfil de APK interno: `preview`
- Perfil de Play Store AAB: `production`

## Comando para generar APK
Desde `apps/mobile`:

`corepack pnpm dlx eas-cli build --platform android --profile preview`

## Resultado esperado
- EAS devolverá una URL con el artefacto `.apk`
- Ese APK se instala manualmente en los 2 dispositivos Android de prueba

## Recomendación de prueba
Validar en ambos dispositivos:
- Login / logout
- Dashboard
- Gastos: listar + crear
- Deudas: listar + crear + registrar pago
- Proyecciones: simular + registrar deuda + exportar
- Perfil / settings

## Siguiente paso después del APK
- Si QA sale bien, generar AAB con:

`corepack pnpm dlx eas-cli build --platform android --profile production`
