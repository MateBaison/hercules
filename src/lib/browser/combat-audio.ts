import type { CombatSignal } from "@/domain/combat";
export class CombatAudio {
  private context: AudioContext | null = null;
  async unlock() {
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
  }
  async play(signal: CombatSignal) {
    if (!this.context) return;
    if (this.context.state === "suspended") await this.context.resume();
    if (signal === "round" || signal === "rest") {
      // Inharmonic partials and a sharp attack imitate a struck boxing bell.
      const strikes = signal === "round" ? 3 : 2;
      for (let strike = 0; strike < strikes; strike++) {
        for (const [frequency, volume] of [
          [520, 0.13],
          [1435, 0.07],
          [2808, 0.035],
          [4644, 0.015],
        ]) {
          const oscillator = this.context.createOscillator();
          const gain = this.context.createGain();
          const start = this.context.currentTime + strike * 0.22;
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency!, start);
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(volume!, start + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 1.3);
          oscillator.connect(gain);
          gain.connect(this.context.destination);
          oscillator.start(start);
          oscillator.stop(start + 1.35);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
        }
      }
      return;
    }
    const patterns: Record<"warning" | "finish", number[][]> = {
      warning: [
        [1100, 0, 0.12],
        [1100, 0.23, 0.12],
      ],
      finish: [
        [880, 0, 0.3],
        [660, 0.35, 0.3],
        [440, 0.7, 0.7],
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
