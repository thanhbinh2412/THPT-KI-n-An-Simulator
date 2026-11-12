"use client";

import { useProgress } from "@react-three/drei";

export function GameLoadingScreen({ ready }: { ready: boolean }) {
  const { active, progress, loaded, total } = useProgress();
  if (ready) return null;
  const displayedProgress = Math.min(95, Math.max(4, Math.round(Number.isFinite(progress) ? progress : 0)));
  const status = active ? "Đang tải khuôn viên và nội thất lớp học…" : "Đang chuẩn bị thế giới trò chơi…";

  return <section className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-slate-950 p-6 text-white" role="status" aria-live="polite">
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/kien-an-high-school-entrance.png')" }} aria-hidden />
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" aria-hidden />
    <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-950/60 p-8 text-center shadow-2xl backdrop-blur-md">
      <p className="text-xs tracking-[.28em] text-amber-200">THPT KIẾN AN · HẢI PHÒNG</p>
      <h1 className="school-title mt-3 text-4xl text-amber-50">Trở Về Trường Xưa</h1>
      <p className="mt-6 text-sm text-slate-200">{status}</p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800/90" aria-label={`Đã tải ${displayedProgress}%`}>
        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-300" style={{ width: `${displayedProgress}%` }} />
      </div>
      <p className="mt-3 text-xs tabular-nums text-slate-300">{displayedProgress}%{total > 0 ? ` · ${loaded}/${total} tài nguyên` : ""}</p>
    </div>
  </section>;
}
