"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type GraphicsPreset = "low" | "medium" | "high";
type Metrics = { fps: number; averageFps: number; frameMs: number; calls: number; triangles: number; geometries: number; textures: number; updateMs: number; collisionMs: number };
type GraphicsValue = { preset: GraphicsPreset; dpr: number; shadows: boolean; campusVisible: boolean; collisionsEnabled: boolean; setPreset: (preset: GraphicsPreset) => void; setCampusVisible: (value: boolean) => void; setCollisionsEnabled: (value: boolean) => void; metrics: Metrics; setMetrics: (metrics: Metrics) => void; debug: boolean };
const PRESETS = { low: { dpr: .9, shadows: false }, medium: { dpr: 1.15, shadows: false }, high: { dpr: 1.5, shadows: false } } as const;
const EMPTY: Metrics = { fps: 0, averageFps: 0, frameMs: 0, calls: 0, triangles: 0, geometries: 0, textures: 0, updateMs: 0, collisionMs: 0 };
const GraphicsContext = createContext<GraphicsValue | null>(null);
export function GraphicsSettingsProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<GraphicsPreset>("medium"); const [campusVisible, setCampusVisible] = useState(true); const [collisionsEnabled, setCollisionsEnabled] = useState(true); const [metrics, setMetrics] = useState(EMPTY); const [debug, setDebug] = useState(false);
  useEffect(() => { setDebug(new URLSearchParams(window.location.search).get("debugPerformance") === "true"); const saved = window.localStorage.getItem("kien-an-graphics-preset"); if (saved === "low" || saved === "medium" || saved === "high") setPresetState(saved); }, []);
  const setPreset = (next: GraphicsPreset) => { setPresetState(next); window.localStorage.setItem("kien-an-graphics-preset", next); };
  const value = useMemo(() => ({ preset, ...PRESETS[preset], campusVisible, collisionsEnabled, setPreset, setCampusVisible, setCollisionsEnabled, metrics, setMetrics, debug }), [preset, campusVisible, collisionsEnabled, metrics, debug]);
  return <GraphicsContext.Provider value={value}>{children}</GraphicsContext.Provider>;
}
export function useGraphicsSettings() { const value = useContext(GraphicsContext); if (!value) throw new Error("useGraphicsSettings must be used inside GraphicsSettingsProvider"); return value; }
