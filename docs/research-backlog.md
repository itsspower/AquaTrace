# AquaTrace research and evidence backlog

This is a queue of leads, exclusions, and project evidence gaps—not a list of established incidents or user-research findings. No record below should be imported until the underlying source is opened and its claims, publication date, and affected area can be checked.

| Lead or source | Status | Reason not included |
|---|---|---|
| Ekurhuleni water-supply interruption leads surfaced in search listings | Unverified research lead; no incident asserted | The original source pages and their details could not be inspected and substantiated. Search-result listings are not evidence. |
| eThekwini water-supply notice leads surfaced in search listings | Unverified research lead; no incident asserted | The original source pages and their details could not be inspected and substantiated. Search-result listings are not evidence. |
| City of Tshwane consolidated update, [26 October 2026](https://www.tshwane.gov.za/?p=106785) | Inspected; excluded as a single record | It describes multiple distinct water challenges. Importing the whole update as one incident would combine unrelated events; each potential event needs a separately supported record. |

## Challenge alignment (confirmation required)

The repository names the Credify System Thinking Challenge 2026 but does not contain its official challenge brief, categories, judging rubric, or submission instructions. The challenge area AquaTrace addresses is therefore **not confirmed**. Obtain the official brief from the challenge organizer and map the project to its exact wording before presenting an official category or claiming judging alignment. Do not infer the category from the project name.

## User value and usability evidence

No participant testing, interviews, pilot, or impact evaluation has been conducted or documented. The value proposition is a hypothesis, not a finding. Run consent-based formative sessions using [user-testing-plan.md](user-testing-plan.md); document actual observations in [user-testing-results-template.md](user-testing-results-template.md). Do not report proposed sample sizes or success criteria as completed research.

## Water-point source dataset

There is no confirmed authoritative dataset of public water points, operating hours, coordinates, access conditions, or current availability in the project. Demo-mode locations are fictional. Before adding a real location, inspect a primary municipal/government/water-board source, retain its original URL and access date, confirm the precise location and public-access conditions, and keep existence verification separate from current availability. Do not infer coordinates from a place name or search-result snippet. Current migration contains no seed rows.

## Shared platform validation

Supabase project setup, migration execution, Auth configuration, RLS policy testing, concurrency tests, and multi-account end-to-end testing remain pending. The migration is preparatory and has not been run against a live database. Validate it in a disposable project before any production data or deployment.

## Next evidence steps

1. Obtain the official challenge brief, categories, judging criteria and pitch/submission constraints.
2. Confirm any proposed stakeholder or operational partner; none is currently represented as a partner.
3. Conduct and document the formative user tasks before claiming usability or user value.
4. Identify a source-backed, maintainable water-point dataset and a safe verification/update process.
5. Validate database behavior and role denials with a configured, disposable Supabase project.
6. Define privacy, retention, moderation, incident escalation and offline procedures before handling real reports.

## Import criteria

Use an inspectable official municipal, water-board, or government notice, or a traceable reputable news report identifying the incident and affected area. Record the direct original URL, exact source title, publication date, incident date/range only when stated, and evidence classification. Keep uncertain or conflicting details in notes. Do not promote a lead to the historical dataset based on a search snippet alone.
