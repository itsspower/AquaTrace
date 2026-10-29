# AquaTrace system design

## Problem and context

AquaTrace explores how community observations about water interruptions and alternative water points could be collected and presented in one place. The context is South African communities where residents may need timely information during service interruptions. The application currently demonstrates interface and local-data workflows only; it does not provide live service information.

## Stakeholders and needs

- **Residents** may need to record an observed interruption, see what has been reported nearby, and find possible alternative water sources. They need clear warnings when information is unverified.
- **Community reviewers or local operators** may need to triage submissions, add context, and keep a visible status history. This prototype does not authenticate reviewers or establish their authority.
- **Municipal service teams** could need concise, consistent, corroborated reports to investigate service issues. No municipality is connected to this system or represented as a partner.
- **Community organisations and researchers** may need aggregate information to identify questions for further investigation, while avoiding claims based on incomplete or duplicate reports.

These are proposed stakeholder needs, not findings from interviews or user research.

## Symptoms, possible causes, and what remains unverified

Possible **symptoms** include resident-reported interruptions, low pressure, or concerns about water quality. Reports in this app are observations and are not proof that a service problem occurred.

Potential underlying causes could include infrastructure faults, planned maintenance, supply constraints, local distribution issues, or inaccurate or duplicate reporting. These are hypotheses only. AquaTrace has no operational, engineering, or municipal data to identify root causes.

To substantiate a cause or recurring service issue would require independently sourced service records, consistent location and time information, corroborating observations, and appropriate technical investigation. None is provided by this prototype.

## System relationships and information flow

1. A resident enters a location, category, severity, observation date/time, and description in the browser.
2. The app labels the report **Unverified** and stores it in that browser's localStorage when available.
3. A local reviewer can select a status and add an optional note. The browser records the previous and new status with a timestamp.
4. A separate static historical dataset contains sourced incidents. These records are read-only, show their source and evidence classification, and state what was reported at publication. Dashboard and insights distinguish historical records from community submissions; community review labels do not modify historical records.
5. Repeat-location and observed-month summaries use only user-submitted browser-local reports. Historical records are counted once in location and category summaries; a multi-area historical notice is assigned one combined location group rather than counted once per named area.
6. The prototype has no outgoing reporting path: reports and reviewer changes are not sent to authorities or other users.

## Historical dataset and evidence

The current dataset is `src/data/historicalIncidents.ts`. Its intended coverage window is 1 January 2025 through 31 December 2026, but it contains records only through its 27 October 2026 snapshot date. The two included entries are City of Tshwane official statements, published 18 July 2025 and 26 October 2026. The first reports water-supply interruptions during reservoir maintenance; the second announces dated supply restrictions and warns that low pressure or temporary interruptions may occur. Neither is presented as current service status.

An `official_statement` classification means the official source directly documents the statement, not that AquaTrace independently verified it. `news_report` identifies a traceable news organisation's reporting, and `unverified_claim` identifies a reported claim not independently confirmed by the available sources. Every record retains the direct source URL, title, publisher, publication date, and notes about missing or limited details. Do not infer precise incident dates, locations, causes, or restoration status beyond what the source says.

Coverage is sparse and non-exhaustive. Research leads for Ekurhuleni and eThekwini were not added because their original source material could not be inspected and substantiated. Media coverage is incomplete, so inclusion and report counts do not measure actual outage frequency. Research exclusions and pending leads are tracked in [research-backlog.md](research-backlog.md).

To add a record, inspect its original source, verify the exact title, URL and publication date, enter only supported incident details, use a unique stable ID and allowed evidence/category values, and explain uncertainty or conflicts in `notes`. Do not create separate incidents for multiple reports of the same event. The module validates IDs, date formats and bounds, URLs, source attribution, and allowed classifications when loaded.

Historical records and user-submitted community reports remain separate. Community reports are browser-local, unverified by default, and can receive local review labels and status history; those labels are not external verification. Historical status is status at publication, not live status. Neither dataset is exhaustive, and neither establishes live water availability.

The water-point directory remains fictional demonstration content and is labelled accordingly. It is not evidence that a water point exists or is available.

## Proposed intervention and boundaries

The proposed intervention is a lightweight reporting and information interface: structured community observations, explicit uncertainty labels, visible local review history, and cautious summaries that may help people decide what to investigate next.

The system can organize entered information and expose patterns in that information. It cannot verify an outage, determine root cause, issue official service updates, predict failures, guarantee water-point availability, or replace municipal incident-management processes. Reviewer status changes are local annotations, not official determinations.

## Risks, assumptions, and limitations

- LocalStorage is tied to one browser profile and device; data can be cleared, unavailable, or edited by the browser user.
- The review interface has no authentication, authorization, audit server, or secure operator controls.
- User reports may be incomplete, inaccurate, duplicated, or malicious. Free-text area spelling variations can split one location into multiple groups.
- A report count is not a count of distinct outages. Repeated reports may describe one event or different observations.
- Historical coverage and media reporting are incomplete; more frequently reported or covered locations are not necessarily experiencing more outages.
- The remaining water-point directory is fictional demonstration content, not verified evidence.
- “Confirmed” and “Resolved” are selectable workflow states, not independently validated facts in this local prototype.
- No connectivity to municipal services, verified water-point availability, interviews, research, pilot data, partnerships, or impact results are claimed.

## Proposed pilot measures

The following are proposed measures for a future, consent-based pilot, not results:

- **Report completeness:** proportion of submissions with usable location, category, description, and observation time.
- **Duplicate review workload:** share of submissions reviewers identify as possible duplicates after manual comparison.
- **Review usability:** time and error rate for a trained reviewer to find a report and record a status change with an explanatory note.
- **Information clarity:** participant ability to distinguish fictional, user-submitted, reviewed, and externally verified information in usability tasks.
- **Data persistence reliability:** proportion of test submissions and status histories that remain available after a browser restart on the same device.
- **Responsible use:** number and type of misunderstandings about verification, municipality contact, and water-point availability observed during testing.

Measures should be defined with community participants before a pilot. A pilot would need appropriate consent, privacy safeguards, and a verified operational partner before handling real service workflows.
