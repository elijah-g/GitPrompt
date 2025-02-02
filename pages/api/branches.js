import { getSession } from "next-auth/react";

export default async function handler(req, res) {
  const { owner, repo } = req.query;
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const accessToken = session.accessToken;
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        Authorization: `token ${accessToken}`
      }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching branches" });
  }
}
