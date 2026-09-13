export type PipelineStage = 0 | 1 | 2;

export type PipelineErrorKind =
  | 'missing-key'
  | 'network'
  | 'unreadable'
  | 'service'
  | 'audio'
  | 'too-large';

/** An error whose `message` is safe to show to the user as-is. */
export class PipelineError extends Error {
  constructor(
    public kind: PipelineErrorKind,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export const isAbortError = (e: unknown) =>
  e instanceof Error && (e.name === 'AbortError' || /abort/i.test(e.message));

export function friendlyError(e: unknown, stage: PipelineStage): PipelineError {
  if (e instanceof PipelineError) return e;
  if (e instanceof TypeError || (e instanceof Error && /network|fetch|connection/i.test(e.message))) {
    return new PipelineError('network', 'No connection — check your internet and try again.', e);
  }
  const byStage = [
    "Couldn't read that clearly — try again.",
    "Couldn't create the voice right now — try again.",
    "Couldn't play the audio — try again.",
  ];
  return new PipelineError(stage === 2 ? 'audio' : 'service', byStage[stage], e);
}
