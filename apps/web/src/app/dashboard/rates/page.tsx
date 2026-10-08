import { redirect } from "next/navigation";

export default function DashboardRatesRedirect() {
  redirect("/dashboard/pricing");
}
