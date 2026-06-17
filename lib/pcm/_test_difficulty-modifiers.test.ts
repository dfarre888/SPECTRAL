import { describe, it, expect } from "vitest";
import { applyDifficultyModifiers, defaultMagazineByType } from "@/lib/pcm/difficulty-modifiers";
import type { PCM } from "@/lib/pcm/spectral.types";

const baseRed: PCM.ForceOrbat = {
  force_id: "RED",
  platforms: [
    { id: "R1", type: "Shahed-136", group: "OWA", quantity: 1, quantity_remaining: 1, location_grid: "A1", altitude_m: 200, status: "pre_launch", fuel_state_percent: 100, payload: "HE", guidance: "GNSS_INS", ew_immune: false, rcs_class: "low", speed_kt: 100, ceiling_ft: 10000, range_km: 2500, endurance_hr: 5 },
    { id: "R2", type: "Shahed-136", group: "OWA", quantity: 1, quantity_remaining: 1, location_grid: "A2", altitude_m: 200, status: "pre_launch", fuel_state_percent: 100, payload: "HE", guidance: "GNSS_INS", ew_immune: false, rcs_class: "low", speed_kt: 100, ceiling_ft: 10000, range_km: 2500, endurance_hr: 5 },
  ],
  ew_assets: [{ id: "EW1", type: "Krasukha", status: "inactive", location_grid: "H1", jam_bands: ["L"], effective_radius_km: 40, affected_platform_ids: [] }],
  c2: { gcs_location: "H1", backup_gcs: null, link_health_percent: 100, comms_status: "nominal", primary_waveform: "UHF", backup_waveform: "VHF" },
  comms_status: "nominal",
  platforms_active: 2,
  platforms_destroyed: 0,
  magazine_expended: 0,
  magazine_remaining: 0,
};

describe("difficulty modifiers", () => {
  it("base leaves RED unchanged", () => {
    expect(applyDifficultyModifiers(baseRed, "base", "RED").platforms.length).toBe(2);
  });
  it("advanced RED adds platforms", () => {
    const out = applyDifficultyModifiers(baseRed, "advanced", "RED");
    expect(out.platforms.length).toBeGreaterThan(2);
  });
});

const baseBlue: PCM.ForceOrbat = {
  force_id: "BLUE",
  platforms: [],
  ew_assets: [],
  c2: { gcs_location: "Y1", backup_gcs: null, link_health_percent: 100, comms_status: "nominal", primary_waveform: "Link-16", backup_waveform: "UHF" },
  comms_status: "nominal",
  platforms_active: 0,
  platforms_destroyed: 0,
  magazine_expended: 0,
  magazine_remaining: 40,
};

describe("difficulty modifiers — corrections", () => {
  it("standard alias is not applied (base enum only)", () => {
    const out = applyDifficultyModifiers(baseRed, "standard", "RED");
    expect(out.platforms.length).toBe(2);
  });

  it("expert BLUE degrades comms to degraded_light and magazine -40%", () => {
    const out = applyDifficultyModifiers(baseBlue, "expert", "BLUE");
    expect(out.magazine_remaining).toBe(24);
    expect(out.c2.link_health_percent).toBe(55);
    expect(out.comms_status).toBe("degraded_light");
  });

  it("expert RED sets ew_immune on ~20% of candidates without touching pre-set immune or fibre FPV", () => {
    const orbat: PCM.ForceOrbat = JSON.parse(JSON.stringify(baseRed));
    orbat.platforms.push(
      { id: "R3", type: "FPV", group: "FPV", quantity: 1, quantity_remaining: 1, location_grid: "A3", altitude_m: 200, status: "pre_launch", fuel_state_percent: 100, payload: "HE", guidance: "fibre_optic_FPV", ew_immune: false, rcs_class: "low", speed_kt: 80, ceiling_ft: 1000, range_km: 5, endurance_hr: 0.5 },
      { id: "R4", type: "Shahed-136", group: "OWA", quantity: 1, quantity_remaining: 1, location_grid: "A4", altitude_m: 200, status: "pre_launch", fuel_state_percent: 100, payload: "HE", guidance: "GNSS_INS", ew_immune: true, rcs_class: "low", speed_kt: 100, ceiling_ft: 10000, range_km: 2500, endurance_hr: 5 },
      { id: "R5", type: "Shahed-136", group: "OWA", quantity: 1, quantity_remaining: 1, location_grid: "A5", altitude_m: 200, status: "pre_launch", fuel_state_percent: 100, payload: "HE", guidance: "GNSS_INS", ew_immune: false, rcs_class: "low", speed_kt: 100, ceiling_ft: 10000, range_km: 2500, endurance_hr: 5 },
      { id: "R6", type: "Shahed-136", group: "OWA", quantity: 1, quantity_remaining: 1, location_grid: "A6", altitude_m: 200, status: "pre_launch", fuel_state_percent: 100, payload: "HE", guidance: "GNSS_INS", ew_immune: false, rcs_class: "low", speed_kt: 100, ceiling_ft: 10000, range_km: 2500, endurance_hr: 5 },
    );
    const out = applyDifficultyModifiers(orbat, "expert", "RED");
    expect(out.platforms.find((p) => p.id === "R4")?.ew_immune).toBe(true);
    expect(out.platforms.find((p) => p.id === "R3")?.ew_immune).toBe(false);
    const newlyImmune = out.platforms.filter((p) => p.ew_immune && p.id !== "R4");
    expect(newlyImmune.length).toBeGreaterThanOrEqual(1);
  });
});

