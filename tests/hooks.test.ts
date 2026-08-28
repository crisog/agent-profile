import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HOOKS_DIR = fileURLToPath(
  new URL("../plugins/agent-workflows/hooks", import.meta.url),
);
const SECRET_GUARD = join(HOOKS_DIR, "secret-guard.sh");
const PUBLISH_GUARD = join(HOOKS_DIR, "publish-guard.sh");
const VERIFIER_GUARD = join(HOOKS_DIR, "verifier-bypass-guard.sh");
const HOOKS_JSON = join(HOOKS_DIR, "hooks.json");

interface HookRun {
  status: number;
  stdout: string;
}

/**
 * Run a PreToolUse hook exactly as the harness does: the script is exec'd
 * (so a missing executable bit or shebang fails here), the payload arrives on
 * stdin, and the decision comes back as JSON on stdout.
 */
function runHook(script: string, stdin: string, cwd: string): HookRun {
  try {
    const stdout = execFileSync(script, [], { input: stdin, encoding: "utf8", cwd });
    return { status: 0, stdout };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string };
    return { status: failure.status ?? -1, stdout: failure.stdout ?? "" };
  }
}

function payload(command: string): string {
  return JSON.stringify({ tool_input: { command } });
}

/**
 * A hook must never exit non-zero (that would fail the tool call for an
 * unrelated reason) and must put nothing but its deny JSON on stdout.
 */
function decisionOf(run: HookRun): string | undefined {
  expect(run.status).toBe(0);
  const text = run.stdout.trim();
  if (text === "") return undefined;
  const parsed = JSON.parse(text) as {
    hookSpecificOutput?: { hookEventName?: string; permissionDecision?: string; permissionDecisionReason?: string };
  };
  expect(parsed.hookSpecificOutput?.hookEventName).toBe("PreToolUse");
  expect(parsed.hookSpecificOutput?.permissionDecisionReason ?? "").not.toBe("");
  return parsed.hookSpecificOutput?.permissionDecision;
}

/** `[command, expectDeny]` — the case shape every table below uses. */
type Case = [string, boolean];

function checkCases(script: string, cases: readonly Case[], cwd: string = process.cwd()): void {
  for (const [command, expectDeny] of cases) {
    it(`${expectDeny ? "denies" : "allows"}: ${command}`, () => {
      const decision = decisionOf(runHook(script, payload(command), cwd));
      expect(decision).toBe(expectDeny ? "deny" : undefined);
    });
  }
}

/** Payload shapes the harness can hand a hook that carry no command at all. */
function checkFailOpen(script: string): void {
  it("allows on empty stdin", () => {
    expect(decisionOf(runHook(script, "", process.cwd()))).toBeUndefined();
  });

  it("allows on malformed JSON", () => {
    expect(decisionOf(runHook(script, "{not json", process.cwd()))).toBeUndefined();
  });
}

const HEX64 = "a".repeat(64);
const HEX40 = "b".repeat(40);
const GHP = `ghp_${"A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8".slice(0, 36)}`;

describe("secret-guard: secret literals in argv", () => {
  checkCases(SECRET_GUARD, [
    ["curl -H \"Authorization: Bearer sk-live1234567890abcdefghij\" https://api.example.com", true],
    ["export ANTHROPIC_API_KEY=sk-ant-api03-abc", true],
    [`git remote set-url origin https://${GHP}@github.com/o/r.git`, true],
    ["echo github_pat_11ABCDEFG0abcdefg", true],
    ["aws configure set aws_access_key_id AKIA1234567890ABCDEF", true],
    ["curl -d token=xoxb-1234567890-abcdefghij", true],
    ["echo \"-----BEGIN RSA PRIVATE KEY-----\" > key.pem", true],
    ["curl -H \"Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig\"", true],
    // Near-misses: key-shaped words that are not secrets. `sk-` needs a left
    // boundary or every hyphenated service name denies.
    ["cast call 0xdeadbeef balanceOf", false],
    ["echo sk-short", false],
    ["kubectl logs task-scheduler-service-name", false],
    ["kubectl get pod helpdesk-notification-service-0", false],
    ["docker ps --filter name=risk-assessment-service-v2", false],
    ["pip install flask-sqlalchemy-migrations", false],
    ["npm test", false],
  ]);
});

// A 64-hex literal is only a secret in a key-shaped context: EVM tx hashes,
// block hashes, storage slots, and image digests share the shape exactly.
describe("secret-guard: 64-hex in key context", () => {
  checkCases(SECRET_GUARD, [
    [`cast send --private-key 0x${HEX64} 0xdead`, true],
    [`cast send --pk 0x${HEX64} 0xdead`, true],
    [`forge create -k ${HEX64} src/A.sol:A`, true],
    [`PRIVATE_KEY=${HEX64} forge script Deploy`, true],
    [`export DEPLOYER_PRIVATE_KEY=0x${HEX64}`, true],
    [`export FOO_SECRET=${HEX64}`, true],
    // Quoting the value changes nothing about the leak.
    [`export PRIVATE_KEY="0x${HEX64}"`, true],
    [`cast send --private-key '0x${HEX64}' 0xdead`, true],
    [`MNEMONIC=${HEX64} npm run seed`, true],
    // The same shape, with no key context: these are public identifiers.
    [`cast receipt 0x${HEX64}`, false],
    [`cast tx 0x${HEX64}`, false],
    [`cast storage 0x${HEX40} 0x${HEX64}`, false],
    [`git show ${HEX40}`, false],
    [`docker pull img@sha256:${HEX64}`, false],
    [`open https://basescan.org/tx/0x${HEX64}`, false],
  ]);
});

describe("secret-guard: printing a secret-bearing file", () => {
  checkCases(SECRET_GUARD, [
    ["cat .env", true],
    ["cat apps/api/.env.production", true],
    ["cat prod.env", true],
    ["cat config/backend.env", true],
    ["head -20 .env.local", true],
    ["tail -n 5 .env", true],
    ["less .env", true],
    ["more .env", true],
    ["bat .env", true],
    ["grep DATABASE_URL .env", true],
    ["sed -n '1,5p' .env", true],
    ["awk '{print $1}' .env", true],
    ["source .env", true],
    [". ./.env", true],
    ["cat ~/.ssh/id_rsa", true],
    ["cat ~/.ssh/id_ed25519", true],
    ["cat certs/server.pem", true],
    ["cat ~/.npmrc", true],
    ["cat ~/.netrc", true],
    ["cat .env | grep KEY", true],
    // Permitted neighbors: templates, non-reading inspection, direnv.
    ["cat .env.local.template", false],
    ["cat .env.example", false],
    ["cat .env.sample", false],
    ["cat .envrc", false],
    ["ls -la .env", false],
    ["test -f .env", false],
    ["stat .env", false],
    ["cp .env.example .env", false],
    ["direnv reload", false],
    ["cat package.json", false],
    ["cat src/env.ts", false],
    ["git log --oneline | head -20", false],
  ]);
});

describe("secret-guard: dumping the environment", () => {
  checkCases(SECRET_GUARD, [
    ["env", true],
    ["printenv", true],
    ["set", true],
    ["env | grep ANTHROPIC", true],
    ["printenv | sort", true],
    ["op item get aws --reveal", true],
    ["op read op://Private/aws/secret", true],
    ["op read op://Private/aws/secret; echo | cat", true],
    // Permitted neighbors: piping the secret instead of printing it.
    ["op read op://Private/aws/secret | docker login --password-stdin", false],
    ["op run -- npm run deploy", false],
    ["op item list", false],
    ["env NODE_ENV=test npm test", false],
    ["set -euo pipefail", false],
    ["printenv PATH", false],
  ]);
});

describe("secret-guard: escape hatch and fail-open", () => {
  checkCases(SECRET_GUARD, [
    ["SECRET_GUARD_APPROVED=1 cat .env", false],
    ["SECRET_GUARD_APPROVED=1 env", false],
  ]);
  checkFailOpen(SECRET_GUARD);
});

describe("publish-guard: merge commands", () => {
  checkCases(PUBLISH_GUARD, [
    ["gh pr merge 12 --squash", true],
    ["gh pr merge --auto", true],
    ["gh pr merge --admin --merge", true],
    ["gh pr merge", true],
    ["gh api -X PUT repos/o/r/pulls/12/merge", true],
    ["gh api repos/o/r/pulls/12/merge --method PUT", true],
    // Proposals and reads stay allowed.
    ["gh pr create --fill", false],
    ["gh pr view 12", false],
    ["gh api repos/o/r/pulls/12", false],
    ["gh pr checks 12", false],
  ]);
});

describe("publish-guard: pushes to a deploying ref", () => {
  checkCases(PUBLISH_GUARD, [
    ["git push origin main", true],
    ["git push origin master", true],
    ["git push origin HEAD:dev", true],
    ["git push -u origin dev", true],
    ["git push --force origin main", true],
    ["git push origin main:main", true],
    ["git push origin \"main\"", true],
    ["git push origin 'dev'", true],
    // A push of any other branch stays allowed, including near-miss names.
    ["git push origin feat/doctrine-floors", false],
    ["git push -u origin feat/main-line", false],
    ["git push origin devtools-fix", false],
    ["git fetch origin main", false],
  ]);
});

describe("publish-guard: escape hatch and fail-open", () => {
  checkCases(PUBLISH_GUARD, [
    ["MERGE_APPROVED=1 gh pr merge 12 --squash", false],
    ["MERGE_APPROVED=1 git push origin main", false],
  ]);
  checkFailOpen(PUBLISH_GUARD);
});

describe("publish-guard: current-branch resolution", () => {
  let root: string;
  let featureRepo: string;
  let devRepo: string;
  let notARepo: string;

  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "test",
    GIT_AUTHOR_EMAIL: "test@example.invalid",
    GIT_COMMITTER_NAME: "test",
    GIT_COMMITTER_EMAIL: "test@example.invalid",
  };

  function makeRepo(parent: string, branch: string): string {
    const dir = join(parent, `repo-${branch}`);
    execFileSync("git", ["init", "-q", "-b", branch, dir], { env: gitEnv });
    execFileSync("git", ["commit", "-q", "--allow-empty", "-m", "init"], {
      cwd: dir,
      env: gitEnv,
    });
    return dir;
  }

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "publish-guard-"));
    featureRepo = makeRepo(root, "feature");
    devRepo = makeRepo(root, "dev");
    notARepo = mkdtempSync(join(tmpdir(), "publish-guard-bare-"));
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(notARepo, { recursive: true, force: true });
  });

  const onFeature: readonly Case[] = [
    ["git push", false],
    ["git push origin", false],
    ["git push -u origin HEAD", false],
    ["git merge feat/other", false],
  ];

  const onDev: readonly Case[] = [
    ["git push", true],
    ["git push origin", true],
    ["git push -u origin HEAD", true],
    ["git merge feat/other", true],
    // An explicit non-deploying refspec is the target, not the current branch.
    ["git push origin feat/x", false],
    // Resolving a conflicted merge is not publishing.
    ["git merge --abort", false],
  ];

  describe("on a feature branch", () => {
    for (const [command, expectDeny] of onFeature) {
      it(`${expectDeny ? "denies" : "allows"}: ${command}`, () => {
        const decision = decisionOf(runHook(PUBLISH_GUARD, payload(command), featureRepo));
        expect(decision).toBe(expectDeny ? "deny" : undefined);
      });
    }
  });

  describe("on dev", () => {
    for (const [command, expectDeny] of onDev) {
      it(`${expectDeny ? "denies" : "allows"}: ${command}`, () => {
        const decision = decisionOf(runHook(PUBLISH_GUARD, payload(command), devRepo));
        expect(decision).toBe(expectDeny ? "deny" : undefined);
      });
    }
  });

  it("fails open outside a git repository", () => {
    expect(decisionOf(runHook(PUBLISH_GUARD, payload("git push"), notARepo))).toBeUndefined();
    expect(decisionOf(runHook(PUBLISH_GUARD, payload("git merge feat/x"), notARepo))).toBeUndefined();
  });
});

describe("verifier-bypass-guard", () => {
  checkCases(VERIFIER_GUARD, [
    ["git commit --no-verify -m wip", true],
    ["git push --no-verify", true],
    ["git -c core.hooksPath=/dev/null commit -m wip", true],
    ["HOOK_BYPASS_APPROVED=1 git commit --no-verify -m wip", false],
    ["git commit -m wip", false],
    ["git status", false],
    ["git -c core.hooksPath=.githooks commit -m wip", false],
  ]);
  checkFailOpen(VERIFIER_GUARD);
});

describe("hooks.json registration", () => {
  interface HookEntry {
    matcher?: string;
    hooks: { command: string }[];
  }

  const manifest = JSON.parse(readFileSync(HOOKS_JSON, "utf8")) as {
    hooks: { PreToolUse: HookEntry[] };
  };

  // A guard that is not registered for both shell tool names is dead code.
  for (const matcher of ["Bash", "shell"]) {
    it(`registers all three guards for the ${matcher} matcher`, () => {
      const entry = manifest.hooks.PreToolUse.find((e) => e.matcher === matcher);
      expect(entry).toBeDefined();
      const commands = entry!.hooks.map((h) => h.command).join("\n");
      for (const script of [
        "verifier-bypass-guard.sh",
        "secret-guard.sh",
        "publish-guard.sh",
      ]) {
        expect(commands).toContain(script);
      }
    });
  }
});
