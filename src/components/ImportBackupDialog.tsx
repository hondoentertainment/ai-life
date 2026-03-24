import { useEffect, useRef, type RefObject } from 'react'
import type { ParsedBackup } from '../lib/coverageBackup'
import type { ImportMergeMode } from '../lib/importMerge'
import { SCHEMA_VERSION } from '../version'
import type { CategorySelfMetrics, ComponentStatus } from '../types/lifeSystem'

function countStatusImportPreview(
  imported: Record<string, ComponentStatus>,
  current: Record<string, ComponentStatus | undefined> | undefined,
) {
  const cur = current ?? {}
  const keys = Object.keys(imported)
  const total = keys.length
  let novel = 0
  let changed = 0
  for (const k of keys) {
    if (!(k in cur) || cur[k] === undefined) novel++
    else if (cur[k] !== imported[k]) changed++
  }
  return { total, novel, changed }
}

function categoryMetricEmpty(m: CategorySelfMetrics | undefined): boolean {
  if (!m) return true
  return m.proficiency === undefined && m.percentComplete === undefined
}

function masteryPairsDiffer(
  a: CategorySelfMetrics,
  b: CategorySelfMetrics,
): boolean {
  return (
    a.proficiency !== b.proficiency ||
    a.percentComplete !== b.percentComplete
  )
}

function countMasteryImportPreview(
  imported: Record<string, CategorySelfMetrics>,
  current: Record<string, CategorySelfMetrics> | undefined,
) {
  const base = current ?? {}
  const keys = Object.keys(imported)
  const total = keys.length
  let novel = 0
  let changed = 0
  for (const k of keys) {
    const cur = base[k]
    if (categoryMetricEmpty(cur)) novel++
    else if (masteryPairsDiffer(imported[k]!, cur!)) changed++
  }
  return { total, novel, changed }
}

export function ImportBackupDialog({
  backup,
  currentOverrides,
  currentCategoryMetrics,
  returnFocusRef,
  onDismiss,
  onApply,
}: {
  backup: ParsedBackup
  currentOverrides: Record<string, ComponentStatus | undefined>
  currentCategoryMetrics: Record<string, CategorySelfMetrics>
  returnFocusRef: RefObject<HTMLElement | null>
  onDismiss: () => void
  onApply: (mode: ImportMergeMode) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const replaceAllRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const onClose = () => {
      returnFocusRef.current?.focus()
    }
    el.addEventListener('close', onClose)
    if (!el.open) el.showModal()
    return () => {
      if (el.open) el.close()
      el.removeEventListener('close', onClose)
    }
  }, [backup, returnFocusRef])

  useEffect(() => {
    const btn = replaceAllRef.current
    if (!btn) return
    const id = requestAnimationFrame(() => {
      btn.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [backup])

  const nStatus = Object.keys(backup.overrides).length
  const nMastery = Object.keys(backup.categoryMetrics).length
  const statusPrev = countStatusImportPreview(
    backup.overrides,
    currentOverrides,
  )
  const masteryPrev = countMasteryImportPreview(
    backup.categoryMetrics,
    currentCategoryMetrics,
  )
  const schemaWarn =
    typeof backup.schemaVersion === 'number' &&
    backup.schemaVersion !== SCHEMA_VERSION

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      aria-labelledby="import-dialog-title"
      aria-describedby="import-dialog-desc"
      onCancel={(e) => {
        e.preventDefault()
        onDismiss()
      }}
    >
      <div className="modal-dialog-inner">
        <h2 id="import-dialog-title" className="modal-dialog-title">
          Apply backup?
        </h2>
        <p id="import-dialog-desc" className="modal-dialog-lead">
          This file has <strong>{nStatus}</strong> component status
          {nStatus === 1 ? '' : 'es'} and mastery for{' '}
          <strong>{nMastery}</strong>{' '}
          {nMastery === 1 ? 'category' : 'categories'}. Choose how to merge with
          what is already saved in this browser.
        </p>
        <p className="modal-dialog-meta muted">
          Statuses: {statusPrev.total} imported keys ({statusPrev.novel} new vs
          current, {statusPrev.changed} changed)
        </p>
        <p className="modal-dialog-meta muted">
          Mastery: {masteryPrev.total} imported categories (
          {masteryPrev.novel} new vs current, {masteryPrev.changed} changed)
        </p>
        {schemaWarn ? (
          <p
            className="modal-dialog-meta import-schema-warn"
            role="status"
          >
            Backup schema version ({backup.schemaVersion}) differs from this app
            ({SCHEMA_VERSION}). Import may be incomplete — review after applying.
          </p>
        ) : null}
        {backup.exportedAt ? (
          <p className="modal-dialog-meta muted">
            Exported: {backup.exportedAt}
          </p>
        ) : null}
        <div
          className="modal-dialog-actions"
          role="group"
          aria-label="Import options"
        >
          <button
            ref={replaceAllRef}
            type="button"
            className="btn"
            onClick={() => onApply('replace_all')}
          >
            Replace all
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onApply('merge_statuses')}
          >
            Merge statuses only
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onApply('merge_mastery')}
          >
            Merge mastery only
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onApply('merge_both')}
          >
            Merge both
          </button>
        </div>
        <div className="modal-dialog-footer">
          <button type="button" className="btn btn-ghost" onClick={onDismiss}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  )
}
