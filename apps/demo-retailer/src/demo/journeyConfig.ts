export type JourneyStepId = "compare" | "financing" | "inventory" | "test_drive" | "submit";

export interface LiveReadingCopy {
  commercialIntent: string;
  momentum: string;
  judgment: string;
}

export interface JourneyStep {
  id: JourneyStepId;
  title: string;
  action: string;
  path: string;
  /** Plain-language expectation for the live panel on this step */
  live: LiveReadingCopy;
  /** Shown on finance — category-defining restraint moment */
  restraintNote?: string;
  /** 0–3 on core path progression */
  progressionIndex: number | null;
  corePath: boolean;
}

export const PROGRESSION_LABELS = [
  "Exploring",
  "Evaluating",
  "Comparing",
  "Escalation earned",
] as const;

export const LIVE_JOURNEY_STEPS: JourneyStep[] = [
  {
    id: "compare",
    title: "Compare vehicles",
    action: "Select two models in the shortlist.",
    path: "/compare",
    progressionIndex: 0,
    corePath: true,
    live: {
      commercialIntent: "Comparison behavior — narrowing options before a stronger ask.",
      momentum: "The visit is moving from browsing into deliberate evaluation.",
      judgment: "Optiview stays patient — comparison support fits better than a hard escalation.",
    },
  },
  {
    id: "financing",
    title: "Review financing options",
    action: "Adjust payment inputs or explore monthly cost.",
    path: "/finance",
    progressionIndex: 1,
    corePath: true,
    restraintNote:
      "Optiview detected growing interest, but the visitor still appears to be validating financing and comparing options. The runtime intentionally held back a stronger dealer escalation.",
    live: {
      commercialIntent: "Comparison behavior with growing financing interest.",
      momentum: "The visitor appears to be moving deeper into validation and planning.",
      judgment:
        "Optiview is favoring reassurance and payment guidance before a stronger escalation.",
    },
  },
  {
    id: "test_drive",
    title: "Book a test drive",
    action: "Open the scheduling step — a high-intent move toward human contact.",
    path: "/test-drive",
    progressionIndex: 2,
    corePath: true,
    live: {
      commercialIntent: "Human-contact intent is strengthening alongside prior comparison and financing interest.",
      momentum: "The visit is progressing toward an in-person next step.",
      judgment:
        "Test-drive guidance can appear when readiness supports it — still balanced against open financing questions.",
    },
  },
  {
    id: "submit",
    title: "Submit test-drive request",
    action: "Submit the form (nothing you type is stored).",
    path: "/test-drive",
    progressionIndex: 3,
    corePath: true,
    live: {
      commercialIntent: "Scheduling intent from the form step — a strong human-escalation signal.",
      momentum: "Interest has deepened into commitment-oriented action.",
      judgment:
        "Escalation is more earned — Optiview can reflect scheduling and visit readiness in the inspector.",
    },
  },
  {
    id: "inventory",
    title: "View inventory",
    action: "Optional — browse models and price blocks.",
    path: "/inventory",
    progressionIndex: null,
    corePath: false,
    live: {
      commercialIntent: "Light exploration — availability and pricing interest.",
      momentum: "Still early in the visit unless comparison or financing followed.",
      judgment: "Inventory reassurance only when it helps — not a substitute for the core path.",
    },
  },
];

export const CORE_JOURNEY_STEPS = LIVE_JOURNEY_STEPS.filter((s) => s.corePath);

export function stepForPath(pathname: string): JourneyStep | undefined {
  if (pathname.startsWith("/compare")) return LIVE_JOURNEY_STEPS.find((s) => s.id === "compare");
  if (pathname.startsWith("/finance")) return LIVE_JOURNEY_STEPS.find((s) => s.id === "financing");
  if (pathname.startsWith("/inventory")) return LIVE_JOURNEY_STEPS.find((s) => s.id === "inventory");
  if (pathname.startsWith("/test-drive")) {
    return LIVE_JOURNEY_STEPS.find((s) => s.id === "test_drive");
  }
  return undefined;
}

export function stepMatchesPath(step: JourneyStep, pathname: string): boolean {
  if (step.id === "submit" || step.id === "test_drive") return pathname.startsWith("/test-drive");
  if (step.id === "financing") return pathname.startsWith("/finance");
  return pathname.startsWith(step.path);
}

export function maxProgressionIndexForPath(pathname: string): number {
  if (pathname.startsWith("/test-drive")) return 3;
  if (pathname.startsWith("/finance")) return 1;
  if (pathname.startsWith("/compare")) return 0;
  if (pathname.startsWith("/inventory")) return 0;
  return -1;
}
