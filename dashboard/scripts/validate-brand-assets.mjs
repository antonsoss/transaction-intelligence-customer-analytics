import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const approvedAssets = {
  "public/brand/as-shell-compact-light.svg":
    "79e8517fe2e371f2e6305cab8ce8505acb44a35a36824e3f7bd0fca0e47a04f7",
  "public/brand/as-shell-compact-dark.svg":
    "2dbeaf3ec5874e48520354bed4e3dd53d8e43f824e845d778499572feaa34233",
};

for (const [relativePath, expectedHash] of Object.entries(approvedAssets)) {
  const path = resolve(dashboardRoot, relativePath);
  const actualHash = createHash("sha256")
    .update(readFileSync(path))
    .digest("hex");

  if (actualHash !== expectedHash) {
    throw new Error(
      `${relativePath} does not match the approved smaller-AS logo geometry.`,
    );
  }
}

console.log("Transaction dashboard logo assets match the approved geometry.");
