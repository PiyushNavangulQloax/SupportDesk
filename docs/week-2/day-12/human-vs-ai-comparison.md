# Human vs. AI Code Review Comparative Analysis
**SupportDesk — Week 2 Day 6 (Day 12)**  
**Author:** Piyush Navangul  
**Partner PR / Branch:** `[Pending Partner PR URL / Branch]`  
**Status:** BLOCKED PENDING PARTNER ASSIGNMENT

---

## 1. Objectives & Comparative Framework

The goal of this comparative analysis is to critically evaluate the strengths and weaknesses of human code review versus automated AI code review (ChatGPT / LLM) across a real-world backend codebase.

When the partner PR is reviewed, findings will be cross-referenced to measure:
1. **Overlap (Consensus):** Issues identified by both human reviewer and AI.
2. **Human-Only Catches:** Subtle domain business logic flaws, multi-file context nuances, or project convention mismatches that AI missed.
3. **AI-Only Catches:** Syntactic edge cases, obscure library quirks, regex flaws, or minor linting issues that the human overlooked.
4. **AI False Positives & Hallucinations:** Recommendations made by the AI that are factually incorrect, reference non-existent APIs, or violate intentional project design patterns (e.g. insisting on 403 when 404 is intentionally used for anti-enumeration).

---

## 2. Comparative Findings Matrix

| Finding Topic | File & Line Reference | Identified by Human? | Identified by AI? | Finding Validity (Valid / False Positive) | Evaluation / Why One Missed It |
|:---|:---|:---:|:---:|:---:|:---|
| *Sample: Anti-enumeration 404* | `src/services/tickets.service.ts` | Yes | Yes (often flagged as "wrong code 404") | Human Valid / AI False Positive | AI frequently flags 404 as incorrect without understanding OWASP anti-enumeration requirements. |
| *Sample: Test DB Truncate Safety* | `tests/helpers/testDb.ts` | Yes | No | Human Valid / AI Blind Spot | AI lacks holistic view of local development database risks and environment variables. |
| *[Pending Partner Finding 1]* | `[Pending]` | — | — | — | *Awaiting Partner PR Assignment* |
| *[Pending Partner Finding 2]* | `[Pending]` | — | — | — | *Awaiting Partner PR Assignment* |
| *[Pending Partner Finding 3]* | `[Pending]` | — | — | — | *Awaiting Partner PR Assignment* |
| *[Pending Partner Finding 4]* | `[Pending]` | — | — | — | *Awaiting Partner PR Assignment* |
| *[Pending Partner Finding 5]* | `[Pending]` | — | — | — | *Awaiting Partner PR Assignment* |

---

## 3. Quantitative Evaluation Metrics

| Metric | Formula | Human Review | AI Review (ChatGPT) | Comparative Analysis |
|:---|:---|:---:|:---:|:---|
| **Total Issues Flagged** | Count of all reported items | `[Pending]` | `[Pending]` | — |
| **Valid Defect Findings** | True positives verified by lead | `[Pending]` | `[Pending]` | — |
| **False Positives / Hallucinations** | Incorrect or non-existent claims | `0` | `[Pending]` | AI historically flags idiomatic patterns as bugs. |
| **Precision** | $\frac{\text{Valid Findings}}{\text{Total Flagged}}$ | `[Pending]` | `[Pending]` | — |
| **Recall / Coverage** | Percentage of actual defects found | `[Pending]` | `[Pending]` | — |
| **Actionability** | Percentage of suggestions with ready code fixes | `[Pending]` | `[Pending]` | — |

---

## 4. Qualitative Analysis Categories

### 4.1. AI Hallucinations & False Positives
*(To be recorded following partner review)*
- Common AI false positive patterns:
  - Claiming methods do not exist when they are provided by newer major versions (e.g. Express 5 or Prisma 7).
  - Recommending HTTP `403 Forbidden` for IDOR checks, ignoring the security design principle of anti-enumeration.
  - Suggesting unnecessary defensive checks that are already guaranteed by upstream Zod schemas.

### 4.2. AI Blind Spots (What AI Consistently Misses)
*(To be recorded following partner review)*
- Context across multiple files (e.g., verifying that a repository query actually matches the database schema index).
- Local runtime execution risks, such as Docker port conflicts or environment variable loading order.
- Test runner safety guards and accidental production database truncate prevention.

### 4.3. AI High-Value Insights (Where AI Excels)
*(To be recorded following partner review)*
- Instant identification of missing Zod edge cases (e.g., regex checks on UUIDs or trim requirements).
- Rapid drafting of comprehensive test case assertions.
- Detection of potential unhandled promise rejections or typing oversights.

---

## 5. Final Recommendation on Human + AI Hybrid Review Workflow

*(To be finalized upon completion of partner review)*
1. **First Pass (Automated AI Prompt):** Run the standardized AI code review prompt on the raw git diff to surface obvious syntax, regex, and standard library bugs.
2. **Second Pass (Human Architectural Review):** Human engineer inspects the diff against the 7-dimension checklist, filtering out AI false positives, verifying anti-enumeration defenses, checking layered MVC boundaries, and ensuring test database safety.
3. **Synthesis & Feedback:** Consolidate valid findings into a polite, structured, actionable GitHub review comment with concrete code suggestions and reproduction tests.

