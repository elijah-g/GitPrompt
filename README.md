# GitPrompt (CodeEcho)

A Next.js application that helps you prepare GitHub repositories for AI prompts.

Authenticate with GitHub, pick a repository and branch, interactively include/exclude folders and files, then export a single consolidated text output of the repository’s structure and file contents. The output includes an estimated token count and is truncated at 150k tokens to keep prompts within model limits. A one-click Copy button lets you paste the result wherever you need it.

## Features

- Sign in with GitHub (NextAuth)
- List your repositories and branches
- Visual folder tree with include/exclude toggles (recursive apply)
- Generate consolidated output containing:
  - Repository and branch header
  - Rendered folder tree (ASCII)
  - Contents of included text files
  - Estimated token count with 150k token cap (binary files skipped)
- Copy consolidated output to clipboard

## Stack

- Next.js (Pages Router)
- React
- NextAuth.js (GitHub provider)
- GitHub REST API
- CSS (global stylesheet)

## Project structure

- pages/_app.js – App wrapper, fonts, SessionProvider
- pages/index.js – Landing page; sign-in and link to dashboard
- pages/dashboard.js – Main UI: repo/branch selectors, folder tree, export/copy
- pages/api/auth/[...nextauth].js – NextAuth GitHub provider; exposes access token in session
- pages/api/repos.js – Fetches user repositories from GitHub
- pages/api/branches.js – Fetches branches for the selected repo
- pages/api/folderStructure.js – Builds a nested folder tree for the selected branch
- pages/api/fetchRepo.js – Produces the consolidated export with token estimation and truncation
- styles/global.css – Theme and component styles

## Requirements

- Node.js 18+ (recommended for Next.js 15)
- A GitHub OAuth App (Client ID and Client Secret)

## Environment variables

Create a .env.local file in the project root with the following variables:

- GITHUB_ID=your_github_oauth_app_client_id
- GITHUB_SECRET=your_github_oauth_app_client_secret
- NEXTAUTH_SECRET=a_long_random_secret_string
- NEXTAUTH_URL=http://localhost:3000

Notes:
- NEXTAUTH_SECRET is required in production; it’s recommended locally as well.
- The GitHub provider requests scopes: read:user repo to list private repositories.

## Getting started

1) Install dependencies
- npm install

2) Configure env vars
- Create .env.local with the variables above.

3) Run the app
- npm run dev
- Open http://localhost:3000

4) Sign in
- Click “Sign in with GitHub”. Approve the requested scopes.

5) Use the dashboard
- Pick a repository; then select a branch.
- Use the folder tree to include/exclude items. Toggling a folder applies recursively to its descendants.
- Click “Fetch Repository Data” to generate the consolidated text.
- Click “Copy” to put the result on your clipboard.

## How export generation works

- The app retrieves the branch commit SHA and walks the repo tree via the GitHub API.
- It renders a folder tree (ASCII art) and appends file contents for included text files.
- Binary files are skipped using a simple extension filter (png, jpg, jpeg, gif, svg, ico, pdf, exe).
- It estimates tokens using a rough heuristic (~1 token ≈ 4 characters) and truncates output at 150k tokens.

## Security & privacy

- The GitHub OAuth access token is stored in the NextAuth JWT and exposed to API routes via session; it isn’t persisted in a database by this app.
- Only repositories and branches you explicitly select are read.
- Be mindful when sharing exported content; it may include source code and secrets present in your repository.

## Limitations

- Token estimation is approximate and intended for budgeting, not exact accounting.
- Large repositories may hit the 150k token cap; files added after reaching the cap are truncated or omitted.
- Binary detection is extension-based and may not catch all binaries.

## Scripts

- npm run dev – Start development server
- npm run build – Create production build
- npm run start – Start production server

## Troubleshooting

- 401 Unauthorized from API routes:
  - Ensure you’re signed in and that GITHUB_ID/GITHUB_SECRET are configured correctly.
  - Confirm the OAuth app has the read:user and repo scopes.
- Callback or CSRF errors with NextAuth:
  - Set NEXTAUTH_URL to your local URL (e.g., http://localhost:3000).
  - Provide a secure NEXTAUTH_SECRET.
- Empty repository list:
  - Check that the GitHub token scopes include repo for private repositories.

## Roadmap ideas

- Smarter binary/text detection
- Per-language filters and ignore patterns
- Download export as file
- Persist user preferences (e.g., exclusions) per repo/branch

## License

No license file was found in this repository at the time this README was generated. If you plan to open-source, consider adding a LICENSE file (e.g., MIT).
