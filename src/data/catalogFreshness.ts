import { projectsCatalog } from './projectsCatalog'

/** Latest `Updated At` value from the bundled CSV (YYYY-MM-DD strings sort lexically). */
export function getCatalogCsvFreshnessLabel(): string | null {
  let best = ''
  for (const p of projectsCatalog) {
    const u = p.updatedAt.trim()
    if (u && u > best) best = u
  }
  return best || null
}
