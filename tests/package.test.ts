import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_ROOT = resolve(ROOT, "plugins/agent-workflows/skills");
function filesBelow(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...filesBelow(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function referencesOnLine(path: string, marker: string): string[] {
  const line = readFileSync(path, "utf-8")
    .split("\n")
    .find((candidate) => candidate.includes(marker));
  expect(line, `missing route marker ${marker} in ${path}`).toBeDefined();
  return [...(line ?? "").matchAll(/\]\((references\/[^)]+)\)/g)].map(
    (match) => match[1],
  );
}

describe("public skill catalog", () => {
  it("keeps the runtime catalog populated and locally linked", () => {
    expect(() => execFileSync("python3", [resolve(ROOT, "scripts/validate-instructions.py")], {
      encoding: "utf8",
      timeout: 10_000,
      stdio: "pipe",
    })).not.toThrow();
  });

  it("keeps references out of recursive skill discovery", () => {
    const nestedEntrypoints = filesBelow(SKILL_ROOT).filter(
      (path) => path.endsWith("/references/SKILL.md") || path.includes("/references/") && path.endsWith("/SKILL.md"),
    );
    expect(nestedEntrypoints).toEqual([]);
  });

  it.each([
    {
      skill: "plugins/agent-workflows/skills/spec-best-practices/SKILL.md",
      marker: "Interview, complete, or find gaps in a `SPEC.md`",
      reference: "references/interview.md",
    },
    {
      skill: "plugins/agent-workflows/skills/program-planning/SKILL.md",
      marker: "When the tracker is GitHub",
      reference: "references/github.md",
    },
  ])("routes $marker only to $reference", ({ skill, marker, reference }) => {
    expect(referencesOnLine(resolve(ROOT, skill), marker)).toEqual([reference]);
  });

});
