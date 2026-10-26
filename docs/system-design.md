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
4. Dashboard and insight views count sample and user-submitted data, labelling their origins separately. Repeat-location and time summaries use only user-submitted browser-local reports.
5. The prototype has no outgoing reporting path: reports and reviewer changes are not sent to authorities or other users.

The included incidents and water points are fictional examples. Their illustrative statuses and histories are not evidence of real events.

## Proposed intervention and boundaries

The proposed intervention is a lightweight reporting and information interface: structured community observations, explicit uncertainty labels, visible local review history, and cautious summaries that may help people decide what to investigate next.

The system can organize entered information and expose patterns in that information. It cannot verify an outage, determine root cause, issue official service updates, predict failures, guarantee water-point availability, or replace municipal incident-management processes. Reviewer status changes are local annotations, not official determinations.

## Risks, assumptions, and limitations

- LocalStorage is tied to one browser profile and device; data can be cleared, unavailable, or edited by the browser user.
- The review interface has no authentication, authorization, audit server, or secure operator controls.
- User reports may be incomplete, inaccurate, duplicated, or malicious. Free-text area spelling variations can split one location into multiple groups.
- A report count is not a count of distinct outages. Repeated reports may describe one event or different observations.
- Sample content can be mistaken for evidence if labels are overlooked; sample data is excluded from user-only date and repeat-location interpretations.
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
