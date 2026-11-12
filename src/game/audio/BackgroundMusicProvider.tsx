"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const MUSIC_URL = "/music/luceris-nostalgic-590392.mp3";
const STORAGE_KEY = "kien-an-bgm-preferences";
const DEFAULT_VOLUME = .18;
const LEGACY_DEFAULT_VOLUME = .35;
const FADE_DURATION_MS = 420;

function clampVolume(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;
}

type MusicPreferences = { volume: number; playing: boolean };
type BackgroundMusicValue = {
  isPlaying: boolean;
  volume: number;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
};

const BackgroundMusicContext = createContext<BackgroundMusicValue | null>(null);

function readPreferences(): MusicPreferences {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!value || typeof value !== "object") return { volume: DEFAULT_VOLUME, playing: true };
    const preferences = value as Partial<MusicPreferences>;
    return {
      // Lower the shipped default without overwriting a deliberately customized volume.
      volume: typeof preferences.volume === "number" ? (preferences.volume === LEGACY_DEFAULT_VOLUME ? DEFAULT_VOLUME : clampVolume(preferences.volume)) : DEFAULT_VOLUME,
      playing: typeof preferences.playing === "boolean" ? preferences.playing : true,
    };
  } catch { return { volume: DEFAULT_VOLUME, playing: true }; }
}

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const desiredPlaybackRef = useRef(true);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const resumeAfterVisibilityRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);

  const savePreferences = useCallback((nextVolume = volumeRef.current, nextPlaying = desiredPlaybackRef.current) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: nextVolume, playing: nextPlaying }));
  }, []);

  const cancelFade = useCallback(() => {
    if (fadeFrameRef.current !== null) window.cancelAnimationFrame(fadeFrameRef.current);
    fadeFrameRef.current = null;
  }, []);

  const fadeTo = useCallback((target: number, afterFade?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    cancelFade();
    const start = clampVolume(audio.volume);
    const clampedTarget = clampVolume(target);
    const startedAt = performance.now();
    const tick = (now: number) => {
      // Some browsers can deliver an animation-frame timestamp from a
      // different clock source. Clamp both interpolation inputs so a frame
      // before startedAt can never produce an invalid negative volume.
      const progress = Math.max(0, Math.min(1, (now - startedAt) / FADE_DURATION_MS));
      audio.volume = clampVolume(start + (clampedTarget - start) * progress);
      if (progress < 1) fadeFrameRef.current = window.requestAnimationFrame(tick);
      else { fadeFrameRef.current = null; afterFade?.(); }
    };
    fadeFrameRef.current = window.requestAnimationFrame(tick);
  }, [cancelFade]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    desiredPlaybackRef.current = true;
    savePreferences();
    if (!audio || document.hidden) return;
    try {
      if (audio.paused) audio.volume = 0;
      await audio.play();
      fadeTo(volumeRef.current);
    } catch {
      // A later user gesture (for example, entering the school) can retry.
      setIsPlaying(false);
    }
  }, [fadeTo, savePreferences]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    desiredPlaybackRef.current = false;
    savePreferences();
    if (!audio || audio.paused) { setIsPlaying(false); return; }
    fadeTo(0, () => { audio.pause(); setIsPlaying(false); });
  }, [fadeTo, savePreferences]);

  const toggle = useCallback(() => { if (isPlaying) pause(); else void play(); }, [isPlaying, pause, play]);

  const setVolume = useCallback((nextVolume: number) => {
    const clamped = clampVolume(nextVolume);
    volumeRef.current = clamped;
    setVolumeState(clamped);
    savePreferences(clamped);
    if (audioRef.current && !audioRef.current.paused) fadeTo(clamped);
  }, [fadeTo, savePreferences]);

  useEffect(() => {
    const preferences = readPreferences();
    desiredPlaybackRef.current = preferences.playing;
    volumeRef.current = preferences.volume;
    setVolumeState(preferences.volume);

    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audioRef.current = audio;

    const requestedFromStartScreen = window.sessionStorage.getItem("kien-an-bgm-start-requested") === "true";
    if (requestedFromStartScreen && preferences.playing) {
      window.sessionStorage.removeItem("kien-an-bgm-start-requested");
      void (async () => {
        try { await audio.play(); fadeTo(volumeRef.current); } catch { /* Browser will require the next user gesture. */ }
      })();
    }

    return () => {
      cancelFade();
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [cancelFade, fadeTo]);

  useEffect(() => {
    const handleVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        resumeAfterVisibilityRef.current = desiredPlaybackRef.current && !audio.paused;
        if (!audio.paused) fadeTo(0, () => audio.pause());
        return;
      }
      if (resumeAfterVisibilityRef.current && desiredPlaybackRef.current) void play();
      resumeAfterVisibilityRef.current = false;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fadeTo, play]);

  const value: BackgroundMusicValue = { isPlaying, volume, play, pause, toggle, setVolume };
  return <BackgroundMusicContext.Provider value={value}>{children}</BackgroundMusicContext.Provider>;
}

export function useBackgroundMusic() {
  const value = useContext(BackgroundMusicContext);
  if (!value) throw new Error("useBackgroundMusic must be used inside BackgroundMusicProvider");
  return value;
}
