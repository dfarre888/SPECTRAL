/**
 * Local fallback store for the AI audit log: data/audit/ai-audit.jsonl.
 *
 * Used when the database this instance is connected to has no ai_audit_log
 * table yet (or refuses the write). One JSON object per line, appended with
 * O_APPEND, never rewritten. Each line carries `prev`, the SHA-384 of the
 * previous line's text, so an edited or deleted line breaks the chain and
 * readChain() reports it. The directory is git-ignored (data/audit/.gitignore).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import type { AiAuditRow } from './ai-audit'

export function localAuditPath(): string {
  return process.env.SPECTRAL_AI_AUDIT_FILE || join(process.cwd(), 'data', 'audit', 'ai-audit.jsonl')
}

const sha384 = (s: string) => createHash('sha384').update(s, 'utf8').digest('hex')

export type LocalAuditRow = AiAuditRow & { prev: string | null; store_reason: string }

function readLines(path: string): string[] {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').split('\n').filter((l) => l.trim().length > 0)
}

function ensureDir(path: string) {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const ignore = join(dir, '.gitignore')
  if (!existsSync(ignore)) writeFileSync(ignore, '*\n!.gitignore\n')
}

/** Append one row. Throws if the file cannot be written. */
export function appendLocalAudit(row: Omit<LocalAuditRow, 'prev'>, path = localAuditPath()): LocalAuditRow {
  ensureDir(path)
  const lines = readLines(path)
  const prev = lines.length ? sha384(lines[lines.length - 1]) : null
  const full: LocalAuditRow = { ...row, prev }
  appendFileSync(path, `${JSON.stringify(full)}\n`, { flag: 'a' })
  return full
}

export interface LocalChain {
  rows: LocalAuditRow[]
  total: number
  /** true when every line's `prev` matches the hash of the line before it. */
  intact: boolean
  /** 1-based line number of the first break, if any. */
  brokenAt: number | null
}

export function readLocalAudit(path = localAuditPath()): LocalChain {
  const lines = readLines(path)
  const rows: LocalAuditRow[] = []
  let brokenAt: number | null = null
  for (let i = 0; i < lines.length; i++) {
    let row: LocalAuditRow
    try {
      row = JSON.parse(lines[i]) as LocalAuditRow
    } catch {
      brokenAt ??= i + 1
      continue
    }
    const expected = i === 0 ? null : sha384(lines[i - 1])
    if (row.prev !== expected) brokenAt ??= i + 1
    rows.push(row)
  }
  return { rows, total: rows.length, intact: brokenAt === null, brokenAt }
}
