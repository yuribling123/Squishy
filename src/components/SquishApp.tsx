"use client";

import dynamic from "next/dynamic";
import { Angry, Heart, RotateCcw, Save, SlidersHorizontal, Sparkles, UserRound, Volume2, VolumeX, WandSparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AvatarRecipe, MaterialKind } from "./AvatarCanvas";

const AvatarCanvas = dynamic(() => import("./AvatarCanvas"), { ssr: false, loading: () => <div className="canvas-loading"><span />正在叫醒软偶…</div> });

const DEFAULT_RECIPE: AvatarRecipe = { name: "小团", relation: "self", skin: "#efad83", hairColor: "#463a31", outfitColor: "#aa9674", hairStyle: 0, headSize: 1, bodySize: 1, height: 1, eyeSize: 1 };
const MATERIALS: { id: MaterialKind; name: string; note: string }[] = [
  { id: "mochi", name: "糯米", note: "软糯 · 慢回弹" }, { id: "cream", name: "奶油", note: "细腻 · 易凹陷" }, { id: "jelly", name: "果冻", note: "透亮 · 爱晃动" }, { id: "rubber", name: "橡胶", note: "紧实 · 快回弹" },
];
const RELATIONS: { id: AvatarRecipe["relation"]; label: string; icon: typeof Heart }[] = [
  { id: "like", label: "喜欢的人", icon: Heart }, { id: "dislike", label: "讨厌的人", icon: Angry }, { id: "self", label: "我自己", icon: UserRound }, { id: "fictional", label: "虚构角色", icon: Sparkles },
];
const SKINS = ["#efad83", "#f4c5a6", "#d9956c", "#a96745", "#71452f"];
const HAIRS = ["#463a31", "#201d1b", "#8a5138", "#d6ae68", "#815d8d"];
const OUTFITS = ["#aa9674", "#768c7a", "#c27f77", "#68768b", "#aa91ad"];

function playSoftSound(enabled: boolean, intensity: number) {
  if (!enabled || typeof window === "undefined") return;
  const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const context = new AudioCtx(); const oscillator = context.createOscillator(); const gain = context.createGain();
  oscillator.type = "sine"; oscillator.frequency.setValueAtTime(150 + intensity, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(72, context.currentTime + 0.14);
  gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
  oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.19); oscillator.addEventListener("ended", () => void context.close());
}

export default function SquishApp() {
  const [recipe, setRecipe] = useState<AvatarRecipe>(DEFAULT_RECIPE); const [draft, setDraft] = useState<AvatarRecipe>(DEFAULT_RECIPE); const [saved, setSaved] = useState<AvatarRecipe[]>([]);
  const [material, setMaterial] = useState<MaterialKind>("mochi"); const [softness, setSoftness] = useState(56); const [rebound, setRebound] = useState(38); const [soundOn, setSoundOn] = useState(true);
  const [customizing, setCustomizing] = useState(false); const [started, setStarted] = useState(false); const [resetKey, setResetKey] = useState(0); const [squeezeCount, setSqueezeCount] = useState(0); const [lastPart, setLastPart] = useState("脸颊");
  const activeMaterial = MATERIALS.find((item) => item.id === material) ?? MATERIALS[0];
  const visibleRecipe = customizing ? draft : recipe;

  useEffect(() => { try { const raw = window.localStorage.getItem("slow-squish-characters"); if (!raw) return; const characters = JSON.parse(raw) as AvatarRecipe[]; if (Array.isArray(characters) && characters.length) { setSaved(characters); setRecipe(characters[0]); setDraft(characters[0]); } } catch { /* keep the fresh local collection */ } }, []);
  const relationCopy = useMemo(() => recipe.relation === "like" ? "喜欢，就多揉一会儿。" : recipe.relation === "dislike" ? "别生气，把烦恼捏成团。" : recipe.relation === "fictional" ? "故事里的人，也可以软一点。" : "照顾自己，也可以从捏捏开始。", [recipe.relation]);
  const handleSqueeze = useCallback((part: string) => { setStarted(true); setLastPart(part); setSqueezeCount((count) => count + 1); playSoftSound(soundOn, softness); navigator.vibrate?.(9); }, [softness, soundOn]);
  const openCustomizer = () => { setDraft(recipe); setCustomizing(true); };
  const saveCharacter = () => { const cleanName = draft.name.trim() || "未命名软偶"; const nextRecipe = { ...draft, name: cleanName }; const nextSaved = [nextRecipe, ...saved.filter((item) => item.name !== cleanName)].slice(0, 6); setRecipe(nextRecipe); setDraft(nextRecipe); setSaved(nextSaved); window.localStorage.setItem("slow-squish-characters", JSON.stringify(nextSaved)); setCustomizing(false); setResetKey((key) => key + 1); };

  return (
    <main className="shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setStarted(false)} aria-label="返回慢慢捏首页"><span className="brand-mark" aria-hidden="true"><i /></span><span>慢慢捏</span></button>
        <nav className="header-actions" aria-label="主要操作">
          <button type="button" className="character-pill" onClick={openCustomizer}><WandSparkles size={15} />DIY 软偶</button>
          <button type="button" className="text-button" onClick={() => setSoundOn((value) => !value)} aria-pressed={soundOn}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}声音　{soundOn ? "开" : "关"}</button>
          <button type="button" className="icon-button" aria-label="让软偶恢复原状" onClick={() => setResetKey((key) => key + 1)}><RotateCcw size={21} /></button>
        </nav>
      </header>

      <section className="hero">
        <div className="intro">
          <p className="eyebrow">{started ? `刚刚捏了${lastPart}` : "今天想捏谁？"}</p>
          <h1>{started ? <>再大的情绪，<br />也能捏成团。</> : <>把情绪，<br />揉软一点。</>}</h1>
          <p className="lede">{started ? relationCopy : <>做一只属于你的软软替身。<br />不用着急，捏一会儿就好。</>}</p>
          <div className="intro-actions"><button type="button" className="primary-button" onClick={() => setStarted(true)}>开始捏捏 <span>→</span></button><button type="button" className="secondary-button" onClick={openCustomizer}><SlidersHorizontal size={15} />先做一个人</button></div>
        </div>

        <div className="stage"><div className="stage-halo" /><div className="canvas-wrap"><AvatarCanvas recipe={visibleRecipe} material={material} softness={softness} rebound={rebound} resetKey={resetKey} onSqueeze={handleSqueeze} /></div><p className="touch-hint"><span>按住角色</span> · 拖动挤压 · 松手回弹 · 空白处旋转</p></div>

        <aside className="character-note"><span className="number">{String(Math.max(1, saved.findIndex((item) => item.name === recipe.name) + 1)).padStart(2, "0")}</span><div><p className="mini-label">我的软偶</p><h2>{recipe.name}</h2><p>{activeMaterial.note}</p>{squeezeCount > 0 && <p className="squeeze-count">今天揉了 {squeezeCount} 下</p>}</div></aside>
      </section>

      <section className="control-dock" aria-label="角色材质与触感设置">
        <div className="materials">{MATERIALS.map((item) => <button key={item.id} className={`material ${material === item.id ? "active" : ""}`} type="button" onClick={() => setMaterial(item.id)} aria-pressed={material === item.id}><span className={`swatch ${item.id}`} />{item.name}</button>)}</div>
        <div className="sliders"><label>软硬度 <span>{softness > 68 ? "软趴趴" : softness > 38 ? "软糯" : "紧实"}</span><input type="range" min="10" max="90" value={softness} onChange={(event) => setSoftness(Number(event.target.value))} /></label><label>回弹速度 <span>{rebound > 65 ? "弹回来" : rebound > 35 ? "慢慢来" : "留个印"}</span><input type="range" min="10" max="90" value={rebound} onChange={(event) => setRebound(Number(event.target.value))} /></label></div>
      </section>

      {customizing && <div className="customizer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomizing(false); }}><section className="customizer" role="dialog" aria-modal="true" aria-labelledby="customizer-title">
        <header className="customizer-header"><div><p>MAKE IT YOURS</p><h2 id="customizer-title">做一只软偶</h2></div><button type="button" className="close-button" aria-label="关闭角色编辑器" onClick={() => setCustomizing(false)}><X size={20} /></button></header>
        <div className="customizer-body">
          <label className="field-label">给 TA 起个名字<input className="name-input" value={draft.name} maxLength={12} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：小团" /></label>
          <fieldset><legend>TA 是谁</legend><div className="option-grid relation-grid">{RELATIONS.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={draft.relation === id ? "selected" : ""} onClick={() => setDraft({ ...draft, relation: id })}><Icon size={16} />{label}</button>)}</div></fieldset>
          <fieldset><legend>轮廓</legend><div className="editor-sliders"><EditorRange label="头部大小" min={0.86} max={1.18} value={draft.headSize} onChange={(headSize) => setDraft({ ...draft, headSize })} /><EditorRange label="身体圆润" min={0.82} max={1.24} value={draft.bodySize} onChange={(bodySize) => setDraft({ ...draft, bodySize })} /><EditorRange label="高矮比例" min={0.88} max={1.1} value={draft.height} onChange={(height) => setDraft({ ...draft, height })} /><EditorRange label="眼睛大小" min={0.78} max={1.3} value={draft.eyeSize} onChange={(eyeSize) => setDraft({ ...draft, eyeSize })} /></div></fieldset>
          <fieldset><legend>发型</legend><div className="option-grid hair-grid">{["短发", "蘑菇头", "小揪揪"].map((name, index) => <button key={name} type="button" className={draft.hairStyle === index ? "selected" : ""} onClick={() => setDraft({ ...draft, hairStyle: index })}>{name}</button>)}</div></fieldset>
          <ColorChoices label="肤色" colors={SKINS} value={draft.skin} onChange={(skin) => setDraft({ ...draft, skin })} /><ColorChoices label="发色" colors={HAIRS} value={draft.hairColor} onChange={(hairColor) => setDraft({ ...draft, hairColor })} /><ColorChoices label="衣服" colors={OUTFITS} value={draft.outfitColor} onChange={(outfitColor) => setDraft({ ...draft, outfitColor })} />
          {saved.length > 0 && <fieldset><legend>以前做的</legend><div className="saved-list">{saved.map((item) => <button type="button" key={item.name} onClick={() => setDraft(item)}>{item.name}</button>)}</div></fieldset>}
        </div>
        <footer className="customizer-footer"><p>角色只保存在这台设备上</p><button type="button" className="save-button" onClick={saveCharacter}><Save size={16} />保存并开始捏</button></footer>
      </section></div>}
    </main>
  );
}

function EditorRange({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return <label><span>{label}</span><input type="range" min={min} max={max} step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function ColorChoices({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (color: string) => void }) {
  return <fieldset><legend>{label}</legend><div className="color-row">{colors.map((color) => <button key={color} type="button" className={value === color ? "selected" : ""} style={{ "--choice-color": color } as React.CSSProperties} onClick={() => onChange(color)} aria-label={`${label} ${color}`} />)}</div></fieldset>;
}
