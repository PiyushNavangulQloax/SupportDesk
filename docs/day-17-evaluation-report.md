# SupportDesk Day 17 — AI Categorization Evaluation Report

- **Evaluation Date:** Wednesday, 25 November 2026
- **Evaluator Harness:** Production AI Pipeline (`AiService.categorizeTicket`)
- **Evaluation Mode:** `MOCK_PIPELINE_VERIFICATION`
- **Dataset Origin:** Synthetic (20 self-authored tickets; project lead dataset missing)
- **Official Lead Dataset Available:** ❌ **No**
- **Official Acceptance Status:** **Official acceptance evaluation: BLOCKED — awaiting project lead's labelled dataset.**
- **Target Accuracy:** &ge; 80% (Requires official lead dataset and live model evaluation)

---

> [!WARNING]
> **MOCK PIPELINE VERIFICATION RUN**
> This evaluation was executed using an offline mock provider for automated pipeline testing.
> It verifies that prompt construction, PII masking, content moderation, timeout handling, and Zod response validation function end-to-end.
> **These results do NOT represent real AI model accuracy and cannot be used for acceptance.**

---

## 1. Executive Summary

The evaluation suite was executed through the production `AiService.categorizeTicket()` pipeline.
Every evaluation item exercised:
- Strict input length boundaries (`MAX_TITLE_LENGTH = 255`, `MAX_DESCRIPTION_LENGTH = 4000`)
- Pre-invocation content moderation (`moderateContent`)
- High-precision PII masking for Indian identifiers (PAN, Aadhaar, Bank accounts, Mobile) and global identifiers (SSN, Cards, Emails, IPs)
- Untrusted context boundary isolation (`<untrusted_ticket_data>`) with delimiter breakout protection (`sanitizeDelimiters`)
- 10-second request timeout handling (`withTimeout`)
- Strict Zod output schema enforcement (`aiCategorizeResponseSchema`)

### Summary Metrics:
| Metric | Value |
| :--- | :--- |
| **Evaluation Mode** | `MOCK` |
| **Total Tickets Tested** | 20 |
| **Successful Pipeline Calls** | 20 / 20 |
| **Failed Pipeline Calls** | 0 / 20 |
| **Category Classification Accuracy** | **20%** (4/20) |
| **Priority Tier Accuracy** | **45%** (9/20) |
| **Combined (Category + Priority) Accuracy** | **20%** (4/20) |
| **Official Acceptance Status** | **BLOCKED (Awaiting project lead's labelled dataset)** |

---

## 2. Category Performance Breakdown

| Category | Total Tickets | Correct Predictions | Accuracy |
| :--- | :---: | :---: | :---: |
| **Technical** | 4 | 0 | **0%** |
| **Billing** | 4 | 0 | **0%** |
| **Account** | 4 | 0 | **0%** |
| **General** | 4 | 4 | **100%** |
| **Feature Request** | 4 | 0 | **0%** |

---

## 3. Detailed Results per Ticket

| Ticket ID | Title | Expected (Cat/Pri) | Predicted (Cat/Pri) | Match | Rationale / Reasoning |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `EVAL-001` | Production checkout API returning 500 inte... | **Technical** / P1 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-002` | Mobile app crashes on iOS 18 when scanning... | **Technical** / P2 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-003` | Webhook delivery experiencing 2-minute del... | **Technical** / P3 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-004` | Typo in API documentation code snippet for... | **Technical** / P4 | **General** / P4 | ⚠️ PRI ONLY | [Mock Provider] Standard mock verification output. |
| `EVAL-005` | Charged twice for annual enterprise plan r... | **Billing** / P2 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-006` | Need updated invoice with corporate VAT an... | **Billing** / P3 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-007` | Credit card renewal failed, subscription i... | **Billing** / P3 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-008` | Inquiring about volume discount pricing fo... | **Billing** / P4 | **General** / P4 | ⚠️ PRI ONLY | [Mock Provider] Standard mock verification output. |
| `EVAL-009` | Organization admin locked out of account a... | **Account** / P2 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-010` | Password reset link emails not arriving in... | **Account** / P3 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-011` | How to invite a new staff member and assig... | **Account** / P4 | **General** / P4 | ⚠️ PRI ONLY | [Mock Provider] Standard mock verification output. |
| `EVAL-012` | Request for GDPR data export and account c... | **Account** / P3 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-013` | Customer support holiday operating hours f... | **General** / P4 | **General** / P4 | ✅ MATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-014` | Clarification on ticket retention policy f... | **General** / P4 | **General** / P4 | ✅ MATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-015` | Where can we find the SOC2 compliance repo... | **General** / P4 | **General** / P4 | ✅ MATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-016` | Feedback on the new table navigation and s... | **General** / P4 | **General** / P4 | ✅ MATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-017` | Add CSV and Excel export functionality for... | **Feature Request** / P4 | **General** / P4 | ⚠️ PRI ONLY | [Mock Provider] Standard mock verification output. |
| `EVAL-018` | Dark mode theme support for the web agent ... | **Feature Request** / P4 | **General** / P4 | ⚠️ PRI ONLY | [Mock Provider] Standard mock verification output. |
| `EVAL-019` | Request for SAML 2.0 / Okta Single Sign-On... | **Feature Request** / P3 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |
| `EVAL-020` | Customizable automated webhook triggers on... | **Feature Request** / P3 | **General** / P4 | ❌ MISMATCH | [Mock Provider] Standard mock verification output. |

---

## 4. Provider Failures & Pipeline Errors

_None. All ticket categorization calls completed without unhandled provider errors._

---

## 5. Security & Authenticity Audit

1. **Production Pipeline Integrity:**
   - The evaluation harness executes `AiService.categorizeTicket()` directly.
   - Offline heuristic classifiers (`classifyOfflineBenchmark`) have been removed from accuracy reporting.
   - Any model or provider failure is recorded as an evaluation failure, preventing false-positive scoring.

2. **Credential & Secret Protection:**
   - Zero API keys, environment secrets, or credentials are leaked in evaluation reports or logs.

3. **Dataset Verification Status:**
   - The 20 tickets currently evaluated are synthetic test fixtures created during development.
   - Official Day 17 evaluation acceptance remains **BLOCKED** until the project lead supplies the authorized 20 labelled tickets.
