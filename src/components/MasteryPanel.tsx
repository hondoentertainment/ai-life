import { useMemo, useState } from 'react'
import { sectionGroups } from '../data/registry'
import { KIND_CLASS, KIND_LABEL, KIND_SORT, clampPctInput } from '../lib/constants'
import type {
  CategorySelfMetrics,
  ComponentStatus,
} from '../types/lifeSystem'
import {
  groupSignalPercent,
} from '../types/lifeSystem'
import { SignalVsSelfRatedHint } from './SignalVsSelfRatedHint'

export function MasteryPanel({
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
        {search.trim() ? ` matching "${search.trim()}"` : ''}
      </p>

      {filtered.length === 0 ? (
        <p className="empty-hint empty-block">
          Nothing matches. Try clearing search or choosing "All kinds".
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
