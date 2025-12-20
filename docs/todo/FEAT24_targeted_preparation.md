# Feature Specification: Targeted Preparation Mode

## 1. Overview

A focused interview preparation experience for users who have a specific role in mind and want personalized practice. Users provide their resume and a job description, and receive tailored questions and feedback that highlight gaps and strengths.

This spec covers **Path 2: Targeted Preparation**. See FEAT23 for Path 1: Quick Practice (no resume, low friction).

## 2. Problem Statement

Users preparing for a specific opportunity need more than generic practice:
- They have a resume that represents their background
- They have a target JD (or specific company/role)
- They want feedback that compares their experience to the job requirements
- They need to identify and work on gaps before the real interview

**The core insight:** These users have both *intent* AND *context*. We should leverage all available context to deliver highly personalized preparation.

## 3. Design Principles

1. **Context is king** — Use resume + JD together to generate targeted questions
2. **Gap-aware feedback** — Highlight where experience aligns and where it doesn't
3. **Persistent targeting** — Let users run multiple sessions against the same JD
4. **Comparative analysis** — Feedback references both resume content and JD requirements

## 4. Solution Design

### 4.0 Dashboard Integration

Target roles are surfaced directly on the dashboard, making them the first thing users see. This encourages repeat practice and reduces friction to start a session.

**Dashboard with Targets:**
```
┌─────────────────────────────────────────────────────┐
│  Dashboard                                          │
│                                                     │
│  Your Target Roles                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │ Stripe              │  │ Google              │   │
│  │ Senior SWE          │  │ Product Manager     │   │
│  │                     │  │                     │   │
│  │ 3 sessions          │  │ 1 session           │   │
│  │ Last: 2 days ago    │  │ Last: 1 week ago    │   │
│  │                     │  │                     │   │
│  │ [Practice]          │  │ [Practice]          │   │
│  └─────────────────────┘  └─────────────────────┘   │
│                                                     │
│  ┌─────────────────────┐                            │
│  │  + Add New Target   │                            │
│  │                     │                            │
│  │  Paste a job link   │                            │
│  │  or describe a role │                            │
│  └─────────────────────┘                            │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Quick Practice                                     │
│  [Start without a specific role →]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Empty State (New Users):**
```
┌─────────────────────────────────────────────────────┐
│  Dashboard                                          │
│                                                     │
│  Welcome to Preppal!                                │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  🎯 Add Your First Target Role                │  │
│  │                                               │  │
│  │  Paste a job posting link or describe the    │  │
│  │  role you're preparing for.                  │  │
│  │                                               │  │
│  │  [ Paste job link or describe role...     ]  │  │
│  │                                               │  │
│  │  [Get Started]                                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Or: [Try Quick Practice first →]                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Entry Points:**
- **[Practice] button** on target card → Skip to Pre-Session Analysis (4.4)
- **[+ Add New Target]** → Target Input flow (4.3)
- **[Quick Practice]** → Path 1 (see FEAT23)

### 4.1 Prerequisites

Before entering Targeted Preparation, user must have:
- **Resume uploaded** — Either on file or uploaded during this flow
- **Target defined** — JD via URL, file upload, paste, or company+role generation

### 4.2 The Setup Flow

```
┌─────────────────────────────────────────────────────┐
│  Targeted Preparation                               │
│                                                     │
│  Step 1: Your Background                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ ✓ Resume: software_engineer_resume.pdf        │  │
│  │   [Change]                                    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Step 2: Target Role                                │
│  ┌───────────────────────────────────────────────┐  │
│  │ [ Paste job link or describe the role... ]    │  │
│  │                                               │  │
│  │ Or: [Upload JD]  [Select from Library]        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Continue]                                         │
└─────────────────────────────────────────────────────┘
```

### 4.3 Target Input Options

| Method | Input | Processing |
|--------|-------|------------|
| URL | Job posting link | Extract JD via Gemini |
| Upload | PDF/image file | OCR via Gemini Vision |
| Paste | Raw text | Direct usage |
| Generate | Company + Role | Synthetic JD via Gemini |
| Library | Previous JD | Select from saved JDs |

### 4.4 Pre-Session Analysis

After both inputs are provided, show a brief analysis:

```
┌─────────────────────────────────────────────────────┐
│  Match Analysis                                     │
│                                                     │
│  Target: Senior Software Engineer at Stripe         │
│                                                     │
│  Strengths (from your resume):                      │
│  • 3 years backend experience (JD asks for 2+)      │
│  • Payment systems experience at Square             │
│  • Strong Python/Go skills                          │
│                                                     │
│  Potential Gaps:                                    │
│  • JD mentions Kubernetes — not on resume           │
│  • Leadership experience limited                    │
│                                                     │
│  Focus Areas:                                       │
│  [✓] System Design  [✓] Behavioral  [ ] Coding     │
│                                                     │
│  [Start Interview]                                  │
└─────────────────────────────────────────────────────┘
```

### 4.5 Tailored Interview Session

The AI interviewer has full context:
- **Resume content** — Can ask about specific projects, roles, technologies
- **JD requirements** — Tailors questions to what the role needs
- **Identified gaps** — Probes areas where experience is thin

Example question flow:
1. *"I see you worked on payment processing at Square. The Stripe role involves similar systems at larger scale. Walk me through how you'd handle 10x the transaction volume."*
2. *"The JD mentions Kubernetes experience. Tell me about any container orchestration you've worked with, even if not Kubernetes specifically."*

### 4.6 Gap-Aware Feedback

Post-session feedback references both resume and JD:

```
┌─────────────────────────────────────────────────────┐
│  Session Feedback                                   │
│                                                     │
│  Overall: Strong performance                        │
│                                                     │
│  Alignment with Stripe SWE Role:                    │
│                                                     │
│  ✓ System Design: Your Square experience shows      │
│    relevant scale. Good tradeoff discussion.        │
│                                                     │
│  ⚠ Infrastructure: When asked about Kubernetes,    │
│    your Docker experience was relevant but          │
│    consider learning K8s basics before interview.   │
│                                                     │
│  ✓ Behavioral: Strong STAR responses. Your         │
│    conflict resolution example was compelling.      │
│                                                     │
│  Recommended Next Steps:                            │
│  • Practice K8s-specific system design questions    │
│  • Prepare 1-2 more leadership examples             │
│                                                     │
│  [Practice Again]  [New Target]  [View History]     │
└─────────────────────────────────────────────────────┘
```

## 5. User Flow

**Returning User (has targets):**
```
[User lands on Dashboard]
            ↓
[Sees target role cards with Practice buttons]
            ↓
[Clicks Practice on existing target]
            ↓
[Resume check: uploaded? If not, prompt upload]
            ↓
[Pre-session analysis: strengths, gaps, focus selection]
            ↓
[Interview session with full context]
            ↓
[Gap-aware feedback with recommendations]
            ↓
[Returns to Dashboard]
```

**New User / Adding Target:**
```
[User lands on Dashboard (empty state or clicks + Add New Target)]
            ↓
[Target input: URL, upload, paste, or generate]
            ↓
[Resume check: uploaded? If not, prompt upload]
            ↓
[Pre-session analysis: strengths, gaps, focus selection]
            ↓
[Interview session with full context]
            ↓
[Gap-aware feedback with recommendations]
            ↓
[Returns to Dashboard (now shows new target)]
```

## 6. Data Model

### 6.1 Target (JD) Storage

```typescript
interface Target {
  id: string;
  userId: string;

  // Source
  sourceType: 'url' | 'upload' | 'paste' | 'generated';
  sourceUrl?: string;  // If from URL

  // Extracted/stored content
  companyName: string;
  roleTitle: string;
  description: string;        // Full JD text
  requirements: string[];     // Parsed requirements

  // Metadata
  createdAt: Date;
  lastUsedAt: Date;
  sessionCount: number;       // How many sessions against this target
}
```

### 6.2 Session with Context

```typescript
interface TargetedSession {
  id: string;
  userId: string;
  targetId: string;           // Link to Target
  resumeId: string;           // Link to Resume used

  // Pre-computed context
  matchAnalysis: {
    strengths: string[];
    gaps: string[];
  };
  focusAreas: string[];       // User-selected focus

  // Session data
  transcript: Message[];
  feedback: TargetedFeedback;

  createdAt: Date;
}

interface TargetedFeedback {
  overall: string;
  alignmentByArea: {
    area: string;
    status: 'strong' | 'adequate' | 'gap';
    feedback: string;
  }[];
  recommendations: string[];
}
```

## 7. Implementation Details

### 7.1 UI Components

| Component | Purpose |
|-----------|---------|
| `TargetRolesSection.tsx` | Dashboard section showing target cards |
| `TargetRoleCard.tsx` | Individual target card with Practice button |
| `AddTargetCard.tsx` | Card/CTA to add a new target |
| `EmptyDashboard.tsx` | First-time user onboarding state |
| `TargetInput.tsx` | Multi-method target input (URL, upload, etc.) |
| `MatchAnalysis.tsx` | Pre-session strengths/gaps display |
| `FocusSelector.tsx` | Checkboxes for interview focus areas |
| `TargetedFeedback.tsx` | Gap-aware feedback display |

### 7.2 Backend Endpoints

| Endpoint | Purpose |
|----------|---------|
| `target.createFromUrl` | Extract and store JD from URL |
| `target.createFromUpload` | OCR and store JD from file |
| `target.createFromText` | Store pasted JD |
| `target.generate` | Generate synthetic JD |
| `target.list` | Get user's target library |
| `interview.analyzeMatch` | Compare resume to target, return strengths/gaps |
| `interview.createTargeted` | Start session with resume + target context |

### 7.3 AI Prompts

**Match Analysis Prompt:**
```
Given this resume and job description, identify:
1. Strengths: Where the candidate's experience aligns with requirements
2. Gaps: Where the JD requires something not evident in the resume

Resume: {resume_text}
Job Description: {jd_text}
```

**Targeted Interview System Prompt:**
```
You are interviewing a candidate for {role} at {company}.

Candidate's background (from resume):
{resume_summary}

Job requirements:
{jd_requirements}

Identified gaps to probe:
{gaps}

Ask questions that:
1. Explore their relevant experience in depth
2. Probe gap areas to see if they have transferable skills
3. Match the difficulty level expected for {role}
```

**Targeted Feedback Prompt:**
```
Based on this interview transcript, provide feedback that:
1. Evaluates performance against {role} at {company} requirements
2. Notes where their resume experience showed through positively
3. Identifies areas needing improvement before the actual interview
4. Gives specific, actionable recommendations

Resume: {resume_text}
JD: {jd_text}
Transcript: {transcript}
```

## 8. Target Library

### 8.1 Reusing Targets

Users can practice multiple sessions against the same target:
- Track progress over time
- See improvement on previously identified gaps
- No need to re-enter JD for each session

### 8.2 Library UI

```
┌─────────────────────────────────────────────────────┐
│  Your Target Roles                                  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Stripe - Senior SWE                           │  │
│  │ 3 sessions · Last practiced 2 days ago        │  │
│  │ [Practice]  [View History]                    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Google - PM                                   │  │
│  │ 1 session · Last practiced 1 week ago         │  │
│  │ [Practice]  [View History]                    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [+ Add New Target]                                 │
└─────────────────────────────────────────────────────┘
```

## 9. Verification Plan

### 9.1 Manual Testing

1. **Full flow:** Upload resume → paste JD URL → verify match analysis → complete session → verify targeted feedback
2. **Gap detection:** Use a resume missing a key JD requirement → verify it appears in gaps
3. **Targeted questions:** Verify AI asks about specific resume items and probes gaps
4. **Feedback quality:** Verify feedback references both resume and JD specifics
5. **Target library:** Create target → run 2 sessions → verify library shows history
6. **Multiple input methods:** Test URL, upload, paste, and generate for target input

### 9.2 Success Metrics

- Users with targets complete 3+ sessions per target on average
- Feedback usefulness rating (post-session survey)
- Gap identification accuracy (spot-check by reviewing match analysis vs actual resume/JD)
- Conversion from Quick Practice (Path 1) to Targeted Preparation (Path 2)
