export const stages = ["INTENT", "PLAN", "BUILD", "VERIFY", "SHIP"] as const;
export const coreConfig = {
  accent: "#8b82ff",
  energy: "#c7c1ff",
  ring: "#6e6c9f",
  particles: 40,
};
export const corePalettes = {
  dark: { shell: "#42435b", accent: "#9d8eff", energy: "#ded6ff", ring: "#74718e" },
  light: { shell: "#d0ccd9", accent: "#6251dc", energy: "#755de2", ring: "#9286aa" },
};
export function nodePosition(index: number): [number, number, number] {
  const angle = index / 5 * Math.PI * 2 + 0.3;
  return [Math.cos(angle) * 2.1, Math.sin(angle) * 1.65, Math.sin(angle * 2) * 0.35];
}
export const stageDescriptions = [
  "Intent enters as a goal. The engine identifies requirements and constraints.",
  "A reviewable architecture turns requirements into an explicit engineering plan.",
  "Approved scope becomes components, interfaces and working application code.",
  "Measured checks expose failures. Repairs are checked again before success.",
  "Verified output reaches a human-controlled release boundary.",
];
