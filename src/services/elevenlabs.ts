import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';

import { env, type Language, type VoiceGender } from '../config';
import { PipelineError } from './errors';

/**
 * Synthesizes `text` with ElevenLabs and writes the MP3 to the cache
 * directory. Resolves with the local file.
 */
export async function synthesizeSpeech(
  text: string,
  language: Language,
  voice: VoiceGender,
  fileName: string,
  signal?: AbortSignal,
): Promise<File> {
  if (!env.elevenLabsApiKey) {
    throw new PipelineError(
      'missing-key',
      'PaperVoice isn’t set up yet — add EXPO_PUBLIC_ELEVENLABS_API_KEY to your .env file.',
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${env.voices[voice]}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'xi-api-key': env.elevenLabsApiKey,
      },
      body: JSON.stringify({
        text,
        model_id: env.elevenLabsModel,
        language_code: language.iso,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (__DEV__) console.warn(`ElevenLabs ${res.status}:`, body);
    if (res.status === 401 || res.status === 403) {
      throw new PipelineError('missing-key', 'Your ElevenLabs API key was rejected — check your .env file.', body);
    }
    if (res.status === 429 || res.status >= 500) {
      throw new PipelineError('service', 'The voice service is busy right now — try again in a moment.', body);
    }
    throw new PipelineError('service', "Couldn't create the voice right now — try again.", body);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) {
    throw new PipelineError('audio', "Couldn't create the voice right now — try again.");
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file;
}

/** Short stable hash so edited sample phrases don't reuse stale cached audio. */
const hash = (text: string) => {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

/** Cached sample phrase for the Settings "Tap to hear a sample" button. */
export async function getVoiceSample(language: Language, voice: VoiceGender): Promise<File> {
  const cached = new File(Paths.cache, `sample-${language.iso}-${env.voices[voice]}-${hash(language.sample)}.mp3`);
  if (cached.exists && (cached.size ?? 0) > 0) return cached;
  return synthesizeSpeech(language.sample, language, voice, cached.name);
}
