# Office CMS

Centralized office content management system (React + Express + PostgreSQL).

## First-time setup (Windows, PowerShell)
1. Copy this folder to `C:\OfficeCMS`.
2. Open PowerShell in `C:\OfficeCMS`, then:
   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\setup.ps1
   ```
   It creates the database and two restricted DB users, writes `server\.env` with random
   passwords, installs packages, and creates all tables.
3. Create your first admin:
   ```powershell
   npm run seed --prefix server -- --email you@office.com --name "Your Name" --password "A-long-password-12+"
   ```
4. Start: `npm run dev`, then open http://localhost:5173 (API health: http://localhost:3000/api/health).

## Folders
- `client/`  React app (Vite). `server/` Express API. `server/migrations/` SQL schema, applied in order by `npm run migrate`.
- `storage/` private uploaded files (never served directly). `backups/` database dumps. `docs/` notes.

## Commands
`npm run dev` · `npm run migrate` · `npm test` · `npm run seed --prefix server -- ...`

## Security notes
`server\.env` holds secrets and is git-ignored; never share it. The app connects as `officecms_app`
(no DDL, no UPDATE/DELETE on audit logs). Migrations use `officecms_owner`.
