// pages/api/fetchRepo.js
import { getSession } from "next-auth/react";

// A simple helper to approximate token count (roughly, 1 token ≈ 4 characters)
function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

// Build a nested object representing the folder structure.
function buildFolderTree(tree) {
  const folderTree = {};
  for (const item of tree) {
    const parts = item.path.split("/");
    let current = folderTree;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }
  return folderTree;
}

// Recursively render the folder tree as a visual text tree.
function renderTree(tree, prefix = "") {
  let output = "";
  const keys = Object.keys(tree).sort();
  keys.forEach((key, index) => {
    const isLast = index === keys.length - 1;
    output += `${prefix}${isLast ? "└── " : "├── "}${key}\n`;
    const newPrefix = prefix + (isLast ? "    " : "│   ");
    output += renderTree(tree[key], newPrefix);
  });
  return output;
}

export default async function handler(req, res) {
  const { owner, repo, branch } = req.query;
  // Parse exclusions if provided (expected as JSON-encoded array).
  let exclusions = [];
  if (req.query.exclusions) {
    try {
      exclusions = JSON.parse(req.query.exclusions);
    } catch (error) {
      console.error("Error parsing exclusions:", error);
      exclusions = [];
    }
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const accessToken = session.accessToken;

  try {
    // 1. Get branch details to retrieve the commit SHA.
    const branchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
      {
        headers: { Authorization: `token ${accessToken}` },
      }
    );
    const branchData = await branchRes.json();
    if (branchData.message) {
      return res.status(400).json({ error: branchData.message });
    }
    const commitSha = branchData.commit.sha;

    // 2. Get repository tree recursively.
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
      {
        headers: { Authorization: `token ${accessToken}` },
      }
    );
    const treeData = await treeRes.json();
    if (treeData.message) {
      return res.status(400).json({ error: treeData.message });
    }
    const tree = treeData.tree;

    // 3. Build the folder structure output.
    const folderTreeObj = buildFolderTree(tree);
    const folderStructureString = renderTree(folderTreeObj);

    let totalTokens = 0;
    // Begin output with repo details and folder structure (in a code fence).
    let outputText = `# Repository: ${owner}/${repo}\n**Branch:** ${branch}\n\n`;
    outputText += `## Folder Structure:\n\`\`\`\n${folderStructureString}\n\`\`\`\n\n`;

    // 4. Process each file in the repository tree.
    for (const item of tree) {
      if (item.type !== "blob") continue;
      // Skip likely binary files.
      const binaryExtensions = [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".ico",
        ".pdf",
        ".exe",
      ];
      if (binaryExtensions.some((ext) => item.path.toLowerCase().endsWith(ext))) {
        continue;
      }
      // Skip if the file path is within an excluded folder/file.
      if (exclusions.some((excludedPath) => item.path.startsWith(excludedPath))) {
        continue;
      }
      // Fetch the file content.
      const blobRes = await fetch(item.url, {
        headers: { Authorization: `token ${accessToken}` },
      });
      const blobData = await blobRes.json();
      if (blobData.encoding !== "base64" || !blobData.content) continue;
      let content = Buffer.from(blobData.content, "base64").toString("utf-8");

      // Estimate token count for the file.
      let fileTokens = estimateTokenCount(content);
      outputText += `## File: ${item.path}\n\`\`\`\n${content}\n\`\`\`\n\n`;
      totalTokens += fileTokens;
    }
    res.status(200).json({ text: outputText, totalTokens });
  } catch (error) {
    console.error("Error fetching repository:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
