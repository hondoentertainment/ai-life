import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Keep aligned with `src/lib/storageKeys.ts` and `useCoverageStore` v1 key. */
const COVERAGE_STORAGE_V2 = 'ai-life-coverage-v2'
const COVERAGE_STORAGE_V1 = 'ai-life-coverage-v1'
/** Align with `src/lib/storageKeys.ts` IMPORT_UNDO_SESSION_KEY */
const IMPORT_UNDO_SESSION_KEY = 'ai-life-import-undo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const minimalFixture = path.join(__dirname, 'fixtures', 'minimal-coverage.json')
const emptyFixture = path.join(__dirname, 'fixtures', 'empty-coverage.json')
const COVERAGE_KEYS = [
  COVERAGE_STORAGE_V2,
  COVERAGE_STORAGE_V1,
  IMPORT_UNDO_SESSION_KEY,
]

async function clearCoverageStorage(page: Page) {
  await page.evaluate((keys: string[]) => {
    for (const k of keys) {
      try {
        localStorage.removeItem(k)
        sessionStorage.removeItem(k)
      } catch {
        /* ignore */
      }
    }
  }, COVERAGE_KEYS)
}

async function getCalendarStatusSelect(page: Page) {
  await page.goto('/?tab=sections')
  await page.getByRole('button', { name: 'Expand all' }).click()
  return page.getByRole('combobox', {
    name: /Status for Calendar intelligence/,
  })
}

test.describe('import', () => {
  test('JSON import replace all applies component override', async ({ page }) => {
    await page.goto('/')
    await clearCoverageStorage(page)
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

  test('JSON import rejects empty backup snapshot', async ({ page }) => {
    await page.goto('/')
    await clearCoverageStorage(page)
    await page.reload()
    await page.getByRole('button', { name: 'Import JSON' }).click()
    await page.locator('input[type="file"]').setInputFiles(emptyFixture)

    await expect(
      page.getByText(
        /Import failed: No valid status or mastery entries found in backup\./i,
      ),
    ).toBeVisible()
    await expect(page.locator('dialog.modal-dialog')).toHaveCount(0)
  })

  test('Undo last import restores pre-import coverage', async ({ page }) => {
    await page.goto('/')
    await clearCoverageStorage(page)
    await page.evaluate(() => {
      localStorage.setItem(
        'ai-life-coverage-v2',
        JSON.stringify({
          overrides: { 'td-cal': 'planned' },
          categoryMetrics: {},
        }),
      )
    })
    await page.reload()

    let sel = await getCalendarStatusSelect(page)
    await expect(sel).toHaveValue('planned')

    await page.goto('/')
    await page.getByRole('button', { name: 'Import JSON' }).click()
    await page.locator('input[type="file"]').setInputFiles(minimalFixture)
    await page.getByRole('button', { name: /replace all/i }).click()

    sel = await getCalendarStatusSelect(page)
    await expect(sel).toHaveValue('implemented')

    await page.goto('/')
    await page.getByRole('button', { name: /Undo last import/i }).click()

    sel = await getCalendarStatusSelect(page)
    await expect(sel).toHaveValue('planned')
  })
})
