/**
 * Project list is sourced from the repo root CSV export.
 * Update `projects-2026-03-23.csv` and rebuild to refresh the catalog.
 */
import rawCsv from '../../projects-2026-03-23.csv?raw'
import { parseProjectsCsv } from './parseProjectsCsv'
import type { CatalogProject } from '../types/projectCatalog'

export const projectsCatalog: CatalogProject[] = parseProjectsCsv(rawCsv)
