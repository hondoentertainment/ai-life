import type { CatalogProject } from '../types/projectCatalog'
import type { ComponentItem, ComponentStatus, SectionGroup } from '../types/lifeSystem'
import { CSV_FILENAME } from './csvMeta'
import { projectsCatalog } from './projectsCatalog'

const GITHUB_ORG = 'hondoentertainment'

function csvStatusToComponentStatus(status: string): ComponentStatus {
  const s = status.trim().toLowerCase()
  if (s === 'active') return 'in_progress'
  if (s === 'archived') return 'not_started'
  if (s === 'in-review' || s === 'in review') return 'planned'
  return 'planned'
}

function repoFields(
  repositoryUrl: string,
): Pick<ComponentItem, 'repo' | 'repoUrl'> {
  const u = repositoryUrl.trim()
  if (!u) return {}
  const m = u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i)
  if (m) {
    const owner = m[1]
    const name = m[2].replace(/\.git$/, '')
    if (owner.toLowerCase() === GITHUB_ORG.toLowerCase()) {
      return { repo: name }
    }
    return { repoUrl: u }
  }
  if (/^https?:\/\//i.test(u)) return { repoUrl: u }
  return {}
}

function buildNotes(p: CatalogProject): string {
  const parts: string[] = []
  if (p.location.trim()) parts.push(`Bucket: ${p.location.trim()}`)
  if (p.description.trim()) parts.push(p.description.trim())
  return parts.join('\n\n')
}

function catalogRowToComponent(p: CatalogProject): ComponentItem {
  const { repo, repoUrl } = repoFields(p.repositoryUrl)
  const loc = p.locationUrl.trim()
  return {
    id: `csv-${p.id}`,
    label: p.name,
    defaultStatus: csvStatusToComponentStatus(p.status),
    notes: buildNotes(p),
    tool: p.tools.trim() || undefined,
    repo,
    repoUrl,
    locationUrl: /^https?:\/\//i.test(loc) ? loc : undefined,
  }
}

/** Life-domain section backed by the bundled project catalog CSV. */
export const csvProjectsSection: SectionGroup = {
  id: 'csv-projects',
  kind: 'domain',
  title: 'Projects (CSV catalog)',
  description:
    `Imported from ${CSV_FILENAME}; replace the file and rebuild to refresh rows.`,
  components: projectsCatalog.map(catalogRowToComponent),
}
