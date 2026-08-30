"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Dept={department:string;cartons:number};
type Shift={id:string;work_date:string;hours:number;departments:Dept[];comment:string|null;rates_snapshot:Record<string,number>};
type Settings={p01:number;p02:number;p03:number;p21:number;p28:number;hourly_rate:number;housing_bonus:number;salary_goal:number};
type Profile={user_id?:string;display_name?:string|null};
type Tab="home"|"history"|"stats"|"settings";

const defaults:Settings={p01:.1908,p02:.1595,p03:.133,p21:.1867,p28:.1631,hourly_rate:33.66,housing_bonus:2,salary_goal:7000};
const depts=["P01","P02","P03","P21","P28"] as const;
const keyMap:Record<string,keyof Settings>={P01:"p01",P02:"p02",P03:"p03",P21:"p21",P28:"p28"};
const money=(n:number)=>new Intl.NumberFormat("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+" zЕ‚";
const todayISO=()=>new Date().toISOString().slice(0,10);
const ym=(d:string)=>d.slice(0,7);
const dateText=(d:string)=>new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(d+"T12:00:00"));
const monthTitle=(v:string)=>{const[y,m]=v.split("-").map(Number);return new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric"}).format(new Date(y,m-1,1));};

export default function DashboardClient({initialShifts,initialSettings,initialProfile,email}:{initialShifts:Shift[];initialSettings:Settings|null;initialProfile:Profile|null;email:string}){
 const supabase=createClient(); const router=useRouter();
 const [shifts,setShifts]=useState<Shift[]>(initialShifts);
 const [settings,setSettings]=useState<Settings>({...defaults,...(initialSettings||{})});
 const [displayName,setDisplayName]=useState(initialProfile?.display_name||email.split("@")[0]||"");
 const [tab,setTab]=useState<Tab>("home");
 const [month,setMonth]=useState(todayISO().slice(0,7));
 const [showForm,setShowForm]=useState(false);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [date,setDate]=useState(todayISO());
 const [hours,setHours]=useState("");
 const [comment,setComment]=useState("");
 const [departments,setDepartments]=useState<Dept[]>([]);
 const [status,setStatus]=useState("");

 function snapshot(){return{P01:settings.p01,P02:settings.p02,P03:settings.p03,P21:settings.p21,P28:settings.p28,hourly_rate:settings.hourly_rate,housing_bonus:settings.housing_bonus};}
 function calc(s:Shift|{hours:number;departments:Dept[];rates_snapshot?:Record<string,number>}){
  const r: Record<string, number> = s.rates_snapshot || snapshot();
  const cartonPay=s.departments.reduce((a,d)=>a+d.cartons*(r[d.department]||0),0);
  const hourlyPay=s.departments.length?0:Number(s.hours||0)*(r.hourly_rate||settings.hourly_rate);
  const housing=Number(s.hours||0)*(r.housing_bonus||settings.housing_bonus);
  return{cartonPay,hourlyPay,housing,total:cartonPay+hourlyPay+housing};
 }
 const monthShifts=useMemo(()=>shifts.filter(s=>ym(s.work_date)===month).sort((a,b)=>b.work_date.localeCompare(a.work_date)),[shifts,month]);
 const totals=useMemo(()=>monthShifts.reduce((a,s)=>{const c=calc(s);a.total+=c.total;a.cartons+=s.departments.reduce((x,d)=>x+d.cartons,0);a.hours+=Number(s.hours||0);return a;},{total:0,cartons:0,hours:0}),[monthShifts,settings]);
 const preview=calc({hours:Number(hours||0),departments});
 const bestDay=useMemo(()=>{const by:Record<string,number>={};monthShifts.forEach(s=>by[s.work_date]=(by[s.work_date]||0)+calc(s).total);return Object.entries(by).sort((a,b)=>b[1]-a[1])[0]||null;},[monthShifts,settings]);
 const deptStats=useMemo(()=>{const map:Record<string,{cartons:number,pay:number}>={};depts.forEach(d=>map[d]={cartons:0,pay:0});monthShifts.forEach(s=>s.departments.forEach(d=>{const r=(s.rates_snapshot||snapshot())[d.department]||0;map[d.department].cartons+=d.cartons;map[d.department].pay+=d.cartons*r;}));return Object.entries(map).sort((a,b)=>b[1].cartons-a[1].cartons);},[monthShifts,settings]);

 function resetForm(){setEditingId(null);setDate(todayISO());setHours("");setComment("");setDepartments([]);setShowForm(false);}
 function openNew(){resetForm();setShowForm(true);setTab("home");}
 function editShift(s:Shift){setEditingId(s.id);setDate(s.work_date);setHours(String(s.hours||""));setComment(s.comment||"");setDepartments(s.departments||[]);setShowForm(true);setTab("home");window.scrollTo({top:0,behavior:"smooth"});}
 function addDepartment(){const n=depts.find(d=>!departments.some(x=>x.department===d));if(n)setDepartments([...departments,{department:n,cartons:0}]);}
 async function saveShift(){
  setStatus("");
  if(!departments.length&&!Number(hours))return setStatus("Р”РѕР±Р°РІСЊ РѕС‚РґРµР» РёР»Рё С‡Р°СЃС‹.");
  if(departments.some(d=>d.cartons<=0))return setStatus("РџСЂРѕРІРµСЂСЊ РєРѕР»РёС‡РµСЃС‚РІРѕ РєР°СЂС‚РѕРЅРѕРІ.");
  const payload={work_date:date,hours:Number(hours||0),departments,comment:comment||null,rates_snapshot:snapshot()};
  if(editingId){
   const{data,error}=await supabase.from("shifts").update(payload).eq("id",editingId).select().single();
   if(error)return setStatus(error.message); setShifts(shifts.map(s=>s.id===editingId?data:s)); setStatus("РЎРјРµРЅР° РѕР±РЅРѕРІР»РµРЅР°.");
  }else{
   const{data,error}=await supabase.from("shifts").insert(payload).select().single();
   if(error)return setStatus(error.message); setShifts([data,...shifts]); setStatus("РЎРјРµРЅР° СЃРѕС…СЂР°РЅРµРЅР°.");
  }
  setMonth(date.slice(0,7)); resetForm();
 }
 async function deleteShift(id:string){if(!confirm("РЈРґР°Р»РёС‚СЊ СЃРјРµРЅСѓ?"))return;const{error}=await supabase.from("shifts").delete().eq("id",id);if(error)setStatus(error.message);else{setShifts(shifts.filter(s=>s.id!==id));setStatus("РЎРјРµРЅР° СѓРґР°Р»РµРЅР°.");}}
 async function saveSettings(){const { data: { user } } = await supabase.auth.getUser(); if (!user) return setStatus("Нет авторизации."); const {error}=await supabase.from("user_settings").upsert({user_id:user.id,p01:settings.p01,p02:settings.p02,p03:settings.p03,p21:settings.p21,p28:settings.p28,hourly_rate:settings.hourly_rate,housing_bonus:settings.housing_bonus,salary_goal:settings.salary_goal},{onConflict:"user_id"});setStatus(error?error.message:"Р›РёС‡РЅС‹Рµ РЅР°СЃС‚СЂРѕР№РєРё СЃРѕС…СЂР°РЅРµРЅС‹.");}
 async function saveProfile(){const name=displayName.trim();if(!name)return setStatus("РЈРєР°Р¶Рё РёРјСЏ.");const{error}=await supabase.from("profiles").upsert({display_name:name},{onConflict:"user_id"});setStatus(error?error.message:"РџСЂРѕС„РёР»СЊ СЃРѕС…СЂР°РЅС‘РЅ.");}
 async function shareSite(){const url=window.location.origin;try{await navigator.clipboard.writeText(url);setStatus("РЎСЃС‹Р»РєР° РЅР° СЃР°Р№С‚ СЃРєРѕРїРёСЂРѕРІР°РЅР°.");}catch{setStatus(url);}}
 async function signOut(){await supabase.auth.signOut();router.push("/login");router.refresh();}

 function shiftCard(s:Shift){const c=calc(s);return <article className="shift" key={s.id}><div className="shift-main"><strong>{dateText(s.work_date)}</strong><div className="muted">{s.departments.length?s.departments.map(d=>`${d.department} ${d.cartons}`).join(" В· "):"РўРѕР»СЊРєРѕ С‡Р°СЃС‹"} В· {s.hours} С‡.</div>{s.comment&&<div className="shift-comment">{s.comment}</div>}</div><div className="right"><strong>{money(c.total)}</strong><div className="row-actions"><button onClick={()=>editShift(s)}>РР·РјРµРЅРёС‚СЊ</button><button className="danger-link" onClick={()=>deleteShift(s.id)}>РЈРґР°Р»РёС‚СЊ</button></div></div></article>;}

 function calendar(){
  const[y,m]=month.split("-").map(Number),days=new Date(y,m,0).getDate(),first=(new Date(y,m-1,1).getDay()+6)%7;
  const dayMap:Record<string,number>={};monthShifts.forEach(s=>dayMap[s.work_date]=(dayMap[s.work_date]||0)+calc(s).total);
  const cells:Array<React.ReactNode>=[];for(let i=0;i<first;i++)cells.push(<div className="cal-day empty" key={"e"+i}/>);
  for(let d=1;d<=days;d++){const iso=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;cells.push(<button key={iso} className={`cal-day ${dayMap[iso]?"worked":""} ${iso===todayISO()?"today":""}`} onClick={()=>{const s=monthShifts.find(x=>x.work_date===iso);if(s)editShift(s);}}><span>{d}</span>{dayMap[iso]?<small>{Math.round(dayMap[iso])} zЕ‚</small>:null}</button>);}
  return <div className="calendar"><div className="cal-week">{["РџРЅ","Р’С‚","РЎСЂ","Р§С‚","РџС‚","РЎР±","Р’СЃ"].map(x=><span key={x}>{x}</span>)}</div><div className="cal-grid">{cells}</div></div>;
 }

 return <main className="app-shell">
  <header className="topbar"><div><div className="brand"><span className="brand-mark">B</span><span>Biedronka HAKY Salary</span></div><div className="muted">РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ: {displayName||email}</div></div><button className="secondary compact" onClick={signOut}>Р’С‹Р№С‚Рё</button></header>
  <div className="month-switch"><button onClick={()=>{const[y,m]=month.split("-").map(Number);const d=new Date(y,m-2,1);setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)}}>вЂ№</button><strong>{monthTitle(month)}</strong><button onClick={()=>{const[y,m]=month.split("-").map(Number);const d=new Date(y,m,1);setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`)}}>вЂє</button></div>

  {tab==="home"&&<>
   <section className="hero"><div className="eyebrow">Р—Р°СЂР°Р±РѕС‚Р°РЅРѕ Р·Р° РІС‹Р±СЂР°РЅРЅС‹Р№ РјРµСЃСЏС†</div><div className="money">{money(totals.total)}</div><div className="progress"><i style={{width:`${Math.min(100,totals.total/settings.salary_goal*100)}%`}}/></div><div className="hero-foot"><span>Р¦РµР»СЊ: {money(settings.salary_goal)}</span><span>Р’С‹РїР»Р°С‚Р°: 20-Рµ вЂ” РїРѕСЃР»РµРґРЅРёР№ РґРµРЅСЊ РјРµСЃСЏС†Р°</span></div></section>
   <section className="grid"><div className="card"><div className="stat-label">РЎРјРµРЅС‹</div><div className="stat-value">{monthShifts.length}</div></div><div className="card"><div className="stat-label">РљР°СЂС‚РѕРЅС‹</div><div className="stat-value">{totals.cartons.toLocaleString("pl-PL")}</div></div><div className="card"><div className="stat-label">Р§Р°СЃС‹</div><div className="stat-value">{totals.hours}</div></div><div className="card"><div className="stat-label">РЎСЂРµРґРЅСЏСЏ СЃРјРµРЅР°</div><div className="stat-value">{money(monthShifts.length?totals.total/monthShifts.length:0)}</div></div></section>
   <div className="action-row"><button className="primary" onClick={openNew}>пј‹ РќРѕРІР°СЏ СЃРјРµРЅР°</button><button className="secondary share-btn" onClick={shareSite}>РџРѕРґРµР»РёС‚СЊСЃСЏ СЃР°Р№С‚РѕРј</button></div>
   {showForm&&<section className="card form form-card"><div className="form-title"><strong>{editingId?"Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ СЃРјРµРЅС‹":"РќРѕРІР°СЏ СЃРјРµРЅР°"}</strong><button className="icon-btn" onClick={resetForm}>Г—</button></div><label>Р”Р°С‚Р°<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Р§Р°СЃС‹<input type="number" step=".25" value={hours} onChange={e=>setHours(e.target.value)} placeholder="РќР°РїСЂРёРјРµСЂ, 8"/></label>
    {departments.map((d,i)=><div className="dept-row" key={`${d.department}-${i}`}><select value={d.department} onChange={e=>{const c=[...departments];c[i]={...c[i],department:e.target.value};setDepartments(c)}}>{depts.map(x=><option key={x} value={x} disabled={departments.some((z,j)=>j!==i&&z.department===x)}>{x}</option>)}</select><input type="number" placeholder="РљР°СЂС‚РѕРЅС‹" value={d.cartons||""} onChange={e=>{const c=[...departments];c[i]={...c[i],cartons:Number(e.target.value)};setDepartments(c)}}/><button className="danger" onClick={()=>setDepartments(departments.filter((_,j)=>j!==i))}>Г—</button></div>)}
    <button className="secondary" onClick={addDepartment}>пј‹ Р”РѕР±Р°РІРёС‚СЊ РѕС‚РґРµР»</button><label>РљРѕРјРјРµРЅС‚Р°СЂРёР№<textarea value={comment} onChange={e=>setComment(e.target.value)}/></label><div className="preview"><span>РџСЂРµРґРІР°СЂРёС‚РµР»СЊРЅРѕ</span><strong>{money(preview.total)}</strong></div><div className="breakdown"><span>РљР°СЂС‚РѕРЅС‹ {money(preview.cartonPay)}</span><span>РџРѕ С‡Р°СЃР°Рј {money(preview.hourlyPay)}</span><span>Р–РёР»СЊС‘ {money(preview.housing)}</span></div><button className="primary" onClick={saveShift}>{editingId?"РЎРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ":"РЎРѕС…СЂР°РЅРёС‚СЊ СЃРјРµРЅСѓ"}</button></section>}
   {status&&<p className="notice">{status}</p>}<section><div className="section-title"><h2>РџРѕСЃР»РµРґРЅРёРµ СЃРјРµРЅС‹</h2><button className="link-btn" onClick={()=>setTab("history")}>Р’СЃРµ</button></div><div className="list">{monthShifts.slice(0,5).map(shiftCard)}{!monthShifts.length&&<div className="empty-box">Р’ СЌС‚РѕРј РјРµСЃСЏС†Рµ СЃРјРµРЅ РїРѕРєР° РЅРµС‚.</div>}</div></section>
  </>}

  {tab==="history"&&<><div className="section-title"><h2>РСЃС‚РѕСЂРёСЏ Рё РєР°Р»РµРЅРґР°СЂСЊ</h2><span className="pill">{monthShifts.length} СЃРјРµРЅ</span></div>{calendar()}<div className="section-title"><h2>РЎРјРµРЅС‹ РјРµСЃСЏС†Р°</h2></div><div className="list">{monthShifts.map(shiftCard)}{!monthShifts.length&&<div className="empty-box">Р’ СЌС‚РѕРј РјРµСЃСЏС†Рµ СЃРјРµРЅ РЅРµС‚.</div>}</div>{status&&<p className="notice">{status}</p>}</>}
  {tab==="stats"&&<><div className="section-title"><h2>РЎС‚Р°С‚РёСЃС‚РёРєР°</h2></div><section className="grid"><div className="card"><div className="stat-label">Р—Р°СЂР°Р±РѕС‚Р°РЅРѕ</div><div className="stat-value">{money(totals.total)}</div></div><div className="card"><div className="stat-label">РЎСЂРµРґРЅСЏСЏ СЃРјРµРЅР°</div><div className="stat-value">{money(monthShifts.length?totals.total/monthShifts.length:0)}</div></div><div className="card"><div className="stat-label">Р›СѓС‡С€РёР№ РґРµРЅСЊ</div><div className="stat-value small-value">{bestDay?dateText(bestDay[0]):"вЂ”"}</div><div className="muted">{bestDay?money(bestDay[1]):""}</div></div><div className="card"><div className="stat-label">Р”Рѕ С†РµР»Рё</div><div className="stat-value">{money(Math.max(0,settings.salary_goal-totals.total))}</div></div></section><div className="section-title"><h2>РћС‚РґРµР»С‹</h2></div><div className="card dept-stats">{deptStats.map(([d,v])=><div className="dept-stat" key={d}><div><strong>{d}</strong><span>{v.cartons.toLocaleString("pl-PL")} РєР°СЂС‚РѕРЅРѕРІ</span></div><strong>{money(v.pay)}</strong></div>)}</div></>}
  {tab==="settings"&&<><div className="section-title"><h2>РџСЂРѕС„РёР»СЊ</h2></div><div className="card settings-grid"><label>РРјСЏ<input value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label>Email<input value={email} disabled/></label><button className="primary" onClick={saveProfile}>РЎРѕС…СЂР°РЅРёС‚СЊ РїСЂРѕС„РёР»СЊ</button></div><div className="section-title"><h2>РњРѕРё СЃС‚Р°РІРєРё</h2></div><div className="card settings-grid">{depts.map(k=><label key={k}>{k}<input type="number" step=".0001" value={settings[keyMap[k]] as number} onChange={e=>setSettings({...settings,[keyMap[k]]:Number(e.target.value)})}/></label>)}<label>Р§Р°СЃРѕРІР°СЏ СЃС‚Р°РІРєР°<input type="number" step=".01" value={settings.hourly_rate} onChange={e=>setSettings({...settings,hourly_rate:Number(e.target.value)})}/></label><label>Р–РёР»СЊС‘ / С‡Р°СЃ<input type="number" step=".01" value={settings.housing_bonus} onChange={e=>setSettings({...settings,housing_bonus:Number(e.target.value)})}/></label><label>Р¦РµР»СЊ РЅР° РјРµСЃСЏС†<input type="number" step="100" value={settings.salary_goal} onChange={e=>setSettings({...settings,salary_goal:Number(e.target.value)})}/></label><button className="primary" onClick={saveSettings}>РЎРѕС…СЂР°РЅРёС‚СЊ РјРѕРё РЅР°СЃС‚СЂРѕР№РєРё</button></div>{status&&<p className="notice">{status}</p>}</>}
  <nav className="bottom-nav"><button className={tab==="home"?"active":""} onClick={()=>setTab("home")}><span>вЊ‚</span>Р“Р»Р°РІРЅР°СЏ</button><button className={tab==="history"?"active":""} onClick={()=>setTab("history")}><span>в–¦</span>РСЃС‚РѕСЂРёСЏ</button><button className="nav-add" onClick={openNew}><span>пј‹</span></button><button className={tab==="stats"?"active":""} onClick={()=>setTab("stats")}><span>в†—</span>РЎС‚Р°С‚РёСЃС‚РёРєР°</button><button className={tab==="settings"?"active":""} onClick={()=>setTab("settings")}><span>вљ™</span>РќР°СЃС‚СЂРѕР№РєРё</button></nav>
 </main>;
}
