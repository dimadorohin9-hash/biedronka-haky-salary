"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  async function signUp() {
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg("Аккаунт создан. Если подтверждение email включено в Supabase — проверь почту.");
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand"><span className="brand-mark">B</span><span>Biedronka Salary</span></div>
        <h1>Вход</h1>
        <p className="muted">У каждого пользователя свой личный кабинет, смены и ставки.</p>
        <form onSubmit={signIn} className="form">
          <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
          <label>Пароль<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required /></label>
          <button className="primary" disabled={busy}>{busy ? "Загрузка..." : "Войти"}</button>
          <button className="secondary" type="button" onClick={signUp} disabled={busy}>Создать личный кабинет</button>
          {msg && <p className="notice">{msg}</p>}
        </form>
      </section>
    </main>
  );
}
