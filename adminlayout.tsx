import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware already blocks unauthenticated requests; this fetch is just to
  // display the signed-in email and gives a typed session to the tree below.
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-base">
      <Sidebar />
      <div className="flex-1">
        <Topbar email={session.email} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
