import type { CapacitorConfig } from "@capacitor/cli"

/**
 * Empaquetado para tiendas: el WebView sirve el export estático de `out/`,
 * generado con `pnpm build:capacitor`. No hay `server.url`: cargar
 * https://app.aureafinanzas.com dentro del WebView es el shell remoto que
 * Apple trata como sitio reempaquetado.
 *
 * El id es `com.aureafinanzas.mobile`, el mismo de la app Expo, para una sola
 * ficha en Google Play y en el App Store.
 */
const config: CapacitorConfig = {
  appId: "com.aureafinanzas.mobile",
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
