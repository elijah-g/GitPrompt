// pages/index.js
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="container">
      <header>
        <h1>CodeEcho</h1>
      </header>
      {!session ? (
        <div className="panel">
          <p>Sign in with GitHub to get started.</p>
          <button onClick={() => signIn("github")}>Sign in with GitHub</button>
        </div>
      ) : (
        <div className="panel">
          <p>Signed in as {session.user.email}</p>
          <button onClick={() => signOut()}>Sign Out</button>
          <br />
          <br />
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <span className="link">Go to Dashboard</span>
          </Link>
        </div>
      )}
    </div>
  );
}
