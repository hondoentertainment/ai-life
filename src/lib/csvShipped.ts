import type { CatalogProject } from '../types/projectCatalog'

function isLikelyHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

/** GitHub owner/repo path without requiring https:// */
function looksLikeGithubRepoPath(s: string): boolean {
  const t = s.trim()
  if (!t || isLikelyHttpUrl(t)) return false
  return /^[\w.-]+\/[\w.-]+$/i.test(t)
}

/** Full or partial GitHub URL to a repo. */
function isGithubRepoUrl(s: string): boolean {
  return /github\.com\/[^/]+\/[^/#?\s]+/i.test(s.trim())
}

/**
 * Active CSV row that counts as “shipped / linkable” for Showcase:
 * http(s) location or repo URL, or GitHub URL / bare owner/repo in repo column.
 */
export function csvProjectLooksShipped(p: CatalogProject): boolean {
  if (p.status.trim().toLowerCase() !== 'active') return false
  const r = p.repositoryUrl.trim()
  const l = p.locationUrl.trim()
  return (
    isLikelyHttpUrl(r) ||
    isLikelyHttpUrl(l) ||
    isGithubRepoUrl(r) ||
    looksLikeGithubRepoPath(r)
  )
}

/** Web links for showcase rows (https URLs or inferred GitHub repo URL). */
export function getCatalogProjectWebLinks(p: CatalogProject): {
  repository?: { href: string }
  location?: { href: string }
} {
  const r = p.repositoryUrl.trim()
  const l = p.locationUrl.trim()
  const out: { repository?: { href: string }; location?: { href: string } } =
    {}
  if (isLikelyHttpUrl(l)) out.location = { href: l }
  if (isLikelyHttpUrl(r)) out.repository = { href: r }
  else if (isGithubRepoUrl(r)) {
    let href = r
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href.replace(/^\/+/, '')}`
    }
    out.repository = { href }
  } else if (looksLikeGithubRepoPath(r)) {
    out.repository = { href: `https://github.com/${r}` }
  }
  return out
}
