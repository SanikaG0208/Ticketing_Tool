# Organization Ticketing Tool — Supabase connected

## Employee simplicity and management insights

Creation keeps routing and an issue summary/description visible. Single-choice employee/type/subtype selections are filled automatically. Priority, screenshot and affected-system information are optional details. Employees can indicate that an issue prevents them from working. This is reported work blockage, not independently measured system availability; older tickets have unknown downtime rather than inferred zero downtime.

IT can open Service insights. Server-side aggregates cover all accessible tickets, regardless of list pagination: assigned ownership, first response, first resolution, reported downtime and recurring category/system combinations during the last 90 days. First response counts an assignee/IT comment or status change by someone other than the creator. First resolution counts the first recorded Resolved transition, separately from Completed. Reported downtime runs from creation to that first resolution and keeps accumulating while unresolved. Reopened incident intervals are not measured separately. Repeated categories are potential patterns, not confirmed duplicate incidents. Unavailable historic events are excluded from averages. Management access is checked again in the database RPC; the UI role check alone is not trusted. Database-generated creation/comment timestamps prevent clients from choosing their own event times.

Ticket loading uses async/await and parallel catalog requests. The initial ticket list fetches 50 rows; Load more fetches the next 50 using the last ticket number. Search and dashboard counts cover the loaded tickets. Screenshot links are requested only when opening ticket details. Comments show the latest 50 entries. Saves disable repeated submissions, and timestamp checks reject conflicting ticket edits instead of overwriting another user's changes. These improvements reduce request volume; concurrent-user capacity still needs load testing against the chosen Supabase plan before production rollout.

## Run in VS Code

Open C:\Users\sanika\Ticketing Tool, then run:

```powershell
npm install
Copy-Item .env.example .env.local
npm run ui
```

For a fresh clone, fill VITE_SUPABASE_PUBLISHABLE_KEY in .env.local with the project's public publishable key before running the UI. Keep .env.local private. If you already have .env.local, keep your existing file instead of copying over it. Open http://localhost:5173. Restart Vite after changing environment files.

## Authentication and protected routes

Project: https://supabase.com/dashboard/project/rhaxyauixzdmwrysquvc

Manik Joshi (manik@b2bindemand.com) is the initial real Supabase Auth user and IT profile. Use the password you provided for this account. No other employees, ticket types, subtypes or tickets were left in the database.

Email/password login, session restoration, refresh and logout use Supabase Auth. The app checks a verified Auth user and an active database profile before displaying the workspace. Hash routes /tickets, /users, /departments and /types are protected; only IT can use the administration routes. The UI does not fall back to demo credentials or local ticket data.

Department permissions come from protected profile records, not user-editable metadata. Supabase row-level security enforces data access independently of React. Non-IT employees can read tickets they raised or that are assigned to them, and edit only tickets they raised. IT can read/edit all tickets and update work status. Assigned employees can change Open, In Progress and Resolved status on their tickets. Only the creator can mark a Resolved ticket Completed; Completed status cannot be reopened. Ticket participants and IT can post and read comments, with author and timestamp stored in Supabase. Account/profile creation goes through the deployed ticketing-admin Edge Function, which validates the access token and the current IT profile before calling the Auth Admin API. Self-editing profiles is denied.

## Connected data

Departments, employees and tickets are read from and saved to Supabase. Employees depend on the selected department. Ticket types and subtypes have been removed. The recipient/department relationship is enforced in the database. Screenshots use a private Supabase Storage bucket and expiring download URLs. The employee directory is available as a minimal active-employee list for ticket routing; IT administration remains protected.

The browser uses only the publishable key in .env.local. Never add a service-role/secret key to a VITE_ variable. The Edge Function uses Supabase's server-side service key. The optional Node server in src/ remains available for later separate hosting, but it is not needed to run the current app.

Existing passwords cannot be retrieved from Supabase. The employee table can preview only a password entered when IT creates an employee during the current session; that preview clears on logout/reload. Passwords are not stored in profile records.

## Email configuration still required

Credential and ticket emails use the ticketing-admin Edge Function. Configure RESEND_API_KEY and EMAIL_FROM as Supabase Edge Function secrets, plus APP_LOGIN_URL for your app's login URL and APP_ORIGIN for its deployed frontend origin. Without a provider the account/ticket is still created, and delivery reports not_configured. No real emails were sent during setup.

Password-reset emails use Supabase Auth's email service. Set the Auth Site URL and allowed redirect URLs for your localhost/deployed app so recovery links return to the app. The frontend handles the PASSWORD_RECOVERY event and lets the employee enter a new password. No recovery email was sent during verification.

Public sign-up is absent from the UI; unprovisioned Auth accounts cannot access tables. For the organization-only setup, disable Allow new users to sign up in Supabase Auth settings. This dashboard setting was not changed by the available tools. The security advisor reports leaked-password protection disabled; its setting can be enabled where supported: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Database setup

The database/setup.sql, database/attachment-cleanup.sql and database/ticket-workflow.sql changes have already been applied to this project. Do not run them again. The temporary initialization function was overwritten with a permanently closed response after creating the first IT account. The normal admin function source is in supabase/functions/ticketing-admin/index.ts.

## Verification

```powershell
npm test
npm run build
```

Verified: real Manik sign-in, wrong-password rejection, anonymous table and admin-function denial, employee RLS ownership/status/profile restrictions, unprovisioned account denial, browser sign-in, session restoration after refresh, sign-out, and direct protected-route redirection to login. Temporary policy-test records were rolled back; they did not leave employees or tickets in the database. Credential email and recovery-email delivery require provider configuration and were not tested.

For schema setups built from the earlier SQL files, apply `database/issue-start.sql` and then `database/remove-ticket-categories.sql` after the activity and insights SQL. The category-removal migration preserves tickets and activity history. Recurrence now groups named affected systems by department.

Apply `database/dependent-ticket-routing.sql` after the category-removal migration. Active departments hold their configured issue options. Existing Developer departments use the Development options. New tickets capture the authenticated creator, validate the selected issue and active POC, and default to Auto Assign. Auto Assign selects the first active department user by name (UUID breaks ties); Other POC records the requested person/team and uses the same default assignee for review. A department with no active POC cannot accept a ticket.

Apply database/ticket-communication.sql after ticket-reassign.sql. Comments support one optional PNG/JPEG screenshot up to 5 MB in the existing private bucket. Comment attachments are retained with history. Ticket activity generates recipient-scoped in-app notifications; viewing a discussion marks updates read. Email update links use the existing ticketing-admin Edge Function and require RESEND_API_KEY plus EMAIL_FROM. Delivery failures remain visible and do not discard saved updates. Notification links open the requested ticket after sign-in. New unread updates are polled every 30 seconds.

### Excel ticket exports

Use ticket checkboxes to show **Export Selected (Excel)**. **Export All · filters** exports all accessible matching tickets, with Created date (inclusive IST days), department/assigned team, status, issue/tool, POC and SLA filters. The export is fetched in pages rather than being limited to the visible ticket list. Supabase row-level security still controls access.

The `.xlsx` workbook contains the recommended ticket fields, IST date cells, numeric durations in hours, frozen headings and Excel column filters. An Export details sheet explains the applied filters and timing definitions. Missing milestones are blank. SLA is `Not configured` until targets/clock rules are defined; Root Cause and Resolution notes are blank until those dedicated fields are captured. Downtime uses recorded work blockage and issue start to first resolution; ongoing blockage accumulates.

Database view: `database/ticket-export.sql`. ExcelJS is loaded only when generating an export.

### Admin, POC and Employee workspaces

Roles are stored in `profiles.role` (`admin` / `employee`), with `profiles.is_poc` identifying department POCs. IT department membership does not grant Admin access. Supabase RLS checks Admin role, department POC visibility, and ticket ownership. The first Admin account uses `newadmin@123.com`; its password is not stored in repository files. Manik remains an IT POC.

- Admin views all tickets and manages employees, Admin/POC designation and departments.
- Employee has Raised by me and Raised for me tabs. Only ticket creator/Admin can edit ticket details; assigned employees can update work status and comment.
- POC also has Raised for employees: other employees' tickets sent to their department. These allow viewing/commenting, without editing or reassignment.
- No ticket Delete action is provided. Support marks Resolved; the creator confirms Completed. Completed/Closed tickets remain read-only; the creator can explicitly reopen a resolved/completed ticket with a reason.

Component layout: `frontend/views/admin`, `frontend/views/poc`, `frontend/views/employee`; `frontend/features/admin` contains employee/department management; `frontend/features/tickets` contains the table, raise form and detail editor; `frontend/auth` contains login and shared permission checks.

### Admin reporting and support workflows

Admin navigation includes Dashboard, All Tickets, Downtime, SLA, Team Performance, Reports and Export. Components live under `frontend/views/admin`. The Admin-only `admin_service_metrics` RPC supplies organization totals, issue-start-based employee downtime and per-current-owner workload/timing aggregates. Reports list recurring named systems over 90 days. SLA thresholds remain unconfigured; reporting displays measured response/resolution times without claiming a breach or compliance.

POC opens on Assigned Tickets, with SLA timings in the ticket View. Admin/current assignee can Reassign / Escalate to any active employee across departments, with a required reason. The original ticket department is retained; assigned team follows the new employee department. Initial ticket creation still requires an active designated POC in the selected department. Reassignment records actor, old/new owner, reason and timestamp in activity; the first reassignment is the Escalated milestone. New assignees can read the received ticket, update work status and comment. Other department POCs retain comment-only access. Completed tickets remain locked.
