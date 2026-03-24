import { describe, expect, it } from 'vitest'
import { csvProjectLooksShipped } from './csvShipped'
import type { CatalogProject } from '../types/projectCatalog'

function row(p: Partial<CatalogProject>): CatalogProject {
  return {
    id: 'id',
    name: 'Name',
    description: '',
    status: 'active',
    location: '',
    locationUrl: '',
    repositoryUrl: '',
    tools: '',
    createdAt: '',
    updatedAt: '',
    ...p,
  }
}

describe('csvProjectLooksShipped', () => {
  it('requires active status', () => {
    expect(csvProjectLooksShipped(row({ status: 'paused' }))).toBe(false)
    expect(
      csvProjectLooksShipped(
        row({ status: 'ACTIVE', repositoryUrl: 'https://ex.test/r' }),
      ),
    ).toBe(true)
  })

  it('accepts https repo or location', () => {
    expect(
      csvProjectLooksShipped(
        row({ repositoryUrl: 'https://github.com/o/r', locationUrl: '' }),
      ),
    ).toBe(true)
    expect(
      csvProjectLooksShipped(
        row({ repositoryUrl: '', locationUrl: 'http://x.test' }),
      ),
    ).toBe(true)
  })

  it('accepts bare owner/repo in repository field', () => {
    expect(csvProjectLooksShipped(row({ repositoryUrl: 'acme/widget' }))).toBe(
      true,
    )
  })

  it('accepts github.com URL without scheme', () => {
    expect(
      csvProjectLooksShipped(
        row({ repositoryUrl: 'github.com/acme/widget' }),
      ),
    ).toBe(true)
  })
})
