import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ImportBackupDialog } from './ImportBackupDialog'
import { SCHEMA_VERSION } from '../version'

function squeeze(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

describe('ImportBackupDialog', () => {
  it('renders preview counts and replace-all removal warning', () => {
    const html = squeeze(
      renderToStaticMarkup(
        <ImportBackupDialog
          backup={{
            overrides: { a: 'implemented' },
            categoryMetrics: {},
          }}
          currentOverrides={{ a: 'planned', b: 'planned' }}
          currentCategoryMetrics={{}}
          returnFocusRef={{ current: null }}
          onDismiss={vi.fn()}
          onApply={vi.fn()}
        />,
      ),
    )

    expect(html).toContain(
      'Statuses: 1 keys in this file (0 new vs current, 1 changed)',
    )
    expect(html).toContain(
      'Replace all will remove 1 existing status key not present in this file.',
    )
  })

  it('renders schema warning as a status region on mismatch', () => {
    const html = squeeze(
      renderToStaticMarkup(
        <ImportBackupDialog
          backup={{
            overrides: { x: 'planned' },
            categoryMetrics: {},
            schemaVersion: SCHEMA_VERSION - 1,
          }}
          currentOverrides={{}}
          currentCategoryMetrics={{}}
          returnFocusRef={{ current: null }}
          onDismiss={vi.fn()}
          onApply={vi.fn()}
        />,
      ),
    )

    expect(html).toContain(
      `Backup schema version (${SCHEMA_VERSION - 1}) differs from this app (${SCHEMA_VERSION}).`,
    )
    expect(html).toMatch(/import-schema-warn" role="status"/)
  })
})
