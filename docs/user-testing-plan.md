# AquaTrace user-testing plan

**Status: planned, not conducted.** There are no participant observations, usability results, or validated user-value claims in this repository. Do not present proposed tasks or thresholds as research findings.

## Purpose

Test whether people can understand and use the proposed reporting and information workflows, distinguish evidence states, and identify the system's limits. This is formative usability research, not a representative survey or proof of impact.

## Participants and safeguards

Recruit a small, varied group of approximately 5–8 adults who may use community water-service information, plus 2–3 people who can perform a reviewer task. These are planning targets, not recruited participants. Include different levels of smartphone familiarity and accessibility needs where possible. Do not recruit anyone into a real emergency workflow.

Before each session, explain that AquaTrace is a prototype, participation is voluntary, and the exercise does not contact a municipality or verify water status. Obtain consent to take notes. Do not collect names, exact home addresses, contact details, account passwords, health information, or real outage reports. Use fictional task data and demo accounts. Allow participants to stop or skip any task. Store only de-identified notes and delete them on a stated schedule.

## Session protocol

Use the same brief introduction, tasks and neutral prompts for each participant. Ask participants to think aloud; do not teach controls before the first attempt. Record task completion, time, errors, assistance, interpretation, and direct anonymized quotes only with consent. Ask what they expected before explaining intended behavior.

### Resident tasks

1. Sign in with the resident demo account and explain what the demonstration-mode notice means.
2. Find an outage report for a named fictional community and describe its current status and what that status does—and does not—prove.
3. Submit a fictional report with a location, observed time, category, severity and description. Locate it afterward.
4. Open a historical incident, find its original source, and explain whether it represents live status.
5. Find the water-point directory and explain the meaning of its source, verification and availability labels.
6. Try to find reviewer status controls; note whether their absence is clear.
7. Sign out, refresh the page, and attempt to return to the dashboard without signing in.

### Reviewer tasks (connected Supabase configuration required)

1. Open a submitted community report and distinguish the reporter's observation from verified evidence.
2. Record an appropriate review status and explanation; inspect the resulting status history.
3. Add a sourced water point as unverified, then record a verification/availability update with an explanation.

### Administrator task (connected Supabase configuration required)

1. Find an account, change its role with a reason, and locate the audit entry. Confirm that the current administrator cannot change their own role and the final administrator cannot be demoted.

## Measures and analysis

For each task, record completion (independent / with assistance / not completed), time, error or recovery, assistance, and participant interpretation. Ask a 1–5 ease rating after each major workflow and a brief open-ended question: “What would you do next, and what information would you still need?”

Analyze task failures and misunderstandings by severity and frequency, not just average ratings. Separate direct observations from participant suggestions and researcher interpretation. Compare patterns across roles and accessibility needs; do not infer population-level preferences from a small convenience sample.

## Proposed success criteria (not results)

- At least 4 of 5 resident participants can submit and find a report without assistance.
- All participants correctly identify community reports and historical entries as different information types.
- No participant interprets a reviewer label as municipal confirmation or water-point availability as guaranteed.
- At least 4 of 5 participants can explain what to do next using the report detail and source information.
- Reviewers can save an explained status update and find its history without losing the original report.

If a participant interprets “Confirmed” or “Verified” as a municipal guarantee, treat that as a high-priority safety/usability issue even if numeric thresholds are met.

## Evidence boundary

No sessions have been run. Participant count is currently zero. Complete `user-testing-results-template.md` only from actual consented sessions; retain failed tasks and negative feedback, and report any protocol deviations.
