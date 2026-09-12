# IssueTrack API

A small REST API for logging and triaging defects/issues across backend
services — tracking status, priority, and which service each issue affects,
with filtering support. Built with Node.js and Express.

Design note: persistence is a JSON file on disk (`src/data/store.js`)
rather than a database server, so the project has zero external
dependencies and can be deployed anywhere Node runs. The store module is
the only place that knows about storage — swapping it for Postgres/MySQL
later wouldn't require touching the routes or controllers.

## Endpoints

| Method | Path                | Description                                      |
|--------|---------------------|---------------------------------------------------|
| GET    | `/health`           | Liveness check                                     |
| GET    | `/issues`           | List issues (supports `?status=`, `?priority=`, `?service=`) |
| GET    | `/issues/:id`       | Get a single issue                                 |
| POST   | `/issues`           | Create an issue                                    |
| PATCH  | `/issues/:id`       | Update fields on an issue                          |
| DELETE | `/issues/:id`       | Delete an issue                                    |

**Issue fields:** `title` (required), `description`, `status`
(`open` | `in_progress` | `resolved` | `closed`, default `open`),
`priority` (`low` | `medium` | `high` | `critical`, default `medium`),
`service` (free text, e.g. `"card-issuer-gateway"`).

### Example

```bash
curl -X POST http://localhost:3000/issues \
  -H "Content-Type: application/json" \
  -d '{"title":"Card issuer timeout on auth callback","priority":"high","service":"card-issuer-gateway"}'

curl "http://localhost:3000/issues?priority=high"

curl -X PATCH http://localhost:3000/issues/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved"}'
```

## Run locally

```bash
npm install
npm start          # http://localhost:3000
npm run dev         # auto-restart on file changes
npm test            # 11 tests: CRUD, filtering, validation, 404s
```

## Deploy (Render, free tier, no credit card)

1. Push this project to a GitHub repo.
2. Go to [render.com](https://render.com) → sign up / log in with GitHub.
3. **New +** → **Web Service** → select this repo.
4. Settings:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Deploy. Render gives you a public URL like `https://issuetrack-api.onrender.com`.

Note: free-tier services spin down after 15 minutes of inactivity, so the
first request after a quiet period takes 30–60 seconds to wake up. That's
expected on the free tier — mention it if you demo this live rather than
letting it look like a bug.

## Possible next steps

- Swap the JSON-file store for a real database (Postgres works well on
  Render's free tier) — the store module is the only file that would change.
- Add simple API-key auth on write endpoints.
- Add pagination to `GET /issues` once the dataset is large enough to need it.
