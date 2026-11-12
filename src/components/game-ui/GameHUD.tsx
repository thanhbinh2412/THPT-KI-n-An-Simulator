"use client";
import { interactions } from "@/game/config/school.config";
import { useGameStore } from "@/game/store/useGameStore";
import { classroomById, isClassroomDoorId } from "@/game/classrooms/classroom.config";
import { stoneBenchConfig } from "@/game/world/stoneBench.config";
import { leaveStoneBenchSeat, requestStoneBenchSeat } from "@/game/world/benchSeatClient";

export function GameHUD() {
  const camera = useGameStore((s) => s.cameraMode); const nearby = useGameStore((s) => s.nearbyId); const dialog = useGameStore((s) => s.activeDialog); const paused = useGameStore((s) => s.paused); const campusGates = useGameStore((s) => s.campusGates); const classroomDoors = useGameStore((s) => s.classroomDoors); const playerPosition = useGameStore((s) => s.playerPosition); const grounded = useGameStore((s) => s.playerGrounded); const sittingOnBench = useGameStore((s) => s.benchSeatIndex !== null);
  const toggle = useGameStore((s) => s.toggleCamera); const setDialog = useGameStore((s) => s.setDialog); const setPaused = useGameStore((s) => s.setPaused); const requestTeacherGreeting = useGameStore((s) => s.requestTeacherGreeting); const physicsDebug = useGameStore((s) => s.physicsDebug); const togglePhysicsDebug = useGameStore((s) => s.togglePhysicsDebug);
  const info = interactions.find((item) => item.id === dialog); const prompt = interactions.find((item) => item.id === nearby);
  const campusGateId = nearby === "campus-gate-main" ? "main" : nearby === "campus-gate-left" ? "left" : nearby === "campus-gate-right" ? "right" : null;
  const classroomDoorId = isClassroomDoorId(nearby) ? nearby : null;
  const classroom = classroomDoorId ? classroomById.get(classroomDoorId) : undefined;
  const toggleNearbyGate = () => {
    if (nearby === stoneBenchConfig.id || sittingOnBench) { if (sittingOnBench) leaveStoneBenchSeat(); else requestStoneBenchSeat(); }
    else if (nearby === "teacher-tam") requestTeacherGreeting();
    else if (campusGateId) useGameStore.getState().requestCampusGateToggle(campusGateId);
    else if (classroomDoorId) useGameStore.getState().requestClassroomDoorToggle(classroomDoorId);
    else if (nearby === "school-gate") useGameStore.getState().requestGateToggle();
    else if (nearby) setDialog(nearby);
  };
  const promptText = sittingOnBench
    ? "G - Đứng dậy"
    : nearby === stoneBenchConfig.id
    ? "G - Ngồi xuống ghế"
    : nearby === "teacher-tam"
    ? "Chào cô giáo"
    : classroomDoorId
    ? `E - ${classroomDoors[classroomDoorId] ? "Đóng cửa lớp" : "Mở cửa lớp"} ${classroom?.id ?? ""}`
    : campusGateId
      ? `E - ${campusGates[campusGateId] ? "Đóng cổng" : "Mở cổng"}`
      : prompt ? `E - ${prompt.label}` : null;
  return <div className="pointer-events-none absolute inset-0 text-white">
    <div className="panel absolute left-4 top-4 rounded-xl px-4 py-3 text-sm"><strong className="block text-amber-200">{camera === "third" ? "Third-person" : "First-person"}</strong><span className="text-slate-200">Kien An Campus · Floor 1</span>{process.env.NODE_ENV !== "production" && physicsDebug && <span className="mt-1 block font-mono text-[11px] text-cyan-200">XYZ {playerPosition.map((value) => value.toFixed(2)).join(", ")} · {grounded ? "grounded" : "airborne"}</span>}</div>
    <div className="absolute right-4 top-4 flex gap-2 pointer-events-auto"><button onClick={toggle} className="action px-4 py-2 text-sm">{camera === "third" ? "FPS" : "TPS"}</button>{process.env.NODE_ENV !== "production" && <button onClick={togglePhysicsDebug} className="panel rounded-full px-3 py-2 text-xs">{physicsDebug ? "Hide colliders" : "Colliders"}</button>}<button onClick={() => setPaused(true)} className="panel rounded-full px-4 py-2 text-sm">Pause</button></div>
    {promptText && <button onClick={toggleNearbyGate} className="panel pointer-events-auto absolute left-1/2 bottom-28 -translate-x-1/2 rounded-full px-5 py-3 text-sm" aria-label={nearby === "teacher-tam" ? "Chào cô giáo" : promptText}>{promptText}{nearby === "teacher-tam" && <span className="ml-2 text-amber-200">(E)</span>}</button>}
    {info && <div className="panel pointer-events-auto absolute left-1/2 top-1/2 w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-7 shadow-2xl"><p className="text-xs tracking-[.2em] text-amber-200">MEMORY FOUND</p><h2 className="mt-2 font-serif text-3xl text-amber-100">{info.title}</h2><p className="my-4 leading-7 text-slate-100">{info.body}</p><button className="action px-5 py-2" onClick={() => setDialog(null)}>Close</button></div>}
    {paused && <div className="panel pointer-events-auto absolute inset-0 flex items-center justify-center"><div className="rounded-2xl p-8 text-center"><p className="font-serif text-4xl text-amber-100">Paused</p><p className="my-4 text-slate-200">Press Escape or continue exploring.</p><button className="action px-6 py-2" onClick={() => setPaused(false)}>Continue</button></div></div>}
  </div>;
}
