# Anchor: setup

Anchor is a phone app (PWA) for a year-long self-worth practice: a morning promise, Catch for the moments that hit, an evening shadow-work reflection that builds on what you wrote before, a weekly review with a digest for therapy, and a coach (Claude) that reflects and asks but never praises. Everything saves on the phone first and syncs to your private Google Sheet.

The research behind every feature is in `RESEARCH.md`.

## If you already use Anchor (upgrading)

Your phone is already connected to the Sheet. Two things to do, about 5 minutes:

1. **Update the backend.** Open your Sheet "Anchor — check-in log" → **Extensions → Apps Script**. Select all of the old code, paste the whole of `apps-script/Code.gs`, and **Save**.
2. **Add your Claude key.** Gear icon (**Project Settings**) → **Script Properties** → add `ANTHROPIC_API_KEY` with your key from console.anthropic.com. (`APP_SECRET` is already there.)
3. **Redeploy at the same URL.** **Deploy → Manage deployments** → pencil icon on your existing deployment → *Version:* **New version** → **Deploy**. Google will ask you to authorize again, because the app can now add reminder events to your Calendar. Allow it.
4. On your phone: open Anchor → **You → Settings → Test connection**. It should say *Coach is on*.

Until the key is set, everything still works: the coach falls back to built-in questions.

## First open

Anchor walks you through five quick screens: Day 1 of your year, what your coach should know about you, your if-then plans, and reminder times. For "What your coach knows about you", paste the profile in `private/coach-profile.txt` (that folder is never published) and edit it in your own words.

## Reminders

Set the times in the app (**You → Settings → Reminders**), then tap **Put these reminders in my Google Calendar**. Anchor creates three repeating 10-minute events (morning, evening, weekly) with a notification at the start time. Change the times whenever you like and tap the button again: the old events are replaced. **Remove the reminders** deletes them.

## The Sheet

New tabs appear automatically:
- **Records**: everything the app saves, one row per item. This is what **Restore everything from my Sheet** reads on a new phone.
- **Therapy Digest**: one row per weekly review, with the digest written for your therapist.
- **Log** and **Weekly Summary**: the body-skill check-ins, as before.

## Fresh setup (new Sheet)

1. Create a Google Sheet. **Extensions → Apps Script**, paste `apps-script/Code.gs`, Save.
2. **Project Settings → Script Properties**: add `APP_SECRET` (a long random string you invent) and `ANTHROPIC_API_KEY`.
3. **Deploy → New deployment → Web app**, *Execute as:* Me, *Who has access:* Anyone. Authorize, copy the `/exec` URL.
4. Optional: **Triggers → Add Trigger** → `buildWeeklySummary`, time-driven, weekly, Sunday 6 to 7pm.
5. On your phone: open the app, **You → Settings**, paste the URL and secret, **Test connection**, **Save**. Then **Share → Add to Home Screen**.

## Privacy

Your words live on your phone and in your own Sheet. The repo is public, so nothing personal is ever put in the code. The coach sends only what each question needs to your own Apps Script, which calls Claude with a key that stays in Google's Script Properties.
