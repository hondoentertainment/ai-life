import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import {
  groupsById,
  integrations,
  sectionGroups,
} from './data/registry'
import { getCatalogCsvFreshnessLabel } from './data/catalogFreshness'
import { projectsCatalog } from './data/projectsCatalog'
import { useCoverageStore } from './hooks/useCoverageStore'
import {
  useThemePreference,
  type ThemePref,
} from './hooks/useThemePreference'
import type { ParsedBackup } from './lib/coverageBackup'
import {
  parseCoverageBackupJson,
  sanitizeImportedMetrics,
  sanitizeImportedOverrides,
} from './lib/coverageBackup'
import { IMPORT_UNDO_SESSION_KEY } from './lib/storageKeys'
import type { ImportMergeMode } from './lib/importMerge'
import {
  csvProjectLooksShipped,
  getCatalogProjectWebLinks,
} from './lib/csvShipped'
import type { CatalogProject } from './types/projectCatalog'
import type {
  CategorySelfMetrics,
  ComponentItem,
  ComponentStatus,
  SectionGroup,
  SectionKind,
} from './types/lifeSystem'
import {
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  bestGroupStatus,
  groupHasCoverage,
  groupSignalPercent,
  integrationSatisfied,
  isActiveCoverage,
  statusWeight,
} from './types/lifeSystem'
import { ImportBackupDialog } from './components/ImportBackupDialog'
import { applyImportMergePlan } from './lib/importMerge'
import { APP_VERSION, SCHEMA_VERSION } from './version'
import './App.css'

type Tab =
  | 'overview'
  | 'showcase'
  | 'mastery'
  | 'sections'
  | 'integrations'
  | 'gaps'

const KIND_SORT: SectionKind[] = ['layer', 'domain', 'addon', 'future']

const TABS: { id: Tab; label: string; description: string }[] = [
  {
    id: 'overview',
    label: 'Overview',
    description:
      'High-level counts, status mix, and whether your four spine integrations are fed.',
  },
  {
    id: 'showcase',
    label: 'Showcase',
    description:
      'What already meets the objectives: spine integrations, category signal, shipped CSV projects, strong self-ratings.',
  },
  {
    id: 'mastery',
    label: 'Mastery',
    description:
      'Your proficiency and how complete each catalog category feels — saved in this browser.',
  },
  {
    id: 'sections',
    label: 'Sections',
    description:
      'Browse layers and domains — including Projects (CSV catalog) from projects-2026-03-23.csv.',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description:
      'Checklists and matrix for Daily brief, Evening reflection, Weekly report, and Decision engine.',
  },
  {
    id: 'gaps',
    label: 'Gaps',
    description:
      'Quiet groups, blocked integrations, and backlog items to prioritize next.',
  },
]

const TAB_META_BY_ID = new Map(TABS.map((t) => [t.id, t]))

const KIND_CLASS: Record<SectionGroup['kind'], string> = {
  layer: 'kind-layer',
  domain: 'kind-domain',
  addon: 'kind-addon',
  future: 'kind-future',
}

const KIND_LABEL: Record<SectionGroup['kind'], string> = {
  layer: 'Core layer',
  domain: 'Life domain',
  addon: 'High-value add-on',
  future: 'Future',
}

const STATUSES = Object.keys(STATUS_LABELS) as ComponentStatus[]

const GITHUB_USER = 'hondoentertainment'

function githubRepoHref(repo: string): string {
  return `https://github.com/${GITHUB_USER}/${encodeURIComponent(repo)}`
}

const SHOWCASE_SELF_RATED_MIN = 70

/** Preset: only the CSV-backed project group. */
const KIND_FILTER_CSV_ONLY = '__csv__'

const CSV_SECTION_PREVIEW_ROWS = 30

const TAB_ORDER: Tab[] = [
  'overview',
  'sections',
  'mastery',
  'showcase',
  'integrations',
  'gaps',
]

const NAV_GROUPS: { label: string; tabs: Tab[] }[] = [
  { label: 'Track', tabs: ['overview', 'sections', 'mastery'] },
  { label: 'Analyze', tabs: ['showcase', 'integrations', 'gaps'] },
]

function SignalVsSelfRatedHint({ id }: { id?: string }) {
  const sid = id ?? 'signal-self-hint'
  return (
    <details className="ux-hint-details">
      <summary className="ux-hint-summary" id={sid}>
        What’s the difference between signal and my ratings?
      </summary>
      <div className="ux-hint-body">
        <p>
          <strong>Signal %</strong> is computed from your{' '}
          <strong>Sections</strong> data: the share of components in that
          category marked Implemented, External, Can do, or In progress. It
          reflects registered coverage, not how you feel about the area.
        </p>
        <p>
          <strong>Proficiency</strong> and <strong>your % complete</strong> on
          the <strong>Mastery</strong> tab are self-ratings (0–100) stored only
          in this browser. Use them for intent and momentum; they do not change
          signal.
        </p>
      </div>
    </details>
  )
}

function useStats(overrides: Record<string, ComponentStatus | undefined>) {
  return useMemo(() => {
    let total = 0
    const byStatus: Record<ComponentStatus, number> = {
      implemented: 0,
      external: 0,
      can_do: 0,
      in_progress: 0,
      planned: 0,
      not_started: 0,
    }
    for (const g of sectionGroups) {
      for (const c of g.components) {
        total++
        const s = overrides[c.id] ?? c.defaultStatus
        byStatus[s]++
      }
    }
    const active = [
      byStatus.implemented,
      byStatus.external,
      byStatus.can_do,
      byStatus.in_progress,
    ].reduce((a, b) => a + b, 0)
    const integrationOk = integrations.filter((i) =>
      integrationSatisfied(i, groupsById, overrides),
    ).length
    return { total, byStatus, active, integrationOk }
  }, [overrides])
}

function weakGroups(
  overrides: Record<string, ComponentStatus | undefined>,
): SectionGroup[] {
  return sectionGroups.filter(
    (g) => g.kind !== 'future' && !groupHasCoverage(g, overrides),
  )
}

type IntegrationFocusHint = {
  integrationTitle: string
  message: string
}

function getFirstBlockedIntegrationFocus(
  overrides: Record<string, ComponentStatus | undefined>,
): IntegrationFocusHint | null {
  const blocked = integrations.filter(
    (i) => !integrationSatisfied(i, groupsById, overrides),
  )
  const i = blocked[0]
  if (!i) return null
  for (const gid of i.requiredGroupIds) {
    const g = groupsById.get(gid)
    if (!g || !groupHasCoverage(g, overrides)) {
      return {
        integrationTitle: i.title,
        message: `No active coverage in “${g?.title ?? gid}” (required).`,
      }
    }
  }
  if (i.requiredOneOfGroups) {
    for (const orSet of i.requiredOneOfGroups) {
      const ok = orSet.some((gid) => {
        const g = groupsById.get(gid)
        return g ? groupHasCoverage(g, overrides) : false
      })
      if (!ok) {
        const labels = orSet
          .map((gid) => groupsById.get(gid)?.title ?? gid)
          .join(', ')
        return {
          integrationTitle: i.title,
          message: `Need active coverage in at least one of: ${labels}.`,
        }
      }
    }
  }
  return null
}

function readTabFromUrl(): Tab {
  if (typeof window === 'undefined') return 'overview'
  try {
    const q = new URLSearchParams(window.location.search).get('tab')
    if (q && TAB_META_BY_ID.has(q as Tab)) return q as Tab
  } catch {
    /* ignore */
  }
  return 'overview'
}

function syncTabToUrl(t: Tab) {
  const url = new URL(window.location.href)
  if (t === 'overview') url.searchParams.delete('tab')
  else url.searchParams.set('tab', t)
  const qs = url.searchParams.toString()
  const next =
    url.pathname + (qs ? `?${qs}` : '') + (url.hash || '')
  const cur = window.location.pathname + window.location.search + window.location.hash
  if (next !== cur) window.history.replaceState(null, '', next)
}

function countActiveComponentsInGroup(
  g: SectionGroup,
  overrides: Record<string, ComponentStatus | undefined>,
): number {
  return g.components.filter((c) =>
    isActiveCoverage(overrides[c.id] ?? c.defaultStatus),
  ).length
}

function statusToneClass(s: ComponentStatus): string {
  if (
    s === 'implemented' ||
    s === 'external' ||
    s === 'can_do' ||
    s === 'in_progress'
  ) {
    return 'tone-active'
  }
  if (s === 'planned') return 'tone-planned'
  return 'tone-quiet'
}

function App() {
  const [tab, setTabState] = useState<Tab>(() => readTabFromUrl())
  const [kindFilter, setKindFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const {
    overrides,
    categoryMetrics,
    setStatus,
    clearOverride,
    setCategoryMetric,
    resetAll,
    importBackup,
  } = useCoverageStore()
  const { pref: themePref, setPref: setThemePref } = useThemePreference()
  const importInputRef = useRef<HTMLInputElement>(null)
  const importJsonButtonRef = useRef<HTMLButtonElement>(null)
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null)
  const [hasImportUndo, setHasImportUndo] = useState(() => {
    try {
      return !!sessionStorage.getItem(IMPORT_UNDO_SESSION_KEY)
    } catch {
      return false
    }
  })
  const stats = useStats(overrides)

  const setTab = useCallback((t: Tab) => {
    setTabState(t)
  }, [])

  useEffect(() => {
    syncTabToUrl(tab)
  }, [tab])

  useEffect(() => {
    const onPop = () => setTabState(readTabFromUrl())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const onImportFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (!f) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : ''
        const parsed = parseCoverageBackupJson(text)
        if (!parsed.ok) {
          setImportNotice(`Import failed: ${parsed.error}`)
          window.setTimeout(() => setImportNotice(null), 7000)
          return
        }
        setPendingImport(parsed.data)
      }
      reader.onerror = () => {
        setImportNotice('Could not read that file.')
        window.setTimeout(() => setImportNotice(null), 5000)
      }
      reader.readAsText(f)
    },
    [],
  )

  const confirmImport = useCallback(
    (mode: ImportMergeMode) => {
      if (!pendingImport) return
      const snap = pendingImport
      try {
        sessionStorage.setItem(
          IMPORT_UNDO_SESSION_KEY,
          JSON.stringify({ overrides, categoryMetrics }),
        )
        setHasImportUndo(true)
      } catch {
        /* ignore quota / private mode */
      }
      const next = applyImportMergePlan(
        mode,
        { overrides, categoryMetrics },
        {
          overrides: snap.overrides,
          categoryMetrics: snap.categoryMetrics,
        },
      )
      importBackup(next)
      setPendingImport(null)
      const extra = snap.exportedAt ? ` (${snap.exportedAt})` : ''
      setImportNotice(`Imported backup${extra}.`)
      window.setTimeout(() => setImportNotice(null), 5000)
    },
    [pendingImport, overrides, categoryMetrics, importBackup],
  )

  const undoLastImport = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(IMPORT_UNDO_SESSION_KEY)
      if (!raw) {
        setHasImportUndo(false)
        return
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>
      importBackup({
        overrides: sanitizeImportedOverrides(parsed.overrides),
        categoryMetrics: sanitizeImportedMetrics(parsed.categoryMetrics),
      })
      sessionStorage.removeItem(IMPORT_UNDO_SESSION_KEY)
      setHasImportUndo(false)
      setImportNotice('Restored state before last import.')
      window.setTimeout(() => setImportNotice(null), 5000)
    } catch {
      setImportNotice('Could not undo import.')
      window.setTimeout(() => setImportNotice(null), 5000)
    }
  }, [importBackup])

  const integrationFocus = useMemo(
    () => getFirstBlockedIntegrationFocus(overrides),
    [overrides],
  )
  const catalogFreshnessLabel = useMemo(
    () => getCatalogCsvFreshnessLabel(),
    [],
  )

  const tabIds = TAB_ORDER
  const activeTabMeta = TAB_META_BY_ID.get(tab)!

  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [copyToast, setCopyToast] = useState<{
    text: string
    seq: number
  } | null>(null)
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveEffectSkipRef = useRef(true)

  useEffect(() => {
    if (saveEffectSkipRef.current) {
      saveEffectSkipRef.current = false
      return
    }
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(() => {
      setSaveNotice('Saved in this browser (statuses & mastery).')
      saveDebounceRef.current = null
    }, 450)
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    }
  }, [overrides, categoryMetrics])

  useEffect(() => {
    if (!copyToast) return
    const id = window.setTimeout(() => setCopyToast(null), 2000)
    return () => window.clearTimeout(id)
  }, [copyToast])

  const onTabKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      const i = tabIds.indexOf(tab)
      if (i < 0) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setTab(tabIds[(i + 1) % tabIds.length])
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setTab(tabIds[(i - 1 + tabIds.length) % tabIds.length])
      } else if (e.key === 'Home') {
        e.preventDefault()
        setTab(tabIds[0])
      } else if (e.key === 'End') {
        e.preventDefault()
        setTab(tabIds[tabIds.length - 1])
      }
    },
    [tab, tabIds, setTab],
  )

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sectionGroups.filter((g) => {
      if (kindFilter === KIND_FILTER_CSV_ONLY) {
        if (g.id !== 'csv-projects') return false
      } else if (kindFilter !== 'all' && g.kind !== kindFilter) {
        return false
      }
      if (!q) return true
      if (g.title.toLowerCase().includes(q)) return true
      return g.components.some((c) => {
        if (c.label.toLowerCase().includes(q)) return true
        if (c.tool?.toLowerCase().includes(q)) return true
        if (c.repo?.toLowerCase().includes(q)) return true
        if (c.repoUrl?.toLowerCase().includes(q)) return true
        if (c.locationUrl?.toLowerCase().includes(q)) return true
        if (c.notes?.toLowerCase().includes(q)) return true
        return false
      })
    })
  }, [kindFilter, search])

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      overrides,
      categoryMetrics,
      registryVersion: 3,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ai-life-coverage.json'
    a.click()
    URL.revokeObjectURL(a.href)
    setExportNotice('Export started — check your downloads for ai-life-coverage.json.')
    window.setTimeout(() => setExportNotice(null), 5000)
  }

  const blockedCount =
    integrations.length -
    integrations.filter((i) => integrationSatisfied(i, groupsById, overrides))
      .length

  const headerBanner = useMemo(() => {
    if (importNotice) {
      const err =
        importNotice.startsWith('Import failed') ||
        importNotice.startsWith('Could not read')
      return {
        text: importNotice,
        tone: err ? ('error' as const) : ('success' as const),
      }
    }
    if (exportNotice) return { text: exportNotice, tone: 'info' as const }
    if (saveNotice) return { text: saveNotice, tone: 'info' as const }
    return null
  }, [importNotice, exportNotice, saveNotice])

  const copyTabLink = useCallback(async () => {
    try {
      const url = new URL(window.location.href)
      if (tab === 'overview') url.searchParams.delete('tab')
      else url.searchParams.set('tab', tab)
      await navigator.clipboard.writeText(url.toString())
      setCopyToast((prev) => ({
        text: 'Tab link copied to clipboard.',
        seq: (prev?.seq ?? 0) + 1,
      }))
    } catch {
      setImportNotice('Could not copy link (clipboard blocked).')
      window.setTimeout(() => setImportNotice(null), 5000)
    }
  }, [tab])

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1 className="app-title">
              AI Life <span>Coverage</span>
            </h1>
            <p className="app-sub">
              Track every subsystem and whether your integration spine (daily
              brief, reflections, reports, decisions) has real signal from each
              area.
            </p>
          </div>
          <div className="header-actions">
            {headerBanner ? (
              <p
                className={`header-status header-status-${headerBanner.tone}`}
                role="status"
                aria-live={headerBanner.tone === 'error' ? 'assertive' : 'polite'}
                aria-atomic="true"
              >
                {headerBanner.text}
              </p>
            ) : null}
            <label className="field field-inline theme-field">
              <span className="field-label visually-hidden">Theme</span>
              <select
                value={themePref}
                onChange={(e) =>
                  setThemePref(e.target.value as ThemePref)
                }
                aria-label="Color theme"
              >
                <option value="system">System theme</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              tabIndex={-1}
              onChange={onImportFile}
              aria-hidden="true"
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={copyTabLink}
              title="Copy URL including the current tab (?tab=…)"
            >
              Copy tab link
            </button>
            {hasImportUndo ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={undoLastImport}
              >
                Undo last import
              </button>
            ) : null}
            <button
              ref={importJsonButtonRef}
              type="button"
              className="btn btn-ghost"
              data-testid="import-json-button"
              onClick={() => importInputRef.current?.click()}
            >
              Import JSON
            </button>
            <button type="button" className="btn btn-ghost" onClick={exportJson}>
              Export JSON
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (
                  window.confirm(
                    'Reset all status overrides and category mastery (proficiency / % complete) in this browser?',
                  )
                ) {
                  resetAll()
                }
              }}
              aria-describedby="reset-help"
            >
              Reset overrides
            </button>
            <span id="reset-help" className="visually-hidden">
              Clears overrides and mastery scores in local storage; does not
              delete the app.
            </span>
          </div>
        </div>
        <div className="nav-tabs-wrap">
          {NAV_GROUPS.map((row) => (
            <div key={row.label} className="nav-tabs-row">
              <span className="nav-tabs-group-label">{row.label}</span>
              <div
                className="nav-tabs-scroll"
                role="tablist"
                aria-label={`${row.label} views`}
                aria-orientation="horizontal"
              >
                {row.tabs.map((id) => {
                  const meta = TAB_META_BY_ID.get(id)!
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      id={`tab-${id}`}
                      aria-selected={tab === id}
                      aria-controls="main-content"
                      tabIndex={tab === id ? 0 : -1}
                      onClick={() => setTab(id)}
                      onKeyDown={onTabKeyDown}
                    >
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="tab-context" role="status" aria-live="polite">
          {activeTabMeta.description}
        </p>
      </header>

      <main
        id="main-content"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={-1}
      >
        {tab === 'overview' && (
          <OverviewPanel
            stats={stats}
            overrides={overrides}
            categoryMetrics={categoryMetrics}
            blockedCount={blockedCount}
            catalogFreshnessLabel={catalogFreshnessLabel}
            integrationFocus={integrationFocus}
            onGoIntegrations={() => setTab('integrations')}
            onGoGaps={() => setTab('gaps')}
            onGoSections={() => setTab('sections')}
            onGoMastery={() => setTab('mastery')}
            onGoShowcase={() => setTab('showcase')}
            onGoSectionsCsv={() => {
              setKindFilter(KIND_FILTER_CSV_ONLY)
              setSearch('')
              setTab('sections')
            }}
          />
        )}
        {tab === 'showcase' && (
          <ShowcasePanel
            overrides={overrides}
            categoryMetrics={categoryMetrics}
            onGoSections={() => setTab('sections')}
            onGoIntegrations={() => setTab('integrations')}
            onGoMastery={() => setTab('mastery')}
          />
        )}
        {tab === 'mastery' && (
          <MasteryPanel
            overrides={overrides}
            categoryMetrics={categoryMetrics}
            setCategoryMetric={setCategoryMetric}
          />
        )}
        {tab === 'sections' && (
          <SectionsPanel
            key={kindFilter}
            groups={filteredGroups}
            overrides={overrides}
            setStatus={setStatus}
            clearOverride={clearOverride}
            kindFilter={kindFilter}
            setKindFilter={setKindFilter}
            search={search}
            setSearch={setSearch}
            catalogFreshnessLabel={catalogFreshnessLabel}
          />
        )}
        {tab === 'integrations' && (
          <IntegrationsPanel overrides={overrides} />
        )}
        {tab === 'gaps' && (
          <GapsPanel
            overrides={overrides}
            onGoSections={() => setTab('sections')}
            onGoIntegrations={() => setTab('integrations')}
          />
        )}
      </main>

      {pendingImport ? (
        <ImportBackupDialog
          backup={pendingImport}
          currentOverrides={overrides}
          currentCategoryMetrics={categoryMetrics}
          returnFocusRef={importJsonButtonRef}
          onDismiss={() => setPendingImport(null)}
          onApply={confirmImport}
        />
      ) : null}

      {copyToast ? (
        <div
          className="copy-toast"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {copyToast.text}
        </div>
      ) : null}
    </div>
  )
}

function ShowcasePanel({
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
          Rows in <code className="inline-code">projects-2026-03-23.csv</code>{' '}
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

function clampPctInput(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

function masteryAverages(categoryMetrics: Record<string, CategorySelfMetrics>) {
  let pSum = 0
  let pN = 0
  let cSum = 0
  let cN = 0
  for (const m of Object.values(categoryMetrics)) {
    if (typeof m.proficiency === 'number') {
      pSum += m.proficiency
      pN++
    }
    if (typeof m.percentComplete === 'number') {
      cSum += m.percentComplete
      cN++
    }
  }
  return {
    avgProficiency: pN > 0 ? Math.round(pSum / pN) : null,
    avgPercentComplete: cN > 0 ? Math.round(cSum / cN) : null,
    profCount: pN,
    completeCount: cN,
  }
}

function MasteryPanel({
  overrides,
  categoryMetrics,
  setCategoryMetric,
}: {
  overrides: Record<string, ComponentStatus | undefined>
  categoryMetrics: Record<string, CategorySelfMetrics>
  setCategoryMetric: (
    groupId: string,
    field: 'proficiency' | 'percentComplete',
    value: number | undefined,
  ) => void
}) {
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<string>('all')

  const sortedGroups = useMemo(() => {
    return [...sectionGroups].sort((a, b) => {
      const ia = KIND_SORT.indexOf(a.kind)
      const ib = KIND_SORT.indexOf(b.kind)
      if (ia !== ib) return ia - ib
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sortedGroups.filter((g) => {
      if (kindFilter !== 'all' && g.kind !== kindFilter) return false
      if (!q) return true
      if (g.title.toLowerCase().includes(q)) return true
      if (g.description?.toLowerCase().includes(q)) return true
      if (KIND_LABEL[g.kind].toLowerCase().includes(q)) return true
      return false
    })
  }, [sortedGroups, kindFilter, search])

  return (
    <div className="panel">
      <h2 className="panel-heading">Category mastery</h2>
      <p className="panel-lead muted">
        Rate each catalog category (0–100). Leave a field empty to leave it
        unset. <strong>Signal %</strong> is computed from how many components
        in that group have active coverage in Sections.
      </p>
      <SignalVsSelfRatedHint id="mastery-signal-hint" />

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
          </select>
        </label>
        <label className="field field-grow">
          <span className="field-label">Search</span>
          <input
            type="search"
            placeholder="Category title or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search categories"
          />
        </label>
      </div>

      <p className="results-line" aria-live="polite">
        Showing <strong>{filtered.length}</strong> of {sectionGroups.length}{' '}
        categories
        {search.trim() ? ` matching “${search.trim()}”` : ''}
      </p>

      {filtered.length === 0 ? (
        <p className="empty-hint empty-block">
          Nothing matches. Try clearing search or choosing “All kinds”.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="comp-table mastery-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Kind</th>
                <th scope="col">Your proficiency</th>
                <th scope="col">Your % complete</th>
                <th scope="col">Signal %</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const m = categoryMetrics[g.id] ?? {}
                const signal = groupSignalPercent(g, overrides)
                return (
                  <tr key={g.id}>
                    <th scope="row" className="comp-name mastery-cat-cell">
                      <span className="mastery-cat-title">{g.title}</span>
                      {g.description ? (
                        <span className="mastery-cat-desc">{g.description}</span>
                      ) : null}
                    </th>
                    <td>
                      <span className={`kind-pill ${KIND_CLASS[g.kind]}`}>
                        {KIND_LABEL[g.kind]}
                      </span>
                    </td>
                    <td className="mastery-input-cell mastery-metric-cell">
                      <label
                        className="mastery-visible-label"
                        htmlFor={`m-prof-${g.id}`}
                      >
                        Proficiency (0–100)
                      </label>
                      <input
                        type="range"
                        id={`m-prof-${g.id}`}
                        className="mastery-range"
                        min={0}
                        max={100}
                        value={m.proficiency ?? 0}
                        onChange={(e) => {
                          setCategoryMetric(
                            g.id,
                            'proficiency',
                            clampPctInput(Number(e.target.value)),
                          )
                        }}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={m.proficiency ?? 0}
                        aria-valuetext={`${m.proficiency ?? 0} percent proficiency`}
                      />
                      <div className="mastery-num-row">
                        <input
                          type="number"
                          className="mastery-num"
                          min={0}
                          max={100}
                          step={1}
                          value={m.proficiency ?? ''}
                          onChange={(e) => {
                            const t = e.target.value.trim()
                            if (t === '') {
                              setCategoryMetric(g.id, 'proficiency', undefined)
                              return
                            }
                            const n = Number.parseInt(t, 10)
                            if (Number.isNaN(n)) return
                            setCategoryMetric(
                              g.id,
                              'proficiency',
                              clampPctInput(n),
                            )
                          }}
                          aria-label={`Proficiency number for ${g.title}`}
                          placeholder="—"
                        />
                        <span className="mastery-unit">%</span>
                        {m.proficiency !== undefined ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs mastery-clear"
                            onClick={() =>
                              setCategoryMetric(g.id, 'proficiency', undefined)
                            }
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="mastery-input-cell mastery-metric-cell">
                      <label
                        className="mastery-visible-label"
                        htmlFor={`m-comp-${g.id}`}
                      >
                        Your % complete (0–100)
                      </label>
                      <input
                        type="range"
                        id={`m-comp-${g.id}`}
                        className="mastery-range"
                        min={0}
                        max={100}
                        value={m.percentComplete ?? 0}
                        onChange={(e) => {
                          setCategoryMetric(
                            g.id,
                            'percentComplete',
                            clampPctInput(Number(e.target.value)),
                          )
                        }}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={m.percentComplete ?? 0}
                        aria-valuetext={`${m.percentComplete ?? 0} percent complete`}
                      />
                      <div className="mastery-num-row">
                        <input
                          type="number"
                          className="mastery-num"
                          min={0}
                          max={100}
                          step={1}
                          value={m.percentComplete ?? ''}
                          onChange={(e) => {
                            const t = e.target.value.trim()
                            if (t === '') {
                              setCategoryMetric(
                                g.id,
                                'percentComplete',
                                undefined,
                              )
                              return
                            }
                            const n = Number.parseInt(t, 10)
                            if (Number.isNaN(n)) return
                            setCategoryMetric(
                              g.id,
                              'percentComplete',
                              clampPctInput(n),
                            )
                          }}
                          aria-label={`Percent complete number for ${g.title}`}
                          placeholder="—"
                        />
                        <span className="mastery-unit">%</span>
                        {m.percentComplete !== undefined ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs mastery-clear"
                            onClick={() =>
                              setCategoryMetric(
                                g.id,
                                'percentComplete',
                                undefined,
                              )
                            }
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="mastery-signal-cell">
                      <div className="mastery-signal-row">
                        <span className="mastery-signal-val">{signal}%</span>
                        <div
                          className="progress-bar mastery-signal-bar"
                          role="presentation"
                        >
                          <div
                            className="progress-fill"
                            style={{ width: `${signal}%` }}
                          />
                        </div>
                      </div>
                      <span className="mastery-signal-hint">
                        {g.components.length} component
                        {g.components.length === 1 ? '' : 's'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OverviewPanel({
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
  stats: ReturnType<typeof useStats>
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
          <code className="inline-code">projects-2026-03-23.csv</code>
          {catalogFreshnessLabel
            ? ` · Latest row “Updated At” in bundle: ${catalogFreshnessLabel}`
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
                  See what’s blocking ({blockedCount} integration
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

function SectionsPanel({
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
          ? ` CSV catalog rows: latest “Updated At” in this bundle is ${catalogFreshnessLabel}.`
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
        {search.trim() ? ` matching “${search.trim()}”` : ''}
      </p>

      {groups.length === 0 ? (
        <p className="empty-hint empty-block">
          Nothing matches this filter. Try clearing search, choosing “All kinds”,
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

function IntegrationsPanel({
  overrides,
}: {
  overrides: Record<string, ComponentStatus | undefined>
}) {
  return (
    <div className="panel">
      <h2 className="panel-heading">Integration requirements</h2>
      <p className="panel-lead muted">
        Required groups must all have active coverage. “At least one of” rows
        mean any single listed group is enough (for example, any health slice).
      </p>
      <div className="integration-cards">
        {integrations.map((i) => {
          const ok = integrationSatisfied(i, groupsById, overrides)
          return (
            <article
              key={i.id}
              className={`integration-card ${ok ? 'ok' : 'bad'}`}
            >
              <div className="integration-card-head">
                <div>
                  <strong>{i.title}</strong>
                  <p>{i.description}</p>
                </div>
                <span className={`badge ${ok ? 'badge-ok' : 'badge-bad'}`}>
                  {ok ? 'Satisfied' : 'Blocked'}
                </span>
              </div>
              <ul className="req-list">
                {i.requiredGroupIds.map((gid) => {
                  const g = groupsById.get(gid)
                  const cov = g
                    ? groupHasCoverage(g, overrides)
                    : false
                  const best = g ? bestGroupStatus(g, overrides) : undefined
                  return (
                    <li key={gid} className={cov ? 'req-ok' : 'req-bad'}>
                      <span className="req-icon" aria-hidden="true">
                        {cov ? '✓' : '✗'}
                      </span>
                      <span className="req-body">
                        <span className="sr-only">
                          {cov ? 'Satisfied: ' : 'Missing: '}
                        </span>
                        <span className="req-label">Required — </span>
                        {g?.title ?? gid}
                        {best ? (
                          <span className="req-detail">
                            {' '}
                            · best in group: {STATUS_LABELS[best]}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  )
                })}
                {i.requiredOneOfGroups?.map((orSet, idx) => {
                  const sat = orSet.some((gid) => {
                    const g = groupsById.get(gid)
                    return g ? groupHasCoverage(g, overrides) : false
                  })
                  const labels = orSet
                    .map((gid) => groupsById.get(gid)?.title ?? gid)
                    .join(', ')
                  return (
                    <li key={`or-${idx}`} className={sat ? 'req-ok' : 'req-bad'}>
                      <span className="req-icon" aria-hidden="true">
                        {sat ? '✓' : '✗'}
                      </span>
                      <span className="req-body">
                        <span className="sr-only">
                          {sat ? 'Satisfied: ' : 'Not satisfied: '}
                        </span>
                        <span className="req-label">At least one of — </span>
                        {labels}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </div>

      <h2 className="panel-heading panel-heading-spaced">Coverage matrix</h2>
      <p className="panel-lead muted">
        Scroll horizontally on small screens. Symbols are explained in the
        legend below.
      </p>
      <MatrixTable overrides={overrides} />
    </div>
  )
}

function MatrixTable({
  overrides,
}: {
  overrides: Record<string, ComponentStatus | undefined>
}) {
  const cols = useMemo(() => {
    const s = new Set<string>()
    for (const i of integrations) {
      i.requiredGroupIds.forEach((id) => s.add(id))
      i.requiredOneOfGroups?.forEach((arr) => arr.forEach((id) => s.add(id)))
    }
    return [...s].sort((a, b) => {
      const ta = groupsById.get(a)?.title ?? a
      const tb = groupsById.get(b)?.title ?? b
      return ta.localeCompare(tb)
    })
  }, [])

  return (
    <div className="matrix-block">
      <p className="matrix-narrow-hint">
        On a small screen, scroll sideways; the integration name column stays
        pinned.
      </p>
      <div className="matrix-wrap matrix-wrap-sticky">
        <table className="matrix">
          <caption className="matrix-caption">
            Integration spine vs section groups (active coverage only)
          </caption>
          <thead>
            <tr>
              <th scope="col">Integration</th>
              {cols.map((c) => (
                <th key={c} scope="col" title={groupsById.get(c)?.title ?? c}>
                  <span className="matrix-th-text">
                    {groupsById.get(c)?.title ?? c}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {integrations.map((i) => (
              <tr key={i.id}>
                <th scope="row">{i.title}</th>
                {cols.map((gid) => {
                  const inRequired = i.requiredGroupIds.includes(gid)
                  const inOr = i.requiredOneOfGroups?.some((a) =>
                    a.includes(gid),
                  )
                  if (!inRequired && !inOr) {
                    return (
                      <td key={gid} className="cell-na">
                        <span aria-label="Not applicable">—</span>
                      </td>
                    )
                  }
                  const g = groupsById.get(gid)
                  const cov = g ? groupHasCoverage(g, overrides) : false
                  const cls = cov ? 'cell-ok' : 'cell-no'
                  const mark = inRequired ? (cov ? '●' : '○') : cov ? '◐' : '○'
                  const kind = inRequired ? 'Required' : 'Optional (OR set)'
                  const state = cov ? 'Active coverage' : 'No active coverage'
                  return (
                    <td
                      key={gid}
                      className={cls}
                      title={`${kind}. ${state}.`}
                    >
                      <span aria-label={`${kind}, ${state}`}>{mark}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="matrix-legend">
        <li>
          <span className="legend-sym" aria-hidden="true">
            ●
          </span>
          Required group, has coverage
        </li>
        <li>
          <span className="legend-sym" aria-hidden="true">
            ○
          </span>
          Required group, still missing coverage
        </li>
        <li>
          <span className="legend-sym" aria-hidden="true">
            ◐
          </span>
          Part of an “at least one” set; this group has coverage (others in the
          set may or may not)
        </li>
        <li>
          <span className="legend-sym muted" aria-hidden="true">
            —
          </span>
          Not used by that integration
        </li>
      </ul>
    </div>
  )
}

function GapsPanel({
  overrides,
  onGoSections,
  onGoIntegrations,
}: {
  overrides: Record<string, ComponentStatus | undefined>
  onGoSections: () => void
  onGoIntegrations: () => void
}) {
  const weak = weakGroups(overrides)
  const noSignal = useMemo(() => {
    const rows: { group: SectionGroup; comp: ComponentItem }[] = []
    for (const g of sectionGroups) {
      if (g.kind === 'future') continue
      for (const c of g.components) {
        const s = overrides[c.id] ?? c.defaultStatus
        if (s === 'not_started' || s === 'planned') {
          rows.push({ group: g, comp: c })
        }
      }
    }
    rows.sort(
      (a, b) =>
        statusWeight(overrides[a.comp.id] ?? a.comp.defaultStatus) -
        statusWeight(overrides[b.comp.id] ?? b.comp.defaultStatus),
    )
    return rows
  }, [overrides])

  const blocked = integrations.filter(
    (i) => !integrationSatisfied(i, groupsById, overrides),
  )

  return (
    <div className="panel">
      <div className="jump-bar">
        <span className="jump-label">Jump to</span>
        <a href="#gaps-quiet" className="jump-link">
          Quiet groups
        </a>
        <a href="#gaps-integrations" className="jump-link">
          Blocked integrations
        </a>
        <a href="#gaps-backlog" className="jump-link">
          Backlog items
        </a>
      </div>

      <h2 className="panel-heading" id="gaps-quiet">
        Section groups with no active coverage
      </h2>
      <p className="panel-lead muted">
        A group is quiet when every component is only Planned or Not started.
        Improving these gives your briefs and reports more to work with.
      </p>
      {weak.length === 0 ? (
        <p className="empty-hint empty-block positive">
          Every life-area group has at least one active component.
        </p>
      ) : (
        <ul className="gap-list">
          {weak.map((g) => (
            <li key={g.id}>
              <strong>{g.title}</strong> — add a tool, mark something in
              progress, or promote a “can do” item in{' '}
              <button type="button" className="link-btn" onClick={onGoSections}>
                Sections
              </button>
              .
            </li>
          ))}
        </ul>
      )}

      <h2 className="panel-heading panel-heading-spaced" id="gaps-integrations">
        Integration blockers
      </h2>
      {blocked.length === 0 ? (
        <p className="empty-hint empty-block positive">
          All spine integrations are satisfied.
        </p>
      ) : (
        <ul className="gap-list">
          {blocked.map((i) => (
            <li key={i.id}>
              <strong>{i.title}</strong> — open{' '}
              <button
                type="button"
                className="link-btn"
                onClick={onGoIntegrations}
              >
                Integrations
              </button>{' '}
              for the checklist, then adjust statuses in Sections.
            </li>
          ))}
        </ul>
      )}

      <h2 className="panel-heading panel-heading-spaced" id="gaps-backlog">
        Components still planned or not started
      </h2>
      <p className="panel-lead muted">
        Weakest statuses first. Use Sections search to find a specific line.
      </p>
      {noSignal.length === 0 ? (
        <p className="empty-hint empty-block positive">Nothing in the backlog.</p>
      ) : (
        <ul className="gap-list gap-list-dense">
          {noSignal.slice(0, 40).map(({ group, comp }) => {
            const s: ComponentStatus = overrides[comp.id] ?? comp.defaultStatus
            return (
              <li key={comp.id}>
                <span className="gap-group">{group.title}</span>
                <span className="gap-sep">·</span>
                <span>{comp.label}</span>
                <span className="gap-status">{STATUS_LABELS[s]}</span>
              </li>
            )
          })}
        </ul>
      )}
      {noSignal.length > 40 ? (
        <p className="empty-hint">
          +{noSignal.length - 40} more — narrow with Search on the Sections tab.
        </p>
      ) : null}

      <details className="ux-hint-details gaps-registry-note">
        <summary className="ux-hint-summary">Registry maintenance</summary>
        <div className="ux-hint-body">
          <p>
            When you change <code className="inline-code">registry.ts</code> or
            the CSV import, review quiet groups and duplicate or stale components
            so Showcase and Integrations stay trustworthy.
          </p>
        </div>
      </details>
    </div>
  )
}

export default App
