export type ProjectCategory = 'threejs' | 'data-viz' | 'interactive' | 'tool'

export interface ProjectDefinition {
  slug: string
  title: string
  description: string
  category: ProjectCategory
  icon: string
  href: string
  embedHref: string
}
