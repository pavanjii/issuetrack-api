# IssueTrack API

A REST API for logging and triaging defects across backend services. It supports issue creation, retrieval, updates, deletion, and filtering by status, priority, and affected service.

## Features

- RESTful CRUD operations for issue management
- Input validation for required fields and allowed status and priority values
- Filtering by status, priority, and service
- Centralized error-handling middleware for consistent JSON error responses
- JSON-file persistence with generated issue IDs and timestamps
- Automated API tests and code coverage reporting
- Deployed on Render

## Tech Stack

- **Runtime:** Node.js
- **Backend:** Express.js
- **Testing:** Node.js built-in test runner, Supertest, and `assert/strict`
- **Coverage:** c8
- **Persistence:** JSON file using Node.js filesystem APIs
- **Deployment:** Render

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |
| GET | `/issues` | List issues |
| GET | `/issues/:id` | Retrieve an issue by ID |
| POST | `/issues` | Create an issue |
| PATCH | `/issues/:id` | Update an existing issue |
| DELETE | `/issues/:id` | Delete an issue |

### Filtering

The `GET /issues` endpoint supports the following query parameters:

- `status` — filter by issue status
- `priority` — filter by priority
- `service` — filter by affected service

Example:

```http
GET /issues?priority=high
GET /issues?status=resolved
GET /issues?service=card-issuer-gateway
```

### Issue Fields

| Field | Description |
|---|---|
| `id` | Unique issue identifier |
| `title` | Required issue title |
| `description` | Issue description |
| `status` | `open`, `in_progress`, `resolved`, or `closed`; defaults to `open` |
| `priority` | `low`, `medium`, `high`, or `critical`; defaults to `medium` |
| `service` | Affected service; defaults to `unspecified` |
| `createdAt` | Issue creation timestamp |
| `updatedAt` | Timestamp of the latest update |

### Example Requests

Create an issue:

```bash
curl -X POST http://localhost:3000/issues \
  -H "Content-Type: application/json" \
  -d '{"title":"Card issuer timeout","description":"Authentication callback is timing out","priority":"high","service":"card-issuer-gateway"}'
```

Retrieve issues by priority:

```bash
curl "http://localhost:3000/issues?priority=high"
```

Update an issue:

```bash
curl -X PATCH http://localhost:3000/issues/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved"}'
```

Delete an issue:

```bash
curl -X DELETE http://localhost:3000/issues/<id>
```

## Architecture and Error Handling

The application separates routes, controllers, validation, and persistence into dedicated modules.

- **Routes:** Define API endpoints and connect requests to controller functions.
- **Controllers:** Implement issue-management operations and HTTP responses.
- **Validation:** Validate issue creation and update requests.
- **Data store:** Persist issues in a JSON file through a dedicated storage module.
- **Centralized error handling:** Express middleware handles errors passed from route handlers and returns structured JSON error responses. Unknown routes also return a structured 404 response.

The storage layer is isolated in `src/data/store.js`, allowing the persistence implementation to be replaced with a database without requiring changes to the route definitions.

## Run Locally

Requirements: Node.js 18 or later and npm.

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm start
```

The API runs at `http://localhost:3000` by default.

Start in development mode with automatic restarts:

```bash
npm run dev
```

## Automated Testing and Coverage

The test suite uses Node.js's built-in test runner, Supertest for HTTP-level API testing, and `assert/strict` for assertions.

Run the tests:

```bash
npm test
```

Generate the coverage report:

```bash
npm run coverage
```

### Latest Test Results

| Metric | Result |
|---|---:|
| Automated tests passed | 30/30 |
| Statement coverage | 100% |
| Line coverage | 100% |
| Function coverage | 100% |
| Branch coverage | 98.52% |

These results are from the latest recorded test and coverage run.

## Deployment

The API is deployed on Render.

**Live health endpoint:** https://issuetrack-api-v95s.onrender.com/health

**List issues:** https://issuetrack-api-v95s.onrender.com/issues

The deployed health endpoint was benchmarked using 30 sequential requests from a local PowerShell client.

| Metric | Result |
|---|---:|
| Successful requests | 30/30 |
| Minimum response time | 218.83 ms |
| Median response time | 263.32 ms |
| P95 response time | 1,172.17 ms |
| Maximum response time | 22,138.34 ms |

These measurements include network and client overhead. The first request was significantly slower than subsequent requests, potentially due to a cold start or startup delay. They represent an initial benchmark rather than a comprehensive load test.

## Persistence

The application stores issues in a local JSON file. Local testing confirmed that issue data survived an application restart, preserving issue IDs, fields, and timestamps.

Persistence across Render restarts or redeployments depends on the deployed filesystem configuration. A persistent disk or external database is needed when data must survive replacement of an ephemeral instance.

## Future Improvements

- Replace JSON-file persistence with PostgreSQL for more robust data management.
- Add API-key authentication to write endpoints.
- Implement pagination for `GET /issues`.
- Expand performance testing to cover issue creation, retrieval, filtering, and updates.
- Add integration tests for persistence across application restarts and deployment changes.
