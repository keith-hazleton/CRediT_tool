# CRediT Author Contributions Tool

A web tool for collecting [CRediT](https://credit.niso.org/) (Contributor Roles Taxonomy) author contributions for academic manuscripts. The corresponding author creates a project, shares a link with co-authors, and each person selects their own roles. The tool then generates copy-paste-ready text for the manuscript.

## How It Works

1. **Create a project** — Enter a manuscript title and get a shareable link
2. **Share the link** — Co-authors open the link and click "Add Myself"
3. **Each author enters their info** — Name, affiliation(s), and CRediT roles
4. **Copy the output** — Two generated text blocks ready for your manuscript:
   - **Author list with affiliations** — Names with numbered superscript affiliations
   - **CRediT author statement** — Elsevier-style contribution statement (with rich-text copy for bold author names)

All 14 CRediT roles from NISO Z39.104-2022 are available with official definitions shown as tooltips.

## Tech Stack

- **Frontend**: Static HTML/CSS/JS (no build step, no framework)
- **Backend**: [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) (serverless Workers)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/)

Everything runs on Cloudflare's free tier.

## Setup

### Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- [Node.js](https://nodejs.org/) installed (for the Wrangler CLI)

### Deploy Your Own

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Clone this repo
git clone https://github.com/YOUR_USERNAME/CRediT_tool.git
cd CRediT_tool

# 4. Create the D1 database
wrangler d1 create credit-tool-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "credit-tool-db"
database_id = "YOUR_DATABASE_ID"   # <-- paste here
```

```bash
# 5. Run the database migrations
wrangler d1 execute credit-tool-db --remote --file=migrations/0001_schema.sql
wrangler d1 execute credit-tool-db --remote --file=migrations/0002_structured_name.sql

# 6. Deploy
wrangler pages deploy .
```

Cloudflare will print your live URL (e.g., `https://credit-tool.pages.dev`).

### Local Development

```bash
# Create local D1 database and run migrations
wrangler d1 execute credit-tool-db --local --file=migrations/0001_schema.sql
wrangler d1 execute credit-tool-db --local --file=migrations/0002_structured_name.sql

# Start local dev server
wrangler pages dev .
```

This serves the site at `http://localhost:8788` with a local SQLite database.

## Project Structure

```
CRediT_tool/
  index.html                              # Main single-page app
  dashboard.html                          # Admin page listing all projects
  styles.css                              # Styling
  app.js                                  # Frontend application logic
  wrangler.toml                           # Cloudflare Pages + D1 config
  migrations/
    0001_schema.sql                       # Initial DB schema
    0002_structured_name.sql              # Structured name fields
  functions/api/                          # Cloudflare Pages Functions (API)
    projects.js                           # POST   /api/projects
    projects-list.js                      # GET    /api/projects-list
    projects/
      [id].js                             # GET    /api/projects/:id
      [id]/
        authors.js                        # GET/POST /api/projects/:id/authors
        authors/
          [authorId].js                   # PUT/DELETE /api/projects/:id/authors/:authorId
          reorder.js                      # POST   /api/projects/:id/authors/reorder
```

## Data Model

**Projects** have a title and timestamp. **Authors** belong to a project and store:
- First name, last name, middle initial
- Affiliations (each with institution, city, state, postal code, country)
- CRediT roles (from the 14 standard roles)
- Author order (for reordering)

All data is stored in Cloudflare D1 (SQLite). Affiliations and roles are stored as JSON arrays.

## The 14 CRediT Roles

Conceptualization, Data curation, Formal analysis, Funding acquisition, Investigation, Methodology, Project administration, Resources, Software, Supervision, Validation, Visualization, Writing -- original draft, Writing -- review & editing

Definitions from [NISO Z39.104-2022](https://credit.niso.org/).

## License

MIT
