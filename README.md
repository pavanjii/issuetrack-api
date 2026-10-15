ssueTrack API
A lightweight REST API for creating, tracking, and triaging software
issues. Built with Node.js and Express, IssueTrack supports CRUD
operations, issue filtering, automated tests, and a live deployment on
Render.
Live Demo
- API landing route: https://issuetrack-api-v95s.onrender.com/
- Health check: https://issuetrack-api-v95s.onrender.com/health
- Issues endpoint: https://issuetrack-api-v95s.onrender.com/issues
Hosting note: The service is deployed on Render's free tier. It
may take a while to respond after a period of inactivity because the
service can enter a cold-start state. The API currently uses JSON-file
persistence, so it should be treated as a demonstration project rather
than a production database-backed service.

Features
- RESTful endpoints for issue management
- Create, retrieve, update, and delete issues
- Filter issues by status, priority, and service
- Input validation for required fields
- JSON-file persistence
- Automated API tests
- Test coverage reporting
- Deployment on Render
Tech Stack
- Runtime: Node.js
- Web framework: Express
- Data persistence: JSON file (src/data/store.js)
- Testing: Node.js API test suite (run with the project's npm
  scripts)
- Hosting: Render
API Endpoints
Base URL:
https://issuetrack-api-v95s.onrender.com
For local development, use:
http://localhost:3000
  Method     Endpoint        Description
  GET      /health       Check whether the API is running
  GET      /issues       List issues; supports filtering
  GET      /issues/:id   Retrieve one issue by ID
  POST     /issues       Create an issue
  PATCH    /issues/:id   Update fields on an existing issue
  DELETE   /issues/:id   Delete an issue
The informational landing route GET / returns the API name, status, and endpoint paths. It is separate from the six health and issue-management endpoints listed above. The deployed root URL has been checked and returns the expected JSON response.
Issue fields
An issue can contain the following fields:
  Field                               Purpose
  title                             Issue title; required when creating
                                      an issue
  description                       Additional details about the issue
  status                            Current workflow status; defaults
                                      to open
  priority                          Issue priority; defaults to
                                      medium
  service                           Service or component associated
                                      with the issue; free-text field
  id                                Identifier assigned to the issue by
                                  the API
The API may also return metadata maintained by the application. Use the
actual response from the running API as the source of truth for fields
not listed above.
Example Requests
Examples below use curl. Replace the base URL with
http://localhost:3000 when testing locally.
1. Health check
curl https://issuetrack-api-v95s.onrender.com/health
2. List issues
curl https://issuetrack-api-v95s.onrender.com/issues
3. Filter issues
Filter by status, priority, or service using query parameters:
curl "https://issuetrack-api-v95s.onrender.com/issues?status=open"
curl "https://issuetrack-api-v95s.onrender.com/issues?priority=high"
curl "https://issuetrack-api-v95s.onrender.com/issues?service=payments"
Use values that exist in your data and are supported by the current
application.
4. Retrieve an issue by ID
curl "https://issuetrack-api-v95s.onrender.com/issues/REPLACE_WITH_ISSUE_ID"
Replace REPLACE_WITH_ISSUE_ID with an ID returned by GET /issues.
5. Create an issue
curl -X POST "https://issuetrack-api-v95s.onrender.com/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Checkout request returns an error",
    "description": "A checkout request fails for the test scenario.",
    "priority": "high",
    "service": "checkout"
  }'
The title is required. If status and priority are omitted, the
documented defaults are open and medium, respectively.
6. Update an issue
curl -X PATCH "https://issuetrack-api-v95s.onrender.com/issues/REPLACE_WITH_ISSUE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": "high"
  }'
PATCH is intended for partial updates. Use a real issue ID and values
accepted by the running application.
7. Delete an issue
curl -X DELETE "https://issuetrack-api-v95s.onrender.com/issues/REPLACE_WITH_ISSUE_ID"
Use a test issue when experimenting with deletion.
Run Locally
Prerequisites
- Node.js and npm installed
- Git installed if cloning the repository
1. Clone the repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
Replace the placeholders with the repository URL and directory name.
2. Install dependencies
npm install
3. Start the application
npm start
For development, if the project defines a development script:
npm run dev
The local API is expected to be available at http://localhost:3000
when configured to use port 3000. If the application uses a
configurable port, follow the value set in its configuration.
Run Tests
Execute the automated test suite:
npm test
The project's test suite has been run successfully with the following
results:
- Tests passed: 31
- Statements coverage: 100%
- Lines coverage: 100%
- Functions coverage: 100%
- Branches coverage: 98.55%
These figures reflect the latest reported local test run; rerun npm test
and npm run coverage against the current checkout to reproduce them.
Deployment
The API is deployed on Render.
Typical Render settings for this project:
- Build command: npm install
- Start command: npm start
After deployment, verify the service using /health, then test the
collection endpoint /issues.
Deployment and performance observations
A benchmark of the deployed /health endpoint recorded:
  Metric                                                          Result
  Successful requests                                              30/30
  Median response time                                         263.32 ms
  P95 response time                                          1,172.17 ms
  First request / cold-start observation     Approximately 22.14 seconds
These are observations from one benchmark run, not a service-level
guarantee. Render free-tier cold starts can substantially affect the
first request.
Data Persistence
Issue data is stored through src/data/store.js using a JSON file
rather than a managed database.
This keeps the project simple to run and demonstrate, but it has
important limitations:
- JSON-file storage is not a substitute for a production database.
- Persistence on hosted platforms may be affected by restarts,
  redeployments, or ephemeral filesystems.
- Concurrent writes and multi-instance scaling need a more robust
  storage strategy.
For production use, replace the JSON store with a database such as
PostgreSQL or MySQL and add appropriate backup, migration, and
operational practices.
Project Structure
The confirmed storage module is:
src/
└── data/
    └── store.js
The broader project also contains the Express application, route/handler
code, and tests. Update this section to match the exact directory layout
in the repository before publishing if those paths differ.
Example Workflow
1. Check API availability with GET /health.
2. List existing issues with GET /issues.
3. Filter issues by status, priority, or service.
4. Create a new issue with POST /issues.
5. Retrieve or update it using its ID.
6. Delete a test issue when it is no longer needed.
Possible Improvements
- Replace JSON-file persistence with PostgreSQL or MySQL.
- Add pagination and sorting for larger issue collections.
- Introduce authentication and authorization.
- Add structured logging and request tracing.
- Add schema validation and a consistent error-response format.
- Add CI checks for tests and coverage.
- Add API documentation using OpenAPI/Swagger.
- Add integration tests against a dedicated test database.
Limitations
- The application is intended as a portfolio/demo project.
- The current persistence layer is JSON-file based.
- Hosted response times can vary, especially after inactivity.
- The benchmark numbers are specific to the test run and environment.

## License

This project is licensed under the [MIT License](LICENSE).
