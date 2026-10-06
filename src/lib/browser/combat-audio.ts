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
    const patterns: Record<CombatSignal, number[][]> = {
      round: [
        [660, 0, 0.35],
        [880, 0.16, 0.5],
      ],
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
      oscillator.type = signal === "round" ? "sine" : "triangle";
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
