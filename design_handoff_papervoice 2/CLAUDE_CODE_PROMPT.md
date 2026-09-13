# Build Prompt for Claude Code — PaperVoice

Copy/paste this into Claude Code in your Expo project.

---

## Prompt

Build **PaperVoice**, a React Native app (Expo, TypeScript) that lets a user photograph a complex government/administrative letter and get it explained and read aloud in their chosen language (default: Armenian).

### Stack
- Expo (managed workflow), TypeScript
- `expo-camera` for capture, `expo-image-picker` for the gallery fallback
- `expo-av` for audio playback
- `expo-file-system` for temp image/audio storage
- `@react-native-async-storage/async-storage` for persisting the selected language/voice and onboarding-completed flag
- Navigation: `expo-router` (or React Navigation if already set up in this project — check first)
- Gemini API (`gemini-1.5-flash` or `gemini-2.0-flash`, whichever is current) for: OCR/document understanding + translation + generating a spoken-script summary, given the photographed letter as an image input. Return structured JSON: `{ documentTitle, status, amountDue, deadline, spokenScript, spokenLanguage }`.
- ElevenLabs API (Text-to-Speech) to synthesize `spokenScript` into audio in the target language/voice. Store the returned audio stream to a local file and play with `expo-av`.
- Store both API keys in environment variables via `expo-constants` / `.env` (`EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_ELEVENLABS_API_KEY`) — never hardcode keys. Ask me for a `.env.example` if one doesn't exist.

### Screens (see `PaperVoice.dc.html` in this handoff folder for exact visual spec — colors, spacing, copy, layout)
1. **Onboarding** — first-launch only (gate with AsyncStorage flag). Language picker: Armenian (pre-selected), Dutch, English, Russian, French. "Get Started" → Camera.
2. **Camera** — live viewfinder via `expo-camera`, corner-bracket guide overlay, shutter button, gallery-import icon, flash toggle, active-language pill (opens Settings), gear icon (opens Settings).
3. **Processing** — shown while: (a) uploading photo to Gemini and awaiting the structured response, (b) sending `spokenScript` to ElevenLabs and awaiting audio, (c) audio file finishes downloading. Drive the three status labels ("Reading document...", "Translating to Armenian...", "Generating voice...") off real pipeline stage transitions, not fixed timers.
4. **Result** — bottom sheet over the captured photo. Audio player (waveform can be a simplified live-amplitude or a static animated placeholder — real waveform data isn't required), rewind-15s, play/pause, speed toggle (1.0x/1.25x via `expo-av`'s `setRateAsync`), status line (from Gemini's `status`/`deadline` fields), transcript card showing `spokenScript` in the target script (load a font covering the target language's characters — e.g. Noto Sans Armenian for Armenian). "Scan Another Letter" → back to Camera.
5. **Settings** — sheet: language list (same 5), voice picker (male/female — map to two specific ElevenLabs voice IDs), "Tap to hear a sample" (plays a short pre-set phrase through ElevenLabs in the selected voice/language).

### Pipeline (Camera capture → Result)
1. Capture/pick photo → show Processing, stage 1.
2. Send image (base64 or multipart) to Gemini with a prompt instructing it to classify the letter into a document type, extract the fields relevant to that type, and produce a plain-language spoken explanation in the user's selected language. Parse the JSON response.

   Document type taxonomy to classify into (extend as needed — these are common Belgian government/administrative letters): `municipal_tax`, `fine` (e.g. GAS/parking), `tax_refund`, `jury_duty`, `permit_renewal`, `car_tax`, `car_insurance`, `other`. Each type has its own expected fields — the app renders a label/value row per field the AI actually found, so omit fields that don't apply:
   - `municipal_tax` → amountDue, paymentReference, deadline
   - `fine` → amountDue, reason, deadline
   - `tax_refund` → refundAmount, expectedPayment, reference
   - `jury_duty` → dateTime, location, respondBy
   - `permit_renewal` → currentExpiry, renewBefore, where
   - `car_tax` → licensePlate, amountDue, deadline
   - `car_insurance` → licensePlate, premiumDue, renewBefore
   - `other` → freeform key/value pairs the model finds important

   Expected JSON shape: `{ documentType, documentTitle, statusLabel, fields: [{ label, value, isPlate? }], spokenScript, spokenLanguage }`.
3. Stage 2 → send the `spokenScript` text to ElevenLabs TTS with the selected voice ID and the target language. Await the audio buffer, write to a local file with `expo-file-system`.
4. Stage 3 → load the audio into `expo-av`'s `Audio.Sound`, autoplay, navigate to Result.
5. Handle failures at each stage with a friendly retry state (e.g. "Couldn't read that clearly — try again") rather than a raw error screen.

### State to persist (AsyncStorage)
- `onboardingComplete: boolean`
- `selectedLanguage: 'am' | 'nl' | 'en' | 'ru' | 'fr'`
- `selectedVoice: 'male' | 'female'`

### Design fidelity
Match `PaperVoice.dc.html`'s spacing, radii, colors, and type exactly — it uses the **Organic** design system (cream background `#f5ead8`, terracotta accent `#c67139`, sage second accent `#7a8a5e`, Caprasimo display font, Figtree body, 16–28px radii, pill buttons). Load Caprasimo and Figtree as custom fonts via `expo-font`. Full token list is in this folder's `README.md` under "Design Tokens" — implement a small `theme.ts` constants file from those values rather than hardcoding colors/fonts inline throughout components.

### Deliverables
- Working Expo app with the 5 screens wired end-to-end against real Gemini + ElevenLabs calls (behind env-var keys).
- A `theme.ts` with the design tokens.
- Basic error/loading/empty states for the capture pipeline.
- README note on which env vars to set and how to get Gemini/ElevenLabs API keys.

---

Reference files in this handoff folder: `PaperVoice.dc.html` (interactive visual spec, open in a browser), `README.md` (full screen-by-screen written spec and design tokens).
