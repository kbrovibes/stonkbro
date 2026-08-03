import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/db/admin";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const user = await getUser();

  if (!user) redirect("/login");

  const admin = await isAdmin(user.id);
  if (!admin) redirect("/");

  return <AdminDashboard />;
}
