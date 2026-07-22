# CSR Shift Logger — Reminder Logics

**Your owner-defined reminder rules, exactly as they run in the live app.**
Generated from the shipped code (`src/config.js`) so you can read each rule and
verify it against how the system behaves. Last updated: 22 Jul 2026.

---

## How every reminder works (the shared rules)

These apply to **all** reminders unless a specific rule says otherwise:

- **Profile-scoped.** A reminder belongs to the **profile**, not the person. It
  pops for whoever is covering that profile at the time — *any shift, any CSR*.
- **Persistent.** It stays on screen until someone resolves it with one of its
  buttons. It never expires on its own.
- **Snooze = 5 minutes.** Every normal reminder has a Snooze button; it hides the
  reminder for 5 minutes, then it comes back. (Red alerts have **no** snooze.)
- **One per entry, per rule.** Logging one activity books at most one reminder
  from each rule. Editing the entry re-checks the rule.
- **Every action is undoable for 5 seconds.** Resolving, snoozing, or advancing a
  chain shows an Undo toast — a mis-tap is never final.
- **Spam / not relevant books nothing.** That activity has no reminder attached.
- **Red alerts are different.** Frustrated / Disputed show as a standing **red
  caution box**, not a normal reminder card — no snooze, only **Solved** clears
  them.

**"Immediate" means 0 minutes** — the reminder is due the moment the activity is
logged.

---

## Quick reference

| # | You log this activity | Reminder appears | What it asks | Buttons |
|---|---|---|---|---|
| 1 | **New inquiry** | after **25 min** | Send 1st follow-up | In discussion · Followed up · Order taken |
| 2 | **Lead follow-up** (1st/2nd/3rd) | **12h / 24h / 48h** | Send the next follow-up | In discussion · Followed up · Order taken |
| 3 | **New order** | after **30 min** | Assign to a designer | Next shift (8h) · Assigned |
| 4 | **New order** = *Direct Order* | **immediately** | Potential upsell (esp. Website) | No need · Upsell done |
| 5 | **Order completed** | after **30 min** | Ask client for **Public Review** | No need · Msg sent · Review given |
| 6 | **Review received** (avg 4.7–5.0) | after **24h** | Ask client for **Private Review** | Msg sent |
| 7 | **Files Assigned to Designer** | **immediately** | Suggest an upsell | No need · Upsell done |
| 8 | **Revision assigned** | after **your typed time** | Is the revision done? | Follow-up done · Revision done |
| 9 | **Offer** | after **2h** (then chains) | Follow up on the offer | Order placed · 1st F/U done → … |
| 10 | **Project delivered** / **Shared in chat** | after **15h** | Follow up on that item | Responded · Followed up |
| 11 | **Frustrated client** | **immediately** (red) | Handle with caution | Solved |
| 12 | **Disputed client** | **immediately** (red) | Dispute open — treat cautiously | Solved |

---

## The 12 logics in detail

### 1. New inquiry → 1st follow-up
- **Trigger:** logging **New inquiry**.
- **Delay:** **25 minutes**.
- **Reminder:** "Send the 1st follow-up to *[client]*."
- **Buttons:** **In discussion** · **Followed up** · **Order taken**
  *(all three simply close the reminder — no form opens.)*

### 2. Lead follow-up chain
- **Trigger:** logging **Lead follow-up** and picking which attempt it was.
- **Delay depends on the attempt you logged:**
  - Logged **1st** → remind to do the **2nd** after **12 hours**
  - Logged **2nd** → remind to do the **3rd** after **24 hours**
  - Logged **3rd** → remind to do the **4th & last** after **48 hours**
  - Logged **4th+** → **books nothing** (the chain ends there)
- **Reminder:** "Send the *[2nd / 3rd / 4th & last]* follow-up to *[lead]*."
- **Buttons:** **In discussion** · **Followed up** · **Order taken**

### 3. New order → assign to designer
- **Trigger:** logging **New order**.
- **Delay:** **30 minutes**.
- **Reminder:** "Assign *[client]*'s order to a designer."
- **Buttons:**
  - **Next shift** — snoozes the reminder **8 hours** (assign on the next shift)
  - **Assigned** — order assigned; closes it

### 4. New order → potential upsell (Direct Order only)
- **Trigger:** logging **New order** **and** marking it **"Direct Order"** (in the
  new *How the order came in* choice). A **"Via Chat"** order books **no** upsell
  reminder. This is a **second, separate** reminder — a Direct Order books both #3
  and #4; a Via Chat order books only #3.
- **Delay:** **immediately**.
- **Reminder:** "Potential upsell for *[client]* — what's missing? Especially a
  Website." *(the order's service shows as context.)*
- **Buttons:** **No need** · **Upsell done**

### 5. Order completed → ask for Public Review
- **Trigger:** logging **Order completed**.
- **Delay:** **30 minutes**.
- **Auto-clears itself** if a **Review received** for the **same client + profile**
  is logged before the reminder is resolved (no point asking — they already left
  one).
- **Reminder:** "Ask the client for a Public Review."
- **Buttons:** **No need** · **Msg sent** · **Review given**

### 6. Review received (top ratings) → ask for Private Review
- **Trigger:** logging **Review received** — **but only when the average rating
  is 4.7 to 5.0**. Any lower average books nothing.
  *(The average is auto-calculated from the three star scores: Value of Delivery,
  Quality of Delivery, Seller Communication Level.)*
- **Delay:** **24 hours** exactly.
- **Reminder:** "Ask the client for a Private Review." *(shows client, project,
  and the ★ average.)*
- **Buttons:** **Msg sent**

### 7. Files Assigned to Designer → upsell
- **Trigger:** logging **Files Assigned to Designer**.
- **Delay:** **immediately**.
- **Reminder:** "Suggest an upsell to *[client]*." *(the CSR knows what to offer.)*
- **Buttons:** **No need** · **Upsell done**

### 8. Revision assigned → check if done
- **Trigger:** logging **Revision assigned to designer** **and typing a time** in
  the form's **"Remind me in"** box (e.g. `30m`, `2h`, `5 h`, `1.5h`).
- **Delay:** **exactly the time you typed.** Leave the box empty → **no reminder**.
- **Reminder:** "Check if *[client]*'s revision is done."
- **Buttons:** **Follow-up done** *(checked in with the designer)* · **Revision
  done** *(the revision is finished)*

### 9. Offer → button-driven follow-up chain
- **Trigger:** logging **Offer** (new or existing client).
- **Stage 1:** after **2 hours** → "Send the 1st follow-up on the offer to
  *[client]*."
  - **Order placed** → offer converted, **chain ends** (no more reminders)
  - **1st F/U done** → books **Stage 2**, timed **16 hours** from the tap
- **Stage 2:** "Send the 2nd follow-up on the offer…"
  - **Order placed** → ends the chain
  - **2nd F/U done** → books **Stage 3**, timed **36 hours** from the tap
- **Stage 3:** "Send the 3rd follow-up on the offer…"
  - **Order placed** → ends the chain
  - **3rd F/U done** → **chain ends** (no more reminders for this offer)
- **Note:** each next stage is booked **only when you tap the button** — its
  timer starts from the click, not from the original offer.

### 10. Project delivered / Shared in chat → follow up on the item
- **Trigger:** logging **Project delivered** (Initial draft / Final files) **or**
  **Shared to client (chat)** (any elements you multi-selected).
- **Delay:** **15 hours**.
- **Reminder:** "Follow up on the *[the specific item]* delivered to / shared with
  *[client]*." *(the reminder names the exact item and client.)*
- **Buttons:** **Responded** *(client already replied)* · **Followed up**

### 11. Frustrated client → red caution box
- **Trigger:** logging **Frustrated client**.
- **Appears:** **immediately**, as a **standing red glowing caution box** on the
  profile.
- **Message:** "*[client]* is frustrated — handle with caution." *(shows what
  happened.)*
- **Persists across every shift** until someone taps **Solved**. No snooze.

### 12. Disputed client → red caution box
- **Trigger:** logging **Disputed client**.
- **Appears:** **immediately**, as a **standing red glowing caution box**.
- **Message:** "*[client]*'s dispute is OPEN — on the verge of cancelling, treat
  cautiously." *(shows the reason.)*
- **Persists across every shift** until someone taps **Solved**. No snooze.

---

## What does NOT book a reminder

For clarity — these activities are logged for the record but do **not** create any
reminder:

Client conversation · Order Assigned to Designer · Follow-up with client ·
Follow-up with designer · Update Followup · Upsell · Review request · Meeting ·
Extension sent · **Spam / not relevant**.

> If you ever want a reminder added to any of these, just tell me the trigger,
> the delay, and the buttons.

---

## Where to watch them

- **CSR app** — reminders appear in the attention column on the right of the
  dashboard; red alerts (frustrated/disputed) sit there too. They follow the
  profile, so the next CSR on that profile sees them.
- **CEO console → Reminders tab** — every reminder across profiles: due now,
  snoozed, scheduled, and resolved, with who resolved each and how (the button
  they tapped is recorded as the resolution).

---

*This document is generated from the live rules. If a rule here doesn't match
what you see in the app, it's almost always a browser tab still running an old
version — a hard refresh (Ctrl/Cmd + Shift + R) loads the current one.*
