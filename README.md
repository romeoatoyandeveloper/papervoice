# PaperVoice

Photograph an official letter and hear it explained in your own language: Armenian by default, or Dutch, English, Russian or French.

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
| `EXPO_PUBLIC_ELEVENLABS_MODEL` | no | Defaults to `eleven_v3`. Armenian needs this model because `eleven_multilingual_v2` doesn't support Armenian. |
| `EXPO_PUBLIC_ELEVENLABS_VOICE_FEMALE` / `_MALE` | no | Voice IDs for the Female and Male options. The defaults are the ElevenLabs default voices "Sarah" and "George". ElevenLabs is retiring its default voices at the end of 2026, so pick replacements from your own voice library. |

> ⚠️ `EXPO_PUBLIC_` variables are embedded in the app bundle, so anyone with the app can extract them. That's acceptable for development and testing. Before a public release, move both API calls behind a server (for example Expo API routes or a small backend) and remove the keys from the app.

## How it works

`src/state/ScanContext.tsx` runs the pipeline. The Processing screen shows one label for each real stage:

| Label | Stage |
| --- | --- |
| Reading document... | The photo goes to Gemini (`src/services/gemini.ts`), which returns structured JSON: `documentTitle`, `status`, `amountDue`, `deadline`, `paymentDetails` (recipient, IBAN, BIC, reference), `letterDetails` (sender, case numbers, contacts), `spokenScript`, `spokenLanguage`. |
| Translating to {language}... | `spokenScript` goes to ElevenLabs (`src/services/elevenlabs.ts`), and the MP3 is saved to the cache directory. |
| Generating voice... | The file is loaded into an `expo-audio` player. Once it's ready, playback starts and the Result sheet opens. |

If a stage fails, the screen shows a plain-language message with **Try Again** and **Retake Photo**. Try Again restarts at the stage that failed, so a failed voice step doesn't send the photo to Gemini again.

AsyncStorage keeps three settings: `onboardingComplete`, `selectedLanguage` and `selectedVoice`.

## Project layout

```
app/                    expo-router screens
  _layout.tsx           fonts, providers, stack
  index.tsx             sends the user to onboarding or the camera
  onboarding.tsx        language choice (first launch only)
  camera.tsx            viewfinder, guide brackets, shutter, gallery, torch
  processing.tsx        pulse animation, stage labels, error and retry state
  result.tsx            bottom sheet: audio player, status line, transcript
  settings.tsx          bottom sheet: language, voice, sample playback
src/
  theme.ts              Organic design tokens (colors, fonts, radii, shadows)
  config.ts             languages, env config, per-language font helper
  services/             Gemini, ElevenLabs, friendly errors
  state/                settings and scan pipeline contexts
  components/           icons, sheet, waveform, pulse rings, buttons
design_handoff_papervoice/   the original design spec
```

## Notes

- **expo-audio instead of expo-av.** `expo-av` isn't part of SDK 57. `expo-audio` replaces it, and playback speed uses `player.setPlaybackRate`.
- **Fonts.** Caprasimo, Figtree and Noto Sans Armenian are bundled from `@expo-google-fonts`. Figtree has no Cyrillic, so Russian text uses the system font.
- **Simulator.** The iOS Simulator has no camera. There, the shutter opens the photo library instead.
- **Letter photos.** Letters are sent to Google, and the generated script is sent to ElevenLabs. Mention this in your privacy policy before release.
# papervoice
# papervoice
