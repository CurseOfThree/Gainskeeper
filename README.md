# Gainskeeper

Personal training log. Plain HTML, CSS and JavaScript wrapped as an Android app with Capacitor.

## How updates work
1. Edit files in `src/` (logic, UI, library, program data, styles in `shell.html`).
2. Commit to `main`.
3. GitHub Actions builds a signed APK (Actions tab, or the `latest` release).
4. Open the release on your phone, download `gainskeeper.apk`, install over the old one. Your data stays.

## Layout
- `src/logic.js` pure logic (parsing, progression, nutrition, warm-ups). Tested by `npm test`.
- `src/program.js` your 12 week program in the short text format.
- `src/lib.js` Library research entries.
- `src/ui1.js` to `ui5.js` screens and handlers. `src/shell.html` head, fonts and CSS.
- `scripts/build.js` joins `src/` into `www/index.html`. `scripts/native.js` saves backups via the Android share sheet.
- `scripts/patch-android.js` adds signing and a rising version number in CI.
- `keystore/gainskeeper.jks` signing key. The same key must sign every build or Android refuses to update the app (you would have to uninstall and lose data). Keep this repository private and never delete the file.

## Local preview
`npm install && npm run build`, then open `www/index.html` in a browser.

## Data
Everything is stored on the phone (browser storage inside the app). Use Plan > Settings > Back up (JSON) regularly and keep a copy somewhere safe. Restore is in the same place. Backups from the Claude Artifact version restore here too.

## Importing programs
Plan > Add program reads Excel, CSV, JSON, text and PDF files on the phone (libraries are bundled under www/lib, copied from node_modules by the build). With a Claude API key saved in Plan > Settings, "Ask Claude to read it" sends a PDF, photo or messy text to Anthropic and gets CSV back. The key stays on the phone and is not in backups.

Photos and scanned PDFs are read on the phone with Google ML Kit (@capacitor-mlkit/text-recognition), Android app only. The OCR text is rows rebuilt from line positions, so layouts with columns come out as spaced text.

## Not carried over from the Artifact version
Cloud saving and "Ask Claude to read it" depended on running inside Claude. Add programs by pasting CSV, JSON or the short text format, or ask Claude in chat to convert a sheet and paste the result.

## Ideas for later
Reminders, Health Connect, plate calculator, injury flags, an app icon, offline fonts.
