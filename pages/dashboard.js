// pages/dashboard.js
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

// Recursive component for an expandable folder tree.
function FolderTree({ node, exclusions, togglePaths }) {
  // Nodes are collapsed by default.
  const [expanded, setExpanded] = useState(false);

  // Recursively compute an array of all descendant paths (including this node).
  const getAllDescendantPaths = (node) => {
    let paths = [node.path];
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        paths = paths.concat(getAllDescendantPaths(child));
      });
    }
    return paths;
  };

  // Determine if this node is included (i.e. not in the exclusions list).
  const isIncluded = !exclusions.includes(node.path);

  // When toggling, propagate the change to all descendant nodes.
  const handleToggle = () => {
    const descendantPaths = getAllDescendantPaths(node);
    togglePaths(descendantPaths, isIncluded);
  };

  return (
    <li style={{ marginLeft: "10px", listStyleType: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1px solid var(--secondary-color)",
          padding: "4px",
          borderRadius: "4px",
          marginBottom: "4px",
          background: "rgba(255, 255, 255, 0.05)",
        }}
      >
        {node.children && node.children.length > 0 && (
          <span
            style={{
              cursor: "pointer",
              marginRight: "5px",
              color: "var(--accent-color)",
            }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▼" : "►"}
          </span>
        )}
        {node.path !== "" && (
          <label
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type="checkbox"
              checked={isIncluded}
              onChange={handleToggle}
              style={{ marginRight: "5px" }}
            />
            {node.name} {node.type === "directory" ? "(Folder)" : "(File)"}
          </label>
        )}
      </div>
      {node.children && node.children.length > 0 && expanded && (
        <ul style={{ marginLeft: "20px", listStyle: "none", paddingLeft: 0 }}>
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
  const [exclusions, setExclusions] = useState([]); // Global list of excluded paths

  // Global function to update exclusions for an array of paths.
  // If the node is currently included, add its paths to exclusions.
  // If it’s currently excluded, remove its paths.
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
      fetch(
        `/api/folderStructure?owner=${owner}&repo=${repo}&branch=${e.target.value}`
      )
        .then((res) => res.json())
        .then((data) => setFolderTree(data))
        .catch((err) =>
          console.error("Error fetching folder structure:", err)
        );
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

  // Copy the repository data output to the clipboard.
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
        <p>Please sign in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>CodeEcho Dashboard</h1>
      </header>
      <div className="panel">
        <button onClick={() => signOut()}>Sign Out</button>
      </div>

      <div className="panel">
        <h2>Select Repository</h2>
        <select onChange={handleRepoChange} defaultValue="">
          <option value="" disabled>
            Select a repository
          </option>
          {Array.isArray(repos) &&
            repos.map((repo) => (
              <option
                key={repo.id}
                value={`${repo.owner.login}/${repo.name}`}
              >
                {repo.full_name}
              </option>
            ))}
        </select>
      </div>

      {branches.length > 0 && (
        <div className="panel">
          <h2>Select Branch</h2>
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
          <h2>Include / Exclude Files &amp; Folders</h2>
          <p>
            By default, all items are included. Uncheck an item to exclude it
            (this will unselect all its sub-files/folders).
          </p>
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            <FolderTree
              node={folderTree}
              exclusions={exclusions}
              togglePaths={togglePaths}
            />
          </ul>
        </div>
      )}

      {selectedRepo && selectedBranch && (
        <div className="panel">
          <button onClick={handleFetchRepo}>
            Fetch Repository Data
          </button>
        </div>
      )}

      {loading && (
        <div className="panel">
          <p>Loading repository data...</p>
        </div>
      )}

      {repoData && (
        <div className="panel" style={{ position: "relative" }}>
          {/* Copy button in the top right corner */}
          <button
            onClick={copyOutput}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "var(--accent-color)",
              color: "var(--bg-color)",
              border: "none",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Copy
          </button>
          <h2>Repository Data</h2>
          <textarea
            readOnly
            value={repoData.text}
            style={{ width: "100%", height: "400px" }}
          />
          <p>Total Estimated Tokens: {repoData.totalTokens}</p>
        </div>
      )}
    </div>
  );
}
