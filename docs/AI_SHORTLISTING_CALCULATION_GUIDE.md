# AI Shortlisting & Candidate Evaluation Documentation
## Comprehensive Technical & Calculation Guide

---

## Executive Summary

The **AI Shortlisting System** automates the candidate screening process by evaluating applicant profiles against job posting requirements. It uses a **Hybrid Scoring Model** combining:
1. **Deterministic Matching Engine**: Exact, rule-based algorithmic matching for required skills, preferred skills, and platform assessment test scores.
2. **AI Inference Evaluator**: Deep qualitative analysis using LLM evaluation to grade education background, experience relevance, success criteria fit, and mandatory requirement checklists.

This document details the exact mathematical formulas, scoring weights, weight redistribution rules, confidence dampening factors, and candidate rejection criteria in simple, transparent language with step-by-step numerical examples.

---

## Key Metrics Overview

When an AI Shortlist run finishes, the system generates three primary decision signals:

| Signal | Description | Range / Values |
| :--- | :--- | :--- |
| **Final Overall Score** | The weighted, confidence-adjusted total suitability score of the candidate. | `0` to `100` |
| **Skill Match Percentage** | Blended score reflecting exact required skill coverage + AI qualitative skill depth. | `0%` to `100%` |
| **Recommendation Status** | Final shortlisting decision tier assigned to the candidate. | `SHORTLIST`, `MAYBE`, `REJECT` |
| **Mandatory Met Flag** | Boolean flag confirming whether all non-negotiable requirements are satisfied. | `TRUE` / `FALSE` |

---

## 1. Skill Match Percentage Calculation

The system calculates candidate skill match using two sub-components: **Deterministic Coverage** and **Qualitative Skill Evaluation**.

### A. Deterministic Skill Coverage & Alias Resolution (Hard Matching)
Skill names are processed through a **Canonical Alias Resolution Engine** (`lib/skills.ts`) that recognizes common industry variations:
- `React.js`, `ReactJS`, `React` $\rightarrow$ Standardized to `REACT`
- `Node.js`, `NodeJS`, `Node` $\rightarrow$ Standardized to `NODE.JS`
- `Postgres`, `PostgreSQL`, `PSQL` $\rightarrow$ Standardized to `POSTGRESQL`
- `Kubernetes`, `K8s` $\rightarrow$ Standardized to `KUBERNETES`
- `TypeScript`, `TS` $\rightarrow$ Standardized to `TYPESCRIPT`
- `Tailwind`, `TailwindCSS` $\rightarrow$ Standardized to `TAILWINDCSS`

Additionally, if a candidate does not have explicit skill tags in their profile, the matcher scans the candidate's **work experience job titles, company history, education degrees, and bio** to infer mentioned skills so applicants are not penalized.

* **Required Skill Match % ($S_{req}$):**
  $$\text{Required Skill Coverage} = \frac{\text{Matched Required Skills Count}}{\text{Total Required Skills Count}}$$
  $$\text{Score } (S_{req}) = \text{Required Skill Coverage} \times 100$$
  *(Note: If a job has 0 required skills listed, $S_{req} = 100\%$)*

* **Preferred Skill Match % ($S_{pref}$):**
  $$\text{Preferred Skill Coverage} = \frac{\text{Matched Preferred Skills Count}}{\text{Total Preferred Skills Count}}$$
  $$\text{Score } (S_{pref}) = \text{Preferred Skill Coverage} \times 100$$
  *(Note: If a job has 0 preferred skills listed, $S_{pref} = 100\%$)*

### B. Blended Skill Score (Reported on UI)
To evaluate candidate capabilities holistically, the UI displays a **Blended Skill Score** ($S_{blended}$):
$$S_{blended} = \text{Round}\Big( (0.75 \times S_{req}) + (0.25 \times S_{ai\_skills}) \Big)$$

* **75% Weight**: Exact match of mandatory required skills (via explicit tags or work experience).
* **25% Weight**: AI qualitative assessment of skill experience context & depth ($S_{ai\_skills}$).
* *(Resilience Safeguard: If exact profile tags are missing but AI verifies strong skill usage from work history, $S_{req}$ is derived from verified background rather than forcing a 0% score).*

---

## 2. Overall Score Calculation Logic

The Overall Score represents the aggregate match across 6 key candidate parameters.

### Standard Category Weights
Under standard conditions (when candidate assessments are present), category weights are distributed as follows:

| Category | Parameter Code | Standard Weight | Description |
| :--- | :--- | :--- | :--- |
| **Required Skills** | $S_{req}$ | **30%** (`0.30`) | Deterministic match of essential job skills |
| **Preferred Skills** | $S_{pref}$ | **10%** (`0.10`) | Deterministic match of nice-to-have skills |
| **Assessment Score** | $S_{assess}$ | **20%** (`0.20`) | Average score % on platform assessment tests |
| **Education Score** | $S_{edu}$ | **15%** (`0.15`) | AI evaluation of degree level, field, and GPA |
| **Experience Score** | $S_{exp}$ | **15%** (`0.15`) | AI evaluation of job titles, tenure, and domain |
| **Success Criteria Score**| $S_{succ}$ | **10%** (`0.10`) | AI evaluation against specific job outcomes/KPIs |
| **TOTAL** | | **100%** (`1.00`) | |

---

### Weight Redistribution Logic (When Assessment is Missing)

If a candidate has **not taken any skill assessment tests** for the job's relevant skills ($S_{assess} = \text{null}$), the system **does not penalize** the candidate with a 0 score. Instead, the 20% weight of the assessment is **proportionally redistributed** across the remaining 5 categories.

#### Adjusted Weight Formula:
$$W_{new} = \frac{W_{standard}}{\sum \text{Active Weights}} = \frac{W_{standard}}{0.80}$$

#### Redistributed Weight Table:

| Category | Standard Weight | Redistributed Weight (No Assessment) | Formula |
| :--- | :--- | :--- | :--- |
| **Required Skills** | 30% (`0.30`) | **37.5%** (`0.375`) | $0.30 \div 0.80$ |
| **Preferred Skills** | 10% (`0.10`) | **12.5%** (`0.125`) | $0.10 \div 0.80$ |
| **Education Score** | 15% (`0.15`) | **18.75%** (`0.1875`) | $0.15 \div 0.80$ |
| **Experience Score** | 15% (`0.15`) | **18.75%** (`0.1875`) | $0.15 \div 0.80$ |
| **Success Criteria** | 10% (`0.10`) | **12.5%** (`0.125`) | $0.10 \div 0.80$ |
| **TOTAL** | **80%** | **100.0%** | |

---

### Step-by-Step Overall Score Formula

#### Step 1: Compute Raw Overall Score ($Score_{raw}$)
* **With Assessment:**
  $$Score_{raw} = (S_{req} \times 0.30) + (S_{pref} \times 0.10) + (S_{assess} \times 0.20) + (S_{edu} \times 0.15) + (S_{exp} \times 0.15) + (S_{succ} \times 0.10)$$

* **Without Assessment:**
  $$Score_{raw} = (S_{req} \times 0.375) + (S_{pref} \times 0.125) + (S_{edu} \times 0.1875) + (S_{exp} \times 0.1875) + (S_{succ} \times 0.125)$$

#### Step 2: Apply AI Confidence Dampening Factor
To protect against incomplete resumes or sparse profile data, raw scores are adjusted by an **AI Confidence Factor** ($C_{ai}$, scaled 0 to 100%).

$$\text{Dampening Multiplier} = 0.5 + \left(0.5 \times \frac{C_{ai}}{100}\right)$$

$$Score_{dampened} = \text{Round}\left( Score_{raw} \times \text{Dampening Multiplier} \right)$$

$$\text{Final Overall Score} = \text{Clamp}\big(Score_{dampened}, \text{Min: } 0, \text{Max: } 100\big)$$

> **Why Confidence Dampening?**
> - If AI confidence is **100%**, Multiplier = $0.5 + 0.5(1.0) = 1.00$ (100% of raw score retained).
> - If AI confidence is **80%**, Multiplier = $0.5 + 0.5(0.8) = 0.90$ (90% of raw score retained).
> - If AI confidence is **50%** (due to missing data), Multiplier = $0.5 + 0.5(0.5) = 0.75$ (75% of raw score retained).

---

## 3. Deep Analysis of Candidate Rejection Criteria

Candidate rejection is governed by strict threshold rules and mandatory requirements validation.

```mermaid
flowchart TD
    Start[Candidate Submitted for AI Shortlist] --> CheckReq[Check Mandatory Requirements]
    
    CheckReq -->|Missing Required Skill OR Failed Mandatory Checklist| MandatoryFail[Mandatory Requirements Met = FALSE]
    CheckReq -->|All Mandatory Requirements Passed| MandatoryPass[Mandatory Requirements Met = TRUE]

    MandatoryFail --> EvalScore[Calculate Overall Score & AI Confidence]
    MandatoryPass --> EvalScore

    EvalScore --> CheckShortlist{Overall Score >= 50% AND Confidence >= 45%}
    
    CheckShortlist -->|Yes| ShortlistDecision[Decision: SHORTLIST (Selected)]
    CheckShortlist -->|No| CheckMaybe{Overall Score >= 35%?}
    
    CheckMaybe -->|Yes| MaybeDecision[Decision: MAYBE]
    CheckMaybe -->|No| RejectDecision[Decision: REJECT]
```

### A. Mandatory Requirements Validation (`mandatoryRequirementsMet`)
A candidate's `mandatoryRequirementsMet` flag evaluates whether core criteria are met without overly rigid penalties:

1. **Adequate Required Skills**:
   $$\text{Required Skill Coverage} \ge 35\% \quad \text{OR} \quad \text{Missing Required Skills Count} == 0 \quad \text{OR} \quad \text{Blended Skills} \ge 40\%$$
   *(Ensures candidates possessing practical competencies are not disqualified over minor keyword mismatches).*
2. **Education Satisfied**:
   $$\text{Education Satisfied} \ne \text{FALSE}$$
   *(Degree level and major field constraints are not violated).*
3. **Core Checklist Met**:
   $$\text{At least 40% of Required Checklist items are satisfied}$$

---

### B. Recommendation Decision Thresholds

The system assigns recommendations according to fair, realistic merit thresholds:

| Recommendation Tier | Minimum Overall Score | Minimum AI Confidence | Mandatory Req Status | Primary Action |
| :--- | :--- | :--- | :--- | :--- |
| **`SHORTLIST`** | **$\ge 50\%$** | **$\ge 45\%$** | Core Criteria Met | Recommended for Interview / Batch Selection |
| **`MAYBE`** | **$\ge 35\%$** (and $< 50\%$) | Any | Variable | Secondary review / backup pool |
| **`REJECT`** | **$< 35\%$** | Any | Failed Education or $< 35\%$ | Not recommended for hiring pipeline |

---

### C. Deep Dive: Why Candidates Get Rejected (5 Key Rejection Drivers)

1. **Hard Skill Deficit (Missing Required Skills)**
   - **Impact**: Missing even 1 required skill drops $S_{req}$ drastically (e.g., matching 2 of 3 required skills gives $S_{req} = 66.7\%$).
   - **Result**: Drops raw score by up to 10–30 points AND automatically triggers `mandatoryRequirementsMet = FALSE`.

2. **Low or Failed Assessment Scores**
   - **Impact**: Assessment accounts for **20%** of total score.
   - **Result**: Scoring below 40% on technical assessment tests pulls down overall candidate score into the `< 50` REJECT zone.

3. **Education or Experience Disqualification**
   - **Impact**: Fulfilling mandatory checklist criteria (e.g., job requires Bachelor's degree, but candidate has high school diploma, or job requires 5 years experience, but candidate has 1 year).
   - **Result**: AI marks `met: false` on REQUIRED checklist items, causing candidate recommendation degradation.

4. **Low Data Completeness (Confidence Penalty)**
   - **Impact**: If candidate profile lacks detailed experience description, achievements, or education entries, AI confidence drops to 40%–50%.
   - **Result**: Raw score of 68 dampened by 0.725 multiplier becomes **49**, causing an automatic fall into **REJECT**.

5. **Poor Alignment with Job Success Criteria**
   - **Impact**: Success criteria evaluates target KPIs (e.g., "Led team of 10+ engineers", "Managed \$1M budget").
   - **Result**: If candidate lacks demonstrated outcomes, $S_{succ}$ scores near 0, shaving off up to 10 full points.

---

## 4. Worked Numerical Examples in Simple Language

### Scenario A: High-Performing Candidate (Outcome: SHORTLIST)

* **Job Requirements**:
  - Required Skills (3): `React`, `TypeScript`, `Node.js`
  - Preferred Skills (2): `Docker`, `GraphQL`
  - Required Education: `Bachelor in Computer Science`
* **Candidate Profile**:
  - Skills Matched: `React`, `TypeScript`, `Node.js`, `Docker` (Missing `GraphQL`).
  - Assessment Score ($S_{assess}$): `85%` average.
  - AI Scores: $S_{ai\_skills} = 90$, $S_{edu} = 95$, $S_{exp} = 85$, $S_{succ} = 80$.
  - AI Confidence ($C_{ai}$): `90%`.

#### Calculations:
1. **Required Skill Score ($S_{req}$)**: $\frac{3}{3} \times 100 = 100\%$
2. **Preferred Skill Score ($S_{pref}$)**: $\frac{1}{2} \times 100 = 50\%$
3. **Blended Skill Score (UI Display)**: $\text{Round}(0.75 \times 100 + 0.25 \times 90) = \mathbf{98\%}$
4. **Raw Overall Score**:
   $$Score_{raw} = (100 \times 0.30) + (50 \times 0.10) + (85 \times 0.20) + (95 \times 0.15) + (85 \times 0.15) + (80 \times 0.10)$$
   $$Score_{raw} = 30 + 5 + 17 + 14.25 + 12.75 + 8 = \mathbf{87.0}$$
5. **Confidence Dampening**:
   $$\text{Multiplier} = 0.5 + (0.5 \times 0.90) = 0.95$$
   $$Score_{dampened} = \text{Round}(87.0 \times 0.95) = \mathbf{83}$$
6. **Mandatory Check**: All required skills matched, education met $\rightarrow$ `TRUE`.
7. **Final Recommendation**: Overall Score = 83 ($\ge 50$) & Confidence = 90% ($\ge 45\%$) $\rightarrow$ **`SHORTLIST`**

---

### Scenario B: Unassessed Candidate - Weight Redistribution (Outcome: MAYBE)

* **Candidate Profile**: Same as above, but **No Platform Assessment Taken** ($S_{assess} = \text{null}$).

#### Calculations:
1. **Redistributed Category Weights**: $w_{req}=0.375, w_{pref}=0.125, w_{edu}=0.1875, w_{exp}=0.1875, w_{succ}=0.125$.
2. **Raw Overall Score (Without Assessment)**:
   $$Score_{raw} = (100 \times 0.375) + (50 \times 0.125) + (95 \times 0.1875) + (85 \times 0.1875) + (80 \times 0.125)$$
   $$Score_{raw} = 37.5 + 6.25 + 17.8125 + 15.9375 + 10 = \mathbf{87.5}$$
3. **Confidence Dampening ($C_{ai} = 85\%$)**:
   $$\text{Multiplier} = 0.5 + (0.5 \times 0.85) = 0.925$$
   $$Score_{dampened} = \text{Round}(87.5 \times 0.925) = \mathbf{81}$$
4. **Final Recommendation**: Overall Score = 81 ($\ge 50$) & Confidence = 85% ($\ge 45\%$) $\rightarrow$ **`SHORTLIST`**

---

### Scenario C: Candidate Rejected (Outcome: REJECT)

* **Job Requirements**:
  - Required Skills (4): `Python`, `Django`, `PostgreSQL`, `AWS`
* **Candidate Profile**:
  - Matched Required Skills (2): `Python`, `PostgreSQL` (Missing `Django`, `AWS`).
  - Required Skill Score ($S_{req}$): $\frac{2}{4} \times 100 = 50\%$.
  - Preferred Skill Score ($S_{pref}$): `0\%`.
  - Assessment Score ($S_{assess}$): Unassessed.
  - AI Scores: $S_{edu} = 70$, $S_{exp} = 40$, $S_{succ} = 30$.
  - AI Confidence ($C_{ai}$): `60%` (Sparse profile detail).

#### Calculations:
1. **Raw Overall Score (Redistributed Weights)**:
   $$Score_{raw} = (50 \times 0.375) + (0 \times 0.125) + (70 \times 0.1875) + (40 \times 0.1875) + (30 \times 0.125)$$
   $$Score_{raw} = 18.75 + 0 + 13.125 + 7.5 + 3.75 = \mathbf{43.125}$$
2. **Confidence Dampening ($C_{ai} = 60\%$)**:
   $$\text{Multiplier} = 0.5 + (0.5 \times 0.60) = 0.80$$
   $$Score_{dampened} = \text{Round}(43.125 \times 0.80) = \mathbf{35}$$
3. **Mandatory Check**: Missing 2 Required Skills (`Django`, `AWS`) $\rightarrow$ `FALSE`.
4. **Final Recommendation**: Overall Score = 35 ($< 50$) $\rightarrow$ **`REJECT`**

---

## 5. Summary Cheat Sheet for System Administrators

| Question | Simple Answer |
| :--- | :--- |
| **How is Skill Match calculated?** | `75%` exact match of mandatory job skills + `25%` AI qualitative skill evaluation. |
| **What happens if a candidate hasn't taken an assessment?** | The 20% assessment weight is removed, and weights are redistributed proportionally across the remaining categories (Skills: 50% combined, Edu: 18.75%, Exp: 18.75%, Success Criteria: 12.5%). Candidate is not penalized. |
| **Why is a candidate rejected when their score looks okay?** | A candidate can be rejected if their score is `< 50`, or if they fail mandatory non-negotiables (missing required skills, failing degree requirements, or low profile confidence score). |
| **How does low confidence affect the score?** | Low confidence dampens the raw score. At 50% confidence, only 75% of the raw score is retained. |
