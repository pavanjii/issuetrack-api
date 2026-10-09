# IssueTrack API

A small REST API for logging and triaging defects/issues across backend services — tracking status, priority, and which service each issue affects, with filtering support. Built with Node.js and Express.

## Design

Persistence uses a JSON file on disk (`src/data/store.js`) rather than a database server. The store module is the only component responsible for storage, so replacing it with PostgreSQL or MySQL later would not require changes to the routes or controllers.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/issues` | List issues; supports `?status=`, `?priority=`, and `?service=` |
| GET | `/issues/:id` | Get a single issue |
| POST | `/issues` | Create an issue |
| PATCH | `/issues/:id` | Update issue fields |
| DELETE | `/issues/:id` | Delete an issue |

**Issue fields**

- `title` — required
- `description` — optional
- `status` — `open`, `in_progress`, `resolved`, or `closed`; defaults to `open`
- `priority` — `low`, `medium`, `high`, or `critical`; defaults to `medium`
- `service` — free text, such as `card-issuer-gateway`

## Example requests

Create an issue:

```bash
curl -X POST http://localhost:3000/issues \
  -H "Content-Type: application/json" \
  -d '{"title":"Card issuer timeout on auth callback","priority":"high","service":"card-issuer-gateway"}'
```

Filter issues by priority:

```bash
curl "http://localhost:3000/issues?priority=high"
```

Update an issue:

```bash
curl -X PATCH http://localhost:3000/issues/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved"}'
```

## Run locally

```bash
npm install
npm start
npm run dev
npm test
npm run coverage
```

The API runs at `http://localhost:3000` by default.

## Test coverage

Coverage is measured with **c8** and Node.js's built-in test runner.

| Metric | Result |
|---|---:|
| Automated tests passed | 30/30 |
| Statement coverage | 100% |
| Line coverage | 100% |
| Function coverage | 100% |
| Branch coverage | 98.52% |

Run `npm test` to execute the tests and `npm run coverage` to generate a fresh coverage report.

## Deployed API performance

**Platform:** Render  
**Endpoint tested:** `GET /health`  
**Methodology:** 30 sequential requests measured from a local Windows PowerShell client.

| Metric | Measured result |
|---|---:|
| Requests successful | 30/30 |
| Success rate during test | 100% |
| Minimum response time | 218.83 ms |
| Median response time | 263.32 ms |
| P95 response time | 1,172.17 ms |
| Maximum response time | 22,138.34 ms |

These measurements include network and client overhead. The first request was significantly slower than subsequent requests, potentially due to a cold start or startup delay. This is an initial benchmark, not a comprehensive load test.

**Live health endpoint:** https://issuetrack-api-v95s.onrender.com/health

## Deploy on Render

1. Push the project to a GitHub repository.
2. Sign in to [Render](https://render.com).
3. Select **New + → Web Service** and connect the repository.
4. Configure the service:

   - **Environment:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free, if available for your account

5. Deploy and use the public URL provided by Render.

Free-instance availability and behavior may change. The first request after inactivity can be significantly slower than subsequent requests.

## Possible next steps

- Replace JSON-file persistence with PostgreSQL.
- Add API-key authentication to write endpoints.
- Add pagination to `GET /issues` as the dataset grows.
- Expand performance testing to include issue creation, retrieval, filtering, and updates.
