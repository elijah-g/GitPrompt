// pages/api/folderStructure.js
import { getSession } from "next-auth/react";

// Updated buildFolderTree to include file sizes and aggregate them for directories.
function buildFolderTree(treeItems) {
  const root = { name: '', path: '', type: 'directory', children: [], size: 0 };
  for (const item of treeItems) {
    if (item.type === 'blob') {
      const parts = item.path.split('/');
      let current = root;
      let fullPath = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        fullPath = fullPath ? `${fullPath}/${part}` : part;
        let child = current.children.find((c) => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: fullPath,
            type: i === parts.length - 1 ? 'file' : 'directory',
            children: [],
            size: 0,
          };
          current.children.push(child);
        }
        // For file nodes, record the size (in bytes) from GitHub.
        if (i === parts.length - 1) {
          child.size = item.size || 0;
        }
        current = child;
      }
    }
  }

  // Recursively aggregate sizes for directories.
  function aggregateSizes(node) {
    if (node.type === 'file') return node.size;
    let totalSize = 0;
    for (const child of node.children) {
      totalSize += aggregateSizes(child);
    }
    node.size = totalSize;
    return totalSize;
  }
  aggregateSizes(root);
  return root;
}

export default async function handler(req, res) {
  const { owner, repo, branch } = req.query;
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const accessToken = session.accessToken;
  try {
    // Get branch details to retrieve commit SHA.
    const branchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
      { headers: { Authorization: `token ${accessToken}` } }
    );
    const branchData = await branchRes.json();
    if (branchData.message) {
      return res.status(400).json({ error: branchData.message });
    }
    const commitSha = branchData.commit.sha;

    // Get repository tree recursively.
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
      { headers: { Authorization: `token ${accessToken}` } }
    );
    const treeData = await treeRes.json();
    if (treeData.message) {
      return res.status(400).json({ error: treeData.message });
    }
    const treeItems = treeData.tree;
    const folderTree = buildFolderTree(treeItems);
    res.status(200).json(folderTree);
  } catch (error) {
    console.error("Error fetching folder structure:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
