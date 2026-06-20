# Deploy the CSR Shift Logger — easy steps

All in the browser. No terminal needed. ~20 minutes.
Part 1 sets up the database. Part 2 puts the app online. Part 3 is a quick check.

---

## Part 1 — Database (Supabase) · ~10 min

1. Go to **supabase.com** and sign in (the **"Continue with GitHub"** button is easiest).
2. Click **New project**.
   - Name: `csr-logger` (anything).
   - Database password: type one and **save it somewhere** (you won't need it day-to-day).
   - Region: pick the closest (e.g. **Singapore** or **Mumbai**).
   - Click **Create new project** and wait ~2 minutes for it to finish setting up.
3. Left menu → **SQL Editor** → **New query**.
   - Open `shift-logger/supabase/schema.sql` from your repo (github.com/ezanbhutta/reports),
     **copy everything**, **paste** it into the box, and click **Run**.
   - You should see **Success. No rows returned**. (This creates the tables, turns on live
     updates, and locks reports after submit.)
4. Left menu → **Project Settings** (gear icon) → **API**. Copy these two — keep them handy:
   - **Project URL** — looks like `https://abcd1234.supabase.co`
   - **anon public** key — a long string under "Project API keys".

---

## Part 2 — Host the app (Vercel) · ~10 min

5. Go to **vercel.com** and sign in with **GitHub**.
6. Click **Add New… → Project**. Find **`ezanbhutta/reports`** in the list → **Import**.
7. On the setup screen:
   - **Root Directory:** click **Edit** and choose the **`shift-logger`** folder. *(Important — the app lives in that folder.)*
   - **Framework Preset:** it should say **Vite** automatically. Leave the rest as-is.
   - Open **Environment Variables** and add these **two** (Name → Value):

     | Name | Value |
     |---|---|
     | `VITE_SUPABASE_URL` | the Project URL from step 4 |
     | `VITE_SUPABASE_ANON_KEY` | the anon key from step 4 |

8. Click **Deploy**. Wait 1–2 minutes.
9. When it finishes, click the live link. There are **two screens, one link**:
   - **CSR app** = the link itself (e.g. `https://your-app.vercel.app`). **Share this with the team.**
   - **CEO screen** = the same link with **`#ceo`** on the end
     (e.g. `https://your-app.vercel.app/#ceo`). Open it, type your CEO password. **Keep this to yourself.**

---

## Part 3 — Quick check · 2 min

10. Open the **CSR link**, pick a name + profile, **Start my report**, and log one action.
11. Open the **`#ceo` link** in another tab and enter the password — your test report should show up **live**.
12. In the CEO screen → **Roster** tab, add/edit/remove your real people. Their names then appear in the CSR "Your name" list.

---

## Good to know

- **Updating later:** anything pushed to the repo's `main` branch auto-redeploys on Vercel. No steps needed.
- **Manager accounts (CEO login):** sign-in uses **Supabase Auth** — no password lives in the app.
  Add or change managers in Supabase → **Authentication → Users** (use **Add user** + *Auto Confirm*,
  or send a password reset). Turn **off** public sign-ups under **Authentication → Providers → Email**
  so only people you add can get in. If Supabase isn't configured (local demo), the console password is `admin`.
- **Two separate links, one password:** the CSR app needs no password; only the `#ceo` screen does.
- If you skip Part 1 (Supabase), the app still runs but only saves on one device — so do Part 1 for the real, shared, live version.
