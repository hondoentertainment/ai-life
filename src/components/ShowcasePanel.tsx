import { useMemo, useState } from 'react'
import {
  groupsById,
  integrations,
  sectionGroups,
} from '../data/registry'
import { CSV_FILENAME } from '../data/csvMeta'
import { projectsCatalog } from '../data/projectsCatalog'
import {
  csvProjectLooksShipped,
  getCatalogProjectWebLinks,
} from '../lib/csvShipped'
import { KIND_CLASS, KIND_LABEL, SHOWCASE_SELF_RATED_MIN } from '../lib/constants'
import type { CatalogProject } from '../types/projectCatalog'
import type {
  CategorySelfMetrics,
  ComponentStatus,
  SectionGroup,
} from '../types/lifeSystem'
import {
  STATUS_LABELS,
  bestGroupStatus,
  groupHasCoverage,
  groupSignalPercent,
  integrationSatisfied,
} from '../types/lifeSystem'
import { SignalVsSelfRatedHint } from './SignalVsSelfRatedHint'

export function ShowcasePanel({
  overrides,
  categoryMetrics,
  onGoSections,
  onGoIntegrations,
  onGoMastery,
}: {
  overrides: Record<string, ComponentStatus | undefined>
  categoryMetrics: Record<string, CategorySelfMetrics>
  onGoSections: () => void
  onGoIntegrations: () => void
  onGoMastery: () => void
}) {
  const [categoryShowMode, setCategoryShowMode] = useState<'all' | 'top5'>(
    'all',
  )

  const satisfiedIntegrations = useMemo(
    () =>
      integrations.filter((i) =>
        integrationSatisfied(i, groupsById, overrides),
      ),
    [overrides],
  )

  const categoriesWithSignal = useMemo(() => {
    return sectionGroups
      .filter((g) => g.kind !== 'future' && groupHasCoverage(g, overrides))
      .map((g) => ({
        group: g,
        signal: groupSignalPercent(g, overrides),
        best: bestGroupStatus(g, overrides),
      }))
      .sort((a, b) => b.signal - a.signal)
  }, [overrides])

  const csvShippedActive = useMemo(
    () => projectsCatalog.filter((p) => csvProjectLooksShipped(p)),
    [],
  )

  const selfRatedStrong = useMemo(() => {
    const rows: {
      group: SectionGroup
      proficiency: number
      percentComplete: number
    }[] = []
    for (const g of sectionGroups) {
      const m = categoryMetrics[g.id]
      if (!m) continue
      const prof = m.proficiency
      const comp = m.percentComplete
      if (typeof prof !== 'number' || typeof comp !== 'number') continue
      if (prof < SHOWCASE_SELF_RATED_MIN || comp < SHOWCASE_SELF_RATED_MIN)
        continue
      rows.push({ group: g, proficiency: prof, percentComplete: comp })
    }
    rows.sort((a, b) => {
      const sa = a.proficiency + a.percentComplete
      const sb = b.proficiency + b.percentComplete
      return sb - sa
    })
    return rows
  }, [categoryMetrics])

  const categoriesDisplayed =
    categoryShowMode === 'top5'
      ? categoriesWithSignal.slice(0, 5)
      : categoriesWithSignal

  return (
    <div className="panel showcase-panel">
      <h2 className="panel-heading">Meeting the objectives</h2>
      <p className="panel-lead muted">
        Highlights driven by your current statuses in{' '}
        <button type="button" className="link-btn" onClick={onGoSections}>
          Sections
        </button>
        , the integration spine, your CSV catalog, and (optionally){' '}
        <button type="button" className="link-btn" onClick={onGoMastery}>
          Mastery
        </button>{' '}
        self-ratings (≥{SHOWCASE_SELF_RATED_MIN}% on both proficiency and %
        complete).
      </p>
      <SignalVsSelfRatedHint id="showcase-signal-hint" />

      <section className="showcase-block" aria-labelledby="showcase-spine">
        <h3 className="showcase-block-title" id="showcase-spine">
          Spine integrations satisfied
        </h3>
        <p className="panel-lead muted showcase-block-lead">
          Objectives met when every required category has active coverage (same
          rules as the Integrations tab).
        </p>
        {satisfiedIntegrations.length === 0 ? (
          <p className="empty-hint empty-block">
            None fully satisfied yet —{' '}
            <button type="button" className="link-btn" onClick={onGoIntegrations}>
              open Integrations
            </button>{' '}
            to see what is blocking.
          </p>
        ) : (
          <ul className="showcase-card-list">
            {satisfiedIntegrations.map((i) => (
              <li key={i.id}>
                <article className="integration-card ok showcase-card">
                  <div>
                    <strong>{i.title}</strong>
                    <p>{i.description}</p>
                  </div>
                  <span className="badge badge-ok">Objective met</span>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="showcase-block" aria-labelledby="showcase-signal">
        <h3 className="showcase-block-title" id="showcase-signal">
          Catalog categories with active signal
        </h3>
        <p className="panel-lead muted showcase-block-lead">
          Non-future section groups where at least one component has active
          coverage (excluding Planned / Not started only).{' '}
          <strong>{categoriesWithSignal.length}</strong> total
          {categoryShowMode === 'top5' && categoriesWithSignal.length > 5
            ? ` · showing top 5 by signal`
            : ''}
          .
        </p>
        {categoriesWithSignal.length > 5 ? (
          <div className="showcase-mode-toggle" role="group" aria-label="Category list length">
            <button
              type="button"
              className={`btn btn-sm ${categoryShowMode === 'top5' ? '' : 'btn-ghost'}`}
              onClick={() => setCategoryShowMode('top5')}
              aria-pressed={categoryShowMode === 'top5'}
            >
              Top 5 by signal
            </button>
            <button
              type="button"
              className={`btn btn-sm ${categoryShowMode === 'all' ? '' : 'btn-ghost'}`}
              onClick={() => setCategoryShowMode('all')}
              aria-pressed={categoryShowMode === 'all'}
            >
              Show all ({categoriesWithSignal.length})
            </button>
          </div>
        ) : null}
        {categoriesWithSignal.length === 0 ? (
          <p className="empty-hint empty-block">
            No categories with signal yet — adjust statuses in Sections.
          </p>
        ) : (
          <ul className="showcase-category-list">
            {categoriesDisplayed.map(({ group, signal, best }) => (
              <li key={group.id} className="showcase-category-row">
                <div className="showcase-category-main">
                  <span className="showcase-category-title">{group.title}</span>
                  <span className={`kind-pill ${KIND_CLASS[group.kind]}`}>
                    {KIND_LABEL[group.kind]}
                  </span>
                </div>
                <div className="showcase-category-meta">
                  <span
                    className="showcase-signal-badge"
                    title="Active components ÷ total in group"
                  >
                    {signal}% signal
                  </span>
                  <span className="showcase-best-status">
                    Best: {STATUS_LABELS[best]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="showcase-block" aria-labelledby="showcase-csv">
        <h3 className="showcase-block-title" id="showcase-csv">
          Active CSV projects (shipped / linkable)
        </h3>
        <p className="panel-lead muted showcase-block-lead">
          Rows in <code className="inline-code">{CSV_FILENAME}</code>{' '}
          marked <strong>active</strong> with an <code className="inline-code">http(s)</code>{' '}
          repository or location URL, a GitHub repo URL, or a bare{' '}
          <code className="inline-code">owner/repo</code> in the repository field.
        </p>
        {csvShippedActive.length === 0 ? (
          <p className="empty-hint empty-block">
            No active projects match the shipped / linkable rules yet.
          </p>
        ) : (
          <ul className="showcase-project-list">
            {csvShippedActive.map((p) => (
              <ShowcaseCsvProject key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>

      <section className="showcase-block" aria-labelledby="showcase-self">
        <h3 className="showcase-block-title" id="showcase-self">
          Self-rated mastery on track
        </h3>
        <p className="panel-lead muted showcase-block-lead">
          Categories where you rated both proficiency and % complete at or
          above {SHOWCASE_SELF_RATED_MIN}%.
        </p>
        {selfRatedStrong.length === 0 ? (
          <p className="empty-hint empty-block">
            None yet — add scores on the Mastery tab.
          </p>
        ) : (
          <ul className="showcase-mastery-list">
            {selfRatedStrong.map(({ group, proficiency, percentComplete }) => (
              <li key={group.id} className="showcase-mastery-row">
                <span className="showcase-mastery-name">{group.title}</span>
                <span className="showcase-mastery-vals">
                  {proficiency}% prof · {percentComplete}% complete
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ShowcaseCsvProject({ p }: { p: CatalogProject }) {
  const links = getCatalogProjectWebLinks(p)
  return (
    <li className="showcase-project-card">
      <div className="showcase-project-head">
        <strong className="showcase-project-name">{p.name}</strong>
        {p.location.trim() ? (
          <span className="showcase-project-bucket">{p.location.trim()}</span>
        ) : null}
      </div>
      {p.description.trim() ? (
        <p className="showcase-project-desc">{p.description.trim()}</p>
      ) : null}
      <div className="showcase-project-links">
        {links.repository ? (
          <a
            className="inline-link"
            href={links.repository.href}
            target="_blank"
            rel="noreferrer"
          >
            Repository
          </a>
        ) : null}
        {links.location ? (
          <a
            className="inline-link"
            href={links.location.href}
            target="_blank"
            rel="noreferrer"
          >
            Live / location
          </a>
        ) : null}
      </div>
    </li>
  )
}
