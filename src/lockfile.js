import fs from "fs";

export function loadLockfile() {
  if (!fs.existsSync(".github/ci-integrity.lock")) {
    return { actions: {}, urls: {} };
  }
  return JSON.parse(fs.readFileSync(".github/ci-integrity.lock", "utf8"));
}

export function updateLockfile(lock, updates) {
  for (const u of updates) {
    lock.actions[u.repo] = u.sha;
  }
  return lock;
}
