export const workflow = [
  {
    name: "Understand",
    title: "Make the intent explicit.",
    description:
      "Interpret requirements, constraints, and the expected outcome before touching a file.",
    output: [
      "Functional requirements",
      "Acceptance criteria",
      "Constraints & open questions",
    ],
    artifact: "requirements.md",
  },
  {
    name: "Plan",
    title: "Build the blueprint first.",
    description:
      "Connect architecture, project structure, dependencies, and the data model into a reviewable implementation strategy.",
    output: [
      "Application architecture",
      "Data model & dependencies",
      "Implementation sequence",
    ],
    artifact: "architecture.md",
  },
  {
    name: "Build",
    title: "Turn the plan into a system.",
    description:
      "Create and modify components, APIs, interfaces, and supporting logic while keeping the project structure coherent.",
    output: ["React interface", "API contracts", "Application logic"],
    artifact: "src/pages/Support.tsx",
  },
  {
    name: "Verify",
    title: "Evaluate the result.",
    description:
      "Check the build, types, tests, accessibility, and security. Keep failures visible and return them to the repair loop.",
    output: ["Build & type checks", "Behavioral tests", "Reviewable evidence"],
    artifact: "verification.json",
  },
  {
    name: "Ship",
    title: "Prepare a controlled release.",
    description:
      "Package the verified application for deployment, with configuration, release notes, and a human approval point.",
    output: [
      "Deployment artifacts",
      "Environment checklist",
      "Release approval",
    ],
    artifact: "release.md",
  },
];
export const capabilities = [
  [
    "Autonomous Engineering",
    "A connected sequence from requirements to implementation, with inspectable work at each stage.",
  ],
  [
    "Project Memory",
    "Keep architecture, requirements, and previous decisions alongside the code they inform.",
  ],
  [
    "Self-Repair",
    "Investigate failures, propose a focused patch, and rerun the checks that failed.",
  ],
  [
    "Verification",
    "Treat build and behavioral evidence as part of the deliverable, rather than an afterthought.",
  ],
  [
    "Deployment",
    "Prepare artifacts and environment requirements for a controlled production release.",
  ],
  [
    "Human Control",
    "Review plans, inspect changes, and retain approval over consequential actions.",
  ],
];
export const audiences = [
  [
    "Startups",
    "Find the shape of your first product.",
    "Move from a scoped product idea to an implementation you can inspect and validate.",
    "Example intent: a customer portal with account access and billing history.",
  ],
  [
    "Developers",
    "Stay close to the decisions.",
    "Delegate repetitive implementation while keeping control over architecture, code, and validation.",
    "Example intent: add a typed reporting API to an existing application.",
  ],
  [
    "Teams",
    "Keep context connected.",
    "Carry architecture, decisions, and requirements across changes, with a shared record of what happened.",
    "Example intent: extend the team workspace without changing its permission model.",
  ],
  [
    "Builders",
    "Give your idea a clear path.",
    "Turn structured ideas into software without coordinating every engineering step manually.",
    "Example intent: a booking tool with availability, reminders, and an admin view.",
  ],
];
export const plans = [
  {
    name: "Free",
    audience: "Explore the workflow",
    detail:
      "A starting point for learning how intent becomes an engineering plan.",
  },
  {
    name: "Pro",
    audience: "For independent builders",
    detail:
      "Designed for deeper project work and an ongoing engineering workflow.",
  },
  {
    name: "Pro+",
    audience: "For complex projects",
    detail:
      "A proposed tier for larger context and more demanding engineering tasks.",
  },
  {
    name: "Team",
    audience: "For shared ownership",
    detail:
      "Designed around collaboration, shared context, and review controls.",
  },
];
