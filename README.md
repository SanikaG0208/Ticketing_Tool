# Organization Ticketing Tool — Supabase connected

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

Departments, employees, department-specific types, subtypes and tickets are read from and saved to Supabase. Employee and Type depend on selected Department; Subtype depends on Type. Composite foreign keys enforce these relationships in the database. Screenshots use a private Supabase Storage bucket and expiring download URLs. The employee directory is available as a minimal active-employee list for ticket routing; IT administration remains protected.

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
