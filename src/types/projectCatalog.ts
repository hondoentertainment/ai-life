/** One row from `projects-2026-03-23.csv` (exported project list). */
export interface CatalogProject {
  id: string
  name: string
  description: string
  status: string
  location: string
  locationUrl: string
  repositoryUrl: string
  tools: string
  createdAt: string
  updatedAt: string
}
