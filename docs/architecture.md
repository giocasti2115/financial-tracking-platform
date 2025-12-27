# Financial Tracking Platform

## 1. Vision General
- **Objetivo**: proveer un sistema integral para registrar ingresos, egresos, deudas y proyecciones, con analisis quincenal y mensual.
- **Usuarios meta**: administradores financieros internos y usuarios finales con cuentas personales.
- **Pilares**: experiencia responsiva (Next.js), capa API consolidada y persistencia auditable.

## 2. Frontend (existente)
- **Stack**: Next.js 15 (App Router) + React 19 + TailwindCSS 4 + Radix UI.
- **Modulos**: dashboard, ingresos, gastos, deudas, proyecciones, assets, auth.
- **Estrategia de datos**: React Query + API client central (pendiente) con DTOs compartidos.
- **Autenticacion**: integrar proveedor OAuth/JWT via `auth-provider` y `theme-provider`.
- **State management**: hooks locales, caches por ruta, slices de datos declarativos.

## 3. Backend propuesto
- **Lenguaje/Framework**: Node.js 20 LTS con NestJS (estructuras modulares, DI) o Express + Zod para validacion.
- **Servicios**:
  - Auth: registro/login, refresh tokens, roles.
  - Catalogs: categorias, cuentas, divisas.
  - Finance: ingresos, gastos, deudas, pagos, clonacion de gastos.
  - Analytics: proyecciones, reportes, dashboards.
- **Contratos**: API REST + OpenAPI; evaluar GraphQL si se requieren agregaciones complejas.
- **Background jobs**: worker para proyecciones y alertas (BullMQ/Temporal) opcional.

## 4. Base de datos
- **Motor**: PostgreSQL 16 (JSONB, funciones, vistas materializadas).
- **Modelado inicial**:
  - `users`, `sessions`, `refresh_tokens`.
  - `accounts`, `categories`, `currencies`.
  - `incomes`, `expenses`, `expense_templates`, `payments`.
  - `debts`, `debt_payments`, `projections`.
- **Migraciones**: Prisma Migrate o TypeORM CLI, versionadas en `scripts/`.
- **Seeds**: datos base (categorias, usuarios demo) bajo `npm run seed`.

## 5. Integracion Front-Back
1. Definir DTOs/Types compartidos en `packages/contracts` (pnpm workspaces).
2. Implementar cliente API (`lib/api-client.ts`) que maneje auth headers, retries y serializacion.
3. Sustituir datos mock en `app/*/page.tsx` por hooks (`useQuery`) conectados al backend.
4. Validar flujos E2E (login, registrar gasto, pagar deuda) con Cypress/Playwright.

## 6. Infraestructura
- **Contenedores**: Docker + docker-compose para dev; Kubernetes/ECS para prod.
- **CI/CD**: GitHub Actions (lint, test, build, deploy). Estrategia trunk-based.
- **Observabilidad**: logs estructurados (pino), trazas (OpenTelemetry), metricas (Prometheus/Grafana), alertas (PagerDuty).
- **Secrets**: Vault o SSM; nunca en repo.

## 7. Seguridad & Cumplimiento
- JWT firmados (RS256), rotacion de refresh tokens.
- Rate limiting (Redis) y proteccion CSRF.
- Validacion y sanitizacion de entradas (Zod/class-validator).
- Backups diarios automaticos y cifrado at-rest (KMS) + in-transit (TLS).

## 8. Roadmap alto nivel
1. Aprobar arquitectura y stack.
2. Modelar base de datos y publicar migraciones iniciales.
3. Construir backend MVP con auth e ingresos/gastos/deudas.
4. Integrar frontend con cliente API y pruebas E2E.
5. Configurar pipelines CI/CD, monitoreo y despliegue a staging/prod.
