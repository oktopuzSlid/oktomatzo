import os
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pathlib import Path

router = APIRouter(tags=["platform"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
PROJECTS_DIR = BASE_DIR / "projects"


def _read_meta(project_dir: Path) -> dict:
    meta_file = project_dir / "project.json"
    if meta_file.is_file():
        try:
            return json.loads(meta_file.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _discover_projects():
    if not PROJECTS_DIR.is_dir():
        return []
    projects = []
    for entry in sorted(PROJECTS_DIR.iterdir()):
        if not entry.is_dir():
            continue
        meta = _read_meta(entry)
        projects.append({
            "slug": meta.get("slug", entry.name),
            "title": meta.get("title", entry.name),
            "description": meta.get("description", ""),
            "category": meta.get("category", "interactive"),
            "icon": meta.get("icon", "smile"),
        })
    return projects


@router.get("/api/platform/projects")
def platform_projects():
    return _discover_projects()


# ── HTML: project listing page ──

_PROJECT_LISTING_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Projects | Oktomatzo Host</title>
  <meta name="description" content="Browse all interactive projects" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    html, body { height: 100%; }
    .page-section { flex: 1; display: flex; flex-direction: column; padding-top: 64px; padding-bottom: 64px; }
    .page-section .container { flex: 1; display: flex; flex-direction: column; }
    .page-header { margin-bottom: 32px; }
    .page-title { font-size: 2.4rem; }
    .page-description { font-size: 1.1rem; margin-top: 12px; }
    .project-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 28px;
      align-content: center;
      padding: 12px 0;
    }
    .project-card { padding: 32px; min-height: 220px; justify-content: center; }
    .card-icon { width: 56px; height: 56px; margin-bottom: 20px; }
    .card-title { font-size: 1.3rem; }
    .card-description { font-size: 0.9rem; margin-top: 10px; }
    .card-category { margin-top: 20px; }
    .card-link { margin-top: 20px; font-size: 0.9rem; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="logo">Oktomatzo<span class="logo-accent">Host</span></a>
      <nav class="nav-links">
        <a href="/projects/" class="nav-link" data-current="true">Projects</a>
        <a href="/about/" class="nav-link">About</a>
        <a href="/docs/" class="nav-link">Docs</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="page-section">
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Projects</h1>
          <p class="page-description">Select a project to launch it.</p>
        </div>
        <div class="project-grid" id="project-grid"></div>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; 2026 Oktomatzo Host</p>
    </div>
  </footer>
  <script src="/js/main.js" defer></script>
  <script>
    fetch('/api/platform/projects')
      .then(function(r) { return r.json() })
      .then(function(projects) {
        var grid = document.getElementById('project-grid')
        if (!grid) return
        var icons = {
          cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
          smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
        }
        projects.forEach(function(p) {
          var card = document.createElement('article')
          card.className = 'project-card'
          card.innerHTML =
            '<div class="card-icon">' + (icons[p.icon] || icons.smile) + '</div>' +
            '<h2 class="card-title">' + p.title + '</h2>' +
            '<p class="card-description">' + p.description + '</p>' +
            '<span class="card-category">' + p.category + '</span>' +
            '<a href="/projects/' + p.slug + '/" class="card-link">Open &rarr;</a>'
          grid.appendChild(card)
        })
      })
  </script>
</body>
</html>"""


@router.get("/projects/", response_class=HTMLResponse, include_in_schema=False)
def projects_listing():
    return _PROJECT_LISTING_HTML


# ── Wrapper template (used for entry: "main.js") ──

_WRAPPER_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | Oktomatzo Host</title>
  <meta name="description" content="{description}" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    html, body { height: 100%; }
    .page-section { flex: 1; display: flex; flex-direction: column; padding-top: 24px; padding-bottom: 0; }
    .page-section .container { flex: 1; display: flex; flex-direction: column; }
    .project-root { flex: 1; min-height: 300px; margin-top: 0; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="logo">Oktomatzo<span class="logo-accent">Host</span></a>
      <nav class="nav-links">
        <a href="/projects/" class="nav-link" data-current="true">Projects</a>
        <a href="/about/" class="nav-link">About</a>
        <a href="/docs/" class="nav-link">Docs</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="page-section" style="padding-bottom:0;">
      <div class="container">
        <div id="project-root" class="project-root">
          <p style="color:var(--text-muted);">Loading...</p>
        </div>
      </div>
    </section>
  </main>
  <div class="project-strip-nav">
    <div class="container">
      <div class="strip-track" id="nav-strip"></div>
    </div>
  </div>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; 2026 Oktomatzo Host</p>
    </div>
  </footer>
  <script src="/js/main.js" defer></script>
  <script src="/platform/sdk.js"></script>
  <script>
    var currentSlug = '{slug}'
    fetch('/api/platform/projects')
      .then(function(r) { return r.json() })
      .then(function(projects) {
        var strip = document.getElementById('nav-strip')
        if (!strip) return
        var icons = {
          cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
          smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
        }
        projects.forEach(function(p) {
          var a = document.createElement('a')
          a.href = '/projects/' + p.slug + '/'
          a.className = 'strip-card' + (p.slug === currentSlug ? ' active' : '')
          a.innerHTML = '<span class="strip-icon">' + (icons[p.icon] || icons.smile) + '</span><span class="strip-label">' + p.title + '</span>'
          strip.appendChild(a)
        })
      })
  </script>
  {importmap_block}
  <script{script_type} src="/projects-content/{slug}/main.js"></script>
</body>
</html>"""


def _build_debug_page(slug: str, meta: dict, project_dir: Path, entry: str) -> str:
    lines = []
    lines.append(f"<h2>Debug: /projects/{slug}/</h2>")
    lines.append(f"<h3>project.json</h3><pre>{json.dumps(meta, indent=2)}</pre>")
    lines.append(f"<h3>Entry mode</h3><p>{entry}</p>")
    lines.append(f"<h3>Folder contents</h3><pre>")
    for f in sorted(project_dir.iterdir()):
        size = f.stat().st_size if f.is_file() else 0
        tag = "&#128196;" if f.is_file() else "&#128193;"
        lines.append(f"  {tag} {f.name} ({size} bytes)" if f.is_file() else f"  {tag} {f.name}/")
    lines.append("</pre>")
    lines.append(f'<h3>Wrapper URL</h3><p><a href="/projects/{slug}/"">/projects/{slug}/</a></p>')
    html = """<!DOCTYPE html>
<html><head><title>Debug: {slug} | Oktomatzo Host</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body { font-family:'Space+Grotesk',sans-serif; background:#000; color:#eee; padding:24px; }
  h2 { color:#3b82f6; } h3 { color:#60a5fa; margin-top:24px; }
  pre { background:#111; padding:16px; border-radius:8px; overflow-x:auto; }
  a { color:#3b82f6; }
</style></head><body>
<h1>&#128269; Debug: {slug}</h1>
<a href="/projects/{slug}/">&larr; Back to project</a>
{body}
</body></html>"""
    return html.replace("{slug}", slug).replace("{body}", "".join(lines))


_EMBED_WRAPPER_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | Oktomatzo Host</title>
  <meta name="description" content="{description}" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/style.css" />
  <style>
    html, body { height: 100%; margin: 0; overflow: hidden; }
    body { display: flex; flex-direction: column; background: #000; }
    main { flex: 1; min-height: 0; }
    iframe { width: 100%; height: 100%; border: none; display: block; }
    .site-header { position: sticky !important; top: 0 !important; z-index: 100 !important; }
    .project-strip-nav { position: sticky !important; bottom: 0 !important; z-index: 50 !important; padding: 10px 0 !important; margin-top: 0 !important; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="logo">Oktomatzo<span class="logo-accent">Host</span></a>
      <nav class="nav-links">
        <a href="/projects/" class="nav-link" data-current="true">Projects</a>
        <a href="/about/" class="nav-link">About</a>
        <a href="/docs/" class="nav-link">Docs</a>
      </nav>
    </div>
  </header>
  <main>
    <iframe id="project-iframe" src="/projects-content/{slug}/"></iframe>
  </main>
  <div class="project-strip-nav">
    <div class="container">
      <div class="strip-track" id="nav-strip"></div>
    </div>
  </div>
  <footer class="site-footer">
    <div class="container">
      <p>&copy; 2026 Oktomatzo Host</p>
    </div>
  </footer>
  <script src="/js/main.js" defer></script>
  <script src="/platform/sdk.js"></script>
  <script>
    var currentSlug = '{slug}'
    fetch('/api/platform/projects')
      .then(function(r) { return r.json() })
      .then(function(projects) {
        var strip = document.getElementById('nav-strip')
        if (!strip) return
        var icons = {
          cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
          smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
        }
        projects.forEach(function(p) {
          var a = document.createElement('a')
          a.href = '/projects/' + p.slug + '/'
          a.className = 'strip-card' + (p.slug === currentSlug ? ' active' : '')
          a.innerHTML = '<span class="strip-icon">' + (icons[p.icon] || icons.smile) + '</span><span class="strip-label">' + p.title + '</span>'
          strip.appendChild(a)
        })
      })
  </script>
</body>
</html>"""


@router.get("/projects/{slug}/", response_class=HTMLResponse, include_in_schema=False)
def project_wrapper(slug: str, request: Request):
    project_dir = PROJECTS_DIR / slug
    if not project_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Project '{slug}' not found")

    meta = _read_meta(project_dir)
    title = meta.get("title", slug)
    description = meta.get("description", "")
    entry = meta.get("entry", "main.js")

    if request.query_params.get("debug") == "true":
        return _build_debug_page(slug, meta, project_dir, entry)

    if entry == "index.html":
        html = _EMBED_WRAPPER_HTML.replace("{slug}", slug)
        html = html.replace("{title}", title)
        html = html.replace("{description}", description)
        return html

    is_module = meta.get("module", False)
    importmap_block = ""
    script_type = ""
    if is_module:
        script_type = ' type="module"'
        imp = meta.get("importmap")
        if imp:
            importmap_block = '<script type="importmap">\n' + json.dumps(imp, indent=2) + '\n</script>'

    html = _WRAPPER_HTML.replace("{slug}", slug)
    html = html.replace("{title}", title)
    html = html.replace("{description}", description)
    html = html.replace("{importmap_block}", importmap_block)
    html = html.replace("{script_type}", script_type)
    return html
