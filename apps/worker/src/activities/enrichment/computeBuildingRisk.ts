import type { Building } from "@ari/schemas";

export function computeBuildingRisk(building: Building) {
  const severe = building.riskSignals.severeViolationCount ?? 0;
  const open = building.riskSignals.openViolationsCount ?? 0;
  const complaints = building.riskSignals.recentComplaintsCount ?? 0;
  const score = severe * 20 + open * 10 + complaints * 10 + (building.riskSignals.dataConfidence < 40 ? 10 : 0);
  return {
    score,
    bucket: score >= 90 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW",
    explanation: "Public-data risk signals only."
  };
}
