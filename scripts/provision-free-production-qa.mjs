import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { createClient } from "@supabase/supabase-js"

const ROOT = resolve(import.meta.dirname, "..")
const APP_ENV_PATH = resolve(ROOT, ".env.local")
const E2E_ENV_PATH = resolve(ROOT, ".env.e2e.local")
const QA_ENV_PATH = resolve(ROOT, ".env.production-qa.local")
const CONFIRMATION_FLAG = "--confirm-production"
const EXPECTED_PRODUCTION_SUPABASE_HOST = "meahkrbbmmytntzzlguk.supabase.co"

function parseEnvFile(path) {
  if (!existsSync(path)) return {}

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=")
        const key = line.slice(0, separator).trim()
        let value = line.slice(separator + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        return [key, value]
      }),
  )
}

function deriveQaEmail(sourceEmail) {
  const match = /^([^@]+)@(gmail\.com|googlemail\.com)$/i.exec(sourceEmail)
  if (!match) {
    throw new Error(
      "Set PRODUCTION_QA_EMAIL explicitly; automatic derivation only supports the controlled Gmail e2e mailbox.",
    )
  }

  const baseLocalPart = match[1].split("+")[0]
  return `${baseLocalPart}+makercompass-billing-qa@${match[2].toLowerCase()}`
}

function createPassword() {
  return `Mc!${randomBytes(30).toString("base64url")}`
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw new Error(`Could not list production auth users: ${error.message}`)

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < 100) return null
  }

  throw new Error("Production auth user scan exceeded the bounded 2,000-user safety limit.")
}

async function waitForProfile(supabase, userId) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()
    if (error) throw new Error(`Could not verify QA profile: ${error.message}`)
    if (data?.id) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }

  throw new Error("QA auth user was created, but its profile trigger did not finish.")
}

async function assertFreeEntitlement(supabase, userId) {
  const { count, error } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
  if (error) throw new Error(`Could not verify QA subscriptions: ${error.message}`)
  if ((count ?? 0) !== 0) {
    throw new Error("QA user has a subscription row; refusing to treat it as a Free account.")
  }
}

async function main() {
  if (!process.argv.includes(CONFIRMATION_FLAG)) {
    throw new Error(`Production mutation blocked. Re-run with ${CONFIRMATION_FLAG}.`)
  }

  const appEnv = parseEnvFile(APP_ENV_PATH)
  const e2eEnv = parseEnvFile(E2E_ENV_PATH)
  const existingQaEnv = parseEnvFile(QA_ENV_PATH)
  const supabaseUrl = appEnv.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = appEnv.SUPABASE_SERVICE_ROLE_KEY
  const sourceEmail = e2eEnv.E2E_TEST_EMAIL
  const qaEmail =
    existingQaEnv.E2E_FREE_TEST_EMAIL ||
    process.env.PRODUCTION_QA_EMAIL ||
    deriveQaEmail(sourceEmail || "")

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Production Supabase URL/service role is not configured in .env.local.")
  }
  const host = new URL(supabaseUrl).hostname
  if (host !== EXPECTED_PRODUCTION_SUPABASE_HOST) {
    throw new Error("Production guard rejected the configured Supabase URL.")
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  let user = await findUserByEmail(supabase, qaEmail)
  let created = false
  let password = existingQaEnv.E2E_FREE_TEST_PASSWORD

  if (user && !password) {
    throw new Error(
      "QA auth user already exists but no local credential file is present; refusing to reset it automatically.",
    )
  }

  if (!user) {
    if (existsSync(QA_ENV_PATH)) {
      throw new Error("QA credential file exists but its auth user does not; refusing to overwrite it.")
    }

    password = createPassword()
    const result = await supabase.auth.admin.createUser({
      email: qaEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Maker Compass Billing QA" },
    })
    if (result.error || !result.data.user) {
      throw new Error(`Could not create production QA user: ${result.error?.message ?? "unknown error"}`)
    }
    user = result.data.user
    created = true
  }

  try {
    await waitForProfile(supabase, user.id)
    await assertFreeEntitlement(supabase, user.id)

    if (!existsSync(QA_ENV_PATH)) {
      writeFileSync(
        QA_ENV_PATH,
        [
          "# Dedicated Free production billing QA identity. Never commit this file.",
          `E2E_FREE_TEST_EMAIL=${qaEmail}`,
          `E2E_FREE_TEST_PASSWORD=${password}`,
          "E2E_FREE_TEST_BASE_URL=https://makercompass.com",
          "",
        ].join("\n"),
        { encoding: "utf8", flag: "wx", mode: 0o600 },
      )
    }
  } catch (error) {
    if (created) await supabase.auth.admin.deleteUser(user.id)
    throw error
  }

  console.info(JSON.stringify({
    ok: true,
    created,
    emailConfirmed: Boolean(user.email_confirmed_at),
    profilePresent: true,
    subscriptionCount: 0,
    credentialFile: ".env.production-qa.local",
  }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
