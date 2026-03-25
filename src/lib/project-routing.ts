export function slugifyProjectName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export function buildProjectRef(id: string, name: string) {
  const slug = slugifyProjectName(name)
  return slug ? `${id}-${slug}` : id
}

export function parseProjectRef(projectRef: string) {
  const match = projectRef.match(
    /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:-(.*))?$/
  )

  if (!match) return null

  return {
    id: match[1],
    slug: match[2] ?? "",
  }
}

export function getProjectUrl(project: { id: string; name: string }) {
  return `/projects/${buildProjectRef(project.id, project.name)}`
}
