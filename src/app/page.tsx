"use client";

import Link from "next/link";

export default function Home() {
  return <main className="relative min-h-dvh overflow-hidden bg-slate-950 text-white">
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/kien-an-high-school-entrance.png')" }} aria-hidden />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-slate-950/20" aria-hidden />
    <section className="relative z-10 flex min-h-dvh items-end justify-center p-6 pb-[max(3rem,8vh)] text-center sm:items-center sm:pb-6">
      <div className="max-w-2xl rounded-3xl border border-white/20 bg-slate-950/45 p-7 shadow-2xl backdrop-blur-sm sm:p-10">
        <p className="text-xs font-medium tracking-[.32em] text-amber-200">THPT KIẾN AN · HẢI PHÒNG</p>
        <h1 className="school-title mt-4 text-4xl leading-tight text-amber-50 drop-shadow sm:text-6xl">Trở Về Trường Xưa</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-100 sm:text-base">Cùng bước qua cổng trường Kiến An, gặp lại sân trường, hành lang và những lớp học thân quen.</p>
        <Link href="/game" onClick={() => window.sessionStorage.setItem("kien-an-bgm-start-requested", "true")} className="mt-7 inline-block rounded-full bg-amber-400 px-9 py-3 font-semibold text-amber-950 no-underline shadow-lg shadow-amber-950/30 transition hover:bg-amber-300">Bắt đầu</Link>
        <p className="mt-5 text-xs text-slate-200">WASD để di chuyển · Shift để chạy · Space để nhảy · V đổi camera · E tương tác</p>
      </div>
    </section>
  </main>;
}
