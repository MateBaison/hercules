"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  CombatMachine,
  type CombatConfig,
  type CombatSignal,
} from "@/domain/combat";
import { useScreenWakeLock } from "@/lib/browser/use-screen-wake-lock";
import { CombatAudio } from "@/lib/browser/combat-audio";
import { haversine, recordedRoute, type Point } from "@/domain/tracking";
import { useApp } from "@/state/app-provider";
type Track = {
  mode: "run" | "cycle";
  running: boolean;
  preparing: boolean;
  prep: number;
  prepEnd: number;
  started: number;
  elapsed: number;
  distance: number;
  points: Point[];
  error: string;
  saved: boolean;
};
type ClockContext = {
  now: number;
  section: string;
  setSection: (section: string) => void;
  sw: { running: boolean; elapsed: number; started: number };
  toggleSw: () => void;
  resetSw: () => void;
  timer: { running: boolean; remaining: number; end: number };
  toggleTimer: () => void;
  preset: (seconds: number) => void;
  combat: CombatMachine;
  configureCombat: (config: CombatConfig) => void;
  toggleCombat: () => void;
  track: Track;
  configureTrack: (change: Partial<Track>) => void;
  toggleTrack: () => void;
  resetTrack: () => void;
};
const Context = createContext<ClockContext | null>(null);
export function ClockProvider({ children }: { children: React.ReactNode }) {
  const { notify, change, t } = useApp(),
    [now, setNow] = useState(Date.now()),
    [section, setSection] = useState("stopwatch"),
    [sw, setSw] = useState({ running: false, elapsed: 0, started: 0 }),
    [timer, setTimer] = useState({ running: false, remaining: 30, end: 0 });
  const timerRef = useRef(timer);
  const timerAnnounced = useRef(0);
  timerRef.current = timer;
  const [track, setTrack] = useState<Track>({
    mode: "run",
    running: false,
    preparing: false,
    prep: 10,
    prepEnd: 0,
    started: 0,
    elapsed: 0,
    distance: 0,
    points: [],
    error: "",
    saved: false,
  });
  const combat = useRef(new CombatMachine()),
    audio = useRef(new CombatAudio()),
    watch = useRef<number | null>(null),
    trackRef = useRef(track);
  useScreenWakeLock(
    sw.running ||
      timer.running ||
      combat.current.state.running ||
      track.running ||
      track.preparing,
  );
  trackRef.current = track;
  const signal = (signals: CombatSignal[]) => {
    signals.forEach((signal) => {
      void audio.current.play(signal).catch(() => {});
    });
  };
  const stopWatch = () => {
    if (watch.current !== null)
      navigator.geolocation?.clearWatch(watch.current);
    watch.current = null;
  };
  const startGPS = () => {
    if (!navigator.geolocation) {
      setTrack((previous) => ({
        ...previous,
        running: false,
        preparing: false,
        error: "GPS no disponible.",
      }));
      return;
    }
    setTrack((previous) => ({
      ...previous,
      running: true,
      preparing: false,
      started: Date.now() - (previous.saved ? 0 : previous.elapsed) * 1000,
      ...(previous.saved
        ? { elapsed: 0, points: [], distance: 0, saved: false }
        : {}),
      error: "",
    }));
    watch.current = navigator.geolocation.watchPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          time: Date.now(),
          speed: Number.isFinite(position.coords.speed)
            ? Math.max(0, position.coords.speed ?? 0)
            : 0,
        };
        if (
          !Number.isFinite(point.lat) ||
          !Number.isFinite(point.lon) ||
          Math.abs(point.lat) > 90 ||
          Math.abs(point.lon) > 180
        )
          return;
        setTrack((previous) => {
          if (!previous.running) return previous;
          const last = previous.points.at(-1),
            distance = last ? haversine(last, point) : 0;
          return {
            ...previous,
            distance: previous.distance + (distance < 200 ? distance : 0),
            points: [...previous.points, point],
          };
        });
      },
      () => {
        stopWatch();
        setTrack((previous) => ({
          ...previous,
          running: false,
          preparing: false,
          error:
            "No se pudo acceder a tu ubicación. Revisá el permiso del navegador.",
        }));
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 },
    );
  };
  const startGPSRef = useRef(startGPS);
  startGPSRef.current = startGPS;
  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (combat.current.state.running) signal(combat.current.advance(time));
      const countdown = timerRef.current;
      if (
        countdown.running &&
        time >= countdown.end &&
        timerAnnounced.current !== countdown.end
      ) {
        timerAnnounced.current = countdown.end;
        void audio.current.play("timer").catch(() => {});
        navigator.vibrate?.([200, 100, 200]);
      }
      setTimer((previous) =>
        previous.running
          ? {
              ...previous,
              remaining: Math.max(0, Math.ceil((previous.end - time) / 1000)),
              running: time < previous.end,
            }
          : previous,
      );
      const current = trackRef.current;
      if (current.preparing && time >= current.prepEnd) {
        trackRef.current = { ...current, preparing: false };
        startGPSRef.current();
      }
      if (current.running)
        setTrack((previous) => ({
          ...previous,
          elapsed: Math.floor((time - previous.started) / 1000),
        }));
    }, 100);
    return () => {
      clearInterval(interval);
      if (watch.current !== null)
        navigator.geolocation?.clearWatch(watch.current);
      audio.current.close();
    };
  }, []);
  return (
    <Context.Provider
      value={{
        now,
        section,
        setSection,
        sw,
        toggleSw: () =>
          setSw((previous) =>
            previous.running
              ? {
                  ...previous,
                  running: false,
                  elapsed: Date.now() - previous.started,
                }
              : {
                  ...previous,
                  running: true,
                  started: Date.now() - previous.elapsed,
                },
          ),
        resetSw: () => setSw({ running: false, elapsed: 0, started: 0 }),
        timer,
        toggleTimer: () => {
          if (!timerRef.current.running && timerRef.current.remaining > 0) {
            timerAnnounced.current = 0;
            void audio.current
              .unlock()
              .catch(() =>
                notify("El sonido no está disponible en este navegador."),
              );
          }
          setTimer((previous) =>
            previous.running
              ? {
                  ...previous,
                  running: false,
                  remaining: Math.max(
                    0,
                    Math.ceil((previous.end - Date.now()) / 1000),
                  ),
                }
              : previous.remaining > 0
                ? {
                    ...previous,
                    running: true,
                    end: Date.now() + previous.remaining * 1000,
                  }
                : previous,
          );
        },
        preset: (seconds) =>
          setTimer({ running: false, remaining: seconds, end: 0 }),
        combat: combat.current,
        configureCombat: (config) => {
          try {
            combat.current.reset(config);
            setNow(Date.now());
          } catch {
            notify("Revisá los valores del reloj de combate.");
          }
        },
        toggleCombat: () => {
          void audio.current
            .unlock()
            .then(() => {
              signal(combat.current.toggle(Date.now()));
              setNow(Date.now());
            })
            .catch(() => {
              signal(combat.current.toggle(Date.now()));
              notify("El sonido no está disponible en este navegador.");
            });
        },
        track,
        configureTrack: (change) => {
          if (!track.running && !track.preparing)
            setTrack((previous) => ({ ...previous, ...change }));
        },
        toggleTrack: () => {
          if (track.preparing)
            setTrack((previous) => ({ ...previous, preparing: false }));
          else if (track.running) {
            stopWatch();
            const current = trackRef.current;
            if (!current.running) return;
            trackRef.current = { ...current, running: false };
            let saved = false;
            if (current.points.length >= 2 && Date.now() > current.started) {
              const record = recordedRoute(current, Date.now());
              saved = change((draft) => {
                (draft.trackingSessions ??= []).unshift(record);
              });
              if (saved) notify(t("Recorrido guardado", "Route saved"));
            }
            setTrack((previous) => ({
              ...previous,
              running: false,
              elapsed: Math.floor((Date.now() - previous.started) / 1000),
              saved,
            }));
          } else if (track.prep > 0)
            setTrack((previous) => ({
              ...previous,
              preparing: true,
              prepEnd: Date.now() + previous.prep * 1000,
              error: "",
            }));
          else startGPS();
        },
        resetTrack: () => {
          stopWatch();
          setTrack((previous) => ({
            ...previous,
            running: false,
            preparing: false,
            elapsed: 0,
            distance: 0,
            points: [],
            error: "",
            saved: false,
            started: 0,
          }));
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useClock() {
  const context = useContext(Context);
  if (!context) throw new Error("Clock unavailable");
  return context;
}
