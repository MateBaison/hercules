import type { CombatSignal } from "@/domain/combat";
export class CombatAudio {
  private context: AudioContext | null = null;
  async unlock() {
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
  }
  async play(signal: CombatSignal | "timer") {
    if (!this.context) return;
    if (this.context.state === "suspended") await this.context.resume();
    if (signal === "round" || signal === "rest" || signal === "finish") {
      // Inharmonic partials and a sharp attack imitate a struck boxing bell.
      const strikes = signal === "rest" ? 2 : 3;
      for (let strike = 0; strike < strikes; strike++) {
        for (const [frequency, volume, decay] of [
          [430, 0.055, 2.4],
          [693, 0.11, 2.1],
          [1023, 0.08, 1.8],
          [1465, 0.06, 1.3],
          [2190, 0.035, 0.8],
          [3030, 0.02, 0.5],
        ] as const) {
          const oscillator = this.context.createOscillator();
          const gain = this.context.createGain();
          const start = this.context.currentTime + strike * 0.28;
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(volume, start + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.001, start + decay);
          oscillator.connect(gain);
          gain.connect(this.context.destination);
          oscillator.start(start);
          oscillator.stop(start + decay + 0.05);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
        }
      }
      return;
    }
    const patterns: Record<"warning" | "timer", number[][]> = {
      warning: [
        [1100, 0, 0.12],
        [1100, 0.23, 0.12],
      ],
      timer: [
        [880, 0, 0.3],
        [880, 0.4, 0.3],
        [880, 0.8, 0.55],
      ],
    };
    for (const [frequency, offset, length] of patterns[signal]) {
      if (
        frequency === undefined ||
        offset === undefined ||
        length === undefined
      )
        continue;
      const oscillator = this.context.createOscillator(),
        gain = this.context.createGain(),
        start = this.context.currentTime + offset;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + length);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + length + 0.03);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
  }
  close() {
    void this.context?.close();
    this.context = null;
  }
}
