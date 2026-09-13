import { fonts, type Weight } from './theme';

export type VoiceGender = 'female' | 'male';

export interface Language {
  flag: string;
  /** English name, used in UI copy ("Translating to Armenian...") */
  label: string;
  native: string;
  /** ISO 639-1 code sent to ElevenLabs (Armenian is `hy`) */
  iso: string;
  /** How Gemini should write the spoken script */
  promptName: string;
  /** How to address the listener casually, for the Gemini prompt */
  casualAddress: string;
  /** Short phrase for "Tap to hear a sample" */
  sample: string;
}

/** PaperVoice currently only speaks Armenian. */
export const LANGUAGE: Language = {
  flag: '🇦🇲',
  label: 'Armenian',
  native: 'Հայերեն',
  iso: 'hy',
  promptName: 'Eastern Armenian, written in the Armenian script',
  casualAddress:
    'Use the informal "դու" form (քո, քեզ), never "Դուք" / "Ձեր". Write the way people actually talk in Yerevan, not literary or bureaucratic Armenian: spoken "ա" instead of "է" ("պետք ա", "էս նամակը քաղաքապետարանից ա", "չկա"), "էս/էդ" instead of "այս/այդ", everyday words over bookish ones ("մինչև երբ" not "վերջնաժամկետ", "պիտի վճարես" not "պարտավոր եք վճարել", "գինը" not "արժեքը").',
  sample: 'Բարև։ Էսպես եմ քեզ համար նամակները կարդալու։',
};

export const DEFAULT_VOICE: VoiceGender = 'female';

/** Armenian script isn't covered by Figtree, so spoken text uses Noto Sans Armenian. */
export const languageFont = (weight: Weight = 400) => ({ fontFamily: fonts.armenian[weight] });

// Keys are inlined at build time from .env. EXPO_PUBLIC_ values ship inside
// the app bundle — see README before distributing a build.
export const env = {
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.8-flash',
  elevenLabsApiKey: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '',
  elevenLabsModel: process.env.EXPO_PUBLIC_ELEVENLABS_MODEL || 'eleven_v3',
  voices: {
    // ElevenLabs default voices "Sarah" and "George". Override in .env with
    // voices from your own library.
    female: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_FEMALE || 'EXAVITQu4vr4xnSDxMaL',
    male: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_MALE || 'JBFqnCBsd6RMkjVDRZzb',
  } satisfies Record<VoiceGender, string>,
};
