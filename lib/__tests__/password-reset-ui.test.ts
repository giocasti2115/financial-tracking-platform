import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

describe("password reset UI", () => {
  it("does not show or request a temporary password", () => {
    const login = read("app/login/page.tsx")
    const auth = read("lib/auth.ts")
    const resetPage = read("app/reset-password/page.tsx")

    for (const source of [login, auth, resetPage]) {
      expect(source).not.toContain("temporaryPassword")
      expect(source).not.toContain("Clave temporal")
    }

    expect(resetPage).toContain("location.hash")
    expect(auth).toContain("/auth/reset-password")
  })
})
