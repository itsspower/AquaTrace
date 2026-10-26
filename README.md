# AquaTrace

**Track the problem. Find the next step.**

AquaTrace is a South African civic-tech concept for reporting water interruptions, finding alternative water points, and making incident information easier to follow. The current app is a front-end prototype; it is not a municipal service.

## Features in this prototype

- Responsive dashboard, outage report list, water-point directory, incident details, local review workflow, and data insights.
- Client-side outage report entry with required fields, validation, search, and combined status/category filters.
- Browser-local persistence for user-submitted reports and reviewer status history.
- Reviewer status options: Unverified, Under review, Confirmed, Resolved, and Rejected. Status changes are explicit and have a timestamp and optional note.
- Insight summaries by area, category, status, and observed month, with possible repeat locations identified only from browser-local reports.
- Sample reports and water points are fictional examples and labelled as such. User submissions are labelled separately and remain unverified unless explicitly changed in the local prototype.

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

- There is no backend, account system, municipal connection, external API, or cross-device synchronization.
- User reports and status history are stored in this browser's localStorage. Clearing browser data removes them; storage restrictions can prevent saving.
- The review workflow is a local, unauthenticated prototype. It is not secure and does not contact a municipality or independently verify reports.
- “Confirmed” and “Resolved” can be selected in the prototype but do not constitute external confirmation or proof of service restoration.
- Sample incidents and water points are fictional demonstration data, not live evidence. Their statuses and histories are illustrative and read-only.
- Insights describe counts and repeated entered locations only. They cannot establish root causes, forecast outages, prove infrastructure failure, or evaluate municipal performance. Repeated entries may be duplicates.
- Area labels are user-entered text; spelling variations are counted separately. Time summaries include only valid user-submitted observation dates.
- No research findings, pilot results, partnerships, or impact outcomes are claimed by this repository.

See [docs/system-design.md](docs/system-design.md) for the system-thinking framing, assumptions, and proposed pilot measures.

### Manual journey checklist

1. Open Dashboard and verify sample reports and water points are clearly marked fictional.
2. Submit a valid report and confirm it appears with **Unverified** status; try missing fields and a future observation time to check validation.
3. Search by area, description, and category; combine category and status filters, then reset.
4. In Review reports, confirm the user submission fields and origin are visible, add a note, and change its status.
5. Open incident details, inspect the status history, refresh, and confirm the status and history remain in the same browser.
6. In Insights, compare totals with report listings and check that repeat locations/time summaries use browser-local submissions only.
7. Repeat at mobile width and by keyboard, including opening/closing the menu and dismissing the report dialog with Escape.

## Technology

React, TypeScript, Vite, standard CSS, and ESLint.

## Challenge project

Developed for the Credify System Thinking Challenge 2026.
