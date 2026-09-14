import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { LANGUAGE, type Language, type VoiceGender } from '../config';
import { synthesizeSpeech } from '../services/elevenlabs';
import { friendlyError, isAbortError, PipelineError, type PipelineStage } from '../services/errors';
import { analyzeLetter, type LetterAnalysis } from '../services/gemini';
import { useSettings } from './SettingsContext';

/** One page of a letter: a photo (front, back, …) or a PDF file. */
export interface Page {
  uri: string;
  mimeType: string;
  kind: 'image' | 'pdf';
  /** File name, for PDFs */
  name?: string;
  /** Pixel size, when known (camera/library photos) */
  width?: number;
  height?: number;
}

/** Long edge photos are shrunk to before upload — still plenty for Gemini to read small print. */
const MAX_IMAGE_EDGE = 2000;

/** Downscales a large photo to cut upload time on mobile data; PDFs and small images pass through. */
async function prepareForUpload(page: Page): Promise<{ uri: string; mimeType: string }> {
  if (page.kind !== 'image') return page;
  try {
    let { width, height } = page;
    if (!width || !height) {
      const probe = await ImageManipulator.manipulate(page.uri).renderAsync();
      ({ width, height } = probe);
    }
    if (Math.max(width, height) <= MAX_IMAGE_EDGE) return page;
    const ref = await ImageManipulator.manipulate(page.uri)
      .resize(width >= height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE })
      .renderAsync();
    const out = await ref.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
    return { uri: out.uri, mimeType: 'image/jpeg' };
  } catch (e) {
    if (__DEV__) console.warn('Resize failed, uploading original', e);
    return page;
  }
}

/** Gemini's inline request limit is 20 MB; leave room for base64 overhead and the prompt. */
const MAX_TOTAL_BYTES = 14 * 1024 * 1024;

export type ScanPhase =
  | { phase: 'idle' }
  | { phase: 'running'; stage: PipelineStage }
  | { phase: 'error'; stage: PipelineStage; error: PipelineError }
  | { phase: 'done' };

interface ScanState {
  status: ScanPhase;
  pages: Page[];
  /** First photo page, used as the blurred backdrop (null for PDF-only scans) */
  backdropUri: string | null;
  language: Language;
  analysis: LetterAnalysis | null;
  player: AudioPlayer | null;
  start: (pages: Page[]) => void;
  retry: () => void;
  cancel: () => void;
  reset: () => void;
}

const ScanContext = createContext<ScanState | null>(null);

const LOAD_TIMEOUT_MS = 15_000;

function waitUntilLoaded(player: AudioPlayer, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (player.isLoaded) return resolve();
    const done = (err?: Error) => {
      clearTimeout(timer);
      sub.remove();
      signal.removeEventListener('abort', onAbort);
      err ? reject(err) : resolve();
    };
    const onAbort = () => done(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    const timer = setTimeout(
      () => done(new PipelineError('audio', "Couldn't play the audio — try again.")),
      LOAD_TIMEOUT_MS,
    );
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.error) done(new PipelineError('audio', "Couldn't play the audio — try again.", s.error));
      else if (s.isLoaded) done();
    });
    signal.addEventListener('abort', onAbort);
  });
}

/**
 * Runs the capture pipeline:
 *   stage 0 — Gemini reads the pages (photos and/or PDF) and writes the spoken script
 *   stage 1 — ElevenLabs synthesizes the script to an audio file
 *   stage 2 — the file is loaded into a player and starts playing
 * Retrying resumes from the stage that failed.
 */
export function ScanProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [status, setStatus] = useState<ScanPhase>({ phase: 'idle' });
  const [pages, setPages] = useState<Page[]>([]);
  const [analysis, setAnalysis] = useState<LetterAnalysis | null>(null);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);

  // Mutable mirror of the pipeline so retries can resume without stale closures.
  const job = useRef<{
    pages: Page[];
    voice: VoiceGender;
    analysis: LetterAnalysis | null;
    audio: File | null;
    player: AudioPlayer | null;
    controller: AbortController | null;
    runId: number;
  }>({
    pages: [],
    voice: settings.voice,
    analysis: null,
    audio: null,
    player: null,
    controller: null,
    runId: 0,
  });

  const releasePlayer = useCallback(() => {
    const j = job.current;
    if (j.player) {
      try {
        j.player.pause();
        j.player.release();
      } catch {}
    }
    j.player = null;
    setPlayer(null);
  }, []);

  const run = useCallback(async () => {
    const j = job.current;
    j.controller?.abort();
    const controller = new AbortController();
    j.controller = controller;
    const runId = ++j.runId;
    const alive = () => job.current.runId === runId && !controller.signal.aborted;

    let stage: PipelineStage = j.analysis ? (j.audio ? 2 : 1) : 0;
    try {
      if (j.pages.length === 0) throw new PipelineError('unreadable', "Couldn't read that clearly — try again.");

      if (stage === 0) {
        setStatus({ phase: 'running', stage: 0 });
        const prepared = await Promise.all(j.pages.map(prepareForUpload));
        if (!alive()) return;
        const totalBytes = prepared.reduce((sum, p) => sum + (new File(p.uri).size ?? 0), 0);
        if (totalBytes > MAX_TOTAL_BYTES) {
          throw new PipelineError(
            'too-large',
            'That’s too much to read at once — try fewer pages or a smaller PDF.',
          );
        }
        const files = await Promise.all(
          prepared.map(async (p) => ({ base64: await new File(p.uri).base64(), mimeType: p.mimeType })),
        );
        if (!alive()) return;
        const result = await analyzeLetter(
          files,
          LANGUAGE,
          controller.signal,
        );
        if (!alive()) return;
        j.analysis = result;
        setAnalysis(result);
        stage = 1;
      }

      if (stage === 1) {
        setStatus({ phase: 'running', stage: 1 });
        const file = await synthesizeSpeech(
          j.analysis!.spokenScript,
          LANGUAGE,
          j.voice,
          `letter-${Date.now()}.mp3`,
          controller.signal,
        );
        if (!alive()) return;
        j.audio = file;
        stage = 2;
      }

      setStatus({ phase: 'running', stage: 2 });
      releasePlayer();
      const p = createAudioPlayer({ uri: j.audio!.uri });
      j.player = p;
      await waitUntilLoaded(p, controller.signal);
      if (!alive()) return;
      p.play();
      setPlayer(p);
      setStatus({ phase: 'done' });
    } catch (e) {
      if (!alive() || isAbortError(e)) return;
      if (stage === 2) {
        // A file that won't load is likely corrupt — regenerate it on retry.
        releasePlayer();
        j.audio = null;
      }
      const error = friendlyError(e, stage);
      if (__DEV__) console.warn(`Pipeline failed at stage ${stage}:`, e);
      setStatus({ phase: 'error', stage, error });
    }
  }, [releasePlayer]);

  const cleanupFiles = useCallback(() => {
    const audio = job.current.audio;
    if (audio?.exists) {
      try {
        audio.delete();
      } catch {}
    }
    job.current.audio = null;
  }, []);

  const start = useCallback(
    (next: Page[]) => {
      const j = job.current;
      j.controller?.abort();
      releasePlayer();
      cleanupFiles();
      j.pages = next;
      j.voice = settings.voice;
      j.analysis = null;
      setPages(next);
      setAnalysis(null);
      run();
    },
    [settings.voice, releasePlayer, cleanupFiles, run],
  );

  const cancel = useCallback(() => {
    job.current.controller?.abort();
    job.current.runId++;
  }, []);

  const reset = useCallback(() => {
    cancel();
    releasePlayer();
    cleanupFiles();
    job.current.analysis = null;
    job.current.pages = [];
    setAnalysis(null);
    setPages([]);
    setStatus({ phase: 'idle' });
  }, [cancel, releasePlayer, cleanupFiles]);

  const value = useMemo(
    () => ({
      status,
      pages,
      backdropUri: pages.find((p) => p.kind === 'image')?.uri ?? null,
      language: LANGUAGE, analysis, player, start, retry: run, cancel, reset }),
    [status, pages, analysis, player, start, run, cancel, reset],
  );

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used inside ScanProvider');
  return ctx;
}
