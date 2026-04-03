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
import { CSV_FILENAME } from './data/csvMeta'
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
import { KIND_FILTER_CSV_ONLY, getFirstBlockedIntegrationFocus } from './lib/constants'
import type {
  ComponentStatus,
} from './types/lifeSystem'
import {
  integrationSatisfied,
} from './types/lifeSystem'
import { ImportBackupDialog } from './components/ImportBackupDialog'
import { OverviewPanel } from './components/OverviewPanel'
import { ShowcasePanel } from './components/ShowcasePanel'
import { MasteryPanel } from './components/MasteryPanel'
import { SectionsPanel } from './components/SectionsPanel'
import { IntegrationsPanel } from './components/IntegrationsPanel'
import { GapsPanel } from './components/GapsPanel'
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
      `Browse layers and domains — including Projects (CSV catalog) from ${CSV_FILENAME}.`,
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

export default App
