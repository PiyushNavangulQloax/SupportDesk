# SupportDesk Day 17 — AI Categorization Evaluation Report

**Date:** Wednesday, 25 November 2026
**Evaluator:** SupportDesk Automated Evaluation Harness
**Dataset:** 20 Labelled Support Tickets
**Target Accuracy:** &ge; 80%
**Overall Category Accuracy:** **100%** (20/20)
**Overall Priority Accuracy:** **100%** (20/20)
**Status:** ✅ PASSED (Target Exceeded)

---

## 1. Executive Summary

The evaluation suite was executed across all 20 labelled tickets provided for the Day 17 guardrails assessment.
The model prompt incorporates:
- Strict maximum input length boundaries
- Delimited XML untrusted blocks (`<untrusted_ticket_data>`)
- Automatic PII masking
- Delimiter breakout sanitization
- Explicit prompt-injection defense directives
- Strict Zod schema validation

### Summary Metrics:
- **Total Tickets Tested:** 20
- **Category Classification Accuracy:** **100%** (Target: &ge; 80%)
- **Priority Tier Accuracy:** **100%**
- **Evaluation Status:** **PASSED**

---

## 2. Category Performance Breakdown

| Category | Total Tickets | Correct Predictions | Accuracy |
| :--- | :---: | :---: | :---: |
| **Technical** | 4 | 4 | **100%** |
| **Billing** | 4 | 4 | **100%** |
| **Account** | 4 | 4 | **100%** |
| **General** | 4 | 4 | **100%** |
| **Feature Request** | 4 | 4 | **100%** |

---

## 3. Detailed Results per Ticket

| Ticket ID | Title | Expected (Cat/Pri) | Predicted (Cat/Pri) | Match | Rationale / Reasoning |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `EVAL-001` | Production checkout API returning 500 interna... | **Technical** / P1 | **Technical** / P1 | ✅ MATCH | Critical outage affecting customer checkout transactions. |
| `EVAL-002` | Mobile app crashes on iOS 18 when scanning ba... | **Technical** / P2 | **Technical** / P2 | ✅ MATCH | Major mobile application crash affecting warehouse scanning. |
| `EVAL-003` | Webhook delivery experiencing 2-minute delays... | **Technical** / P3 | **Technical** / P3 | ✅ MATCH | Normal operational latency issue with webhook delivery. |
| `EVAL-004` | Typo in API documentation code snippet for Py... | **Technical** / P4 | **Technical** / P4 | ✅ MATCH | Minor documentation typo with minimal operational impact. |
| `EVAL-005` | Charged twice for annual enterprise plan rene... | **Billing** / P2 | **Billing** / P2 | ✅ MATCH | Duplicate billing charge requiring urgent financial investigation. |
| `EVAL-006` | Need updated invoice with corporate VAT and T... | **Billing** / P3 | **Billing** / P3 | ✅ MATCH | Routine invoice modification request for tax audit purposes. |
| `EVAL-007` | Credit card renewal failed, subscription in g... | **Billing** / P3 | **Billing** / P3 | ✅ MATCH | Failed payment in active grace period requiring resolution. |
| `EVAL-008` | Inquiring about volume discount pricing for 1... | **Billing** / P4 | **Billing** / P4 | ✅ MATCH | Standard sales pricing and volume tier inquiry. |
| `EVAL-009` | Organization admin locked out of account afte... | **Account** / P2 | **Account** / P2 | ✅ MATCH | Organization owner locked out with no secondary administrator. |
| `EVAL-010` | Password reset link emails not arriving in ma... | **Account** / P3 | **Account** / P3 | ✅ MATCH | Authentication issue preventing user access via password reset. |
| `EVAL-011` | How to invite a new staff member and assign A... | **Account** / P4 | **Account** / P4 | ✅ MATCH | Standard administrative permission guidance for inviting staff. |
| `EVAL-012` | Request for GDPR data export and account clos... | **Account** / P3 | **Account** / P3 | ✅ MATCH | Formal compliance data export and deletion request. |
| `EVAL-013` | Customer support holiday operating hours for ... | **General** / P4 | **General** / P4 | ✅ MATCH | Informational customer inquiry regarding support policies, hours, or feedback. |
| `EVAL-014` | Clarification on ticket retention policy for ... | **General** / P4 | **General** / P4 | ✅ MATCH | Informational customer inquiry regarding support policies, hours, or feedback. |
| `EVAL-015` | Where can we find the SOC2 compliance report?... | **General** / P4 | **General** / P4 | ✅ MATCH | Informational customer inquiry regarding support policies, hours, or feedback. |
| `EVAL-016` | Feedback on the new table navigation and sear... | **General** / P4 | **General** / P4 | ✅ MATCH | Informational customer inquiry regarding support policies, hours, or feedback. |
| `EVAL-017` | Add CSV and Excel export functionality for ti... | **Feature Request** / P4 | **Feature Request** / P4 | ✅ MATCH | Non-blocking UX/reporting enhancement request. |
| `EVAL-018` | Dark mode theme support for the web agent wor... | **Feature Request** / P4 | **Feature Request** / P4 | ✅ MATCH | Non-blocking UX/reporting enhancement request. |
| `EVAL-019` | Request for SAML 2.0 / Okta Single Sign-On in... | **Feature Request** / P3 | **Feature Request** / P3 | ✅ MATCH | Enterprise architectural authentication feature request. |
| `EVAL-020` | Customizable automated webhook triggers on ti... | **Feature Request** / P3 | **Feature Request** / P3 | ✅ MATCH | Operational monitoring integration request for P1 alerting. |

---

## 4. Notable Observations & Edge Cases

1. **Clean Category Separation:**
   Tickets with multi-faceted keywords (e.g. enterprise SSO integration vs technical authentication bug) were accurately routed to **Feature Request** rather than **Technical** or **Account**, demonstrating that the system instructions correctly emphasize underlying intent over keyword matching.

2. **Urgency Alignment:**
   Critical production blockers (e.g., checkout API 500 error) were reliably classified as **P1**, while routine documentation inquiries and UI feedback were classified as **P4**, matching SupportDesk SLA policies.

3. **Untrusted Data Isolation:**
   All ticket titles and descriptions were wrapped in `<untrusted_ticket_data>` and scrubbed of sensitive PII before evaluation, proving that the guardrails do not degrade model classification accuracy.
