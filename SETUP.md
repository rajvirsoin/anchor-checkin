# Anchor — one-time setup

Anchor is a phone app (PWA) that walks you through your therapist's body skill and logs
every check-in to a private Google Sheet. Entries save on the phone first and sync when
online, so it works with no signal.

Three things to wire up, ~10 minutes total.

## 1. The Google Sheet + backend

1. Create a new Google Sheet — name it e.g. **Anchor — check-in log**.
2. In the Sheet: **Extensions → Apps Script**. Delete the placeholder code, paste the whole
   of `apps-script/Code.gs`, and **Save**.
3. Gear icon (**Project Settings**) → **Script Properties** → add two properties:
   | Property | Value |
   |---|---|
   | `APP_SECRET` | any long random string you invent (you'll paste it into the app too) |
   | `ANTHROPIC_API_KEY` | your API key from console.anthropic.com (for the reframe step) |
   These live only inside your Google account — never in the app, never in this repo.
4. **Deploy → New deployment** → type **Web app** →
   *Execute as:* **Me** · *Who has access:* **Anyone** → **Deploy** → authorize → copy the
   URL ending in `/exec`.
5. Test: open that `/exec` URL in a browser — it should say *"Anchor endpoint is live."*

The `Log` and `Weekly Summary` tabs are created automatically on first write.

## 2. The weekly therapist summary

In the Apps Script editor: **Triggers** (clock icon, left sidebar) → **Add Trigger** →
- function: `buildWeeklySummary`
- event source: **Time-driven** → **Week timer** → **Every Sunday**, 6–7pm

Each Sunday it appends one row to **Weekly Summary**: entry count, average distress
before → after grounding → final (and the drop), % of urges acted on, % pauses completed,
top triggers / emotions / fears, and what helped most. Show your therapist that tab.

## 3. The app on your phone

1. Open the app URL in Safari (iPhone) or Chrome (Android).
2. **Settings** (top right) → paste the `/exec` URL and your `APP_SECRET` → **Test
   connection** → **Save**.
3. Share button → **Add to Home Screen**. It now opens full-screen like a native app.

### Notes

- **Notifications:** the app asks permission the first time you start a pause. On iPhone the
  20-minute alert usually arrives, but iOS can drop it if the app has been closed a while —
  the timer itself is bulletproof: it's a saved timestamp, so reopening the app always shows
  the true state, even days later.
- **Privacy:** entries live in your phone's storage and your own Sheet. The AI step sends
  only that entry's text to *your* Apps Script, which calls Claude with a key that never
  leaves Google's side. If the AI is unreachable the step falls back to self-guided prompts.
- **If a sync fails** it just stays queued — open History → **Sync now** whenever.
