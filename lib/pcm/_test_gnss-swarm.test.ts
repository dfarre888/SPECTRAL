import { describe, it, expect } from "vitest";
import type { PCM } from "@/lib/pcm/spectral.types";
import { applyGnssSwarmDegradation } from "@/lib/pcm/swarm-saturation";
import { createSeededRng } from "@/lib/pcm/seeded-rng";

const threat = (id: string): PCM.Platform => ({
  id, type: "Shahed-136", group: "OWA", quantity: 1, quantity_remaining: 1,
  location_grid: "ECHO-7", altitude_m: 200, status: "airborne_tasked",
  fuel_state_percent: 80, payload: "HE", guidance: "GNSS_INS", ew_immune: false,
  rcs_class: "low", speed_kt: 100, ceiling_ft: 10000, range_km: 2500, endurance_hr: 5,
});

describe("GNSS swarm degradation", () => {
  it("scatters swarm under L-band jamming", () => {
    const state = {
      turn: 5,
      red_force: { platforms: [threat("T1"), threat("T2"), threat("T3")] },
    } as unknown as PCM.WorldState;
    const ew = [{ id: "EW-L", type: "L-band", status: "active" as const, location_grid: "H1", jam_bands: ["L1"], effective_radius_km: 50, affected_platform_ids: [] }];
    const result = applyGnssSwarmDegradation(state, ew, createSeededRng(4242));
    expect(result.degradedCount).toBeGreaterThan(0);
  });

  it("scatters swarm under L2-only jammer DB band string", () => {
    const state = {
      turn: 5,
      red_force: { platforms: [threat("T1"), threat("T2"), threat("T3")] },
    } as unknown as PCM.WorldState;
    const ew = [{ id: "EW-L2", type: "Zhitel", status: "active" as const, location_grid: "H1", jam_bands: ["L2"], effective_radius_km: 50, affected_platform_ids: [] }];
    const result = applyGnssSwarmDegradation(state, ew, createSeededRng(99));
    expect(result.degradedCount).toBeGreaterThan(0);
  });
});
