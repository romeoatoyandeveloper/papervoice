# PaperVoice

Photograph an official letter and hear it explained in Armenian.

Built with Expo SDK 57, TypeScript and expo-router. Google Gemini reads and explains the letter, and ElevenLabs turns the explanation into speech.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the two keys below
npx expo start         # scan the QR code with Expo Go
```

If you edit `.env`, restart with `npx expo start --clear`. The keys are compiled into the JavaScript bundle, so a plain reload won't pick up the change.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_GEMINI_API_KEY` | yes | Create one at [Google AI Studio → API keys](https://aistudio.google.com/apikey). |
| `EXPO_PUBLIC_ELEVENLABS_API_KEY` | yes | Create one at [ElevenLabs → Settings → API keys](https://elevenlabs.io/app/settings/api-keys). It needs Text to Speech access. |
| `EXPO_PUBLIC_GEMINI_MODEL` | no | Defaults to `gemini-3.8-flash`. `gemini-1.5-flash` and `gemini-2.0-flash` are shut down. |
| `EXPO_PUBLIC_GEMINI_THINKING` | no | Defaults to `low`. Measured ~3.5s vs ~10s at the model's default `medium`, with the same result. |
| `EXPO_PUBLIC_ELEVENLABS_MODEL` | no | Defaults to `eleven_v3`. It takes ~24s for a full script in one request, so the app splits the script into up to 3 sentence-aligned pieces, generates them in parallel and joins the MP3s. `eleven_v3_conversational` is faster but cuts the audio off mid-sentence. `eleven_flash_v2_5` and `eleven_multilingual_v2` reject Armenian. |
| `EXPO_PUBLIC_ELEVENLABS_VOICE_FEMALE` / `_MALE` | no | Voice IDs for the Female and Male options. Female defaults to "Armenian Woman" (`Uzip068RriboSuMJCIne`, a voice on the account, which sounds much more natural in Armenian). Male defaults to the premade "George", which ElevenLabs retires at the end of 2026. |

> ⚠️ `EXPO_PUBLIC_` variables are embedded in the app bundle, so anyone with the app can extract them. That's acceptable for development and testing. Before a public release, move both API calls behind a server (for example Expo API routes or a small backend) and remove the keys from the app.

## How it works

`src/state/ScanContext.tsx` runs the pipeline. The Processing screen shows one label for each real stage:

| Label | Stage |
| --- | --- |
| Reading document... | The photo goes to Gemini (`src/services/gemini.ts`), which classifies the letter and returns structured JSON: `documentType`, `documentTitle`, `statusLabel`, `fields` (`label`, `value`, `kind`, `isPlate`), `paymentDetails` (recipient, IBAN, BIC, reference), `spokenScript`, `spokenLanguage`. |
| Translating to {language}... | `spokenScript` goes to ElevenLabs (`src/services/elevenlabs.ts`), and the MP3 is saved to the cache directory. |
| Generating voice... | The file is loaded into an `expo-audio` player. Once it's ready, playback starts and the Result sheet opens. |

If a stage fails, the screen shows a plain-language message with **Try Again** and **Retake Photo**. Try Again restarts at the stage that failed, so a failed voice step doesn't send the photo to Gemini again.

### Letter types

The taxonomy is defined in `src/documentTypes.ts`. The Gemini prompt and the Result screen's Document card both read from it:

Card text is Armenian written in Latin letters ("Armenglish"). The status tag and fixed labels live in code, and Gemini transliterates free-text values.

| `documentType` | Tag | Fields |
| --- | --- | --- |
| `municipal_tax` | Petk a mucvi | Pox, Vcharman kod, Minchev erb |
| `fine` | Tugank | Tugani pox, Inchi hamar, Minchev erb |
| `parking_fine` | Tugank | Hamaranish, Pox, Vortex, Erb, Minchev erb |
| `speeding_fine` | Tugank | Hamaranish, Pox, Aragutyun, Vortex, Erb, Minchev erb |
| `tax_refund` | Veradardz | Het kstanas, Erb kga, Hamar |
| `jury_duty` | Petk a pataxanel | Or u zham, Vortex, Pataxani minchev |
| `permit_renewal` | Petk a erkarel | Prcnum a, Erkari minchev, Vortex |
| `car_tax` | Petk a mucvi | Hamaranish, Pox, Minchev erb |
| `car_insurance` | Petk a erkarel | Hamaranish, Pox, Erkari minchev |
| `other` | Uxaki imanas | Free-form: the 3–6 facts that matter most |

A row with `isPlate: true` is drawn as a Belgian license plate. Tapping an amount, reference or plate copies it. To add a letter type, add an entry to `DOCUMENT_TYPES`.

AsyncStorage keeps one setting: `selectedVoice`. Armenian is the only language for now; it's defined as `LANGUAGE` in `src/config.ts`.

## Project layout

```
app/                    expo-router screens
  _layout.tsx           fonts, providers, stack
  index.tsx             redirects to the camera
  camera.tsx            viewfinder, guide brackets, shutter, page tray, photos/PDF picker, torch
  processing.tsx        pulse animation, stage labels, error and retry state
  result.tsx            bottom sheet: audio player, Document card, How to Pay, transcript
  settings.tsx          bottom sheet: voice, sample playback
src/
  theme.ts              Organic design tokens (colors, fonts, radii, shadows)
  documentTypes.ts      letter taxonomy shared by the prompt and the UI
  config.ts             Armenian language config, env config, font helper
  services/             Gemini, ElevenLabs, friendly errors
  state/                settings and scan pipeline contexts
  components/           icons, sheet, waveform, pulse rings, buttons
design_handoff_papervoice 2/ the current design spec
```

## Notes

- **expo-audio instead of expo-av.** `expo-av` isn't part of SDK 57. `expo-audio` replaces it, and playback speed uses `player.setPlaybackRate`.
- **Fonts.** Caprasimo, Figtree and Noto Sans Armenian are bundled from `@expo-google-fonts`. Figtree has no Cyrillic, so Russian text uses the system font.
- **Multiple pages and PDFs.** The shutter adds a page to a tray above the controls instead of starting right away, so you can shoot the front and back. **Explain** sends every page (up to 10, about 14 MB total) to Gemini in one request as one letter. The library button offers **Photos** (multi-select) or **PDF file** (`expo-document-picker`).
- **Simulator.** The iOS Simulator has no camera. There, the shutter opens the Photos/PDF picker instead.
- **Letter photos.** Letters are sent to Google, and the generated script is sent to ElevenLabs. Mention this in your privacy policy before release.
# papervoice
# papervoice
