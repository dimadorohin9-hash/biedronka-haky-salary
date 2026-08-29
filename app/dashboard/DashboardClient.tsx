"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Dept = { department: string; cartons: number };
type Shift = {
  id: string;
  work_date: string;
  hours: number;
  departments: Dept[];
  comment: string | null;
  rates_snapshot: Record<string, number>;
};
type Settings = {
  p01: number; p02: number; p03: number; p21: number; p28: number;
  hourly_rate: number; housing_bonus: number; salary_goal: number;
};

const defaults: Settings = {
  p01: .1908, p02: .1595, p03: .133, p21: .1867, p28: .1631,
  hourly_rate: 33.66, housing_bonus: 2, salary_goal: 7000
};

const keyMap: Record<string, keyof Settings> = {
  P01:"p01",P02:"p02",P03:"p03",P21:"p21",P28:"p28"
};

const money=(n:number)=>new Intl.NumberFormat("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+" zł";

export default function DashboardClient({
  initialShifts, initialSettings, email
}: { initialShifts: Shift[]; initialSettings: Settings | null; email: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [shifts,setShifts]=useState<Shift[]>(initialShifts);
  const [settings,setSettings]=useState<Settings>({...defaults,...(initialSettings||{})});
  const [showForm,setShowForm]=useState(false);
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [hours,setHours]=useState("");
  const [comment,setComment]=useState("");
  const [departments,setDepartments]=useState<Dept[]>([]);
  const [status,setStatus]=useState("");

  function calc(s: Shift | {hours:number;departments:Dept[];rates_snapshot?:Record<string,number>}) {
    const snap=s.rates_snapshot || {
      P01:settings.p01,P02:settings.p02,P03:settings.p03,P21:settings.p21,P28:settings.p28,
      hourly_rate:settings.hourly_rate,housing_bonus:settings.housing_bonus
    };
    const cartonPay=s.departments.reduce((a,d)=>a+d.cartons*(snap[d.department]||0),0);
    const hourlyPay=s.departments.length ? 0 : Number(s.hours||0)*(snap.hourly_rate||settings.hourly_rate);
    const housing=Number(s.hours||0)*(snap.housing_bonus||settings.housing_bonus);
    return cartonPay+hourlyPay+housing;
  }

  const total=useMemo(()=>shifts.reduce((a,s)=>a+calc(s),0),[shifts,settings]);
  const cartons=useMemo(()=>shifts.reduce((a,s)=>a+s.departments.reduce((x,d)=>x+d.cartons,0),0),[shifts]);
  const totalHours=useMemo(()=>shifts.reduce((a,s)=>a+Number(s.hours||0),0),[shifts]);
  const preview=calc({hours:Number(hours||0),departments});

  function addDepartment(){
    const next=["P01","P02","P03","P21","P28"].find(d=>!departments.some(x=>x.department===d));
    if(next) setDepartments([...departments,{department:next,cartons:0}]);
  }

  async function saveShift(){
    setStatus("");
    if(!departments.length && !Number(hours)) return setStatus("Добавь отдел или часы.");
    if(departments.some(d=>d.cartons<=0)) return setStatus("Проверь количество картонов.");

    const snapshot={
      P01:settings.p01,P02:settings.p02,P03:settings.p03,P21:settings.p21,P28:settings.p28,
      hourly_rate:settings.hourly_rate,housing_bonus:settings.housing_bonus
    };
    const { data,error }=await supabase.from("shifts").insert({
      work_date:date,
      hours:Number(hours||0),
      departments,
      comment:comment||null,
      rates_snapshot:snapshot
    }).select().single();

    if(error) return setStatus(error.message);
    setShifts([data,...shifts]);
    setDepartments([]);setHours("");setComment("");setShowForm(false);
  }

  async function deleteShift(id:string){
    if(!confirm("Удалить смену?")) return;
    const {error}=await supabase.from("shifts").delete().eq("id",id);
    if(!error) setShifts(shifts.filter(s=>s.id!==id));
  }

  async function saveSettings(){
    const {error}=await supabase.from("user_settings").upsert({
      p01:settings.p01,p02:settings.p02,p03:settings.p03,p21:settings.p21,p28:settings.p28,
      hourly_rate:settings.hourly_rate,housing_bonus:settings.housing_bonus,salary_goal:settings.salary_goal
    },{onConflict:"user_id"});
    setStatus(error?error.message:"Настройки сохранены в облаке.");
  }

  async function signOut(){
    await supabase.auth.signOut();
    router.push("/login");router.refresh();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><div className="brand"><span className="brand-mark">B</span><span>Biedronka HAKY Salary</span></div><div className="muted">{email}</div></div>
        <button className="secondary" onClick={signOut}>Выйти</button>
      </header>

      <section className="hero">
        <div className="eyebrow">Облачное хранилище подключено</div>
        <div className="money">{money(total)}</div>
        <div className="progress"><i style={{width:`${Math.min(100,total/settings.salary_goal*100)}%`}} /></div>
        <div className="muted">Цель: {money(settings.salary_goal)}</div>
      </section>

      <section className="grid">
        <div className="card"><div className="stat-label">Смены</div><div className="stat-value">{shifts.length}</div></div>
        <div className="card"><div className="stat-label">Картоны</div><div className="stat-value">{cartons.toLocaleString("pl-PL")}</div></div>
        <div className="card"><div className="stat-label">Часы</div><div className="stat-value">{totalHours}</div></div>
        <div className="card"><div className="stat-label">Средняя смена</div><div className="stat-value">{money(shifts.length?total/shifts.length:0)}</div></div>
      </section>

      <button className="primary" onClick={()=>setShowForm(!showForm)}>＋ Новая смена</button>

      {showForm && <section className="card form">
        <label>Дата<input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <label>Часы<input type="number" step=".25" value={hours} onChange={e=>setHours(e.target.value)} placeholder="Например, 8" /></label>

        {departments.map((d,i)=><div className="dept-row" key={d.department}>
          <select value={d.department} onChange={e=>{
            const copy=[...departments];copy[i]={...copy[i],department:e.target.value};setDepartments(copy);
          }}>
            {["P01","P02","P03","P21","P28"].map(x=><option key={x} value={x} disabled={departments.some((z,j)=>j!==i&&z.department===x)}>{x}</option>)}
          </select>
          <input type="number" placeholder="Картоны" value={d.cartons||""} onChange={e=>{
            const copy=[...departments];copy[i]={...copy[i],cartons:Number(e.target.value)};setDepartments(copy);
          }} />
          <button className="danger" onClick={()=>setDepartments(departments.filter((_,j)=>j!==i))}>×</button>
        </div>)}

        <button className="secondary" onClick={addDepartment}>＋ Добавить отдел</button>
        <label>Комментарий<textarea value={comment} onChange={e=>setComment(e.target.value)} /></label>
        <div className="preview"><span>Предварительно</span><strong>{money(preview)}</strong></div>
        <button className="primary" onClick={saveShift}>Сохранить смену</button>
      </section>}

      {status && <p className="notice">{status}</p>}

      <section>
        <div className="section-title"><h2>Последние смены</h2></div>
        <div className="list">
          {shifts.map(s=><article className="shift" key={s.id}>
            <div><strong>{s.work_date}</strong><div className="muted">{s.departments.length?s.departments.map(d=>`${d.department} ${d.cartons}`).join(" · "):"Только часы"} · {s.hours} ч.</div></div>
            <div className="right"><strong>{money(calc(s))}</strong><button className="delete-link" onClick={()=>deleteShift(s.id)}>Удалить</button></div>
          </article>)}
        </div>
      </section>

      <section>
        <div className="section-title"><h2>Настройки ставок</h2></div>
        <div className="card settings-grid">
          {(["P01","P02","P03","P21","P28"] as const).map(k=><label key={k}>{k}
            <input type="number" step=".0001" value={settings[keyMap[k]] as number} onChange={e=>setSettings({...settings,[keyMap[k]]:Number(e.target.value)})}/>
          </label>)}
          <label>Часовая ставка<input type="number" step=".01" value={settings.hourly_rate} onChange={e=>setSettings({...settings,hourly_rate:Number(e.target.value)})}/></label>
          <label>Жильё / час<input type="number" step=".01" value={settings.housing_bonus} onChange={e=>setSettings({...settings,housing_bonus:Number(e.target.value)})}/></label>
          <label>Цель<input type="number" step="100" value={settings.salary_goal} onChange={e=>setSettings({...settings,salary_goal:Number(e.target.value)})}/></label>
          <button className="primary" onClick={saveSettings}>Сохранить настройки</button>
        </div>
      </section>
    </main>
  );
}
