/**
 * Short two-tone chime synthesised with the WebAudio API.
 *
 * Deliberately not an audio asset: no extra network request, nothing to 404,
 * and nothing for a strict CSP to block.
 *
 * Browsers block audio until the page has been interacted with, so every call
 * is best-effort — a silent failure must never break notification handling.
 */

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function tone(ctx: AudioContext, frequency: number, startAt: number, duration: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);

  // Quick attack, exponential decay — reads as a "ding" rather than a beep.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

export function playNotificationChime(): void {
  const ctx = getContext();
  if (!ctx) return;

  try {
    // Autoplay policy parks the context until a user gesture has happened.
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    tone(ctx, 880, now, 0.18);
    tone(ctx, 1174.7, now + 0.12, 0.22);
  } catch {
    /* audio is a nicety; never let it break the notification path */
  }
}
