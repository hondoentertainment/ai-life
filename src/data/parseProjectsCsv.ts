import Papa from 'papaparse'
import type { CatalogProject } from '../types/projectCatalog'

type RawRow = Record<string, string>

function cell(row: RawRow, key: string): string {
  const v = row[key]
  return typeof v === 'string' ? v.trim() : ''
}

function slugId(name: string, index: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return base ? `${base}-${index}` : `project-${index}`
}

/** Parse the exported CSV (multiline-safe). */
export function parseProjectsCsv(csvText: string): CatalogProject[] {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const out: CatalogProject[] = []
  let i = 0
  for (const row of parsed.data) {
    if (!row || typeof row !== 'object') continue
    const name = cell(row, 'Name')
    if (!name) continue
    out.push({
      id: slugId(name, i),
      name,
      description: cell(row, 'Description'),
      status: cell(row, 'Status') || 'unknown',
      location: cell(row, 'Location'),
      locationUrl: cell(row, 'Location URL'),
      repositoryUrl: cell(row, 'Repository URL'),
      tools: cell(row, 'Tools'),
      createdAt: cell(row, 'Created At'),
      updatedAt: cell(row, 'Updated At'),
    })
    i++
  }
  return out
}
