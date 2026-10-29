# AquaTrace

**Track the problem. Find the next step.**

AquaTrace is a South African civic-tech concept for reporting water interruptions, finding alternative water points, and making incident information easier to follow. The current app is a front-end prototype; it is not a municipal service.

## Features in this prototype

- Responsive dashboard, outage report list, water-point directory, incident details, local review workflow, and data insights.
- Client-side outage report entry with required fields, validation, search, and combined status/category filters.
- Browser-local persistence for user-submitted reports and reviewer status history.
- Reviewer status options: Unverified, Under review, Confirmed, Resolved, and Rejected. Status changes are explicit and have a timestamp and optional note.
- Historical source records are kept in a dedicated dataset and shown separately from community submissions.
- Insight summaries distinguish historical records from community reports; possible repeat locations and observed-month summaries use only browser-local reports.
- The remaining fictional demonstration data is the water-point directory, labelled as fictional and not verified. Community submissions are labelled separately and are unverified by default.

## Getting started

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Run project checks with:

```sh
npm run lint
npm run build
```

There is no automated browser/end-to-end test suite in this project. Use the manual journey checklist below when reviewing interactive flows.

## Data, privacy, and limitations

- **Historical coverage:** `src/data/historicalIncidents.ts` currently contains two City of Tshwane notices dated 18 July 2025 and 26 October 2026. The intended coverage window is 1 January 2025–31 December 2026; records are included only through the dataset snapshot date, 27 October 2026. This is a small, non-exhaustive dataset, not a national incident register.
- **Sources and evidence:** Each historical entry records its incident date/range when known, publication date, source title, publisher, direct URL, evidence classification, and limits/notes. `official_statement` means an official body directly documents the statement; `news_report` means a traceable news organisation reported it; `unverified_claim` is a reported claim not independently confirmed by the available sources. None of these labels means AquaTrace independently verified an incident. The current two entries are official statements.
- **Known coverage gaps:** Research leads for Ekurhuleni and eThekwini could not be substantiated from inspectable original source pages and are not represented as incidents. There are no included news reports, and the dataset is not exhaustive. See [docs/research-backlog.md](docs/research-backlog.md).
- **Adding a historical record:** Inspect the original source page, confirm the exact title, URL, publication date and supported event details, distinguish incident dates from publication dates, and record uncertainty in `notes`. Add one unique record to `historicalIncidents` with an allowed category and evidence classification. Do not duplicate one event for multiple sources; add conflicting source accounts to the notes and run `npm run lint` and `npm run build`.
- Historical incidents are read-only source records; new reports and review histories are separate browser-local community records. Historical status means only what a source reported at publication, not current status.
- Insights count each historical record once in each summary. Multi-area historical notices use one combined location group to avoid inflating location totals. Repeated-location indicators represent repeated community reports, not a shared infrastructure cause. Media coverage is incomplete, and reporting frequency does not necessarily equal actual outage frequency.
- The dataset does not establish live water availability, is not exhaustive, and should not be used as a live outage feed.
- There is no backend, account system, municipal connection, external API, or cross-device synchronization.
- User reports and status history are stored in this browser's localStorage. Clearing browser data removes them; storage restrictions can prevent saving.
- The review workflow is a local, unauthenticated prototype. It is not secure and does not contact a municipality or independently verify reports.
- “Confirmed” and “Resolved” can be selected in the prototype but do not constitute external confirmation or proof of service restoration.
- Fictional water points are demonstration data, not live evidence; their availability is not verified.
- Insights describe counts and repeated entered locations only. They cannot establish root causes, forecast outages, prove infrastructure failure, or evaluate municipal performance. Repeated entries may be duplicates.
- Area labels are user-entered text; spelling variations are counted separately. Time summaries include only valid user-submitted observation dates.
- No research findings, pilot results, partnerships, or impact outcomes are claimed by this repository.

See [docs/system-design.md](docs/system-design.md) for the system-thinking framing, assumptions, and proposed pilot measures.

### Manual journey checklist

1. Open Dashboard and verify historical records and fictional water points are clearly distinguished.
2. Submit a valid report and confirm it appears with **Unverified** status; try missing fields and a future observation time to check validation.
3. Search historical and community reports by area or keyword; verify category filters affect both datasets and status filters apply only to community reports.
4. In Review reports, confirm the user submission fields and origin are visible, add a note, and change its status.
5. Open a historical record, verify publication date, source attribution and evidence label, follow the original-source link in a new tab, and confirm the record has no edit/review controls.
6. Open a community report's details, inspect the status history, refresh, and confirm the status and history remain in the same browser.
7. In Insights, compare historical/community counts with the report list; verify each historical record is counted once, while repeat-location/time summaries use browser-local submissions only.
8. Repeat at mobile width and by keyboard, including opening/closing the menu and dismissing the report dialog with Escape.

## Technology

React, TypeScript, Vite, standard CSS, and ESLint.

## Challenge project

Developed for the Credify System Thinking Challenge 2026.
