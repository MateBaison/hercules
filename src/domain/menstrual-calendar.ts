import type { Snapshot } from "./schemas/snapshot";

export function menstrualCalendarAllowed(profile: Snapshot["profile"]) {
  return !["hombre", "male", "masculino"].includes(
    (profile.gender ?? "").trim().toLowerCase(),
  );
}
export function menstrualCalendarEnabled(profile: Snapshot["profile"]) {
  return (
    menstrualCalendarAllowed(profile) &&
    profile.menstrualCalendar?.enabled === true
  );
}
