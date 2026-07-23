# Transaction Intelligence: Customer Segmentation and Behavioral Analytics

This project uses the Berka (PKDD'99) banking dataset to build customer-level
behavioral profiles, discover meaningful customer segments, and explore unusual
account activity. The emphasis is on exploratory data analysis, relational data
preparation, unsupervised learning, and responsible interpretation—not fraud
prediction.

## Project status

All four planned notebooks are complete: the reproducible data foundation, behavioral and
temporal analysis, customer segmentation, behavioral-outlier workflow, supervised-learning
case study, data-centric validation, and final synthesis are established. A read-only FastAPI
service and Angular dashboard present the prepared results without exposing the source tables.

## Structure

```text
data/       Raw, interim, and processed datasets
dashboard/  Angular dashboard with four analytical views
notebooks/  Reproducible analytical workflow
reports/    Figures and final deliverables
src/        Reusable Python package and FastAPI service
tests/      Automated checks for data, feature logic, and API behavior
```

## Data architecture

```mermaid
flowchart LR
    A["Source (external)<br/>CTU MariaDB"]
    B["Bronze<br/>data/raw/<br/>CSV, DDL, manifest, checksums"]
    C["Silver<br/>data/interim/<br/>Validated DuckDB and clean Parquet"]
    D["Gold<br/>data/processed/<br/>Features, segments, and analytical outputs"]
    E["Read-only API<br/>src/transaction_intelligence/api/<br/>Curated dashboard endpoints"]
    F["Presentation<br/>dashboard/ and reports/<br/>Interactive views and figures"]

    A --> B --> C --> D --> E --> F
```

| Layer | Repository location | Contents | Git policy |
|---|---|---|---|
| Source | External to the repository | Public CTU MariaDB database | Not applicable |
| Bronze | `data/raw/` | Immutable source CSV files, MariaDB DDL, provenance, and checksums | CSV data ignored; schema and manifest committed |
| Silver | `data/interim/` | Validated DuckDB database and cleaned Parquet tables | Generated data ignored |
| Gold | `data/processed/` | Customer features, segments, outliers, forecasts, and dashboard-ready tables | Full generated data ignored; six anonymous or aggregate dashboard files committed for deployment |
| API | `src/transaction_intelligence/api/` | Read-only endpoints over selected Gold tables and report figures | Application code committed |
| Presentation | `dashboard/` and `reports/` | Angular views, selected figures, and final course deliverables | Source and intended report figures committed; builds ignored |

## Data

The Berka dataset files are not committed to this repository. Place the original,
unchanged files in `data/raw/` and document their source and retrieval date.

```text
Source: CTU Prague Relational Dataset Repository
Dataset: Financial — PKDD’99 Financial Dataset
Retrieved: 2026-07-17
URL: https://relational.fel.cvut.cz/dataset/Financial
```

### Downloading the dataset

After completing the setup below, provide the public CTU guest password through
an environment variable and run the downloader:

```bash
export BERKA_DB_PASSWORD='ctu-relational'
python scripts/download_berka.py
unset BERKA_DB_PASSWORD
```

Alternatively, omit the environment variable and the script will request the
password securely. It streams all eight database tables to CSV files in
`data/raw/`, so the large transaction table is never loaded fully into memory.
It also creates `download_manifest.json` with the retrieval time, row counts,
SHA-256 checksums, ordered column names and MariaDB types, primary keys, and
foreign-key relationships. The downloader compares each exact source-table row
count with the exported row count and stops if they differ. The manifest is safe
to commit because it contains metadata rather than banking records. The original
MariaDB table definitions, indexes, and constraints are retained separately in
`data/raw/schema_mariadb.sql`. Database nulls are represented in CSV as `\N` so
they remain distinguishable from empty strings.

Existing raw files are not replaced unless explicitly requested:

```bash
python scripts/download_berka.py --overwrite
```

### Building the local relational database

After downloading the snapshot, build the local DuckDB database:

```bash
python scripts/build_local_database.py
```

The builder verifies every raw-file checksum, reconstructs typed tables with
primary and foreign keys, loads parent tables before their children, compares
local and source row counts, and checks every relationship for orphaned records.
It produces:

```text
data/interim/berka.duckdb
data/interim/relationship_validation.json
```

The notebooks should query this local database rather than repeatedly accessing
the public CTU server. To intentionally rebuild it, use:

```bash
python scripts/build_local_database.py --overwrite
```

## Setup

The analytical workflow and API require Python 3.11 or newer.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
```

The dashboard also requires a Node.js version supported by Angular 21 and pnpm 11:

```bash
cd dashboard
corepack enable
pnpm install
cd ..
```

## Dashboard application

The application has five views built from the notebook outputs and project documentation:

1. **Overview** — portfolio measures, monthly activity, segment sizes, and the data journey.
2. **Banking activity over time** — monthly series, cash movement, forecasting results, and service associations.
3. **Customer segmentation** — segment profiles, PCA visualization, and anonymized behavioral-outlier cases.
4. **Validation and insights** — supervised-learning results, stability checks, limitations, and responsible-use guidance.
5. **About the project** — course information, data source, system architecture, project boundaries, and AI-assistance disclosure.

The API only reads the six prepared Parquet datasets needed by these views. It does not accept
arbitrary SQL, expose raw account identifiers, or make lending or fraud decisions.

### Development

Run the API from the repository root:

```bash
source .venv/bin/activate
uvicorn transaction_intelligence.api.main:app --reload --port 8000
```

In a second terminal, run the Angular development server:

```bash
cd dashboard
pnpm start
```

Open `http://localhost:4200`. The Angular development server sends `/api` requests to the local
FastAPI service. Interactive API documentation is available at `http://localhost:8000/docs`.

### Single-server build

For a production-style local run, build Angular and let FastAPI serve both the frontend and API:

```bash
cd dashboard
pnpm build
cd ..
source .venv/bin/activate
uvicorn transaction_intelligence.api.main:app --host 127.0.0.1 --port 8000
```

Open `http://localhost:8000`. Run all notebooks before starting the dashboard so the required
Gold datasets and validation figures exist.

### Render deployment

The repository includes a multi-stage `Dockerfile` that builds Angular and serves the compiled
application and read-only API from one FastAPI process. The deployed image contains only six
small dashboard-ready Parquet files and five intended report figures. Raw Berka data, the local
DuckDB database, full account-level analytical tables, notebooks, and trained models are not
copied into the image. `requirements-api.txt` keeps the container limited to packages needed to
serve these results; the complete analytical environment remains defined in `pyproject.toml`.

Test the production image locally:

```bash
docker build -t transaction-intelligence .
docker run --rm -p 10000:10000 -e PORT=10000 transaction-intelligence
```

Then open `http://localhost:10000`, verify `/api/v1/health`, and review the API documentation at
`/docs`.

To deploy the free service:

1. Push the deployment files and the six selected dashboard outputs to GitHub.
2. In Render, choose **New → Blueprint** and connect this repository.
3. Render reads `render.yaml`, builds the Docker image, and checks `/api/v1/health`.
4. Open the generated `onrender.com` URL after the deployment becomes live.

Every later commit to `main` triggers a new deployment. A free Render service sleeps after a
period without traffic, so the first request after inactivity can take longer.

### Verification

```bash
pytest -q
cd dashboard
pnpm test
pnpm build
```

## AI assistance disclosure

*I used AI as an engineering productivity tool for brainstorming, troubleshooting, and documentation, while remaining responsible for all technical decisions, implementation, testing, validation, and conclusions.*
