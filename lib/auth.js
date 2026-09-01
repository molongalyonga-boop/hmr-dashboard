import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// The single source of truth for who is allowed in.
// For the real deployment this becomes "hmr-consultinggroup.com".
// Set ALLOWED_DOMAIN in your .env to test with your own domain first.
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || "hmr-consultinggroup.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Pass the secret explicitly. Auth.js v5 normally auto-reads AUTH_SECRET, but
  // reading it directly here removes any ambiguity (this is the MissingSecret fix).
  // Falls back to NEXTAUTH_SECRET in case the variable was named that way.
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  // Trust the deployment host (needed on Vercel behind their proxy).
  trustHost: true,
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/login", // rejected users land back on the login page, not a raw error screen
  },
  callbacks: {
    // This is the gate. It runs on every sign-in attempt.
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Determine the user's domain from the hosted-domain claim, falling back
        // to the part after @ in their email. Normalize both sides (trim + lowercase)
        // so an invisible space or stray capital can't cause a false rejection.
        const allowedDomain = String(ALLOWED_DOMAIN).trim().toLowerCase();
        const rawDomain =
          profile?.hd ||
          (typeof profile?.email === "string" ? profile.email.split("@")[1] : "");
        const domain = String(rawDomain).trim().toLowerCase();

        // email_verified is normally true for Workspace accounts. Some token shapes
        // omit it; treat "not explicitly false" as acceptable, since the domain match
        // plus Internal OAuth restriction is the real gate.
        const notUnverified = profile?.email_verified !== false;

        return notUnverified && domain === allowedDomain;
      }
      return false;
    },
    // Carry the email onto the token so the protected page can show who's in.
    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.email = token.email;
      return session;
    },
  },
});
