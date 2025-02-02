// pages/dashboard.js
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

// A simple navigation bar component.
function NavBar() {
  return (
    <nav className="navbar">
      <h1 className="navbar-title">CodeEcho</h1>
      <button onClick={() => signOut({ callbackUrl: "/" })} className="nav-signout">
        Sign Out
      </button>
    </nav>
  );
}

// Helper to format file size (in bytes) to a human-readable string.
function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(2) + " KB";
    const mb = kb / 1024;
    return mb.toFixed(2) + " MB";
  }
  
  function FolderTree({ node, exclusions, togglePaths }) {
    const [expanded, setExpanded] = useState(false);
  
    // Recursively collect all descendant paths.
    const getAllDescendantPaths = (node) => {
      let paths = [node.path];
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => {
          paths = paths.concat(getAllDescendantPaths(child));
        });
      }
      return paths;
    };
  
    const isIncluded = !exclusions.includes(node.path);
  
    const handleToggle = () => {
      const descendantPaths = getAllDescendantPaths(node);
      togglePaths(descendantPaths, isIncluded);
    };
  
    return (
      <li className="folder-tree-item">
        <div className="folder-tree-container">
          {node.children && node.children.length > 0 && (
            <span
              className="folder-tree-toggle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "▼" : "►"}
            </span>
          )}
          {node.path !== "" && (
            <label className="folder-tree-label">
              <input
                type="checkbox"
                checked={isIncluded}
                onChange={handleToggle}
                className="folder-tree-checkbox"
              />
              <span className="folder-tree-name">
                {node.name} {node.type === "directory" ? "(Folder)" : "(File)"}
              </span>
              <span className="folder-tree-size">{formatSize(node.size)}</span>
            </label>
          )}
        </div>
        {node.children && node.children.length > 0 && expanded && (
          <ul className="folder-tree-list">
            {node.children.map((child) => (
              <FolderTree
                key={child.path}
                node={child}
                exclusions={exclusions}
                togglePaths={togglePaths}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

export default function Dashboard() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [repoData, setRepoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [folderTree, setFolderTree] = useState(null);
  const [exclusions, setExclusions] = useState([]);

  // Toggle a list of paths between included and excluded.
  const togglePaths = (paths, currentlyIncluded) => {
    if (currentlyIncluded) {
      setExclusions((prev) => {
        const newExclusions = new Set(prev);
        paths.forEach((p) => newExclusions.add(p));
        return Array.from(newExclusions);
      });
    } else {
      setExclusions((prev) => prev.filter((p) => !paths.includes(p)));
    }
  };

  // Fetch the user's repositories.
  useEffect(() => {
    if (session) {
      fetch("/api/repos")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setRepos(data);
          else setRepos([]);
        })
        .catch((err) => console.error("Error fetching repos:", err));
    }
  }, [session]);

  // When a repository is selected, fetch its branches.
  const handleRepoChange = (e) => {
    const value = e.target.value;
    if (!value) return;
    const [owner, repo] = value.split("/");
    setSelectedRepo({ owner, repo });
    setBranches([]);
    setFolderTree(null);
    setExclusions([]);
    fetch(`/api/branches?owner=${owner}&repo=${repo}`)
      .then((res) => res.json())
      .then((data) => setBranches(data))
      .catch((err) => console.error("Error fetching branches:", err));
  };

  // When the branch changes, fetch the folder structure.
  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
    if (selectedRepo) {
      const { owner, repo } = selectedRepo;
      fetch(`/api/folderStructure?owner=${owner}&repo=${repo}&branch=${e.target.value}`)
        .then((res) => res.json())
        .then((data) => setFolderTree(data))
        .catch((err) => console.error("Error fetching folder structure:", err));
    }
  };

  // When the user clicks “Fetch Repository Data”
  const handleFetchRepo = async () => {
    if (!selectedRepo || !selectedBranch) return;
    setLoading(true);
    const { owner, repo } = selectedRepo;
    try {
      const exclusionsParam = JSON.stringify(exclusions);
      const res = await fetch(
        `/api/fetchRepo?owner=${owner}&repo=${repo}&branch=${selectedBranch}&exclusions=${encodeURIComponent(
          exclusionsParam
        )}`
      );
      const data = await res.json();
      setRepoData(data);
    } catch (error) {
      console.error("Error fetching repository data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Copy the repository output to the clipboard.
  const copyOutput = () => {
    if (repoData && repoData.text) {
      navigator.clipboard
        .writeText(repoData.text)
        .then(() => alert("Output copied to clipboard!"))
        .catch(() => alert("Failed to copy output."));
    }
  };

  if (!session) {
    return (
      <div className="container">
        <p>Please sign in to view your repository explorer.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <NavBar />
      <h2 className="page-title">Repository Explorer</h2>

      <div className="panel">
        <h3>Select Repository</h3>
        <select onChange={handleRepoChange} defaultValue="">
          <option value="" disabled>
            Select a repository
          </option>
          {Array.isArray(repos) &&
            repos.map((repo) => (
              <option key={repo.id} value={`${repo.owner.login}/${repo.name}`}>
                {repo.full_name}
              </option>
            ))}
        </select>
      </div>

      {branches.length > 0 && (
        <div className="panel">
          <h3>Select Branch</h3>
          <select onChange={handleBranchChange} defaultValue="">
            <option value="" disabled>
              Select a branch
            </option>
            {branches.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {folderTree && (
        <div className="panel">
          <h3>Include / Exclude Files &amp; Folders</h3>
          <p>
            All items are included by default. Uncheck an item to exclude it (this will
            also unselect all its sub-items).
          </p>
          <ul className="folder-tree-list">
            <FolderTree node={folderTree} exclusions={exclusions} togglePaths={togglePaths} />
          </ul>
        </div>
      )}

      {selectedRepo && selectedBranch && (
        <div className="panel">
          <button onClick={handleFetchRepo}>Fetch Repository Data</button>
        </div>
      )}

      {loading && (
        <div className="panel">
          <p>Loading repository data...</p>
        </div>
      )}

      {repoData && (
        <div className="panel panel-relative">
          <button onClick={copyOutput} className="copy-button">
            Copy
          </button>
          <h3>Repository Data</h3>
          <textarea readOnly value={repoData.text} className="repo-textarea" />
          <p>Total Estimated Tokens: {repoData.totalTokens}</p>
        </div>
      )}
    </div>
  );
}
