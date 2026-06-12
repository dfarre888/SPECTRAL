# SPECTRAL Operations — Product Charter

**Classification:** UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY  
**Edition:** Spectral Operations (Defence)  
**Date:** 2026-06-07

---

## Product split

| SKU | Audience | Data | Propagation | Deploy |
|-----|----------|------|-------------|--------|
| **Spectral Training** | Course providers, contractors | OSINT only | Band overlap + geometric envelopes | Cloud SaaS |
| **Spectral Operations** | Defence commands, EW/C-UAS planners | Customer tenant data + OSINT seed | Server-side ITU-R propagation + multipath | On-prem + sovereign cloud |

Spectral Operations is a **tenant-isolated battlespace engine**. Propagation solvers run **server-side only** — never in the browser bundle.

---

## Legal / export-control posture (v1 Operations)

### Permitted in v1 (open literature models)

- ITU-R P.525 free-space / Friis path loss
- Two-ray ground reflection (multipath, low altitude)
- ITU-R P.526 knife-edge diffraction (simplified)
- ITU-R P.1411 short-range urban NLOS statistics (Estimated)
- Geometric terrain LOS (MEA viewshed)
- Building-vector LOS occlusion (OSINT + customer upload)

### Requires legal review before enabling

- Full radar range equation with customer RCS
- Classified clutter maps
- Live track feeds (ADS-B, AIS, tactical data links)

### Prohibited without contract amendment + export licence

- Shipping controlled ECCN 7D994/7E994 algorithms to non-US persons
- Cross-tenant data aggregation that approaches classified conclusions

**Exit criterion for engineering:** customer contract specifies allowed `model_tier` per deployment.

---

## Data handling

- Every object carries: `tenant_id`, `classification`, `confidence`, `source_date`
- Customer proprietary platforms/documents never leave tenant boundary
- Audit log: immutable record of propagation runs, laydown changes, imports

---

## Architecture principles

1. Bands tell you *can* jam; propagation tells you *will* jam at this geometry.
2. All numeric outputs use NATO confidence language (Confirmed / Assessed / Estimated / Reported / Suspected).
3. Multipath without site survey is **Estimated** — UI must display model tier.
