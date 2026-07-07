#!/usr/bin/env node
/**
 * Bootstrap Spectral Operations admin user + tenant membership hint.
 * Usage: node scripts/bootstrap-spectral-admin.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvLocal() {
  const text = readFileSync(resolve(root, '.env.local'), 'utf8')
  const env = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[m[1]] = v
  }
  return env
}

const EMAIL = process.env.SPECTRAL_BOOTSTRAP_EMAIL ?? 'dfarre888@gmail.com'
const TENANT_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  const env = loadEnvLocal()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing Supabase env in .env.local')
    process.exit(1)
  }

  const password = `Spectral-Ops-${randomBytes(3).toString('hex')}!`
  let userId = null

  const listRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (listRes.ok) {
    const listed = await listRes.json()
    const hit = (listed.users ?? []).find((u) => u.email === EMAIL)
    if (hit) userId = hit.id
  }

  if (userId) {
    const patchRes = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: { full_name: 'David Farrell' },
      }),
    })
    if (!patchRes.ok) {
      console.error('Password reset failed:', await patchRes.text())
      process.exit(1)
    }
    console.log(`Updated existing user ${EMAIL}`)
  } else {
    const createRes = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: EMAIL,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'David Farrell' },
      }),
    })
    if (!createRes.ok) {
      console.error('Create user failed:', await createRes.text())
      process.exit(1)
    }
    const created = await createRes.json()
    userId = created.id
    console.log(`Created user ${EMAIL}`)
  }

  writeFileSync(
    resolve(root, '.spectral-local-credentials'),
    `# DO NOT COMMIT\nEMAIL=${EMAIL}\nPASSWORD=${password}\nUSER_ID=${userId}\nTENANT_ID=${TENANT_ID}\n`,
  )

  console.log(JSON.stringify({ email: EMAIL, password, userId, tenantId: TENANT_ID }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
