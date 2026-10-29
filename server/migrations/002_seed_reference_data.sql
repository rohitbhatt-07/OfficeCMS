-- 002: Roles, permissions, and starter categories/departments.

INSERT INTO roles (name, description) VALUES
  ('Super Admin', 'Full system access'),
  ('Admin',       'Manage records and documents; import/export; read users'),
  ('Staff',       'Create/edit records, upload documents'),
  ('Viewer',      'Read-only access');

INSERT INTO permissions (code, description) VALUES
  ('records:read',     'View and search records'),
  ('records:write',    'Create and edit records'),
  ('records:delete',   'Delete records'),
  ('documents:read',   'View and download documents'),
  ('documents:upload', 'Upload documents and new versions'),
  ('documents:delete', 'Delete documents'),
  ('import:run',       'Import records from CSV/XLSX'),
  ('export:run',       'Export records'),
  ('users:read',       'View users'),
  ('users:manage',     'Create, edit, deactivate users'),
  ('audit:read',       'View audit logs'),
  ('settings:manage',  'Change system settings, categories, departments');

-- Super Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'Super Admin';

-- Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN
  ('records:read','records:write','records:delete','documents:read','documents:upload',
   'documents:delete','import:run','export:run','users:read','audit:read')
WHERE r.name = 'Admin';

-- Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN
  ('records:read','records:write','documents:read','documents:upload','export:run')
WHERE r.name = 'Staff';

-- Viewer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('records:read','documents:read')
WHERE r.name = 'Viewer';

INSERT INTO departments (name) VALUES ('Administration'), ('Finance'), ('Human Resources'), ('Operations');

INSERT INTO record_categories (name, description) VALUES
  ('General',   'General office records'),
  ('Contracts', 'Agreements and contracts'),
  ('Invoices',  'Invoices and billing'),
  ('Letters',   'Incoming and outgoing correspondence');
