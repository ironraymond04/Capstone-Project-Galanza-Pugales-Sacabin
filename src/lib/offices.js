// Matches ml_service/office_names.json
export const OFFICE_NAMES = {
  1: "CCS", 2: "CAS", 3: "COE", 4: "REGISTRAR", 5: "DSA/OSAS", 6: "LIBRARY",
  7: "GUIDANCE", 8: "CBA", 9: "COC", 10: "GRADUATE STUDIES", 11: "ACCOUNTING",
  12: "CED", 13: "BED", 14: "SECURITY", 15: "PHYSICAL PLANT", 16: "MIS",
  17: "HUMAN RESOURCE", 18: "RESEARCH AND CREATIVE WORKS", 19: "NSTP",
  20: "PENWOOD", 21: "CLINIC", 22: "TESDA"
};

// Names of the predicted offices, excluding the one the ticket is assigned to
export function otherPredictedOffices(ticket) {
  return (ticket.predicted_offices || [])
    .filter((id) => id !== ticket.assigned_office)
    .map((id) => OFFICE_NAMES[id])
    .filter(Boolean);
}