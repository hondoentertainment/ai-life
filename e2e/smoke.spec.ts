import { expect, test } from '@playwright/test'

/** Keep aligned with `src/lib/storageKeys.ts`. */
const COVERAGE_STORAGE_V2 = 'ai-life-coverage-v2'

test.describe('smoke', () => {
  test('home and deep-linked Sections tab', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: /AI Life/i, level: 1 }),
    ).toBeVisible()

    await page.goto('/?tab=sections')
    await expect(
      page.getByRole('heading', { name: 'Sections', exact: true, level: 2 }),
    ).toBeVisible()
  })

  test('Sections status override persists after reload', async ({ page }) => {
    await page.goto('/?tab=sections')
    await page.evaluate((k) => localStorage.removeItem(k), COVERAGE_STORAGE_V2)
    await page.reload()
    await page.getByRole('button', { name: 'Expand all' }).click()

    const sel = page.getByRole('combobox', {
      name: /Status for Calendar intelligence/,
    })
    await sel.selectOption('implemented')
    await page.reload()
    await page.getByRole('button', { name: 'Expand all' }).click()
    await expect(sel).toHaveValue('implemented')
  })

  test('Integrations tab shows spine matrix and status badges', async ({
    page,
  }) => {
    await page.goto('/?tab=integrations')
    await expect(
      page.getByRole('table', {
        name: /Integration spine vs section groups/i,
      }),
    ).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(4)
    await expect(
      page.getByText(/^(Blocked|Satisfied)$/).first(),
    ).toBeVisible()
  })
})
