import { Octokit } from "@octokit/core";
import fs from "fs";

const octokit = new Octokit({});

export async function generatePatches(path, yaml, lockfile) {
  const patches = [];
  const lockUpdates = [];

  async function walk(obj) {
    for (const key of Object.keys(obj)) {
      const value = obj[key];

      // Detect uses: owner/repo@ref
      if (key === "uses" && typeof value === "string") {
        const [repo, ref] = value.split("@");

        // If not pinned to SHA
        if (!ref || !/^[0-9a-f]{40}$/.test(ref)) {
          const sha = await getCommitSHA(repo, ref);

          // Generate unified diff patch
          patches.push(
            `--- a/${path}\n+++ b/${path}\n@@\n-${value}\n+${repo}@${sha}\n`
          );

          lockUpdates.push({ repo, sha });
        }
      }

      if (typeof value === "object" && value !== null) {
        await walk(value);
      }
    }
  }

  await walk(yaml);

  return { patches, lockUpdates };
}

async function getCommitSHA(repo, ref) {
  const [owner, name] = repo.split("/");

  // Resolve the tag/branch to a SHA-1 commit hash
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/commits/{ref}",
    {
      owner,
      repo: name,
      ref
    }
  );

  return response.data.sha;
}
