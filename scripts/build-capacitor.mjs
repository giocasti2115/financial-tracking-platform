import { spawnSync } from "node:child_process"
import { existsSync, renameSync, unlinkSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const proxyPath = path.join(root, "proxy.ts")
const holdPath = path.join(root, "proxy.ts.capacitor-hold")
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next")

if (existsSync(holdPath)) {
  console.error("Ya existe proxy.ts.capacitor-hold. Restáuralo a proxy.ts antes de continuar.")
  process.exit(1)
}

let movedProxy = false

try {
  if (existsSync(proxyPath)) {
    renameSync(proxyPath, holdPath)
    movedProxy = true
  }

  const result = spawnSync(process.execPath, [nextBin, "build"], {
    stdio: "inherit",
    env: {
      ...process.env,
      CAPACITOR_BUILD: "1",
      NEXT_PUBLIC_CAPACITOR: "1",
    },
  })

  if ((result.status ?? 1) === 0) {
    const bundledWorker = path.join(root, "out", "sw.js")
    if (existsSync(bundledWorker)) {
      unlinkSync(bundledWorker)
    }
  }

  process.exitCode = result.status ?? 1
} finally {
  if (movedProxy && existsSync(holdPath)) {
    renameSync(holdPath, proxyPath)
  }
}
