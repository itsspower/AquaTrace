# AquaTrace pitch — slide-by-slide content

**Status:** content draft, not a designed slide deck. No presentation file was present in the repository. The official Credify challenge brief/category and submission format were not found, so slide 2 must be aligned with the organizer's wording before presentation. Do not describe the provisional framing here as an official category.

## 1. AquaTrace

**Track the problem. Find the next step.**

A civic-tech prototype exploring how community observations, visible review context and source-backed water-service information might be brought together.

**Presenter note:** AquaTrace is an information and coordination concept. It does not repair infrastructure or provide an official municipal service.

## 2. Challenge alignment — confirm before presenting

**Challenge area:** Awaiting the official Credify System Thinking Challenge 2026 brief and categories.

**System-thinking framing (provisional, not an official challenge label):** Information gaps and uncertainty during water-service disruptions; feedback between reporting, review capacity, trust and continued participation.

Replace this slide's first line only after verifying the exact category/brief with the organizer. Do not guess from the challenge name.

## 3. The problem hypothesis

During a disruption, residents may need to know what has been reported, how current that information is, and what evidence supports it. Information may be fragmented or difficult to interpret.

**Evidence boundary:** This is the project's problem hypothesis, not a claim established by interviews, survey data, or municipal data. No user research has been conducted.

## 4. The proposed intervention

AquaTrace provides a single interface to:

- submit a structured community observation;
- follow a report's review state and history;
- distinguish community reports from dated historical source records;
- explore water-point entries only when supported by a source, with verification and availability shown separately.

## 5. How the system works

**Observe → report → review → explain → follow up.**

Residents submit reports as Unverified. A designated reviewer can record a status, explanation and evidence link. Residents can inspect that history. Historical source records remain a separate read-only stream. Reports do not automatically go to a municipality.

## 6. System thinking and feedback

**Potential reinforcing loop:** better structured reports → more interpretable review → greater confidence in updates → potential repeat participation.

**Potential balancing loop:** increased reporting → triage burden → slower updates → lower perceived usefulness.

**Risk of distorted signals:** unequal access and media coverage can make report counts reflect participation rather than underlying outage frequency.

All three are hypotheses to test, not observed causal effects.

## 7. What the prototype demonstrates today

- React + TypeScript frontend and role-specific demonstration workflow.
- Browser-only demo accounts and local reports by default.
- Optional Supabase adapter and prepared schema/RLS/RPC migration; **no project configured, migration applied, or shared backend validated**.
- Separate source-linked historical entries. The current two dated entries are City of Tshwane notices:
  - [18 July 2025: Hartebeeshoek Reservoir maintenance notice](https://www.tshwane.gov.za/?p=90138)
  - [26 October 2026: overnight water restrictions notice](https://www.tshwane.gov.za/?p=106772)
- No verified water-point dataset or actual participant-testing results yet.

These sources document what the City stated in those dated notices; they do not establish present status, independently verify household impacts, or show outage frequency.

## 8. User value — question, not conclusion

**Testable question:** Can residents use the report detail, source and status history to decide what information is available and what remains uncertain?

Planned formative tasks cover report submission, status interpretation, historical source interpretation, water-point evidence interpretation and the logout boundary. The plan and blank recording form are in `docs/user-testing-plan.md` and `docs/user-testing-results-template.md`. Participant count: **0; testing not conducted**.

## 9. Risks, dependencies and next steps

1. Obtain the challenge brief and confirm the exact category and judging criteria.
2. Conduct documented, consent-based user sessions; revise if evidence labels are misunderstood.
3. Identify an authoritative water-point dataset and a safe update process.
4. Configure a separate Supabase project, review/apply the migration, and validate RLS/RPCs with multiple roles.
5. Define privacy, retention, moderation, offline operation and a responsible partner before real community use.

## 10. Close

**AquaTrace is a testable information-sharing hypothesis, not a proven intervention.**

The next step is to validate whether the distinctions between reported, reviewed, sourced and currently available information help residents make a better-informed next decision.
