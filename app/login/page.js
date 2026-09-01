import { signIn, auth } from "../../lib/auth";
import { redirect } from "next/navigation";

export default async function Login({ searchParams }) {
  const session = await auth();
  if (session?.user) redirect("/");

  const params = await searchParams;
  const wasRejected = params?.error;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src="/hmr-logo.jpeg" alt="HMR" className="login-logo" />
        <h1>HMR Executive Dashboard</h1>
        <p>Sign in with your company Google account to continue.</p>

        {wasRejected && (
          <div className="reject">
            That account isn&apos;t allowed. Only company accounts can access this dashboard.
          </div>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="gbtn">Sign in with Google</button>
        </form>
      </div>
    </div>
  );
}
