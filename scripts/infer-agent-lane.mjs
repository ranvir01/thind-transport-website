#!/usr/bin/env node
/**
 * Infer the best lane for a set of changed file paths (integrator territory check).
 * Usage: node scripts/infer-agent-lane.mjs src/lib/hub/compliance.ts src/app/hub/driver/page.tsx
 */
const RULES = [
  {
    lane: "lane-driver",
    label: "Driver PWA",
    test: (f) =>
      f.startsWith("src/app/hub/driver/") ||
      f.startsWith("src/components/hub/driver/"),
  },
  {
    lane: "lane-portal",
    label: "Portal / tracking",
    test: (f) =>
      f.startsWith("src/app/hub/portal/") ||
      f.startsWith("src/app/track/") ||
      f.includes("ShareLink") ||
      f.includes("Portal"),
  },
  {
    lane: "lane-compliance",
    label: "Compliance / IFTA",
    test: (f) =>
      f.includes("/compliance") ||
      f.includes("ifta") ||
      f.includes("compliance.ts"),
  },
  {
    lane: "lane-integrations",
    label: "Integrations",
    test: (f) =>
      f.includes("integrations/") ||
      f.includes("webhooks/") ||
      f.includes("telematics") ||
      f.includes("credentials.ts"),
  },
  {
    lane: "lane-sidecars",
    label: "Go/Rust sidecars",
    test: (f) => f.startsWith("services/") || f.includes("sidecars.ts"),
  },
  {
    lane: "lane-tests",
    label: "Tests / E2E only",
    test: (f) =>
      f.startsWith("src/lib/hub/__tests__/") || f.startsWith("scripts/e2e-"),
  },
  {
    lane: "lane-docs",
    label: "Docs / ops",
    test: (f) =>
      f.startsWith("docs/") ||
      f === "README.md" ||
      f.startsWith(".env.example") ||
      f.includes("go-live-check"),
  },
  {
    lane: "lane-saas",
    label: "SaaS / admin",
    test: (f) => f.startsWith("src/app/hub/admin/") || f.includes("onboarding"),
  },
  {
    lane: "lane-analytics",
    label: "Reports / analytics",
    test: (f) => f.includes("/reports/") || f.includes("reports.ts"),
  },
  {
    lane: "lane-office",
    label: "Office UI",
    test: (f) =>
      f.startsWith("src/app/hub/(office)/") ||
      (f.startsWith("src/components/hub/") && !f.includes("/driver/")),
  },
]

export function inferLane(files) {
  const scores = new Map()
  for (const file of files) {
    for (const rule of RULES) {
      if (rule.test(file)) {
        scores.set(rule.lane, (scores.get(rule.lane) ?? 0) + 1)
      }
    }
  }
  if (!scores.size) return { lane: "lane-roadmap", label: "Roadmap / mixed", confidence: "low" }
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1])
  const [lane, count] = sorted[0]
  const rule = RULES.find((r) => r.lane === lane)
  const confidence =
    sorted.length > 1 && sorted[1][1] === count
      ? "mixed"
      : count >= 2 || files.length === 1
        ? "high"
        : "medium"
  return { lane, label: rule?.label ?? lane, confidence, scores: Object.fromEntries(scores) }
}

if (process.argv[1]?.endsWith("infer-agent-lane.mjs")) {
  const files = process.argv.slice(2)
  if (!files.length) {
    console.error("Usage: node scripts/infer-agent-lane.mjs <file>...")
    process.exit(1)
  }
  console.log(JSON.stringify(inferLane(files), null, 2))
}
