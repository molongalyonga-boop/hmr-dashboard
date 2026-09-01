import { auth, signOut } from "../lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "./Dashboard";

// Session is checked on the server before anything renders.
export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <div className="signout-bar">
        <span className="who">{session.user.email}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="signout">Sign out</button>
        </form>
      </div>

      <Dashboard />
    </>
  );
}
