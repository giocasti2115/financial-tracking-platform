import type { CapacitorConfig } from "@capacitor/cli"

/**
 * Empaquetado para tiendas: el WebView sirve el export estático de `out/`,
 * generado con `pnpm build:capacitor`. No hay `server.url`: cargar
 * https://app.aureafinanzas.com dentro del WebView es el shell remoto que
 * Apple trata como sitio reempaquetado.
 *
 * El id `com.aureafinanzas.app` es distinto del paquete Expo
 * `com.aureafinanzas.mobile`. Hay que fijar uno solo antes de Play Console.
 */
const config: CapacitorConfig = {
  appId: "com.aureafinanzas.app",
  appName: "Áurea Finanzas",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
