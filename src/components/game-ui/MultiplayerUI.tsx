"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSavedMultiplayerProfile, useMultiplayer } from "@/game/multiplayer/MultiplayerProvider";
import { useBackgroundMusic } from "@/game/audio/BackgroundMusicProvider";
import type { PlayerGender } from "@/shared/multiplayer-types";

export function MultiplayerUI() {
  const { localPlayer, onlineCount, status, error, join, leave } = useMultiplayer();
  const music = useBackgroundMusic();
  const [name, setName] = useState(""); const [gender, setGender] = useState<PlayerGender | null>(null);
  useEffect(() => { const profile = getSavedMultiplayerProfile(); if (profile) { setName(profile.name); setGender(profile.gender); } }, []);
  const valid = name.trim().length >= 2 && name.trim().length <= 24 && gender !== null;
  const submit = (event: FormEvent) => { event.preventDefault(); if (gender && valid) { void music.play(); join(name, gender); } };
  if (!localPlayer) return <div className="multiplayer-overlay"><form className="multiplayer-card multiplayer-card--profile" onSubmit={submit}>
    <p className="text-xs tracking-[.2em] text-amber-200">THPT KIẾN AN</p><h1 className="mt-2 font-serif text-3xl text-amber-100">TRỞ VỀ TRƯỜNG XƯA</h1>
    <label className="mt-5 block text-sm text-slate-200" htmlFor="player-name">Tên của bạn</label><input id="player-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={24} autoComplete="name" autoFocus className="multiplayer-input" placeholder="Nhập tên của bạn..." />
    <fieldset className="character-choice"><legend>Chọn nhân vật</legend><div className="character-choice__grid">
      {(["male", "female"] as const).map((option) => <button key={option} type="button" onClick={() => setGender(option)} className={`character-choice__card ${gender === option ? "character-choice__card--selected" : ""}`} aria-pressed={gender === option}>
        <strong>{option === "male" ? "NAM" : "NỮ"}</strong><span>{option === "male" ? "Học sinh nam" : "Học sinh nữ"}</span>
      </button>)}
    </div></fieldset>
    <p className="mt-2 min-h-5 text-sm text-rose-200">{error ?? ""}</p><button className="action mt-2 w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-45" disabled={!valid || status === "connecting" || status === "reconnecting"}>{status === "connecting" || status === "reconnecting" ? "Đang kết nối..." : "VÀO TRƯỜNG"}</button><p className="mt-4 text-center text-sm text-slate-200">● {onlineCount} người đang online</p>
  </form></div>;
  const label = status === "connected" ? "Đã kết nối" : "Đang kết nối lại...";
  return <div className="multiplayer-status pointer-events-none absolute left-4 bottom-4 z-10 flex items-center gap-3 text-white"><div className="multiplayer-status__identity panel rounded-xl px-3 py-2 text-sm"><strong>{localPlayer.name}</strong><span className="ml-2 text-emerald-200">● {label}</span><span className="ml-2 text-slate-200">Online: {onlineCount}</span></div><button className="multiplayer-status__leave action pointer-events-auto px-3 py-2 text-sm" onClick={leave}>Rời trường</button></div>;
}
