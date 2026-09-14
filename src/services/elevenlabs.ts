import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';

import { env, type Language, type VoiceGender } from '../config';
import { isAbortError, PipelineError } from './errors';

/**
 * eleven_v3 takes ~24s for a full letter script in one request, so the script
 * is split at sentence ends and the pieces are generated concurrently, then
 * joined into one MP3 (same format per piece, so the frames concatenate
 * cleanly). The account allows about 3 concurrent requests.
 */
const MAX_PARTS = 3;
/** Scripts shorter than this go in one request — splitting only adds seams. */
const SPLIT_MIN_CHARS = 160;
const MAX_ATTEMPTS = 3;

/** Splits at sentence ends (Armenian ։ included) into at most `maxParts` similar-length pieces. */
export function splitForSpeech(text: string, maxParts = MAX_PARTS): string[] {
  const clean = text.trim();
  if (clean.length < SPLIT_MIN_CHARS || maxParts <= 1) return [clean];

  const sentences = clean.match(/[^։.!?…]+(?:[։.!?…]+|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
  const parts = Math.min(maxParts, sentences.length);
  const target = clean.length / parts;

  // Each sentence goes to the piece its midpoint falls in, so pieces end up
  // close to equal length (the slowest piece sets the wait).
  const out: string[] = Array.from({ length: parts }, () => '');
  let before = 0;
  for (const sentence of sentences) {
    const index = Math.min(parts - 1, Math.floor((before + sentence.length / 2) / target));
    out[index] = out[index] ? `${out[index]} ${sentence}` : sentence;
    before += sentence.length + 1;
  }
  return out.filter(Boolean);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestAudio(
  text: string,
  language: Language,
  voice: VoiceGender,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  for (let attempt = 1; ; attempt++) {
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

    if (res.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > 0) return bytes;
      throw new PipelineError('audio', "Couldn't create the voice right now — try again.");
    }

    const body = await res.text().catch(() => '');
    if (__DEV__) console.warn(`ElevenLabs ${res.status} (attempt ${attempt}):`, body);
    if (res.status === 401 || res.status === 403) {
      throw new PipelineError('missing-key', 'Your ElevenLabs API key was rejected — check your .env file.', body);
    }
    // Too many concurrent requests or a hiccup on their side: back off and retry.
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
      await sleep(700 * attempt);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      throw new PipelineError('service', 'The voice service is busy right now — try again in a moment.', body);
    }
    throw new PipelineError('service', "Couldn't create the voice right now — try again.", body);
  }
}

/**
 * Synthesizes `text` with ElevenLabs and writes one MP3 to the cache
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

  const parts = splitForSpeech(text);
  // If one piece fails, cancel the others instead of paying for audio we'll throw away.
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  let pieces: Uint8Array[];
  try {
    pieces = await Promise.all(
      parts.map((part) =>
        requestAudio(part, language, voice, controller.signal).catch((e) => {
          controller.abort();
          throw e;
        }),
      ),
    );
  } catch (e) {
    // Surface the original failure, not the abort it caused in sibling requests.
    if (isAbortError(e) && !signal?.aborted) throw new PipelineError('service', "Couldn't create the voice right now — try again.", e);
    throw e;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }

  const bytes = new Uint8Array(pieces.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const piece of pieces) {
    bytes.set(piece, offset);
    offset += piece.length;
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
  const cached = new File(
    Paths.cache,
    `sample-${language.iso}-${env.elevenLabsModel}-${env.voices[voice]}-${hash(language.sample)}.mp3`,
  );
  if (cached.exists && (cached.size ?? 0) > 0) return cached;
  return synthesizeSpeech(language.sample, language, voice, cached.name);
}
