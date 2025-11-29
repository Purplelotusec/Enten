import { Octokit } from "@octokit/core";

const octokit = new Octokit();

export async function generatePatches(path, yaml, lockfile) {
  const violations = [];
  const patches = [];
  const lockUpdates = [];

  function walk(obj, parentKeys = []) {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (key === "uses" && typeof value === "string") {
        const [repo, ref] = value.split("@");
        if (!ref.match(/^[0-9a-f]{40}$/)) {
          violations.push({ type: "UNPINNED_ACTION", file: path, repo, ref });

          const sha = await getCommitSHA(repo, ref);

          patches.push(
            `--- a/${path}\n+++ b/${path}\n@@\n-${value}\n+${repo}@${sha}\n`
          );

          lockUpdates.push({ repo, sha });
        }
      }

      if (typeof value === "object") walk(value, [...parentKeys, key]);
    }
  }

  walk(yaml);
  return { violations, patches, lockUpdates };
}

async function getCommitSHA(repo, ref) {
  const [owner, name] = repo.split("/");
  const response = await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
    owner,
    repo: name,
    ref
  });
  return response.data.sha;
}
