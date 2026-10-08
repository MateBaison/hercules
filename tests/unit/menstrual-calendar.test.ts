import { expect, test } from "bun:test";
import { createDefaultSnapshot } from "../../src/domain/legacy/read-snapshot";
import {
  menstrualCalendarAllowed,
  menstrualCalendarEnabled,
} from "../../src/domain/menstrual-calendar";

test("masculine profiles suppress menstrual features without deleting their dates", () => {
  const profile = createDefaultSnapshot().profile;
  profile.menstrualCalendar = { enabled: true, dates: ["2026-10-06"] };
  for (const gender of ["hombre", "male", "masculino", " Male "]) {
    profile.gender = gender;
    expect(menstrualCalendarAllowed(profile)).toBe(false);
    expect(menstrualCalendarEnabled(profile)).toBe(false);
    expect(profile.menstrualCalendar.dates).toEqual(["2026-10-06"]);
  }
  for (const gender of ["mujer", "no_binario", "otro"]) {
    profile.gender = gender;
    expect(menstrualCalendarEnabled(profile)).toBe(true);
    profile.menstrualCalendar.enabled = false;
    expect(menstrualCalendarEnabled(profile)).toBe(false);
    profile.menstrualCalendar.enabled = true;
  }
});
