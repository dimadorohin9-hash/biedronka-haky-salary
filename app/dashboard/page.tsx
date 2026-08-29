import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: shifts }, { data: settings }, { data: profile }] = await Promise.all([
    supabase.from("shifts").select("*").order("work_date", { ascending: false }),
    supabase.from("user_settings").select("*").maybeSingle(),
    supabase.from("profiles").select("*").maybeSingle(),
  ]);

  return <DashboardClient
    initialShifts={shifts ?? []}
    initialSettings={settings}
    initialProfile={profile}
    email={user.email ?? ""}
  />;
}
