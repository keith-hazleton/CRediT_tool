# CLAUDE.md

## Project Overview

CRediT Author Contributions Tool — a web app for collecting CRediT (Contributor Roles Taxonomy) contributions from co-authors for academic manuscripts. Corresponding author creates a project, shares a link, co-authors each enter their own info, and the tool generates copy-paste-ready author lists and contribution statements.

## Tech Stack

- **Frontend**: Plain HTML/CSS/JS — no framework, no build step
- **Backend**: Cloudflare Pages Functions (serverless, file-based routing)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Deployment**: Cloudflare Pages via `wrangler pages deploy .`
- **CLI**: Wrangler (`wrangler` command for deploy, D1 management, local dev)

## Key Files

- `index.html` — Main app (single-page), includes modal for add/edit author
- `dashboard.html` — Admin page listing all projects (not linked from main app)
- `app.js` — All frontend logic: API calls, polling, modal, output generation, clipboard
- `styles.css` — All styling, responsive down to mobile
- `wrangler.toml` — Cloudflare config, D1 database binding
- `functions/api/` — API routes (Cloudflare Pages Functions, file-based routing)
- `migrations/` — D1 schema migrations (run manually via `wrangler d1 execute`)

## Architecture

### Frontend

- No build step. All files served as static assets by Cloudflare Pages.
- `app.js` communicates with the backend via `fetch("/api/...")`.
- Polls for author updates every 5 seconds (pauses when tab is hidden).
- URL param `?project=<id>` loads a specific project.

### API (Pages Functions)

File-based routing under `functions/`. Each file exports `onRequestGet`, `onRequestPost`, etc.

| Route | File | Methods |
|-------|------|---------|
| `/api/projects` | `functions/api/projects.js` | POST |
| `/api/projects-list` | `functions/api/projects-list.js` | GET |
| `/api/projects/:id` | `functions/api/projects/[id].js` | GET |
| `/api/projects/:id/authors` | `functions/api/projects/[id]/authors.js` | GET, POST |
| `/api/projects/:id/authors/:authorId` | `functions/api/projects/[id]/authors/[authorId].js` | PUT, DELETE |
| `/api/projects/:id/authors/reorder` | `functions/api/projects/[id]/authors/reorder.js` | POST |

D1 is accessed via `context.env.DB` (bound in `wrangler.toml`).

### Database (D1)

Two tables:

**`projects`**: `id` (TEXT PK), `title`, `created_at`

**`authors`**: `id` (TEXT PK), `project_id` (FK), `first_name`, `last_name`, `middle_initial`, `affiliations` (JSON), `roles` (JSON), `author_order`, `added_at`

- `affiliations` is a JSON array of objects: `{ institution, city, state, postalCode, country }`
- `roles` is a JSON array of role name strings
- Migrations are in `migrations/` and run in order via `wrangler d1 execute`

## Common Commands

```bash
# Local development
wrangler pages dev .

# Deploy to production
wrangler pages deploy .

# Run a new migration
wrangler d1 execute credit-tool-db --remote --file=migrations/XXXX_name.sql

# Run migration locally
wrangler d1 execute credit-tool-db --local --file=migrations/XXXX_name.sql

# List D1 databases
wrangler d1 list

# Query D1 directly
wrangler d1 execute credit-tool-db --remote --command="SELECT * FROM projects"
```

## Conventions

- No npm/node_modules — everything is vanilla JS loaded directly
- Migrations are numbered sequentially (`0001_`, `0002_`, ...) and applied manually
- API functions return JSON; errors use appropriate HTTP status codes
- IDs are generated with `crypto.randomUUID()` in Workers
- The `dashboard.html` page is intentionally not linked from the main app (admin-only, access by direct URL)

## CRediT Roles

The 14 roles and their NISO definitions are defined in `app.js` in the `CREDIT_ROLES` array. This is the single source of truth for role names and tooltip descriptions.
