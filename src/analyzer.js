import fs from "fs";
import yaml from "js-yaml";
import { generatePatches } from "./pin-actions.js";
import { loadLockfile, updateLockfile } from "./lockfile.js";

async function run() {
  const workflows = fs.readdirSync(".github/workflows");

  let patches = [];
  let lock = loadLockfile();

  for (const file of workflows) {
    const path = `.github/workflows/${file}`;
    const content = fs.readFileSync(path, "utf8");
    const parsed = yaml.load(content);

    const result = await generatePatches(path, parsed, lock);

    patches.push(...result.patches);
    lock = updateLockfile(lock, result.lockUpdates);
  }

  // Save updated lockfile
  fs.writeFileSync(".github/ci-integrity.lock", JSON.stringify(lock, null, 2));

  if (patches.length > 0) {
    fs.writeFileSync("fix.patch", patches.join("\n"));
    console.log("Fix needed. Patch generated.");
    process.exit(1);
  } else {
    console.log("No violations found.");
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
