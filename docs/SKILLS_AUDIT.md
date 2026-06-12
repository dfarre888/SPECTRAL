# SKILLS AUDIT — RECOMMENDED THIRD-PARTY SKILLS FOR THE MILSKIL BUILD
**Date:** 24 May 2026
**Purpose:** Identify GitHub skills that would accelerate Phase 3–7 production.
**Read before starting in Cowork.**

---

## SUMMARY — TOP 4 SKILLS TO INSTALL

If you only install four, install these. They cover the biggest production bottlenecks in the work plan:

| # | Skill | Repo | What it gives you |
|---|---|---|---|
| 1 | **pptx-from-layouts** | `tristan-mcinnis/pptx-from-layouts-skill` | Generates PowerPoint decks from markdown using a real template's slide-master layouts (not text overlays). The author benchmarked 32 PPTX skills and built this because the rest failed on professional templates. This is the right tool for the ~500-slide Milskil build. |
| 2 | **academic-pptx-skill** | `Gabberflast/academic-pptx-skill` | Enforces *action titles* (every slide title is a complete-sentence takeaway), structured argument flow, exhibit discipline, citation standards, ghost-deck test. This is exactly the slide-discipline you want for contractor-grade military training — every slide earns its place or doesn't ship. |
| 3 | **education-agent-skills** | `GarethManning/education-agent-skills` | 152 evidence-based pedagogical skills — Bloom's Taxonomy alignment, backwards design unit planner, spaced practice scheduler, retrieval practice generator, assessment design. Drop-in upgrade for the workbook and knowledge-check production in Phase 7. |
| 4 | **Anthropic official `skills` repo** | `anthropics/skills` | Reference implementation of pptx, docx, pdf, xlsx skills. Already shipping inside Claude on paid plans — but worth cloning so you have the SKILL.md files locally if you want to extend them with Milskil-specific overrides. |

---

## CATEGORY 1 — SLIDE / PRESENTATION PRODUCTION (highest priority)

The Phase 7 slide build is the biggest piece of work. These skills directly attack that.

### `tristan-mcinnis/pptx-from-layouts-skill` ⭐ STRONG RECOMMEND
Why it matters for Milskil:
- Most PPTX-generation skills overlay text boxes on a template background. Result: the corporate template's actual layouts get ignored, and what comes out looks like a Word document pasted onto a PowerPoint.
- This skill *profiles* your Milskil master template once, then uses real slide-master placeholders. The output looks like a human designer made it inside your template.
- Markdown-driven outline format → great fit because Phase 1 and Phase 2 are already written in markdown.

Workflow:
1. Build the Milskil master `.pptx` template (one-off — already in the work plan)
2. Run `profile.py` on it once to generate a layout config
3. Write each slide pack as a markdown outline (already the pattern in `phase1/01_platform_landscape.md`)
4. Run `generate.py` to produce the deck
5. Review and refine

Install: `git clone https://github.com/tristan-mcinnis/pptx-from-layouts-skill ~/.claude/skills/pptx-from-layouts`

### `Gabberflast/academic-pptx-skill` ⭐ STRONG RECOMMEND
Why it matters:
- Enforces **action titles** — every slide title is a sentence stating the takeaway, not a label. (e.g. "70% OF IAF FLIGHT HOURS DURING RISING LION WERE UAV" not "IAF UAV Statistics")
- Enforces **situation → complication → resolution** argument structure across the deck
- **Ghost deck test:** read just the slide titles top to bottom — they should tell the entire story
- **One exhibit per results slide** with the key finding annotated directly on the chart
- Citation standards on every borrowed figure
- "Conclusions slide stays on screen during Q&A — never on Thank You or blank"

This is exactly the slide discipline a contractor-grade military course needs. The default Claude slide style is too "presentation deck" — this drags it toward the briefing-room standard your audience expects.

Compose with `pptx-from-layouts` — academic-pptx handles *content discipline*, pptx-from-layouts handles *template fidelity*. They're complementary.

### `tfriedel/claude-office-skills` — secondary
- All-in-one PPTX + DOCX + XLSX + PDF workflows
- Useful for Excel matrices (the platform/payload/c-UAS comparison sheets in Phase 7)
- Has inventory/replace and rearrange utilities for slide-level editing

### `zarazhangrui/frontend-slides` — secondary, but very interesting
- Generates beautiful single-page HTML slide decks (not .pptx)
- Worth considering for an **online interactive version** of the course content as a follow-on product
- Style-preset library is excellent — good reference for the Milskil brand tokens
- Not for the primary deliverable, but a strong follow-on opportunity

---

## CATEGORY 2 — INSTRUCTIONAL DESIGN (high priority for workbooks + assessment)

### `GarethManning/education-agent-skills` ⭐ STRONG RECOMMEND
- **152 evidence-based pedagogical skills** designed for Claude/Codex
- Includes: Backwards Design Unit Planner, Bloom's Taxonomy aligner, Spaced Practice Scheduler, Retrieval Practice Generator, Cognitive Load auditor, Assessment Designer, Rubric Builder
- Built specifically for instructional designers and trainers
- Auto-activates when relevant — won't add friction
- Perfect for Phase 7 workbook + knowledge-check + scenario assessment design

### `educates/educates-course-design-skill`
- Course planning across multiple workshops, with spine/elective classification
- Built for the Educates training platform but the planning logic is portable
- Good for the **course architecture document** (the first Phase 7 deliverable)
- Less applicable to actual content production

### `dmccreary/claude-skills` (Intelligent Textbooks)
- 19 skills for textbook creation: course-description-analyzer, learning-graph-generator (200-concept DAG), book-chapter-generator, glossary-generator (ISO 11179-compliant), FAQ-generator, **Bloom's Taxonomy quiz-generator**
- The **glossary-generator** is particularly relevant — the running glossary across Phases 1–6 will need polishing for the final deliverable, and ISO 11179 is a credible standard for military/government training materials.

---

## CATEGORY 3 — BRAND CONSISTENCY (medium priority — you've already done most of this)

The Milskil brand spec is already written and locked. These skills could *enforce* it during production.

### `AutumnsGrove/ClaudeSkills/brand-guidelines`
- Templates and patterns for maintaining brand identity across presentations, web, social, documents
- Could be adapted to encode the Milskil spec into a skill that auto-loads on every Phase 7 production task — guarantees no drift across the ~500-slide build and 4 workbooks

### `VicUgochukwu/brand-design-skill`
- Specifically for on-brand HTML designs (LinkedIn carousels etc.) but the brand-token enforcement pattern is transferable
- Useful if Milskil ever wants social marketing assets generated to the same standard as the courseware

### `Leonxlnx/taste-skill` (13.3k stars — popular)
- Premium aesthetic, anti-slop, motion-first design
- Worth a look just to see how a sophisticated design-system skill is structured, for reference when authoring a Milskil-specific brand-enforcement skill

---

## CATEGORY 4 — WARGAMING / SCENARIO DESIGN (medium priority — for the Day 4–5 scenarios)

### `IQTLabs/snowglobe`
- **Open-ended wargames driven by LLMs** — text-based, tabletop-style
- Originally designed for political wargames and AI incident response tabletops
- Could be adapted to power the Milskil Red v Blue scenario library:
  - Pre-built scenarios with NPC role personas (Red commander, Blue ISR cell, c-UAS team, etc.)
  - Players can take Red or Blue, AI takes the rest
  - Post-game analysis automated
- IQT Labs is In-Q-Tel — credible defence-adjacent provenance
- **Caveat:** Not a Claude skill in the SKILL.md sense — it's a Python package and Docker stack. Either run it adjacent to the course (as a delivery tool for instructors) or extract the scenario-generation logic as inspiration for the markdown scenario library Phase 7 will produce.

### `nicmarti/skills-weaver`
- Tabletop RPG engine using Claude Code
- D&D-focused but the structure (dice rolls, character generation, adventure manager, party state tracking) is transferable to military tabletop facilitation
- Worth looking at for the inject-timeline mechanics of the scenario week

---

## CATEGORY 5 — RESEARCH SYNTHESIS & DEVELOPMENT METHODOLOGY (low priority for this build, high for the next one)

### `obra/superpowers` (170,634+ GitHub stars — the most popular Claude skill ecosystem)
- Jesse Vincent's framework — now in Anthropic's official plugin marketplace as of Jan 2026
- Not directly a courseware tool, but the **methodology** (Socratic brainstorming → planning → TDD-style implementation → review) is exactly how Phases 3–7 should be run
- Skills like `/brainstorm`, `/write-plan`, `/execute-plan` give Claude structure that prevents drift across a long build like this one
- For Milskil specifically — install **purely to support David's broader A3DM development workflow**, not for the course itself

### `obra/elements-of-style`
- William Strunk Jr.'s *Elements of Style* (1918) compiled as a writing skill
- Useful for instructor notes and workbook prose discipline — short sentences, active voice, no padding
- Lightweight, no downside

### `glebis/claude-skills` — decision-toolkit
- Structured decision-making, scenario matrices, bias checkers
- Could be useful inside scenarios as a tool the Red/Blue planners use to structure their COA (Course of Action) decisions

---

## CATEGORY 6 — NOT RECOMMENDED FOR THIS PROJECT

To save you time evaluating things that look relevant but aren't:

- **Most general "claude skill collection" repos** (karanb192, ComposioHQ, abubakarsiddik31) — useful for discovery, but the actual high-quality skills are listed individually above
- **`codebase-to-course`** — for turning codebases into HTML courses; this is teaching code, not military doctrine
- **`brand-design-md`** (62 named brand styles) — Apple/Stripe/Notion clones, irrelevant to Milskil's bespoke identity
- **`taste-skill` / general design-system skills** — useful as reference patterns only; Milskil brand spec is already written
- **Most `pptx` generation alternatives** (gpt-image-2 mimics, hand-drawn rough.js generators) — wrong aesthetic for military training

---

## INSTALLATION ORDER FOR COWORK

When you start Phase 3 in Cowork, install in this order:

```bash
# 1. The two slide skills — needed for Phase 7
git clone https://github.com/tristan-mcinnis/pptx-from-layouts-skill ~/.claude/skills/pptx-from-layouts
git clone https://github.com/Gabberflast/academic-pptx-skill ~/.claude/skills/academic-pptx

# 2. The instructional design library — needed for workbooks and assessments
git clone https://github.com/GarethManning/education-agent-skills ~/.claude/skills/education-agent-skills

# 3. Optional but useful — the Anthropic reference repo
git clone https://github.com/anthropics/skills ~/.claude/skills/anthropic-reference

# 4. Optional — install Superpowers in Claude Code via plugin marketplace
# In Claude Code:
# /plugin marketplace add obra/superpowers-marketplace
# /plugin install superpowers@superpowers-marketplace
```

**You don't need any of these for Phases 3–6** (the research phases). They become valuable when Phase 7 production starts.

---

## STRATEGIC RECOMMENDATION

The Milskil project is large enough that **authoring your own bespoke skill** would pay off. Specifically:

**`milskil-courseware`** — a private skill that:
- Encodes the Milskil brand spec (colours, type stack, layouts, classification banners) as constants
- Wraps `pptx-from-layouts` with Milskil-template-aware defaults
- Wraps `academic-pptx-skill` with military-training-specific overrides (e.g. classification banner requirements, instructor-note layout variant)
- Pulls from `education-agent-skills` for assessment generation
- Has its own knowledge-check templates calibrated to military training standards
- Auto-loads on any Milskil content task

This is a one-off investment of perhaps 4 hours that pays back across every cohort delivery from now to retirement. Worth doing in Cowork once Phases 3–6 research is done, before slide production starts.

---

**END SKILLS AUDIT**
