import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      // Request the “repo” scope so that we can list user repositories
      authorization: { params: { scope: "read:user repo" } }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access token to the token after sign in
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Make the access token available in session
      session.accessToken = token.accessToken;
      return session;
    }
  }
});
