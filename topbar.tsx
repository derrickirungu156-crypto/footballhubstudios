import { destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

async function signOut() {
  "use server";
  await destroySession();
  redirect("/login");
}

export function Topbar({ email }: { email: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-5">
      <p className="text-sm text-subtext">Signed in as {email}</p>
      <form action={signOut}>
        <button type="submit" className="text-sm text-subtext hover:text-text">
          Sign out
        </button>
      </form>
    </header>
  );
}
