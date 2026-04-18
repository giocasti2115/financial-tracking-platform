# Roadmap de Sprints Mobile (Android)

Estado actualizado: 2026-04-18

## Convención
- **Completado**: entregado, validado y subido.
- **Pendiente**: no iniciado o en cola.

## Mapa de sprints

| Sprint | Objetivo | Estado |
|---|---|---|
| Sprint 1.0 | Base de app Expo + navegación + tema + auth inicial | **Completado** |
| Sprint 1.1 | Dashboard móvil conectado a API real | **Completado** |
| Sprint 1.2 | Módulo Gastos móvil (listar, filtrar, crear) | **Completado** |
| Sprint 1.3 | Módulo Deudas móvil (listar, filtrar, crear, registrar pago) | **Completado** |
| Sprint 1.4 | Proyecciones móvil: simulador de crédito funcional | **Completado** |
| Sprint 1.5 | Proyecciones: registrar deuda desde simulación + export básico | **Completado** |
| Sprint 1.6 | Perfil: edición de datos de usuario + settings base | **Completado** |
| Sprint 1.7 | Manejo offline básico (cache lectura + reintentos) | **Completado** |
| Sprint 2.0 | Push notifications (recordatorios de pago) | **Completado** |
| Sprint 2.1 | Reportes avanzados y visualizaciones en mobile | **Completado** |
| Sprint 2.2 | QA integral, hardening de errores y telemetría | **Completado** |
| Sprint 3.0 | Monetización Android (ads/planes) | **Completado** |
| Sprint 3.1 | Release candidate para Play Store | **Completado** |

## Evidencia rápida de sprints completados
- Sprint 1.0: estructura en `apps/mobile` con auth provider, tabs y tema.
- Sprint 1.1: dashboard real consumiendo API.
- Sprint 1.2: pantalla gastos conectada y operativa.
- Sprint 1.3: pantalla deudas conectada y operativa.
- Sprint 1.4: simulador de crédito en pantalla de proyecciones.
- Sprint 1.5: registro de deuda desde simulación + exportación CSV básica para compartir.
- Sprint 1.6: edición de nombre de perfil y configuración base persistida en dispositivo.
- Sprint 1.7: cache de lectura con fallback y reintentos de red en capa API móvil.
- Sprint 2.0: centro de recordatorios de pagos próximos y gestión de lectura.
- Sprint 2.1: bloque de reporte avanzado e insights de flujo/neto/top gastos en dashboard.
- Sprint 2.2: telemetría local de errores/red y panel de diagnóstico en perfil.
- Sprint 3.0: configuración de planes Free/Plus/Pro y selector base de monetización.
- Sprint 3.1: checklist RC documentado + versión móvil actualizada a `1.0.0-rc.1`.
