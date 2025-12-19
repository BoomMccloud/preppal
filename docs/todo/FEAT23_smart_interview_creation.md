# Feature Specification: Quick Practice Mode

## 1. Overview

A low-friction entry point for users who want to practice immediately without uploading a resume or job description. Users select a topic or paste a quick input, and start an interview within 2 clicks.

This spec covers **Path 1: Quick Practice** only. A separate spec will cover Path 2: Targeted Preparation (users with resume + specific JD).

## 2. Problem Statement

New users arriving at Preppal face friction:
- They don't have a resume uploaded yet
- They may not have a specific job posting in mind
- They just want to try the product and practice something

**The core insight:** These users have *intent* (why they came) but no *context* (resume, JD). We should capture intent with minimal friction and gather context progressively.

## 3. Design Principles

1. **Value first, context later** — Let users experience an interview before asking for resume/profile data
2. **One input, many intents** — A single smart input handles URLs, company names, and topics
3. **Zero-typing option** — Quick-start chips for instant sessions
4. **Progressive disclosure** — Prompt for resume after the session, when user has seen value

## 4. Solution Design

### 4.1 The Smart Input Interface

A single, prominent input field with quick-start options below:

```
┌─────────────────────────────────────────────────────┐
│  What do you want to practice?                      │
│                                                     │
│  [ Paste a job link, company name, or topic... ]   │
│                                                     │
│  Or jump in:                                        │
│  [Behavioral] [System Design] [Product Sense]      │
│  [Frontend] [Backend] [Data Structures]            │
└─────────────────────────────────────────────────────┘
```

### 4.2 Input Detection Logic

The smart input auto-detects user intent:

| User Input | Detection | Action |
|------------|-----------|--------|
| `https://linkedin.com/jobs/123` | URL pattern | Extract JD from link |
| `Google PM` | Company + Role pattern | Generate synthetic JD |
| `System Design` | Known topic | Topic-focused session |
| `Kafka internals` | Free text | Skill-focused session |
| *(clicks chip)* | Quick-start | Immediate session with preset topic |

### 4.3 Minimal Confirmation Screen

Before starting, a brief confirmation:

```
┌─────────────────────────────────────────────────────┐
│  Starting: Behavioral Interview                     │
│                                                     │
│  The AI will ask about your past experiences.       │
│  Answer as if speaking to a real interviewer.       │
│                                                     │
│  [Start Interview]                                  │
└─────────────────────────────────────────────────────┘
```

### 4.4 Post-Session Resume Prompt

After feedback is displayed, prompt for progressive context gathering:

```
┌─────────────────────────────────────────────────────┐
│  Want better, personalized questions next time?     │
│                                                     │
│  [Upload Resume]  [Maybe Later]                     │
└─────────────────────────────────────────────────────┘
```

## 5. User Flow

```
[User lands on Create Interview page]
            ↓
[Smart input + quick-start chips displayed]
            ↓
[User types input OR clicks chip]
            ↓
[Minimal confirmation screen]
            ↓
[Interview session begins]
            ↓
[Session ends → Feedback displayed]
            ↓
[Prompt: "Upload resume for better sessions"]
```

**Total clicks to first interview: 2** (select topic → start)

## 6. Implementation Details

### 6.1 UI Components

| Component | Purpose |
|-----------|---------|
| `QuickPracticeInput.tsx` | Smart input field with detection logic |
| `TopicChips.tsx` | Quick-start chip buttons |
| `SessionConfirmation.tsx` | Pre-session confirmation screen |
| `ResumePromptModal.tsx` | Post-session resume upload prompt |

### 6.2 Input Detection (Frontend)

```typescript
type DetectedIntent =
  | { type: 'url'; url: string }
  | { type: 'company_role'; company: string; role: string }
  | { type: 'topic'; topic: string }
  | { type: 'freeform'; text: string };

function detectIntent(input: string): DetectedIntent {
  // URL pattern
  if (/^https?:\/\//.test(input)) {
    return { type: 'url', url: input };
  }

  // Known topics (exact match)
  const knownTopics = ['behavioral', 'system design', 'product sense', ...];
  if (knownTopics.includes(input.toLowerCase())) {
    return { type: 'topic', topic: input };
  }

  // Company + Role pattern (e.g., "Google PM", "Meta SWE")
  const companyRoleMatch = input.match(/^(\w+)\s+(.+)$/);
  if (companyRoleMatch && isKnownCompany(companyRoleMatch[1])) {
    return { type: 'company_role', company: companyRoleMatch[1], role: companyRoleMatch[2] };
  }

  // Default: treat as freeform topic/skill
  return { type: 'freeform', text: input };
}
```

### 6.3 Backend Endpoints

| Endpoint | Purpose |
|----------|---------|
| `interview.createFromTopic` | Start session with topic/skill focus |
| `interview.createFromUrl` | Extract JD from URL, then start session |
| `interview.createFromGenerated` | Generate synthetic JD from company+role |

### 6.4 Topic-to-Prompt Mapping

Each topic maps to a specialized AI persona/prompt:

| Topic | AI Behavior |
|-------|-------------|
| Behavioral | Ask STAR-format questions about past experiences |
| System Design | Present a design problem, probe for tradeoffs |
| Product Sense | Ask product strategy and prioritization questions |
| Frontend/Backend | Technical questions for that domain |

## 7. Quick-Start Topics

Initial set of chips:

**General:**
- Behavioral
- System Design
- Product Sense

**Technical:**
- Frontend
- Backend
- Data Structures
- Algorithms

**Role-Specific:**
- PM Interview
- TPM Interview
- Engineering Manager

## 8. Verification Plan

### 8.1 Manual Testing

1. **Chip quick-start:** Click "Behavioral" chip → verify session starts with behavioral questions
2. **Topic input:** Type "System Design" → verify detection and appropriate questions
3. **URL input:** Paste LinkedIn job URL → verify JD extraction and session context
4. **Company+Role:** Type "Google PM" → verify synthetic JD generation
5. **Freeform:** Type "Kafka internals" → verify skill-focused session
6. **Post-session prompt:** Complete session → verify resume upload prompt appears

### 8.2 Success Metrics

- Time from page load to session start < 10 seconds (for chip quick-start)
- >50% of new users complete their first session
- Resume upload rate after first session (measure progressive disclosure effectiveness)
