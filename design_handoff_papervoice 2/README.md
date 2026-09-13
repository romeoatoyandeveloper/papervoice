# Handoff: PaperVoice iOS App

## Overview
PaperVoice is an iOS app that lets users photograph complex government/administrative letters (taxes, municipal notices, bills) and immediately get them explained and read aloud in their native language — specifically Armenian for this build. This package covers the full first-run flow: language onboarding, camera capture, processing, result playback, and settings.

## About the Design Files
The files in this bundle (`PaperVoice.dc.html`, `ios-frame.jsx`) are **design references built in HTML/React for prototyping** — they show intended look, layout, and interaction, not production code to copy directly. The task is to **recreate this design natively in Swift/SwiftUI** (or whatever the target codebase's stack is), using the app's existing patterns, navigation, and asset pipeline. Do not ship the HTML/JSX as-is.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and copy are final. Recreate pixel-close using native iOS equivalents (SF Symbols where noted, native fonts, etc.) — the HTML uses web-safe stand-ins (Figtree/Caprasimo, inline SVG icons) that should be swapped for the target platform's real typefaces/icon system if different.

## Screens / Views

### 1. Onboarding — Language Choice
- **Purpose**: One-time setup on first launch; user picks the language all letters will be explained/read aloud in.
- **Layout**: Full-screen, padding 22px sides, 66px top (clears status bar), 28px bottom. Vertical stack: headline → sub-caption → 28px gap → language list → flex spacer → full-width CTA.
- **Headline**: "Choose spoken language" — Caprasimo (display font), 26px, weight 400, color `--color-text`.
- **Sub-caption**: "All letters will be explained and read aloud to you in this language." — body font, 15px, line-height 1.4, color text at 58% opacity.
- **Language list**: vertical stack, 10px gap. Each row is a card: 18px border-radius, 14px/16px padding, flex row, 14px gap.
  - Flag emoji, 26px.
  - Native script label (e.g. "Հայերեն"), 17px, weight 600, color `--color-text` (use "Noto Sans Armenian" for Armenian glyphs).
  - English label below, 13px, color text at 50%.
  - Selected state: background tint `--color-accent-100`, border 1.5px `--color-accent`, soft glow shadow (`0 0 0 3px accent@18%`), trailing 24px checkmark circle filled `--color-accent` with a white/cream check icon.
  - Unselected: background `--color-surface`, border 1.5px `--color-divider`.
  - Order: 🇦🇲 Armenian (Հայերեն) — pre-selected — 🇳🇱 Dutch (Nederlands) — 🇬🇧 English — 🇷🇺 Russian (Русский) — 🇫🇷 French (Français).
- **CTA**: "Get Started" full-width pill button, 17px padding vertical, 999px radius, background `--color-accent`, text `--color-bg`, Caprasimo 17px weight 600. Tap → Camera view.

### 2. Camera (Main / Default State)
- **Top bar** (58px top padding for status bar clearance, 18px side padding):
  - Left: active-language pill — flag + native label + chevron-down, tappable, opens Settings. Background `--color-surface`, border `--color-divider`, 999px radius.
  - Right: gear icon button, 40×40, circular, same surface/border treatment. Opens Settings.
- **Viewfinder**: fills remaining space, 16px side margins, 26px radius, dark gradient (`--color-neutral-800` → `--color-neutral-900`) simulating the live camera feed (kept dark regardless of light/dark app theme — a real camera preview is always dark).
  - Floating label centered near top: "Fit the letter inside the frame" — dark pill, blurred backdrop, white text 13px.
  - Centered guide frame at ~64%×78% of viewfinder, A4-ish aspect, with four square-cut corner brackets (34×34px, 3px stroke, light color at 88% opacity) — no rounded/pill brackets.
- **Bottom controls** (22px/34px/30px padding):
  - Left: gallery/photo-library icon button, 50×50, rounded-square (16px radius).
  - Center: shutter — 80×80 circle, 3.5px border (text color at 55%), inner 64×64 filled circle in `--color-accent`. Tap → Processing.
  - Right: flash/torch toggle, 50×50 rounded-square. Icon color flips from `--color-text` to `--color-accent` when active.

### 3. Processing State
- Full-screen overlay: blurred/dimmed frozen capture behind (`blur(2px)` + neutral-900 tint at 60% + `blur(14px)` backdrop).
- Centered: 3 concentric pulsing rings (`--color-accent-400`, 2px stroke, scale 0.7→1.9 fading out, staggered 0.7s apart, 2.2s loop) around a solid `--color-accent` circle with a mic icon.
- Below the rings: a single status label that cross-fades between three sequential messages, ~1.1s apart:
  1. "Reading document..."
  2. "Translating to Armenian..."
  3. "Generating voice..."
- After the third label, auto-transitions to the Result view (~3.3s total).

### 4. Result View
Presented as a bottom sheet (90% of screen height, rounded top corners 28px, large shadow) sliding up over the dimmed/blurred captured photo.
- **Grab handle**: 36×5px pill, centered, 22% text-opacity fill.
- **Audio Player Hero Card** (rounded 22px, `--color-surface` fill, 18px padding, plays automatically on appear):
  - Top row: "Speaking Armenian" tag (pill, `--color-accent-2-100` bg, `--color-accent-2-700` text, small dot) + playback-speed toggle pill on the right, cycles "1.0x" ↔ "1.25x".
  - Waveform: 28 vertical bars, 2px gap, rounded ends; "played" portion tinted `--color-accent-2-500`, remainder `--color-neutral-300`; bars animate a gentle scale pulse when playing, pause when paused.
  - Controls row, centered, 28px gap: Rewind-15s button (48×48 circle, neutral-100 bg, icon + "15" label) — Play/Pause button (64×64 circle, filled `--color-accent`, icon in `--color-bg`) — placeholder spacer for symmetry.
- **Document type preview switcher**: a row of chips (design-system `.tag`/`.tag-outline`) above the document card, one per letter type, for previewing how the card adapts. Not final UI chrome — in the real app the type is inferred automatically from Gemini's classification, not picked by the user.
- **Document card**: "Document" label + a type tag (`.tag-accent`/`.tag-accent-2`/`.tag-neutral` depending on category) in the header row, title below, then a row-table of label/value pairs (divider rules) specific to the letter's category. A "License plate" row renders as a Belgian plate graphic (white bg, red border/text, blue EU strip with one yellow star + "B") instead of plain text. Categories modeled so far:
  - **Municipal Tax** (Payment Required): Amount due, Payment reference (structured communication code), Deadline
  - **GAS Fine** (Fine): Amount due, Reason, Deadline
  - **Tax Refund** (Refund): Refund amount, Expected payment, Reference
  - **Jury Duty Summons** (Action Required): Date & time, Location, Respond by
  - **Permit Renewal** (Renewal Due): Current expiry, Renew before, Where
  - **Car Tax / Road Tax** (Payment Required): License plate, Amount due, Deadline
  - **Car Insurance Renewal** (Renewal Due): License plate, Premium due, Renew before
  
  This is a starting taxonomy, not exhaustive — the real Gemini prompt should classify into these (or additional) categories and populate only the rows relevant to that letter.
- **Spoken Transcript card** (rounded 22px, `--color-surface` fill, 18px padding): small speaker icon + "Spoken Transcript" label (13px, text@65%), followed by the full Armenian transcript at 16px, line-height 1.65, text@88% opacity, set in "Noto Sans Armenian".
  - Transcript copy (verbatim, Armenian): "Սա Ձեզ ուղարկված մունիցիպալ հարկային ծանուցագիր է։ Ձեզանից պահանջվում է վճարել 125,00 եվրո մինչև 2026 թվականի հոկտեմբերի 15-ը։ Վճարումը կատարելու համար օգտագործեք նամակում նշված հղումը կամ բանկային մանրամասները։"
- **Sticky bottom action**: full-width "Scan Another Letter" pill button, `--color-accent` fill, `--color-bg` text, Caprasimo weight 600, top border divider, stays pinned while the card content above scrolls. Tap → dismiss sheet, back to live Camera view, resets audio/speed state.

### 5. Settings Sheet
Bottom sheet, 72% of screen height, dimmed scrim behind (tap scrim or the X button to dismiss).
- Header: "Settings" (Caprasimo, 20px) + circular X close button (32×32, surface bg).
- "Spoken language" section label (uppercase, 12px, text@55%), then the same 5-language list as onboarding but as compact rows (flag + native + "· English label", 14px radius rows), selected row tinted `--color-accent-100` with a trailing accent-colored checkmark. Tapping changes the active language immediately (no confirmation step).
- "Voice" section label, then a 2-up segmented pair of pills: "Female" / "Male" — selected pill gets `--color-accent-100` bg + `--color-accent` border.
- "Tap to hear a sample" button, full width, pill, `--color-surface` bg — label swaps to "Playing sample..." for ~1.6s on tap (no audio in the prototype; real build should play an actual sample in the selected voice/language).

## Interactions & Behavior
- Onboarding → Camera: one-way, no back navigation (first-run only).
- Camera shutter tap → Processing (auto, ~3.3s scripted sequence) → Result (auto).
- Result "Scan Another Letter" → back to Camera, resets playback/speed state.
- Language pill or gear icon (Camera) → opens Settings sheet as an overlay (Camera state persists underneath).
- All sheets (Result, Settings) slide up from the bottom (`translateY(100%)` → `0`, ~0.3–0.35s ease-out) — implement as native sheet presentations (e.g. `.sheet` / custom bottom-sheet) rather than a literal CSS transform.
- Play/Pause on the audio card toggles a `playing` boolean; waveform bar animation should play/pause in sync (this prototype fakes playback — no real audio wiring).
- Flash and voice selections are local UI state only in this prototype; wire to actual camera torch / TTS voice APIs in the real build.

## State Management
Minimal state machine, one screen at a time:
- `screen`: 'onboarding' | 'camera' | 'processing' | 'result'
- `language`: selected language code (default 'am')
- `processingStep`: 0–2, drives the sequential status labels
- `playing`: bool, audio playback state
- `speed`: 1.0 | 1.25
- `showSettings`: bool, sheet visibility (independent of `screen`)
- `voice`: 'female' | 'male'
- `flash`: bool

In the real app, `processingStep` should be driven by actual pipeline events (OCR/read → translate → TTS generation) rather than fixed timers, and the Result view's content (document type, amount, deadline, transcript) should come from the actual document-understanding response instead of being hardcoded.

## Design Tokens
All colors/fonts/radii/shadows come from the bound **Organic** design system (see `_ds` folder reference below) — do not hardcode new values if implementing against that system elsewhere. Key tokens used:
- `--color-bg`: #f5ead8 (screen/sheet background)
- `--color-surface`: #ebddc5 (card fill)
- `--color-text`: #201e1d
- `--color-divider`: color-mix(text 16%, transparent)
- `--color-accent` (terracotta): #c67139 — primary actions, selection, shutter, payment/deadline emphasis
- `--color-accent-100/700`: #fff2eb / #8c491a — tint/text pairs for accent badges
- `--color-accent-2` (sage): #7a8a5e — "speaking/info" indicator, waveform played state
- `--color-accent-2-100/700`: #f0fae1 / #56633f
- `--color-neutral-100…900`: tonal ramp from #f9f4ed to #2e2b25, used for secondary surfaces and the dark camera/processing backdrop
- `--font-heading`: Caprasimo (display, weight 400) — screen headlines, primary buttons
- `--font-body`: Figtree — all other text
- Armenian text specifically: "Noto Sans Armenian" (Google Fonts), since Caprasimo/Figtree don't cover Armenian glyphs
- Radii: 16–28px on cards/sheets, 999px (pill) on buttons/pills/badges
- Shadow: `--shadow-lg` on sheets

## Assets
- Flag emoji (🇦🇲 🇳🇱 🇬🇧 🇷🇺 🇫🇷) — native OS emoji, no custom assets.
- All icons (gear, chevron, gallery, flash, mic, play/pause, rewind-15, speaker, close) are inline SVGs in the prototype — recreate with SF Symbols or the app's existing icon set.
- No photography/imagery assets used; the camera viewfinder and processing/result backdrops are gradients, not real photos.

## Files
- `PaperVoice.dc.html` — the full interactive prototype (all 5 screens/states in one file, state-driven).
- `ios-frame.jsx` — device-bezel component used only for prototype presentation (status bar, dynamic island, home indicator); not part of the design itself.
