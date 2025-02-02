// pages/index.js
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  // Redirect to the dashboard if the user is signed in.
  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  // Only show the sign in page if not signed in.
  if (session) return null;

  return (
    <div className="container signin-container">
      <header>
        <h1>CodeEcho</h1>
      </header>
      <div className="panel">
        <p>Sign in with GitHub to get started.</p>
        <button onClick={() => signIn("github")}>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
