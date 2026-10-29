-- Run by setup.ps1 as the PostgreSQL superuser (postgres). Safe to re-run.
-- Variables passed with psql -v:  owner_pw, app_pw
\set ON_ERROR_STOP on

SELECT 'CREATE ROLE officecms_owner LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'officecms_owner') \gexec
SELECT 'CREATE ROLE officecms_app LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'officecms_app') \gexec

ALTER ROLE officecms_owner PASSWORD :'owner_pw';
ALTER ROLE officecms_app   PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE;

SELECT 'CREATE DATABASE officecms OWNER officecms_owner'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'officecms') \gexec

REVOKE CONNECT ON DATABASE officecms FROM PUBLIC;
GRANT CONNECT ON DATABASE officecms TO officecms_owner, officecms_app;

\connect officecms
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO officecms_owner;
GRANT USAGE ON SCHEMA public TO officecms_app;
