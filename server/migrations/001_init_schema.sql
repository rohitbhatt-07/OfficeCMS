-- 001: Core schema. Runs as the OWNER database user.

-- ===== Roles & permissions =====
CREATE TABLE roles (
  id          SMALLSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE permissions (
  id          SMALLSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,      -- e.g. 'records:write'
  description TEXT
);

CREATE TABLE role_permissions (
  role_id       SMALLINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id SMALLINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ===== Users =====
CREATE TABLE users (
  id                 BIGSERIAL PRIMARY KEY,
  email              TEXT NOT NULL,
  full_name          TEXT NOT NULL,
  password_hash      TEXT NOT NULL,                 -- never plaintext
  role_id            SMALLINT NOT NULL REFERENCES roles(id),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE, -- deactivate instead of delete
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until       TIMESTAMPTZ,
  last_login_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX users_email_lower_key ON users (LOWER(email));

CREATE TABLE departments (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which departments' records a Staff/Viewer user may see.
CREATE TABLE user_departments (
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, department_id)
);

-- ===== Records =====
CREATE TABLE record_categories (
  id                BIGSERIAL PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  description       TEXT,
  field_definitions JSONB NOT NULL DEFAULT '[]'::jsonb,  -- extra fields per category
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE records (
  id               BIGSERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  notes            TEXT,
  category_id      BIGINT REFERENCES record_categories(id),
  reference_number TEXT,
  department_id    BIGINT REFERENCES departments(id),
  record_date      DATE,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('draft','active','archived','closed')),
  custom_fields    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,                          -- soft delete
  search_vector    TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, COALESCE(reference_number, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, COALESCE(notes, '')), 'C')
  ) STORED
);
CREATE UNIQUE INDEX records_reference_unique ON records (reference_number)
  WHERE reference_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX records_search_idx   ON records USING GIN (search_vector);
CREATE INDEX records_category_idx ON records (category_id);
CREATE INDEX records_department_idx ON records (department_id);
CREATE INDEX records_date_idx     ON records (record_date);
CREATE INDEX records_created_idx  ON records (created_at DESC);

-- ===== Documents (metadata only; files live in /storage) =====
CREATE TABLE documents (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  category_id BIGINT REFERENCES record_categories(id),
  department_id BIGINT REFERENCES departments(id),
  uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, COALESCE(description, '')), 'B')
  ) STORED
);
CREATE INDEX documents_search_idx   ON documents USING GIN (search_vector);
CREATE INDEX documents_category_idx ON documents (category_id);
CREATE INDEX documents_created_idx  ON documents (created_at DESC);

-- Every upload is a version. Current version = highest version_number.
CREATE TABLE document_versions (
  id                BIGSERIAL PRIMARY KEY,
  document_id       BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number    INTEGER NOT NULL,
  original_filename TEXT NOT NULL,          -- display only, never used as a path
  stored_filename   TEXT NOT NULL UNIQUE,   -- random UUID name on disk
  extension         TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  size_bytes        BIGINT NOT NULL CHECK (size_bytes >= 0),
  sha256            TEXT NOT NULL,
  uploaded_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version_number)
);

CREATE TABLE record_documents (
  record_id   BIGINT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  linked_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (record_id, document_id)
);
CREATE INDEX record_documents_doc_idx ON record_documents (document_id);

-- ===== Audit log (append-only) =====
CREATE TABLE audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_email    TEXT,                       -- snapshot, so history survives user changes
  action        TEXT NOT NULL,              -- e.g. 'record.create', 'auth.login_failed'
  resource_type TEXT,
  resource_id   TEXT,
  details       JSONB,                      -- never put passwords/tokens here
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_user_idx    ON audit_logs (user_id);
CREATE INDEX audit_logs_action_idx  ON audit_logs (action);

-- Block UPDATE/DELETE on audit_logs for everyone (defence in depth beyond GRANTs).
CREATE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

-- ===== Imports =====
CREATE TABLE import_jobs (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  file_type      TEXT NOT NULL CHECK (file_type IN ('csv','xlsx')),
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','completed','failed')),
  total_rows     INTEGER NOT NULL DEFAULT 0,
  success_rows   INTEGER NOT NULL DEFAULT 0,
  failed_rows    INTEGER NOT NULL DEFAULT 0,
  column_mapping JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE TABLE import_errors (
  id            BIGSERIAL PRIMARY KEY,
  import_job_id BIGINT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number    INTEGER NOT NULL,
  message       TEXT NOT NULL,
  row_data      JSONB
);
CREATE INDEX import_errors_job_idx ON import_errors (import_job_id);

-- ===== Keep updated_at fresh =====
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER users_updated     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER records_updated   BEFORE UPDATE ON records   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER documents_updated BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== Least-privilege access for the app user =====
GRANT USAGE ON SCHEMA public TO officecms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO officecms_app;
REVOKE UPDATE, DELETE ON audit_logs FROM officecms_app;   -- insert + select only
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO officecms_app;
