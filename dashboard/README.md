# Transaction Intelligence Dashboard

This Angular application presents the prepared analytical outputs from the parent project.
It contains five routes: Overview, Banking activity over time, Customer segmentation,
Validation and insights, and About the project.

During development, `pnpm start` runs the Angular server and forwards `/api` requests to
FastAPI on port 8000. For a single-server run, `pnpm build` creates the static application
that FastAPI serves from the repository root.

See the root `README.md` for setup, data prerequisites, and complete run instructions.
