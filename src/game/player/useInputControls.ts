"use client";
import { useEffect, useRef } from "react";

export type InputState = { forward: number; right: number; jump: boolean; run: boolean; interact: boolean };
export function useInputControls(enabled = true) {
  const input = useRef<InputState>({ forward: 0, right: 0, jump: false, run: false, interact: false });
  useEffect(() => {
    const update = (event: KeyboardEvent, down: boolean) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (!enabled) { input.current = { forward: 0, right: 0, jump: false, run: false, interact: false }; return; }
      const code = event.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "KeyE", "KeyG"].includes(code)) event.preventDefault();
      if (code === "KeyW" || code === "ArrowUp") input.current.forward = down ? 1 : input.current.forward === 1 ? 0 : input.current.forward;
      if (code === "KeyS" || code === "ArrowDown") input.current.forward = down ? -1 : input.current.forward === -1 ? 0 : input.current.forward;
      if (code === "KeyD" || code === "ArrowRight") input.current.right = down ? 1 : input.current.right === 1 ? 0 : input.current.right;
      if (code === "KeyA" || code === "ArrowLeft") input.current.right = down ? -1 : input.current.right === -1 ? 0 : input.current.right;
      if (code === "Space") input.current.jump = down;
      if (code === "ShiftLeft") input.current.run = down;
      if (code === "KeyE") input.current.interact = down;
    };
    const down = (event: KeyboardEvent) => update(event, true);
    const up = (event: KeyboardEvent) => update(event, false);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [enabled]);
  return input;
}
