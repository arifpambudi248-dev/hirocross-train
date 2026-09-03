// Efek suara ringan berbasis Web Audio API (tanpa file audio eksternal)

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Bunyi "ting" pendek — dipakai saat 1 repetisi terdeteksi. */
export function playTing(pitch = 1) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1320 * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(1980 * pitch, now + 0.04);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

/** Bunyi peringatan (rep di luar target kecepatan). */
export function playWarn() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.32);
}

/** Buka konteks audio dari interaksi user (dibutuhkan iOS/Safari). */
export function primeAudio() {
  getCtx();
}
