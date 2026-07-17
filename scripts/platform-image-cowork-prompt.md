# SPECTRAL — Platform Image Sourcing (Claude Cowork prompt)

Copy everything below the line into Claude Cowork with the SPECTRAL workspace connected.

---

## PROMPT START — copy from here

You are sourcing OSINT platform images for **Spectral**, a military drone intelligence training SaaS (UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY). The SPECTRAL repo is connected to this Cowork session.

### Your job

Find, download, and **write image files directly into the project** — do not just paste URLs. For each platform below that still lacks an image:

1. **Search** Wikimedia Commons first, then manufacturer/government press releases (OSINT only).
2. **Download** the best image (see quality rules).
3. **Save** to:
   ```
   public/assets/platforms/{id}.jpg
   ```
   Use `.webp` only if JPG unavailable; filename must match `id` exactly.
4. **Register** in `lib/platforms/image-manifest.ts`:
   ```ts
   '{id}': '/assets/platforms/{id}.jpg',
   ```
5. **Show** a small preview in this chat for each image saved (filename + source URL + licence).
6. **Track progress** in a running table: `id | status | source | notes`.

Work in **batches of 10–15** platforms. After each batch, stop and report count saved vs remaining.

### Image quality rules (strict)

**ACCEPT:**
- Clear photo of the **aircraft/drone/USV/system hardware only** (in flight, on launcher, on deck, or static display)
- Wikimedia Commons CC / public domain / government release
- Minimum ~800px wide; landscape preferred
- Correct platform variant (not a different model)

**REJECT — do not use:**
- Personnel holding drones / backpack operator shots / infantry with FPV
- Stock photos of generic quadcopters when a named military system exists
- Diagrams, renders, or logos unless no photo exists anywhere (flag as `RENDER_FALLBACK`)
- Watermarked Getty/Shutterstock
- Classified or export-controlled imagery

### Repo paths

- Images: `public/assets/platforms/`
- Manifest: `lib/platforms/image-manifest.ts` (add entries alphabetically by id)
- Search hints: `lib/platforms/image-catalog.ts` and `scripts/fetch-platform-images.mjs`
- ID aliases (do not duplicate): `bayraktar-tb2` → `tb2-bayraktar`, `wing-loong-ii` → `wing-loong-2`

### Already have images — SKIP (41)

aeronautics-orbiter, alpagu, anduril-anvil, baba-yaga, ch-4-rainbow, ch-5-rainbow, dji-mavic-3, dronesentry-sentrycs, fpv-fibre-optic, fpv-interceptor, hermes-900, hq-17, jco-swarm-kit, kargu-2, kazhan, lancet-3, matrice-300, mohajer-6, molniya-2-fpv, mq-1c-gray-eagle, mq-25-stingray, mq-9-reaper, phalanx-ciws, rotem-l, rq-7b-shadow, searam, shahed-129, shahed-136, skydio-x10d, st-35-silent-thunder, starstreak-hvm, supercam-s250, supercam-s350, tb-001, tb2-bayraktar, uj-22-airborne, uj-26-bober, v2u, vampire, wing-loong-1, wing-loong-2, zala-aero

### Missing images — SOURCE THESE (77)

#### Red — threat UAS / OWA / USV (51)

| id | name | search hint |
|---|---|---|
| fpv-analog-5800 | Analog FPV Racer | FPV racing drone quadcopter Ukraine |
| autel-evo-max-4t | Autel EVO Max 4T | Autel EVO Max 4T drone |
| avic-nine-sky | AVIC Nine Sky (SS-UAV) | AVIC Nine Sky UAV China |
| akinci | Baykar Akinci | Bayraktar Akıncı UCAV |
| tb3 | Baykar TB3 | Bayraktar TB3 UAV carrier |
| bayraktar-kizilelma | Bayraktar Kizilelma | Bayraktar Kızılelma jet UCAV |
| black-sea-usv-swarm | Black Sea Baby Drone Boats | Ukraine Magura USV drone boat |
| casc-ch-901 | CASC CH-901 | CASC CH-901 loitering munition |
| cdet-ram | CDET RAM | CDET RAM loitering munition |
| arash-kian | DIO Arash / Kian | Iran Arash loitering munition |
| elbit-skystriker | Elbit Skystriker | Elbit Skystriker loitering munition |
| forpost-r | Forpost-R | Forpost-R UAV Russia |
| ga-mq-20-avenger | GA MQ-20 Avenger | General Atomics MQ-20 Avenger |
| ga-xq-67a-obss | GA XQ-67A OBSS | XQ-67A OBSS drone |
| gerbera-parody | Gerbera / Parody Decoy | Geran decoy drone Ukraine |
| ababil-3 | HESA Ababil-3 | HESA Ababil-3 UAV |
| qasef-1 | HESA Qasef-1 | HESA Qasef-1 drone Yemen |
| shahed-101 | HESA Shahed-101 / Shahed-107 | Shahed-101 loitering munition |
| shahed-149-gaza | HESA Shahed-149 Gaza | Shahed-149 Gaza UAV |
| gj-11 | Hongdu GJ-11 Sharp Sword | GJ-11 Sharp Sword UCAV |
| houthi-barq-1 | Houthi Barq-1 (Thunder-1) USV | Houthi Barq-1 USV |
| houthi-owa-maritime | Houthi OWA-UAV (Maritime) | Houthi Samad maritime drone |
| iai-green-dragon | IAI Green Dragon | IAI Green Dragon loitering munition |
| iai-harop | IAI Harop | IAI Harop loitering munition |
| iai-point-blank | IAI Point Blank | IAI Point Blank loitering munition |
| lentatek-kargi | Lentatek Kargi | Lentatek Kargi kamikaze drone |
| magura-v5 | Magura V5 USV | Magura V5 USV Ukraine |
| mohajer-mersad | Mohajer / Mersad Series | Mohajer-6 Mersad UAV Iran |
| mq-1-predator | MQ-1 Predator | MQ-1 Predator UAV |
| ncsist-cardinal | NCSIST Cardinal | NCSIST Cardinal UAV Taiwan |
| ncsist-chien-hsiang | NCSIST Chien Hsiang | NCSIST Chien Hsiang loitering munition |
| northrop-jackal | Northrop Grumman Jackal | Northrop Jackal loitering munition |
| orlan-10 | Orlan-10 | Orlan-10 UAV Russia |
| privet-82 | Privet-82 | Privet-82 drone Ukraine |
| rafael-spike-firefly | Rafael SPIKE Firefly | Rafael SPIKE FireFly loitering munition |
| rq-4-global-hawk | RQ-4 Global Hawk | RQ-4 Global Hawk UAV |
| samad-2 | Samad-2 OWA | Samad-2 Houthi drone |
| schiebel-camcopter-s100 | Schiebel Camcopter S-100 | Schiebel Camcopter S-100 |
| shahed-131 | Shahed-131 | Shahed-131 drone |
| shahed-238 | Shahed-238 / Geran-3 | Shahed-238 jet drone |
| s-70-okhotnik | Sukhoi S-70 Okhotnik-B | S-70 Okhotnik-B UCAV |
| switchblade-300 | AeroVironment Switchblade 300 | AeroVironment Switchblade 300 |
| tai-anka | TAI Anka | TAI Anka UAV |
| uj-32-lastivka | UKRJET UJ-32 Lastivka | UJ-32 Lastivka Ukraine |
| hero-120 | UVision Hero-120 | UVision Hero-120 loitering munition |
| uvision-hero-30 | UVision Hero-30 | UVision Hero-30 |
| uvision-hero-70 | UVision Hero-70 | UVision Hero-70 |
| uvision-hero-900 | UVision Hero-900 | UVision Hero-900 |
| warmate | WB Electronics Warmate | Warmate loitering munition Poland |
| zala-421-16em | ZALA 421-16EM | ZALA 421-16EM UAV |
| zala-eleron-3sv | ZALA Eleron-3SV | ZALA Eleron-3SV drone |

#### Blue — C-UAS / EW / effectors (26)

| id | name | search hint |
|---|---|---|
| switchblade-600 | AeroVironment Switchblade 600 | AeroVironment Switchblade 600 |
| phoenix-ghost | Aevex Phoenix Ghost (Disruptor) | Aevex Phoenix Ghost UAV |
| altius-600 | Anduril ALTIUS-600M | Anduril ALTIUS-600M |
| pulsar-l | Anduril Pulsar-L | Anduril Pulsar-L jammer |
| pulsar-v | Anduril Pulsar-V | Anduril Pulsar-V jammer |
| anduril-sentry | Anduril Sentry Tower (XRST) | Anduril Sentry Tower |
| bukovel-ad | Bukovel-AD | Bukovel-AD Ukraine anti-drone |
| dronegun-mk4 | DroneShield DroneGun Mk4 | DroneGun Mk4 |
| dronegun-tactical | DroneShield DroneGun Tactical | DroneGun Tactical |
| dronesentry | DroneShield DroneSentry | DroneSentry fixed C-UAS |
| rfpatrol-mk2 | DroneShield RfPatrol Mk2 | RfPatrol Mk2 |
| eos-slinger | EOS Slinger | EOS Slinger C-UAS |
| epirus-leonidas | Epirus Leonidas (IFPC-HPM) | Epirus Leonidas HPM |
| fim-92-stinger | FIM-92J Stinger MANPADS | FIM-92 Stinger launcher |
| goalkeeper-ciws | Goalkeeper CIWS | Goalkeeper CIWS |
| millennium-35mm | 35 mm Millennium | OTO Melara Millennium naval gun |
| dardo-fast-forty | Dardo / Fast Forty | Dardo Fast Forty CIWS |
| dragonfire | MBDA DragonFire | MBDA DragonFire laser |
| locust-lws | AeroVironment LOCUST LWS | LOCUST laser weapon system |
| iron-beam | Rafael Iron Beam | Rafael Iron Beam laser |
| lite-beam | Rafael Lite Beam | Rafael Lite Beam |
| drone-dome | Rafael Drone Dome | Rafael Drone Dome |
| coyote-block3 | Raytheon Coyote Block 3 NK | Coyote Block 3 interceptor |
| smash-hopper | Smart Shooter SMASH Hopper | SMASH Hopper C-UAS |
| krasukha-4 | 1RL257 Krasukha-4 | Krasukha-4 EW vehicle |
| zhitel-r330zh | R-330Zh Zhitel | R-330Zh Zhitel jammer |

### Priority batch 1 (high visibility — do these first)

orlan-10, akinci, rq-4-global-hawk, iron-beam, forpost-r, s-70-okhotnik, switchblade-300, switchblade-600, iai-harop, magura-v5, mq-1-predator, gj-11

### When finished (or after each batch)

1. Confirm files exist on disk under `public/assets/platforms/`
2. Confirm `lib/platforms/image-manifest.ts` entries added
3. Run: `npx tsc --noEmit`
4. Report: `{saved} / 77` with list of any `NO_SUITABLE_OSINT` ids

### Start now

Begin with **Priority batch 1**. Download each image, write it into the repo, update the manifest, and show previews in this chat. Ask before using a render/diagram fallback.

## PROMPT END
