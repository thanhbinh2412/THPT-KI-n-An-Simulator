"use client";
import { activateNearby } from "@/game/interactions/activateNearby";
import { campusDoors } from "@/game/config/campusGameplay";
import { interactions } from "@/game/config/school.config";
import { useGameStore } from "@/game/store/useGameStore";
import { isClassroomDoorId } from "@/game/classrooms/classroom.config";
import { stoneBenchConfig } from "@/game/world/stoneBench.config";
import { useBackgroundMusic } from "@/game/audio/BackgroundMusicProvider";

export function GameHUD() {
  const camera = useGameStore((s) => s.cameraMode); const nearby = useGameStore((s) => s.nearbyId); const dialog = useGameStore((s) => s.activeDialog); const paused = useGameStore((s) => s.paused); const campusGates = useGameStore((s) => s.campusGates); const classroomDoors = useGameStore((s) => s.classroomDoors); const playerPosition = useGameStore((s) => s.playerPosition); const grounded = useGameStore((s) => s.playerGrounded); const sittingOnBench = useGameStore((s) => s.benchSeatIndex !== null);
  const music = useBackgroundMusic();
  const toggle = useGameStore((s) => s.toggleCamera); const setDialog = useGameStore((s) => s.setDialog); const setPaused = useGameStore((s) => s.setPaused); const physicsDebug = useGameStore((s) => s.physicsDebug); const togglePhysicsDebug = useGameStore((s) => s.togglePhysicsDebug);
  const info = interactions.find((item) => item.id === dialog); const prompt = interactions.find((item) => item.id === nearby);
  const campusGateId = nearby === "campus-gate-main" ? "main" : nearby === "campus-gate-left" ? "left" : nearby === "campus-gate-right" ? "right" : null;
  const classroomDoorId = isClassroomDoorId(nearby) ? nearby : null;
  const door = campusDoors.find((entry) => entry.id === nearby);
  const gateCloseRequested = useGameStore((s) => s.campusGateCloseRequested);
  const doorCloseRequested = useGameStore((s) => s.classroomDoorCloseRequested);
  const closePending = door?.gate ? gateCloseRequested === door.gate : door && doorCloseRequested === door.id;
  const promptText = sittingOnBench
    ? "G - Đứng dậy"
    : nearby === stoneBenchConfig.id
    ? "G - Ngồi xuống ghế"
    : nearby === "teacher-tam"
    ? "Chào cô giáo"
    : classroomDoorId
    ? `E - ${classroomDoors[classroomDoorId] ? "Đóng" : "Mở"} ${campusDoors.find((door) => door.id === classroomDoorId)?.title ?? ""}`
    : campusGateId
      ? `E - ${campusGates[campusGateId] ? "Đóng cổng" : "Mở cổng"}`
      : prompt ? `E - ${prompt.label}` : null;
  return <div className="pointer-events-none absolute inset-0 z-10 text-white">
    <div className="game-hud-info panel absolute left-4 top-4 rounded-xl px-4 py-3 text-sm"><strong className="block text-amber-200">{camera === "third" ? "Third-person" : "First-person"}</strong><span className="text-slate-200">THPT Kiến An · V02</span>{process.env.NODE_ENV !== "production" && physicsDebug && <span className="mt-1 block font-mono text-[11px] text-cyan-200">XYZ {playerPosition.map((value) => value.toFixed(2)).join(", ")} · {grounded ? "grounded" : "airborne"}</span>}</div>
    <div className="game-hud-actions absolute right-4 top-4 flex gap-2 pointer-events-auto"><button onClick={toggle} className="action px-4 py-2 text-sm">{camera === "third" ? "FPS" : "TPS"}</button><button onClick={music.toggle} className="music-control panel rounded-full px-3 py-2 text-sm" aria-label={music.isPlaying ? "Tạm dừng nhạc nền" : "Phát nhạc nền"} title={music.isPlaying ? "Tạm dừng nhạc nền" : "Phát nhạc nền"}><span aria-hidden="true">{music.isPlaying ? "♫" : "🔇"}</span><span className="music-control__label"> BGM</span></button>{process.env.NODE_ENV !== "production" && <button onClick={togglePhysicsDebug} className="panel rounded-full px-3 py-2 text-xs">{physicsDebug ? "Hide colliders" : "Colliders"}</button>}<button onClick={() => setPaused(true)} className="panel rounded-full px-4 py-2 text-sm">Tạm dừng</button></div>
    {promptText && !paused && !dialog && <button onClick={activateNearby} className="game-hud-prompt panel pointer-events-auto absolute left-1/2 bottom-28 -translate-x-1/2 rounded-full px-5 py-3 text-sm" aria-label={nearby === "teacher-tam" ? "Chào cô giáo" : promptText}>{closePending ? "Đang chờ lối cửa trống…" : promptText}{nearby === "teacher-tam" && <span className="ml-2 text-amber-200">(E)</span>}</button>}
    {info && <div className="panel pointer-events-auto absolute left-1/2 top-1/2 w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-7 shadow-2xl"><p className="text-xs tracking-[.2em] text-amber-200">KỶ NIỆM SÂN TRƯỜNG</p><h2 className="mt-2 font-serif text-3xl text-amber-100">{info.title}</h2><p className="my-4 leading-7 text-slate-100">{info.body}</p><button className="action px-5 py-2" onClick={() => setDialog(null)}>Đóng</button></div>}
    {paused && <div className="panel pointer-events-auto absolute inset-0 flex items-center justify-center"><div className="rounded-2xl p-8 text-center"><p className="font-serif text-4xl text-amber-100">Tạm dừng</p><p className="my-4 text-slate-200">Nhấn Escape hoặc tiếp tục khám phá.</p><button className="action px-6 py-2" onClick={() => setPaused(false)}>Tiếp tục</button></div></div>}
  </div>;
}
