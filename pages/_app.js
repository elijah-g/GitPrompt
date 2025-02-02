// pages/_app.js
import { SessionProvider } from "next-auth/react";
import Head from "next/head";
import "../styles/global.css";

export default function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <>
      <Head>
        <title>CodeEcho</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono&display=swap"
          rel="stylesheet"
        />
      </Head>
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </>
  );
}
