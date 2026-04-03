import { useState } from 'react'
import { sectionGroups } from '../data/registry'
import {
  CSV_SECTION_PREVIEW_ROWS,
  GITHUB_USER,
  KIND_CLASS,
  KIND_FILTER_CSV_ONLY,
  KIND_LABEL,
  STATUSES,
  countActiveComponentsInGroup,
  githubRepoHref,
  statusToneClass,
} from '../lib/constants'
import type {
  ComponentStatus,
  SectionGroup,
} from '../types/lifeSystem'
import {
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  bestGroupStatus,
} from '../types/lifeSystem'

export function SectionsPanel({
  groups,
  overrides,
  setStatus,
  clearOverride,
  kindFilter,
  setKindFilter,
  search,
  setSearch,
  catalogFreshnessLabel,
}: {
  groups: SectionGroup[]
  overrides: Record<string, ComponentStatus | undefined>
  setStatus: (id: string, s: ComponentStatus) => void
  clearOverride: (id: string) => void
  kindFilter: string
  setKindFilter: (v: string) => void
  search: string
  setSearch: (v: string) => void
  catalogFreshnessLabel: string | null
}) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})
  const [showAllCsvRows, setShowAllCsvRows] = useState(false)

  const defaultOpen = groups.length <= 6
  const getOpen = (id: string) => {
    if (id in openMap) return openMap[id]!
    if (id === 'csv-projects') return false
    return defaultOpen
  }

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    groups.forEach((g) => {
      next[g.id] = true
    })
    setOpenMap(next)
  }

  const collapseAll = () => {
    const next: Record<string, boolean> = {}
    groups.forEach((g) => {
      next[g.id] = false
    })
    setOpenMap(next)
  }

  const totalSections = sectionGroups.length
  const totalComponents = sectionGroups.reduce(
    (n, g) => n + g.components.length,
    0,
  )

  return (
    <div className="panel">
      <h2 className="panel-heading">Sections</h2>
      <p className="panel-lead muted">
        Default statuses and repo links mirror{' '}
        <a
          href={`https://github.com/${GITHUB_USER}`}
          target="_blank"
          rel="noreferrer"
          className="inline-link"
        >
          github.com/{GITHUB_USER}
        </a>
        . Open a group to edit; use <strong>Reset overrides</strong> to reload
        defaults after a registry update.
        {catalogFreshnessLabel
          ? ` CSV catalog rows: latest "Updated At" in this bundle is ${catalogFreshnessLabel}.`
          : ''}
      </p>

      <div className="toolbar toolbar-wrap">
        <label className="field">
          <span className="field-label">Kind</span>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            aria-label="Filter by section kind"
          >
            <option value="all">All kinds</option>
            <option value="layer">Core layers</option>
            <option value="domain">Life domains</option>
            <option value="addon">Add-ons</option>
            <option value="future">Future</option>
            <option value={KIND_FILTER_CSV_ONLY}>CSV catalog only</option>
          </select>
        </label>
        <label className="field field-grow">
          <span className="field-label">Search</span>
          <input
            type="search"
            placeholder="Section, component, tool, or repo name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search sections and components"
          />
        </label>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-sm" onClick={expandAll}>
            Expand all
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
      </div>

      <p className="results-line" aria-live="polite">
        Showing <strong>{groups.length}</strong> of {totalSections} sections (
        {totalComponents} components total)
        {search.trim() ? ` matching "${search.trim()}"` : ''}
      </p>

      {groups.length === 0 ? (
        <p className="empty-hint empty-block">
          Nothing matches this filter. Try clearing search, choosing "All kinds",
          or another kind preset (including CSV catalog only).
        </p>
      ) : null}

      {groups.map((g) => {
        const gBest = bestGroupStatus(g, overrides)
        const activeN = countActiveComponentsInGroup(g, overrides)
        const totalN = g.components.length
        const isCsv = g.id === 'csv-projects'
        const visibleComponents =
          isCsv && !showAllCsvRows
            ? g.components.slice(0, CSV_SECTION_PREVIEW_ROWS)
            : g.components
        return (
          <details
            key={g.id}
            className="group"
            open={getOpen(g.id)}
            onToggle={(e) => {
              const el = e.currentTarget
              setOpenMap((m) => ({ ...m, [g.id]: el.open }))
            }}
          >
            <summary>
              <span className="summary-main">
                <span className="summary-title">{g.title}</span>
                {g.description ? (
                  <span className="group-meta"> — {g.description}</span>
                ) : null}
              </span>
              <span className="summary-meta">
                <span className={`kind-pill ${KIND_CLASS[g.kind]}`}>
                  {KIND_LABEL[g.kind]}
                </span>
                <span className="group-count" title="Active components in this group">
                  {activeN}/{totalN} active
                </span>
                <span className={`status-pill ${statusToneClass(gBest)}`}>
                  Best: {STATUS_LABELS[gBest]}
                </span>
              </span>
            </summary>
            <div className="table-scroll table-scroll-sticky">
              <table className="comp-table comp-table-sections">
                <thead>
                  <tr>
                    <th scope="col">Component</th>
                    <th scope="col">Repo</th>
                    <th scope="col">Tool</th>
                    <th scope="col">Status</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleComponents.map((c) => {
                    const cur = overrides[c.id] ?? c.defaultStatus
                    const dirty = overrides[c.id] !== undefined
                    return (
                      <tr key={c.id} className={`row-status ${statusToneClass(cur)}`}>
                        <th scope="row" className="comp-name">
                          {c.label}
                        </th>
                        <td>
                          {c.repoUrl || c.repo || c.locationUrl ? (
                            <div className="repo-links-stack">
                              {c.repoUrl ? (
                                <a
                                  className="repo-link"
                                  href={c.repoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Repository
                                </a>
                              ) : c.repo ? (
                                <a
                                  className="repo-link"
                                  href={githubRepoHref(c.repo)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {c.repo}
                                </a>
                              ) : null}
                              {c.locationUrl ? (
                                <a
                                  className="repo-link repo-link-secondary"
                                  href={c.locationUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Location URL
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            <span className="cell-empty">—</span>
                          )}
                        </td>
                        <td>
                          {c.tool ? (
                            <span className="tool-tag">{c.tool}</span>
                          ) : (
                            <span className="cell-empty">—</span>
                          )}
                        </td>
                        <td className="cell-status">
                          <select
                            value={cur}
                            title={STATUS_DESCRIPTIONS[cur]}
                            onChange={(e) =>
                              setStatus(c.id, e.target.value as ComponentStatus)
                            }
                            aria-label={`Status for ${c.label}. ${STATUS_DESCRIPTIONS[cur]}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s} title={STATUS_DESCRIPTIONS[s]}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          {dirty ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => clearOverride(c.id)}
                            >
                              Use default
                            </button>
                          ) : null}
                        </td>
                        <td className="cell-notes">
                          {c.notes ?? <span className="cell-empty">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {isCsv &&
              g.components.length > CSV_SECTION_PREVIEW_ROWS &&
              !showAllCsvRows ? (
                <div className="csv-table-expand">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setShowAllCsvRows(true)}
                  >
                    Show all {g.components.length} rows
                  </button>
                </div>
              ) : null}
            </div>
          </details>
        )
      })}
    </div>
  )
}
