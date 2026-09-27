import { redirect } from "next/navigation";
import { verifyCredentials, createSession } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/admin");

  if (!verifyCredentials(email, password)) {
    redirect(`/login?error=1&from=${encodeURIComponent(from)}`);
  }

  await createSession(email);
  redirect(from);
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ?? "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <form action={login} className="w-full max-w-sm border border-border bg-surface p-8">
        <h1 className="text-lg font-semibold text-text">Analyst Studio</h1>
        <p className="mt-1 text-sm text-subtext">Sign in to continue.</p>

        {params.error && (
          <p className="mt-4 border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            Incorrect email or password.
          </p>
        )}

        <input type="hidden" name="from" value={from} />

        <label className="mt-6 block text-xs uppercase tracking-wide text-subtext">
          Email
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full border border-border bg-base px-3 py-2 text-text outline-none focus:border-accent"
          />
        </label>

        <label className="mt-4 block text-xs uppercase tracking-wide text-subtext">
          Password
          <input
            name="password"
            type="password"
            required
            className="mt-1 w-full border border-border bg-base px-3 py-2 text-text outline-none focus:border-accent"
          />
        </label>

        <button
          type="submit"
          className="mt-6 w-full bg-accent px-4 py-2 text-sm font-medium text-base hover:bg-accentBright"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
