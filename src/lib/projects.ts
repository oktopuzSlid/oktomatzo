import type { ProjectDefinition } from './types'

export const projects: ProjectDefinition[] = [
  {
    slug: '3d-viz',
    title: '3D Visualizer',
    description: 'Interactive geometric scene with Three.js — orbit, zoom, recolor.',
    category: 'threejs',
    icon: 'cube',
    href: '/projects/3d-viz/',
  },
  {
    slug: 'hello-world',
    title: 'Hello World',
    description: 'Smoke test project — verify the platform works.',
    category: 'interactive',
    icon: 'smile',
    href: '/projects/hello-world/',
  },
]
