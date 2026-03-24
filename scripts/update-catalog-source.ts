/**
 * Rewrites `src/data/projectsCatalog.ts` to import a CSV file from the repo root.
 * Usage: npm run catalog:refresh -- your-export.csv
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseProjectsCsv } from '../src/data/parseProjectsCsv.ts'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const csvName = process.argv[2]?.trim() || 'projects-2026-03-23.csv'
const csvPath = resolve(root, csvName)

if (!existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}`)
  process.exit(1)
}

const base = basename(csvName)
if (!/\.csv$/i.test(base)) {
  console.error('Expected a .csv filename.')
  process.exit(1)
}

const csvText = readFileSync(csvPath, 'utf8')
const rows = parseProjectsCsv(csvText)
if (rows.length === 0) {
  console.error('CSV produced zero catalog rows (no valid Name cells).')
  process.exit(1)
}

const idCounts = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.id] = (acc[r.id] ?? 0) + 1
  return acc
}, {})
const duplicateIds = Object.entries(idCounts)
  .filter(([, n]) => n > 1)
  .map(([id]) => id)
  .sort()
if (duplicateIds.length > 0) {
  console.error(`Duplicate project ids (${duplicateIds.length}): ${duplicateIds.join(', ')}`)
  process.exit(1)
}

const outPath = resolve(root, 'src/data/projectsCatalog.ts')
const content = `/**
 * Project list is sourced from the repo root CSV export.
 * Source: \`${base}\`
 *
 * Refresh: \`npm run catalog:refresh -- ${base}\`
 */
import rawCsv from '../../${base}?raw'
import { parseProjectsCsv } from './parseProjectsCsv'
import type { CatalogProject } from '../types/projectCatalog'

export const projectsCatalog: CatalogProject[] = parseProjectsCsv(rawCsv)
`

writeFileSync(outPath, content, 'utf8')
console.log(`Updated ${outPath} → ../../${base}?raw`)
