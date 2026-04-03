import { useMemo } from 'react'
import {
  groupsById,
  integrations,
  sectionGroups,
} from '../data/registry'
import { CSV_FILENAME } from '../data/csvMeta'
import { projectsCatalog } from '../data/projectsCatalog'
import { csvProjectLooksShipped } from '../lib/csvShipped'
import { STATUSES, masteryAverages, weakGroups } from '../lib/constants'
import type { IntegrationFocusHint } from '../lib/constants'
import type {
  CategorySelfMetrics,
  ComponentStatus,
} from '../types/lifeSystem'
import {
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  groupHasCoverage,
  groupSignalPercent,
  integrationSatisfied,
} from '../types/lifeSystem'
import { SignalVsSelfRatedHint } from './SignalVsSelfRatedHint'

export function OverviewPanel({
  stats,
  overrides,
  categoryMetrics,
  blockedCount,
  catalogFreshnessLabel,
  integrationFocus,
  onGoIntegrations,
  onGoGaps,
  onGoSections,
  onGoMastery,
  onGoShowcase,
  onGoSectionsCsv,
}: {
  stats: {
    total: number
    byStatus: Record<ComponentStatus, number>
    active: number
    integrationOk: number
  }
  overrides: Record<string, ComponentStatus | undefined>
  categoryMetrics: Record<string, CategorySelfMetrics>
  blockedCount: number
  catalogFreshnessLabel: string | null
  integrationFocus: IntegrationFocusHint | null
  onGoIntegrations: () => void
  onGoGaps: () => void
  onGoSections: () => void
  onGoMastery: () => void
  onGoShowcase: () => void
  onGoSectionsCsv: () => void
}) {
  const spineMetCount = useMemo(
    () =>
      integrations.filter((i) =>
        integrationSatisfied(i, groupsById, overrides),
      ).length,
    [overrides],
  )

  const categoriesSignalCount = useMemo(
    () =>
      sectionGroups.filter(
        (g) => g.kind !== 'future' && groupHasCoverage(g, overrides),
      ).length,
    [overrides],
  )

  const csvShippedCount = useMemo(
    () => projectsCatalog.filter((p) => csvProjectLooksShipped(p)).length,
    [],
  )

  const pct =
    stats.total > 0
      ? Math.round((stats.active / stats.total) * 100)
      : 0
  const intPct =
    integrations.length > 0
      ? Math.round((stats.integrationOk / integrations.length) * 100)
      : 0

  const weak = weakGroups(overrides)
  const {
    avgProficiency,
    avgPercentComplete,
    profCount,
    completeCount,
  } = useMemo(() => masteryAverages(categoryMetrics), [categoryMetrics])

  const avgSignalAcrossCategories = useMemo(() => {
    if (sectionGroups.length === 0) return 0
    const sum = sectionGroups.reduce(
      (acc, g) => acc + groupSignalPercent(g, overrides),
      0,
    )
    return Math.round(sum / sectionGroups.length)
  }, [overrides])

  const hasAnyMastery =
    profCount > 0 || completeCount > 0

  return (
    <div className="panel">
      <h2 className="panel-heading">System snapshot</h2>
      <p className="panel-lead">
        <strong>Active coverage</strong> counts components marked Implemented,
        External tool, Can do, or In progress — those feed your integration
        spine. Planned and Not started do not.
      </p>

      <h3 className="panel-subheading">Suggested first-time flow</h3>
      <ol className="getting-started-list">
        <li>
          <span className="getting-started-step" aria-hidden="true">
            1
          </span>
          <span>
            <button type="button" className="link-btn" onClick={onGoSections}>
              Sections
            </button>{' '}
            — Set component statuses so each category sends signal into the
            spine.
          </span>
        </li>
        <li>
          <span className="getting-started-step" aria-hidden="true">
            2
          </span>
          <span>
            <button type="button" className="link-btn" onClick={onGoIntegrations}>
              Integrations
            </button>{' '}
            — Confirm the four spine integrations are fed; fix any blocked
            requirements.
          </span>
        </li>
        <li>
          <span className="getting-started-step" aria-hidden="true">
            3
          </span>
          <span>
            <button type="button" className="link-btn" onClick={onGoShowcase}>
              Showcase
            </button>{' '}
            — See what already meets objectives (signal, links, self-ratings).
          </span>
        </li>
        <li>
          <span className="getting-started-step" aria-hidden="true">
            4
          </span>
          <span>
            Optional:{' '}
            <button type="button" className="link-btn" onClick={onGoMastery}>
              Mastery
            </button>{' '}
            for subjective proficiency / % complete;{' '}
            <button type="button" className="link-btn" onClick={onGoSectionsCsv}>
              CSV catalog only
            </button>{' '}
            in Sections for the imported project list.
          </span>
        </li>
      </ol>

      <div className="stats stats-primary">
        <div className="stat-card">
          <strong>{stats.total}</strong>
          <span>Total components</span>
        </div>
        <div className="stat-card stat-card-wide">
          <div className="stat-card-row">
            <strong>{pct}%</strong>
            <span className="stat-sub">active</span>
          </div>
          <span className="stat-label">Coverage</span>
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Percent of components with active coverage"
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="stat-card stat-card-wide">
          <div className="stat-card-row">
            <strong>
              {stats.integrationOk}/{integrations.length}
            </strong>
            <span className="stat-sub">ready</span>
          </div>
          <span className="stat-label">Spine integrations</span>
          <div
            className="progress-bar progress-bar-amber"
            role="progressbar"
            aria-valuenow={intPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Percent of integrations fully satisfied"
          >
            <div className="progress-fill" style={{ width: `${intPct}%` }} />
          </div>
        </div>
      </div>

      <h2 className="panel-heading panel-heading-spaced">
        Objectives at a glance
      </h2>
      <p className="panel-lead muted">
        The{' '}
        <button type="button" className="link-btn" onClick={onGoShowcase}>
          Showcase
        </button>{' '}
        tab pulls together what already meets your objectives: satisfied spine
        integrations (same rules as Integrations), catalog categories with active
        signal, active CSV projects that look shipped or linkable, and strong
        self-ratings from Mastery.
      </p>
      <div className="stats stats-mix showcase-overview-stats">
        <div className="stat-card stat-card-compact">
          <strong>
            {spineMetCount}/{integrations.length}
          </strong>
          <span>Spine objectives met</span>
        </div>
        <div className="stat-card stat-card-compact">
          <strong>{categoriesSignalCount}</strong>
          <span>Categories with signal</span>
        </div>
        <div className="stat-card stat-card-compact">
          <strong>{csvShippedCount}</strong>
          <span>Active CSV shipped</span>
        </div>
      </div>

      {integrationFocus ? (
        <div
          className="callout callout-info"
          role="region"
          aria-label="Suggested integration focus"
        >
          <p className="callout-title">Suggested integration focus</p>
          <p className="callout-focus-body">
            <strong>{integrationFocus.integrationTitle}</strong>
            {' — '}
            {integrationFocus.message}{' '}
            <button type="button" className="link-btn" onClick={onGoIntegrations}>
              Integrations
            </button>
            {' · '}
            <button type="button" className="link-btn" onClick={onGoSections}>
              Sections
            </button>
          </p>
        </div>
      ) : null}

      <h2 className="panel-heading panel-heading-spaced">Catalog mastery</h2>
      <p className="panel-lead muted">
        Self-rated <strong>proficiency</strong> and <strong>% complete</strong>{' '}
        per category (section group). <strong>Signal</strong> is derived from
        component statuses in Sections.
      </p>
      <SignalVsSelfRatedHint id="overview-signal-hint" />
      <div className="stats stats-mix mastery-overview-stats">
        <div className="stat-card stat-card-compact">
          <strong>
            {avgProficiency !== null ? `${avgProficiency}%` : '—'}
          </strong>
          <span>
            Avg proficiency
            {profCount > 0 ? ` (${profCount} set)` : ''}
          </span>
        </div>
        <div className="stat-card stat-card-compact">
          <strong>
            {avgPercentComplete !== null ? `${avgPercentComplete}%` : '—'}
          </strong>
          <span>
            Avg your % complete
            {completeCount > 0 ? ` (${completeCount} set)` : ''}
          </span>
        </div>
        <div className="stat-card stat-card-compact">
          <strong>{avgSignalAcrossCategories}%</strong>
          <span>Avg signal (all categories)</span>
        </div>
      </div>
      <p className="panel-lead muted catalog-hint">
        <button type="button" className="link-btn" onClick={onGoMastery}>
          Edit per category
        </button>
        <span className="catalog-hint-detail">
          {' '}
          · {sectionGroups.length} categories in the catalog
          {hasAnyMastery ? '' : ' — no scores saved yet'}
        </span>
      </p>

      <p className="panel-lead muted catalog-hint">
        <button type="button" className="link-btn" onClick={onGoSections}>
          Open Sections
        </button>
        <span className="catalog-hint-detail">
          {' '}
          · CSV exports appear as <strong>Projects (CSV catalog)</strong> (Life
          domain). Source:{' '}
          <code className="inline-code">{CSV_FILENAME}</code>
          {catalogFreshnessLabel
            ? ` · Latest row "Updated At" in bundle: ${catalogFreshnessLabel}`
            : ''}
        </span>
      </p>

      {(blockedCount > 0 || weak.length > 0) && (
        <div className="callout callout-warn" role="region" aria-label="Suggested next steps">
          <p className="callout-title">Suggested next steps</p>
          <ul className="callout-actions">
            {blockedCount > 0 ? (
              <li>
                <button type="button" className="link-btn" onClick={onGoIntegrations}>
                  See what's blocking ({blockedCount} integration
                  {blockedCount === 1 ? '' : 's'})
                </button>
              </li>
            ) : null}
            <li>
              <button type="button" className="link-btn" onClick={onGoSections}>
                Update statuses in Sections
              </button>
            </li>
            {weak.length > 0 ? (
              <li>
                <button type="button" className="link-btn" onClick={onGoGaps}>
                  Review {weak.length} quiet section group{weak.length === 1 ? '' : 's'}
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      )}

      <h2 className="panel-heading">Status mix</h2>
      <p className="panel-lead muted">
        Hover a status in <strong>Sections</strong> for a short definition.
      </p>
      <div className="stats stats-mix">
        {STATUSES.map((s) => (
          <div key={s} className="stat-card stat-card-compact" title={STATUS_DESCRIPTIONS[s]}>
            <strong>{stats.byStatus[s]}</strong>
            <span>{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      <h2 className="panel-heading">Integration spine</h2>
      <p className="panel-lead muted">
        Each card turns green when every required section group has active
        signal (same rule as Coverage above).
      </p>
      <div className="integration-cards">
        {integrations.map((i) => {
          const ok = integrationSatisfied(i, groupsById, overrides)
          return (
            <div
              key={i.id}
              className={`integration-card ${ok ? 'ok' : 'bad'}`}
            >
              <div>
                <strong>{i.title}</strong>
                <p>{i.description}</p>
              </div>
              <span className={`badge ${ok ? 'badge-ok' : 'badge-bad'}`}>
                {ok ? 'Ready' : 'Gaps'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
