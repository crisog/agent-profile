import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SKILL = new URL(
  "../plugins/agent-workflows/skills/op-cli/SKILL.md",
  import.meta.url,
);

/**
 * The zsh MULTIOS law is shell-level: a redirect cannot suppress stdout inside
 * a pipeline, so a credential printed by `op read` reaches the pipe anyway. The
 * failure mode is a leaked live credential, so the documented shell results are
 * a floor the test reproduces rather than prose it trusts.
 */
const HEADING = "### The zsh MULTIOS trap";

/** The block runs from its heading to the next heading at any level. */
function lawBlock(): string {
  const text = readFileSync(fileURLToPath(SKILL), "utf8");
  const start = text.indexOf(HEADING);
  if (start === -1) throw new Error(`op-cli/SKILL.md is missing "${HEADING}"`);
  const rest = text.slice(start + HEADING.length);
  const end = rest.search(/^#/m);
  return HEADING + (end === -1 ? rest : rest.slice(0, end)).trimEnd();
}

interface Probe {
  command: string;
  /** The documented result: the value reaches the pipeline, or it does not. */
  leaks: boolean;
}

/**
 * The block's own fenced example is the specification. Parsing it means the
 * test fails when the prose claims a result the shell does not produce.
 */
function probes(block: string): Probe[] {
  const fence = block.match(/```bash\n([\s\S]*?)```/);
  if (!fence) throw new Error(`${HEADING} has no bash example to verify`);
  return fence[1]
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parsed = line.match(/^(.*?)\s{2,}#\s*(LEAKED|\(nothing\))$/);
      if (!parsed) throw new Error(`probe line is not annotated with its result: ${line}`);
      return { command: parsed[1].trim(), leaks: parsed[2] === "LEAKED" };
    });
}

function hasShell(shell: string): boolean {
  try {
    execFileSync("command", ["-v", shell], { shell: "/bin/sh", stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("op-cli MULTIOS law", () => {
  it("names the credential tool it governs", () => {
    expect(lawBlock().replace(/\s+/g, " ")).toContain("op read");
  });

  it("demonstrates the trap without a real credential", () => {
    for (const probe of probes(lawBlock())) {
      expect(probe.command).not.toMatch(/\b(op|aws)\b/);
    }
  });

  it.skipIf(!hasShell("zsh") || !hasShell("bash"))(
    "reproduces the four documented results",
    () => {
      for (const probe of probes(lawBlock())) {
        const stdout = execFileSync("/bin/sh", ["-c", probe.command], { encoding: "utf8" });
        expect(stdout.trim(), `unexpected output from: ${probe.command}`).toBe(
          probe.leaks ? "LEAKED" : "",
        );
      }
    },
  );
});
