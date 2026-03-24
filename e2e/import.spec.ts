import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Keep aligned with `src/lib/storageKeys.ts` and `useCoverageStore` v1 key. */
const COVERAGE_STORAGE_V2 = 'ai-life-coverage-v2'
const COVERAGE_STORAGE_V1 = 'ai-life-coverage-v1'
/** Align with `src/lib/storageKeys.ts` IMPORT_UNDO_SESSION_KEY */
const IMPORT_UNDO_SESSION_KEY = 'ai-life-import-undo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const minimalFixture = path.join(__dirname, 'fixtures', 'minimal-coverage.json')

test.describe('import', () => {
  test('JSON import replace all applies component override', async ({ page }) => {
    await page.goto('/')
    await page.evaluate((keys: string[]) => {
      for (const k of keys) {
        try {
          localStorage.removeItem(k)
          sessionStorage.removeItem(k)
        } catch {
          /* ignore */
        }
      }
    }, [COVERAGE_STORAGE_V2, COVERAGE_STORAGE_V1, IMPORT_UNDO_SESSION_KEY])
    await page.reload()
    await page.getByRole('button', { name: 'Import JSON' }).click()
    await page.locator('input[type="file"]').setInputFiles(minimalFixture)

    await expect(
      page.getByRole('heading', { name: 'Apply backup?', level: 2 }),
    ).toBeVisible()
    await page.getByRole('button', { name: /replace all/i }).click()
    await expect(
      page.getByRole('heading', { name: 'Apply backup?', level: 2 }),
    ).toBeHidden()

    await page.goto('/?tab=sections')
    await page.getByRole('button', { name: 'Expand all' }).click()
    const sel = page.getByRole('combobox', {
      name: /Status for Calendar intelligence/,
    })
    await expect(sel).toHaveValue('implemented')
  })
})
