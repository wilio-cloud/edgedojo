import confetti from 'canvas-confetti';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function triggerHaptic(pattern: number | number[] = 12) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore on unsupported browsers
    }
  }
}

function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.06,
  delaySec = 0
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function playUiTick(enabled: boolean) {
  triggerHaptic(8);
  if (!enabled) return;
  playTone(580, 0.04, 'triangle', 0.035);
}

export function playOrderExecSound(enabled: boolean) {
  triggerHaptic([15, 25, 15]);
  if (!enabled) return;
  playTone(440, 0.07, 'sine', 0.055, 0);
  playTone(660, 0.09, 'sine', 0.055, 0.055);
}

export function playVictoryFeedback(enabled: boolean, stars: number) {
  triggerHaptic([20, 40, 30]);
  if (stars >= 3 && typeof window !== 'undefined') {
    confetti({
      particleCount: 55,
      spread: 62,
      origin: { y: 0.72 },
      colors: ['#10B981', '#34D399', '#F59E0B', '#06B6D4'],
    });
  }
  if (!enabled) return;
  playTone(523.25, 0.11, 'triangle', 0.065, 0);
  playTone(659.25, 0.11, 'triangle', 0.065, 0.08);
  if (stars >= 2) {
    playTone(783.99, 0.16, 'triangle', 0.075, 0.16);
  }
  if (stars >= 3) {
    playTone(1046.5, 0.24, 'sine', 0.08, 0.25);
  }
}

export function playLossFeedback(enabled: boolean) {
  triggerHaptic([35, 30, 35]);
  if (!enabled) return;
  playTone(260, 0.13, 'sawtooth', 0.04, 0);
  playTone(195, 0.2, 'sawtooth', 0.04, 0.1);
}
