-- ============================================================
-- ASK Platform — Postgres Schema (v3 — separate PC / RA schemas + GCS paths)
-- Run this once against your Postgres instance.
-- Connection: Set DATABASE_URL env var (see .env.local.example)
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS on every CREATE.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- CREATE SCHEMAS (namespaces — like folders for tables)
--
--   pc.*      → PC module's private tables
--   ra.*      → RA module's private tables
--   public.*  → shared tables (user_profiles)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS pc;
CREATE SCHEMA IF NOT EXISTS ra;


-- ============================================================
-- 1. COMPANIES (one per schema — NO module column needed)
--
-- The schema name IS the module:
--   pc.companies = PC companies
--   ra.companies = RA companies
-- ============================================================

-- PC companies
CREATE TABLE IF NOT EXISTS pc.companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL UNIQUE,              -- unique within PC
  created_by  VARCHAR(255),                              -- Firebase UID
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- RA companies
CREATE TABLE IF NOT EXISTS ra.companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL UNIQUE,              -- unique within RA
  created_by  VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. UPLOAD JOBS (one per schema)
--
-- gcs_paths stores the permanent GCS location of each uploaded file
-- so the frontend can offer re-download links in later sessions.
-- Example: {"report.pdf": "gs://bucket/inputs/gmr/presentations/report.pdf"}
-- ============================================================

-- PC upload jobs
CREATE TABLE IF NOT EXISTS pc.upload_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES pc.companies(id) ON DELETE CASCADE,
  status          VARCHAR(30)  NOT NULL DEFAULT 'uploading',
  progress        INTEGER      NOT NULL DEFAULT 0,
  file_names      JSONB        NOT NULL DEFAULT '[]',
  file_categories JSONB        DEFAULT '{}',
  gcs_paths       JSONB        DEFAULT '{}',              -- {"filename": "gs://bucket/path/to/file"}
  uploaded_by     VARCHAR(255),
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_pc_upload_jobs_company
  ON pc.upload_jobs(company_id, started_at DESC);

-- RA upload jobs
CREATE TABLE IF NOT EXISTS ra.upload_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES ra.companies(id) ON DELETE CASCADE,
  status          VARCHAR(30)  NOT NULL DEFAULT 'uploading',
  progress        INTEGER      NOT NULL DEFAULT 0,
  file_names      JSONB        NOT NULL DEFAULT '[]',
  file_categories JSONB        DEFAULT '{}',
  gcs_paths       JSONB        DEFAULT '{}',              -- {"filename": "gs://bucket/path/to/file"}
  uploaded_by     VARCHAR(255),
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_ra_upload_jobs_company
  ON ra.upload_jobs(company_id, started_at DESC);


-- ============================================================
-- 3. GENERATION JOBS (one per schema)
--
-- Tracks the PROCESS of generating a section.
-- Status, progress, errors — operational data.
-- Actual outputs (PPTs, references) are stored in output_files.
-- ============================================================

-- PC generation jobs
CREATE TABLE IF NOT EXISTS pc.generation_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES pc.companies(id) ON DELETE CASCADE,
  section_name    VARCHAR(255) NOT NULL,
  subsidiary_name VARCHAR(255),
  status          VARCHAR(30)  NOT NULL DEFAULT 'pending',
  progress        INTEGER      NOT NULL DEFAULT 0,
  output_url      TEXT,                                    -- temporary signed URL (backend writes this during pipeline)
  backend_job_id  VARCHAR(255),
  created_by      VARCHAR(255),
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_pc_gen_jobs_company
  ON pc.generation_jobs(company_id, started_at DESC);

-- RA generation jobs
-- NOTE: RA has NO sections — it generates ONE final report per company.
CREATE TABLE IF NOT EXISTS ra.generation_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES ra.companies(id) ON DELETE CASCADE,
  status          VARCHAR(30)  NOT NULL DEFAULT 'pending',
  progress        INTEGER      NOT NULL DEFAULT 0,
  output_url      TEXT,                                    -- temporary signed URL (backend writes this during pipeline)
  backend_job_id  VARCHAR(255),
  created_by      VARCHAR(255),
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_ra_gen_jobs_company
  ON ra.generation_jobs(company_id, started_at DESC);


-- ============================================================
-- 4. OUTPUT FILES (one per schema)
--
-- Permanent record of WHAT WAS PRODUCED.
-- Queried on re-login: "Show me all outputs for company GMR."
-- Separated from jobs (which track the process) for clean querying.
--
-- file_type values:
--   'pptx'       — generated section deck
--   'references' — provenance/audit trail
--   'merged'     — final merged deck (all sections combined)
--
-- generation_job_id is NULLABLE because merged outputs
-- are not tied to a single section's generation job.
-- ============================================================

-- PC output files
CREATE TABLE IF NOT EXISTS pc.output_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID         NOT NULL REFERENCES pc.companies(id) ON DELETE CASCADE,
  generation_job_id UUID         REFERENCES pc.generation_jobs(id) ON DELETE SET NULL,  -- NULL for merged outputs
  file_type         VARCHAR(50)  NOT NULL,                 -- pptx, merged
  section_name      VARCHAR(255),                          -- NULL for merged outputs
  file_name         VARCHAR(500) NOT NULL,                 -- generated_deck.pptx
  gcs_path          TEXT         NOT NULL,                 -- gs://bucket/path/to/output.pptx
  gcs_references_path TEXT,                                -- gs://bucket/path/to/references.md (NULL for merged)
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pc_output_files_company
  ON pc.output_files(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pc_output_files_job
  ON pc.output_files(generation_job_id);

-- RA output files
-- NOTE: RA has no sections or merging — just one report per generation job.
CREATE TABLE IF NOT EXISTS ra.output_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID         NOT NULL REFERENCES ra.companies(id) ON DELETE CASCADE,
  generation_job_id UUID         REFERENCES ra.generation_jobs(id) ON DELETE SET NULL,
  file_type         VARCHAR(50)  NOT NULL,                 -- report (single final report)
  file_name         VARCHAR(500) NOT NULL,                 -- final_report.pptx
  gcs_path          TEXT         NOT NULL,                 -- gs://bucket/path/to/output.pptx
  gcs_references_path TEXT,                                -- gs://bucket/path/to/references.md
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ra_output_files_company
  ON ra.output_files(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ra_output_files_job
  ON ra.output_files(generation_job_id);


-- ============================================================
-- 5. USER PROFILES — stays in public (shared across both modules)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  firebase_uid  VARCHAR(255) PRIMARY KEY,
  display_name  VARCHAR(255),
  email         VARCHAR(255),
  role          VARCHAR(30)  NOT NULL DEFAULT 'member',
  modules       JSONB        NOT NULL DEFAULT '["pc"]',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
-- DONE. Verify with:
--   SELECT schemaname, tablename FROM pg_tables
--   WHERE schemaname IN ('pc', 'ra', 'public')
--   ORDER BY schemaname, tablename;
--
-- Expected output:
--   pc       | companies
--   pc       | generation_jobs
--   pc       | output_files
--   pc       | upload_jobs
--   public   | user_profiles
--   ra       | companies
--   ra       | generation_jobs
--   ra       | output_files
--   ra       | upload_jobs
-- ============================================================
