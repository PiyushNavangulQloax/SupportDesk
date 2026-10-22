# SupportDesk — Product Requirements Document (PRD)

> **Version:** 0.1  
> **Status:** Draft — proposed, not reviewed or approved  
> **Prepared:** 22 October 2026  
> **Audience:** Product, engineering, design, QA, and business stakeholders

> [!IMPORTANT]
> This is an initial draft based on a typical customer-support ticketing product. It is **not a verified company PRD**. Confirm the requirements, scope, priorities, and workflows with the SupportDesk product owner or team lead before treating this as authoritative or implementing from it.

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision and Goals](#3-product-vision-and-goals)
4. [Scope and Non-Goals](#4-scope-and-non-goals)
5. [Users and Roles](#5-users-and-roles)
6. [Terminology](#6-terminology)
7. [Proposed Ticket Lifecycle](#7-proposed-ticket-lifecycle)
8. [Functional Requirements](#8-functional-requirements)
9. [User Stories and Acceptance Criteria](#9-user-stories-and-acceptance-criteria)
10. [Business Rules to Confirm](#10-business-rules-to-confirm)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [UX and Design Expectations](#12-ux-and-design-expectations)
13. [Analytics and Success Metrics](#13-analytics-and-success-metrics)
14. [Assumptions and Dependencies](#14-assumptions-and-dependencies)
15. [Risks and Mitigations](#15-risks-and-mitigations)
16. [MoSCoW Prioritisation](#16-moscow-prioritisation)
17. [QA and UAT Approach](#17-qa-and-uat-approach)
18. [Example UAT Scenarios](#18-example-uat-scenarios)
19. [Release Readiness Checklist](#19-release-readiness-checklist)
20. [Open Questions](#20-open-questions)
21. [Approval and Change History](#21-approval-and-change-history)

---

## 1. Executive Summary

SupportDesk is proposed as a web-based customer-support ticketing system that helps an organisation receive support requests, organise and assign work, communicate with customers, track ticket status, and understand support performance.

The product should provide a consistent workflow from ticket creation through resolution, with appropriate access control, validation, traceability, and operational visibility. The initial release should focus on the smallest reliable end-to-end support workflow. Additional automation and analytics can be delivered after the core needs are validated.

This PRD is a working draft. Product ownership, target customers, deployment model, integrations, detailed business rules, service-level targets, and release scope must be confirmed with the project lead.

## 2. Problem Statement

Support teams need a dependable way to capture requests, ensure each request has a clear owner, communicate progress, and determine which issues require attention.

When requests are spread across informal channels or tracked inconsistently, teams can lose context, duplicate work, miss follow-ups, and struggle to report performance. SupportDesk aims to centralise the support workflow and make ticket ownership, status, and communication easier to manage.

## 3. Product Vision and Goals

### Vision

Make customer-support work visible, organised, traceable, and easier to resolve.

### Goals

- Provide a central place to create and manage support tickets.
- Make ownership, status, and conversation history clear to authorised users.
- Help agents find and prioritise the requests they need to handle.
- Protect customer and ticket information through role-appropriate access.
- Provide a foundation for operational reporting and future workflow improvements.

## 4. Scope and Non-Goals

### Proposed initial scope

- Ticket creation and validation.
- Ticket lists and ticket details.
- Assignment and status management.
- Replies or conversation history.
- Basic search and filtering.
- Access control and appropriate error handling.
- Basic activity history, if confirmed for the MVP.

### Proposed non-goals for the initial release

- A full CRM, sales pipeline, billing, or inventory management system.
- AI-generated replies, autonomous ticket resolution, or sentiment analysis.
- A native mobile application; this draft assumes a responsive web application.
- Public knowledge base, live chat, voice support, or social-media ingestion unless stakeholders add them to scope.
- Specific third-party integrations or guaranteed service-level commitments before requirements are confirmed.

## 5. Users and Roles

| Role | Primary needs | Illustrative permissions |
|---|---|---|
| Customer / requester | Submit a request, view own tickets, reply where enabled, track status. | Create tickets; access only tickets associated with their identity; reply where permitted. |
| Support agent | Work a queue, inspect context, communicate, update status, resolve issues. | View tickets allowed by policy; reply; update permitted fields; resolve or reopen where allowed. |
| Support lead / supervisor | Balance workload, assign ownership, review progress, identify blocked tickets. | View team queue; assign/reassign; manage priority where authorised; access operational views. |
| Administrator | Configure users, roles, and system-level settings. | Manage access and approved configuration; access administrative functions. |
| Product / operations stakeholder | Validate workflows and understand performance. | Review agreed metrics and UAT scenarios; no additional production access by default. |

Role names and exact permissions are proposed and must be confirmed. Least privilege should be the default.

## 6. Terminology

| Term | Definition |
|---|---|
| Ticket | A record of a support request, including its subject, description, requester, status, and relevant history. |
| Requester | The person who raised the support request. |
| Assignee | The agent currently responsible for progressing a ticket. |
| Status | The ticket's position in its lifecycle. |
| Priority | A label used to communicate urgency or importance. |
| Conversation | Replies or messages associated with a ticket. |
| Acceptance criteria | Observable conditions used to determine whether a requirement has been implemented correctly. |
| SLA | A service-level agreement or target; values and enforcement rules are not defined in this draft. |

## 7. Proposed Ticket Lifecycle

Proposed baseline:

`New → Open / In Progress → Pending → Resolved → Closed`

Reopening may be permitted from `Resolved` or `Closed` only if business rules allow it.

| State | Illustrative meaning | Questions to confirm |
|---|---|---|
| New | Ticket has been submitted and awaits triage. | Can customers create tickets without signing in? |
| Open / In Progress | Ticket is being reviewed or actively worked. | Are Open and In Progress separate statuses? |
| Pending | Work is waiting for a customer, vendor, or another dependency. | Are pending reasons required? |
| Resolved | A solution or response has been provided. | Can a customer reopen it, and for how long? |
| Closed | Ticket is considered complete. | Is closure automatic or manual? |

The precise statuses, allowed transitions, who can perform each transition, and whether `Pending` requires a reason must be confirmed.

## 8. Functional Requirements

| ID | Requirement | Open point |
|---|---|---|
| FR-01 | The system shall allow an eligible requester to submit a ticket with configured required fields. | Required fields, authentication model, and channels need confirmation. |
| FR-02 | The system shall validate required fields and field formats and present actionable validation feedback. | Exact field constraints to be defined. |
| FR-03 | The system shall provide a unique identifier for each successfully created ticket. | Identifier format and exposure to users to be confirmed. |
| FR-04 | The system shall show users a list of tickets they are authorised to access. | Customer and staff views may differ. |
| FR-05 | The system shall display ticket details, current status, and available conversation/history to authorised users. | Fields visible by role need confirmation. |
| FR-06 | Authorised staff shall be able to assign or reassign tickets to eligible agents. | Rules for inactive agents and reassignment audit to be defined. |
| FR-07 | Authorised staff shall be able to change ticket status using permitted transitions. | Transition matrix needs approval. |
| FR-08 | The system should support a defined or configurable priority label for tickets. | Priority levels and rules need confirmation. |
| FR-09 | Authorised participants shall be able to add replies to a ticket conversation. | Public replies versus internal notes must be clarified. |
| FR-10 | Authorised staff should be able to search and filter accessible tickets by supported fields. | Search fields and filter list to be defined. |
| FR-11 | The system should record significant ticket events and show history to authorised users. | Retention, visible events, and actor details to be defined. |
| FR-12 | The system may notify relevant users of agreed events, such as assignment or replies. | Channels, preferences, and event list need confirmation. |
| FR-13 | Administrators shall be able to manage users and role-based access if in scope. | Identity provider and invitation flow to be confirmed. |
| FR-14 | The system may provide views of ticket volume, status, ageing, and workload. | Metric definitions and access permissions to be agreed. |
| FR-15 | The system shall present clear error states and avoid losing valid user input where practical. | Error copy and retry behaviour to be designed. |
| FR-16 | The system should record security-relevant or operationally important changes. | Audit fields and retention period need approval. |

## 9. User Stories and Acceptance Criteria

> These are draft examples based on the proposed requirements above. They are not approved backlog items and must be checked against the official PRD and team decisions.

### US-01 — Create a ticket

**Story:** As a requester, I want to submit a support ticket so that I can ask for help.

**Acceptance criteria:**

- Given I am eligible to submit a ticket and all required fields are valid, when I submit the form, then a ticket is created and a confirmation with its identifier is shown.
- Given a required field is missing or invalid, when I submit the form, then field-level validation is shown and no ticket is created.

### US-02 — View my tickets

**Story:** As a requester, I want to see my tickets so that I can track my requests.

**Acceptance criteria:**

- Given I am authenticated, when I open my ticket list, then I see only tickets I am authorised to access.
- Given another requester's ticket is not accessible to me, when I view or query my list, then its private details are not disclosed.

### US-03 — View ticket details

**Story:** As an authorised user, I want to open a ticket so that I can understand its status and context.

**Acceptance criteria:**

- Given I am authorised to view a ticket, when I open it, then its permitted details and current status are displayed.
- Given I am not authorised, when I request the ticket, then access is denied without exposing private details.

### US-04 — Assign a ticket

**Story:** As a support lead, I want to assign a ticket to an agent so that ownership is clear.

**Acceptance criteria:**

- Given I have assignment permission and the selected agent is eligible, when I save the assignment, then the assignee is updated.
- Given I lack assignment permission, when I attempt to assign a ticket, then the system rejects the change.

### US-05 — Update ticket status

**Story:** As a support agent, I want to update ticket status so that progress is visible.

**Acceptance criteria:**

- Given I am authorised and the transition is allowed, when I save the new status, then the ticket shows that status.
- Given the transition is not allowed, when I attempt it, then the system rejects it and retains the prior status.

### US-06 — Reply to a ticket

**Story:** As an authorised participant, I want to reply to a ticket so that I can communicate about the issue.

**Acceptance criteria:**

- Given I can reply and the message contains valid text, when I submit it, then it appears in the conversation.
- Given the message is empty or whitespace only, when I submit it, then the system asks for a message and does not save an empty reply.

### US-07 — Search and filter tickets

**Story:** As a support agent, I want to search and filter tickets so that I can find relevant work.

**Acceptance criteria:**

- Given I can access the ticket list, when I search using a supported term, then results include only accessible matching tickets.
- Given I apply a supported status filter, when results load, then each result matches the selected status.

### US-08 — Review activity history

**Story:** As an authorised agent, I want to view ticket activity so that I can understand important changes.

**Acceptance criteria:**

- Given I can access the ticket, when I open its activity history, then available recorded events are shown in the agreed order.
- Given I cannot access the ticket, when I try to view its history, then access is denied.

## 10. Business Rules to Confirm

- Can tickets be submitted by guests, or must every requester authenticate?
- Which fields are mandatory (for example, subject, description, category, or contact details)?
- Who may see, edit, assign, reply to, resolve, close, or reopen tickets?
- Are internal notes supported, and how are they separated from customer-visible replies?
- Which status transitions are valid? Can a ticket be reopened after closure?
- How are priorities set, and can priority be changed after creation?
- What happens if an assigned agent becomes inactive or leaves the team?
- Are attachments allowed? If yes, what are the size/type restrictions and malware checks?
- Are notifications in scope? Which events, channels, and user preferences are required?
- Are SLAs required? If so, what are the business hours, targets, pause rules, and escalation rules?
- What retention, deletion, export, and privacy requirements apply?
- Which languages, time zones, and accessibility standard are required?

## 11. Non-Functional Requirements

The values below are proposed discussion areas, not commitments. Stakeholders and engineering must set measurable thresholds.

| Area | Proposed requirement / question |
|---|---|
| Security | Authenticate users where required; enforce server-side authorisation on every protected operation; follow least privilege; protect secrets and sensitive data. |
| Privacy | Collect only necessary personal data; define purpose, access, retention, and deletion rules; avoid exposing ticket data in logs. |
| Performance | Set target response times for common list, detail, and create actions under an agreed representative load. |
| Availability | Define uptime target, maintenance expectations, backup cadence, and recovery objectives. |
| Reliability | Handle transient failures safely; avoid duplicate ticket creation on retries where practical. |
| Accessibility | Target WCAG 2.2 AA or another stakeholder-approved standard; test keyboard navigation, focus, and screen-reader semantics. |
| Usability | Provide clear loading, empty, success, validation, and failure states; use consistent terminology. |
| Compatibility | Define supported browsers, viewport sizes, and minimum device requirements. |
| Observability | Capture structured application errors and operational metrics without leaking secrets or sensitive ticket contents. |
| Maintainability | Use documented APIs, automated tests, code review, version control, and repeatable deployment processes. |
| Data integrity | Use unique identifiers and enforce valid relationships and permitted state transitions. |
| Scalability | Estimate expected users, tickets per day, attachment volume, and growth before setting capacity targets. |

## 12. UX and Design Expectations

- Responsive layouts for common desktop, tablet, and mobile viewport sizes.
- Clear navigation for ticket list, ticket details, creation, and profile/settings where applicable.
- Ticket lists should show readable status/priority indicators and obvious ownership.
- Forms should label fields, explain validation errors, and preserve entered values after recoverable errors.
- Use confirmation or undo patterns for destructive or high-impact actions where appropriate.
- Colour must not be the only way status or priority is communicated.
- Provide loading, empty, error, permission-denied, and no-results states.

## 13. Analytics and Success Metrics

Metrics are proposed; baselines and targets must be defined with stakeholders.

| Metric | Definition to agree | Why it matters |
|---|---|---|
| Ticket volume | Number of tickets created in a defined period. | Measures demand. |
| First response time | Time from ticket creation to first qualifying staff response. | Measures responsiveness. |
| Resolution time | Time from creation to the agreed resolution event, with pause rules defined. | Measures speed to resolution. |
| Backlog and ageing | Open tickets grouped by age or status. | Highlights stalled work. |
| Reopen rate | Share of resolved/closed tickets reopened under the agreed rule. | Signals resolution quality. |
| Assignment delay | Time from creation to first assignment, if applicable. | Shows triage efficiency. |
| Customer satisfaction | Survey method, response window, and scoring rules to be agreed. | Provides customer feedback. |

## 14. Assumptions and Dependencies

### Assumptions in this draft

- SupportDesk is a web-based ticketing product for customer-support workflows.
- There are distinct requester and staff workflows.
- Tickets have a status and can have an assignee.
- Access control and protection of ticket data are required.
- The initial scope should prioritise a usable end-to-end ticket lifecycle.

### Dependencies

- Product owner/manager approval of goals, scope, and release boundaries.
- UX decisions for requester and staff journeys.
- Identity/authentication approach and role/permission model.
- Technical architecture, hosting, environments, and data model decisions.
- Notification provider or email service if notifications are in scope.
- QA test environment and representative test data.

## 15. Risks and Mitigations

| Risk | Potential impact | Mitigation |
|---|---|---|
| Unconfirmed requirements | Rework and mismatched implementation. | Review PRD with stakeholders; mark assumptions; obtain approval before commitment. |
| Ambiguous permissions | Data exposure or blocked workflows. | Create a role/permission matrix and test both allowed and denied access. |
| Unclear lifecycle rules | Tickets become stuck or change inconsistently. | Approve a status transition matrix and cover transitions with tests. |
| Unclear public vs internal messages | Private staff notes could be disclosed. | Define message visibility explicitly and enforce it server-side. |
| Unmeasured non-functional needs | Poor performance or reliability at real workloads. | Agree measurable targets and validate with tests/monitoring. |
| Scope expansion | Initial release delayed. | Use an agreed MVP boundary and explicit change control. |

## 16. MoSCoW Prioritisation

| Priority | Meaning | Illustrative candidates |
|---|---|---|
| **Must have** | Required for the agreed minimum usable release. | Create tickets, access control, view ticket details, basic assignment/status, reliable validation. |
| **Should have** | Important but may be deferred if a viable core release remains. | Search/filter, useful activity history, notifications if stakeholders need them. |
| **Could have** | Useful enhancement if time/capacity permits. | Advanced dashboards, configurable workflows, richer analytics. |
| **Won't have this time** | Explicitly excluded from this release. | AI automation, omnichannel integrations, or native mobile app unless separately approved. |

All priorities are provisional. The product owner and team must prioritise based on approved requirements, risk, dependencies, and release goals.

## 17. QA and UAT Approach

- **Unit tests:** Validate individual functions and business rules.
- **Integration tests:** Verify API, database, authentication, and external-service interactions.
- **End-to-end tests:** Verify key requester and agent journeys.
- **Authorisation tests:** Verify users cannot read or modify tickets outside their permissions.
- **Validation/error tests:** Test missing fields, invalid input, empty states, failed requests, and retries.
- **Regression tests:** Ensure changes do not break previously working workflows.
- **UAT:** Product/business stakeholders execute agreed scenarios and record pass/fail, defects, and sign-off.
- **Release readiness:** Confirm acceptance criteria, severity of open defects, migration/rollback plan, monitoring, and support ownership.

## 18. Example UAT Scenarios

| Scenario | Expected result |
|---|---|
| Submit a valid ticket | Ticket is created once; identifier and confirmation are displayed. |
| Submit incomplete form | Required-field errors appear; no ticket is created. |
| Requester opens own ticket | Permitted ticket details and history are visible. |
| Requester attempts to access another user's ticket | Access is denied and private details are not exposed. |
| Lead assigns a ticket | Assignee updates and the change is reflected in the UI. |
| Agent performs valid status transition | Status updates and is visible in the ticket. |
| Agent attempts invalid transition | Change is rejected and existing status remains. |
| User posts valid reply | Reply appears for the intended audience. |
| User posts empty reply | Submission is blocked with helpful validation. |
| Agent searches/filters tickets | Only accessible tickets matching the query/filter are returned. |

## 19. Release Readiness Checklist

- [ ] Approved scope and requirements are linked to stories.
- [ ] Acceptance criteria are reviewed and testable.
- [ ] Critical user journeys and permissions have automated/manual test coverage.
- [ ] No unresolved release-blocking defects remain under the team's severity policy.
- [ ] Configuration and secrets are managed safely.
- [ ] Database changes and migration/rollback steps are reviewed.
- [ ] Monitoring, error reporting, and support ownership are in place.
- [ ] UAT outcome and release approval are recorded where required.
- [ ] Release notes and known limitations are documented.

## 20. Open Questions

1. Who is the primary customer and who is the product owner?
2. Is this internal-only, customer-facing, or both?
3. What is the exact MVP scope and target release date?
4. What authentication and account provisioning model will be used?
5. What ticket fields, categories, statuses, and priorities are required?
6. Are attachments, email intake, email notifications, live chat, or integrations required?
7. Are SLAs, escalation rules, and business-hour calendars required?
8. What data protection, retention, and compliance obligations apply?
9. What deployment environments, hosting constraints, and service-level targets apply?
10. Which team board, definition of ready, definition of done, and approval process should be followed?

## 21. Approval and Change History

### Stakeholder approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Product owner / manager | TBD | Pending review | TBD |
| Engineering lead | TBD | Pending review | TBD |
| QA representative | TBD | Pending review | TBD |
| Business / operations representative | TBD | Pending review | TBD |

### Change history

| Version | Date | Change | Status |
|---|---|---|---|
| 0.1 | 22 October 2026 | Initial proposed PRD draft created. | Proposed — not approved |

---

## How to Use This Document

Share this as a discussion draft, not as the company's official PRD. Replace assumptions with confirmed requirements, remove out-of-scope features, agree measurable non-functional targets, review the stories with the product owner, and record approval and version changes. Do not implement from this draft until the responsible lead confirms that it reflects the intended SupportDesk product.
