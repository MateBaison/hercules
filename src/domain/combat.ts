import { z } from "zod";
export const combatPresets = {
  boxeo: { rounds: 12, work: 180, rest: 60 },
  tabata: { rounds: 8, work: 20, rest: 10 },
  hiit: { rounds: 10, work: 40, rest: 20 },
  "muay-thai": { rounds: 5, work: 180, rest: 60 },
} as const;
export const combatConfigSchema = z.object({
  mode: z.enum(["boxeo", "tabata", "hiit", "muay-thai"]),
  rounds: z.number().int().min(1).max(100),
  work: z.number().int().min(1).max(3600),
  rest: z.number().int().min(0).max(3600),
  prep: z.number().int().min(0).max(600),
});
export type CombatConfig = z.infer<typeof combatConfigSchema>;
export type CombatSignal = "round" | "rest" | "warning" | "finish";
export type CombatState = {
  phase: "prep" | "work" | "rest" | "done";
  round: number;
  remaining: number;
  end: number;
  running: boolean;
};
export class CombatMachine {
  config: CombatConfig;
  state: CombatState;
  private pausedMs = 0;
  private announced = 0;
  private warned = 0;
  constructor(
    config: CombatConfig = { mode: "boxeo", ...combatPresets.boxeo, prep: 10 },
  ) {
    this.config = combatConfigSchema.parse(config);
    this.state = this.initial();
  }
  private initial(): CombatState {
    this.pausedMs = (this.config.prep || this.config.work) * 1000;
    this.announced = 0;
    this.warned = 0;
    return {
      phase: this.config.prep ? "prep" : "work",
      round: 1,
      remaining: this.config.prep || this.config.work,
      end: 0,
      running: false,
    };
  }
  reset(config = this.config) {
    this.config = combatConfigSchema.parse(config);
    this.state = this.initial();
  }
  toggle(now: number): CombatSignal[] {
    if (this.state.running) {
      this.pausedMs = Math.max(0, this.state.end - now);
      this.state = {
        ...this.state,
        remaining: Math.ceil(this.pausedMs / 1000),
        running: false,
      };
      return [];
    }
    if (this.state.phase === "done") this.state = this.initial();
    this.state = { ...this.state, end: now + this.pausedMs, running: true };
    if (this.state.phase === "work" && this.announced !== this.state.round) {
      this.announced = this.state.round;
      return ["round"];
    }
    return [];
  }
  advance(now: number): CombatSignal[] {
    const signals: CombatSignal[] = [];
    if (!this.state.running) return signals;
    let state = { ...this.state };
    while (state.running && now >= state.end) {
      if (state.phase === "prep") {
        state.phase = "work";
        state.end += this.config.work * 1000;
      } else if (state.phase === "work" && state.round === this.config.rounds) {
        state.phase = "done";
        state.running = false;
        signals.push("finish");
      } else if (state.phase === "work" && this.config.rest) {
        state.phase = "rest";
        signals.push("rest");
        state.end += this.config.rest * 1000;
      } else {
        state.phase = "work";
        state.round++;
        state.end += this.config.work * 1000;
      }
      if (state.phase === "work" && this.announced !== state.round) {
        this.announced = state.round;
        signals.push("round");
      }
    }
    state.remaining = state.running
      ? Math.max(0, Math.ceil((state.end - now) / 1000))
      : 0;
    if (
      state.phase === "work" &&
      state.remaining <= 15 &&
      this.config.work > 15 &&
      this.warned !== state.round
    ) {
      this.warned = state.round;
      signals.push("warning");
    }
    this.state = state;
    return signals;
  }
}
export function timeFormat(seconds: number) {
  const value = Math.max(0, Math.floor(seconds)),
    hours = Math.floor(value / 3600),
    minutes = Math.floor((value % 3600) / 60),
    rest = value % 60;
  return `${hours ? String(hours).padStart(2, "0") + ":" : ""}${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
