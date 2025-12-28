# Feature Specification: Results Storage & Extended Feedback

## Implementation Status

> **Branch:** TBD
> **Last Updated:** 2025-12-28

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1: Schema** | Pending | BlockTranscript, extended InterviewFeedback |
| **Phase 2: Backend** | Pending | Block result storage, feedback aggregation |
| **Phase 3: Feedback Generation** | Pending | Extended dimensions, historical comparison |
| **Phase 4: Frontend** | Pending | Enhanced feedback display UI |

---

## 1. Overview

Define how interview results are stored and presented, with support for:

- **Per-block transcripts** - Store transcript for each 10-min block separately
- **Extended feedback dimensions** - 6-9 evaluation criteria (vs. current 5)
- **Historical comparison** - Compare current interview to previous attempts
- **Aggregated feedback** - Unified report from all blocks

## 2. Problem Statement

Channel partner feedback:
- "Summary report needs 6-9 dimensions to look more professional"
- "Interview summary should compare with historical interviews to show improvement"
- "Teacher needs to see each student's interview info including process, summary, suggestions"

Current limitations:
- Single monolithic transcript (hard to navigate)
- Only 5 feedback dimensions
- No cross-interview comparison
- No progress tracking over multiple sessions

## 3. Data Model

### 3.1 Block Transcript Storage

```prisma
model BlockTranscript {
  id            String   @id @default(cuid())

  // Link to block
  blockId       String   @unique
  block         InterviewBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)

  // Transcript data
  transcriptBinary  Bytes?   // Protobuf binary (existing format)
  transcriptText    String?  // Plain text version for display

  // AI-generated summary of candidate's answer
  answerSummary     String?

  // Per-block quick feedback (optional)
  quickFeedback     Json?    // { score: number, notes: string }

  createdAt     DateTime @default(now())
}

// Update InterviewBlock to include relation
model InterviewBlock {
  // ... existing fields ...

  transcript    BlockTranscript?
}
```

### 3.2 Extended Feedback Schema

```prisma
model InterviewFeedback {
  id           String    @id @default(cuid())
  interviewId  String    @unique
  interview    Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)

  // === LEGACY FIELDS (keep for backwards compatibility) ===
  summary                  String?
  strengths                String?
  contentAndStructure      String?
  communicationAndDelivery String?
  presentation             String?

  // === NEW: Flexible dimensions ===
  dimensions   Json?     // Array of FeedbackDimensionResult

  // === NEW: Historical comparison ===
  historicalComparison  Json?  // ComparisonResult

  // === NEW: Overall metrics ===
  overallScore          Float?  // Weighted average of dimension scores
  interviewNumber       Int?    // Which interview attempt (1st, 2nd, 3rd...)

  // Metadata
  templateId   String?   // FeedbackTemplate used (from FEAT27)
  generatedAt  DateTime  @default(now())
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

### 3.3 TypeScript Types

```typescript
// src/types/feedback.ts

interface FeedbackDimensionResult {
  id: string;              // Unique identifier
  name: string;            // e.g., "Communication Skills"
  nameZh?: string;         // Chinese translation
  score: number;           // 1-10 scale
  maxScore: number;        // Usually 10
  weight: number;          // For weighted average (0.0-1.0)
  feedback: string;        // Detailed feedback text
  feedbackZh?: string;     // Chinese translation
  highlights: string[];    // Specific examples from interview
  suggestions: string[];   // Actionable improvements
}

interface HistoricalComparison {
  previousInterviewId: string | null;
  previousDate: string | null;
  improvements: ComparisonItem[];
  regressions: ComparisonItem[];
  unchanged: ComparisonItem[];
  overallTrend: 'improving' | 'stable' | 'declining';
  summaryText: string;       // "You improved in 4 areas..."
  summaryTextZh?: string;
}

interface ComparisonItem {
  dimension: string;
  previousScore: number;
  currentScore: number;
  change: number;          // +2, -1, 0, etc.
  changePercent: number;   // +25%, -10%, etc.
  insight: string;         // "Your structure improved significantly"
}
```

## 4. Default Feedback Dimensions (9)

| # | Dimension | Weight | Description |
|---|-----------|--------|-------------|
| 1 | **Overall Impression** | 0.15 | General hiring recommendation and fit |
| 2 | **Content Quality** | 0.15 | Depth, relevance, specificity of answers |
| 3 | **Structure & Organization** | 0.12 | STAR format, logical flow, completeness |
| 4 | **Communication Clarity** | 0.12 | Articulation, vocabulary, fluency |
| 5 | **Listening & Responsiveness** | 0.10 | Addressed actual questions asked |
| 6 | **Professional Presence** | 0.10 | Confidence, poise, demeanor |
| 7 | **Critical Thinking** | 0.10 | Problem analysis, reasoning depth |
| 8 | **Self-Awareness** | 0.08 | Understanding of strengths/weaknesses |
| 9 | **Cultural Fit Signals** | 0.08 | Values alignment, team dynamics |

**Total weight: 1.00**

Teachers can customize dimensions via FeedbackTemplate (FEAT27).

## 5. Feedback Generation Flow

### 5.1 Per-Block Processing

```typescript
// After each block ends
async function processBlockResult(
  block: InterviewBlock,
  transcript: string
): Promise<void> {
  // 1. Store raw transcript
  await db.blockTranscript.create({
    data: {
      blockId: block.id,
      transcriptText: transcript,
      transcriptBinary: encodeProtobuf(transcript),
    },
  });

  // 2. Generate answer summary (for context passing)
  const summary = await gemini.summarize(transcript, {
    prompt: 'Summarize the candidate\'s key points in 2-3 sentences.',
    maxTokens: 150,
  });

  await db.blockTranscript.update({
    where: { blockId: block.id },
    data: { answerSummary: summary },
  });
}
```

### 5.2 Final Feedback Aggregation

```typescript
// After all blocks complete
async function generateFinalFeedback(
  interview: Interview,
  blocks: InterviewBlock[],
  template: FeedbackTemplate | null
): Promise<InterviewFeedback> {
  // 1. Aggregate all transcripts
  const fullTranscript = blocks
    .map(b => `[Block ${b.blockNumber}] Language: ${b.language}\n${b.transcript?.transcriptText}`)
    .join('\n\n---\n\n');

  // 2. Get dimensions to evaluate
  const dimensions = template?.feedbackTemplate?.dimensions
    ?? getDefaultDimensions();

  // 3. Generate feedback via Gemini
  const feedbackPrompt = buildFeedbackPrompt(fullTranscript, dimensions, interview);
  const result = await gemini.generate(feedbackPrompt);

  // 4. Parse and validate
  const parsed = FeedbackResultSchema.parse(JSON.parse(result));

  // 5. Historical comparison (if previous interview exists)
  const comparison = await generateHistoricalComparison(
    interview.userId,
    interview.templateId,
    parsed.dimensions
  );

  // 6. Calculate overall score
  const overallScore = calculateWeightedScore(parsed.dimensions);

  // 7. Store feedback
  return db.interviewFeedback.create({
    data: {
      interviewId: interview.id,
      dimensions: parsed.dimensions,
      historicalComparison: comparison,
      overallScore,
      interviewNumber: await getInterviewNumber(interview),
      // Legacy fields for backwards compatibility
      summary: parsed.dimensions.find(d => d.name === 'Overall Impression')?.feedback,
      strengths: extractStrengths(parsed.dimensions),
    },
  });
}
```

### 5.3 Historical Comparison Logic

```typescript
async function generateHistoricalComparison(
  userId: string,
  templateId: string | null,
  currentDimensions: FeedbackDimensionResult[]
): Promise<HistoricalComparison | null> {
  // Find most recent previous interview with same template
  const previousFeedback = await db.interviewFeedback.findFirst({
    where: {
      interview: {
        userId,
        templateId,
        status: 'COMPLETED',
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: 1, // Skip current interview
  });

  if (!previousFeedback?.dimensions) return null;

  const previousDimensions = previousFeedback.dimensions as FeedbackDimensionResult[];

  // Compare each dimension
  const comparisons = currentDimensions.map(current => {
    const previous = previousDimensions.find(p => p.name === current.name);
    if (!previous) return null;

    return {
      dimension: current.name,
      previousScore: previous.score,
      currentScore: current.score,
      change: current.score - previous.score,
      changePercent: ((current.score - previous.score) / previous.score) * 100,
    };
  }).filter(Boolean);

  const improvements = comparisons.filter(c => c.change > 0);
  const regressions = comparisons.filter(c => c.change < 0);
  const unchanged = comparisons.filter(c => c.change === 0);

  // Determine overall trend
  const avgChange = comparisons.reduce((sum, c) => sum + c.change, 0) / comparisons.length;
  const overallTrend = avgChange > 0.5 ? 'improving'
    : avgChange < -0.5 ? 'declining'
    : 'stable';

  return {
    previousInterviewId: previousFeedback.interviewId,
    previousDate: previousFeedback.createdAt.toISOString(),
    improvements,
    regressions,
    unchanged,
    overallTrend,
    summaryText: generateComparisonSummary(improvements, regressions, overallTrend),
  };
}
```

## 6. Gemini Feedback Prompt

```typescript
function buildFeedbackPrompt(
  transcript: string,
  dimensions: FeedbackDimensionConfig[],
  interview: Interview
): string {
  const dimensionInstructions = dimensions.map((d, i) =>
    `${i + 1}. **${d.name}** (weight: ${d.weight}): ${d.description}`
  ).join('\n');

  return `
You are evaluating a job interview. Analyze the transcript and provide comprehensive feedback.

## Interview Context
- Position: ${interview.jobDescriptionSnapshot}
- Candidate Background: ${interview.resumeSnapshot}
- Interview Type: ${interview.template?.name ?? 'General'}

## Evaluation Dimensions
Score each dimension from 1-10 and provide specific feedback:

${dimensionInstructions}

## Full Interview Transcript
${transcript}

## Output Requirements
Return a JSON object with this exact structure:
{
  "dimensions": [
    {
      "id": "dim_1",
      "name": "Overall Impression",
      "score": 8,
      "maxScore": 10,
      "weight": 0.15,
      "feedback": "The candidate demonstrated strong potential with clear communication and relevant experience...",
      "highlights": [
        "Clear articulation of career goals",
        "Specific metrics when discussing achievements"
      ],
      "suggestions": [
        "Provide more specific examples for leadership claims",
        "Practice structuring answers using STAR format"
      ]
    }
    // ... repeat for all dimensions
  ]
}

## Scoring Guidelines
- 9-10: Exceptional, exceeds expectations significantly
- 7-8: Strong, meets expectations with notable strengths
- 5-6: Adequate, meets basic expectations
- 3-4: Below expectations, needs improvement
- 1-2: Significantly below expectations

Be specific and actionable in feedback. Reference exact moments from the transcript.
`;
}
```

## 7. User Interface

### 7.1 Feedback Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Interview Feedback                    Interview #3   [Share]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Overall Score: 7.4 / 10                                        │
│  ████████████████████████████████░░░░░░░░░░░░░░░░░░  74%        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📈 Compared to Interview #2 (Dec 15)                   │    │
│  │                                                         │    │
│  │  ↑ Improved: Communication (+1.2), Structure (+0.8)     │    │
│  │  ↓ Declined: Content Quality (-0.5)                     │    │
│  │  → Stable: Professional Presence, Critical Thinking     │    │
│  │                                                         │    │
│  │  Overall trend: Improving                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Dimension Cards

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Detailed Breakdown                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Communication Clarity                        8.2 / 10   │    │
│  │ ████████████████████████████████░░░░░░░░░░░░░░░░░░░░░   │    │
│  │ ↑ +1.2 from last interview                              │    │
│  │                                                         │    │
│  │ You articulated your thoughts clearly with appropriate  │    │
│  │ vocabulary. Responses were well-paced and easy to       │    │
│  │ follow.                                                 │    │
│  │                                                         │    │
│  │ ✓ Highlights:                                           │    │
│  │   • "Clear explanation of project impact metrics"       │    │
│  │   • "Effective use of transition phrases"               │    │
│  │                                                         │    │
│  │ → Suggestions:                                          │    │
│  │   • Reduce filler words ("um", "like")                  │    │
│  │   • Vary sentence structure for engagement              │    │
└─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Content Quality                              6.8 / 10   │    │
│  │ ██████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░   │    │
│  │ ↓ -0.5 from last interview                              │    │
│  │                                                         │    │
│  │ Answers showed good understanding but lacked specific   │    │
│  │ examples in some areas. Quantifiable results were       │    │
│  │ missing from leadership stories.                        │    │
│  │ ...                                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [View all 9 dimensions...]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Radar Chart

```
                    Overall Impression
                           8.0
                          /   \
          Self-Awareness /     \ Content Quality
               7.2      ●       ●      6.8
                       / \     / \
                      /   \   /   \
    Critical        ●     \ /     ●    Structure
    Thinking 7.5    |      ●      |       7.8
                    |    Center   |
                    |             |
    Cultural Fit  ● ─ ─ ─ + ─ ─ ─ ● Communication
         6.5                           8.2
                    \             /
                     \           /
                      ●    ●    ●
               Listening  |  Professional
                  7.0     |     7.2
```

### 7.4 Progress Over Time

```
┌─────────────────────────────────────────────────────────────────┐
│  📈 Your Progress                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Overall Score Trend                                            │
│                                                                 │
│  10 ┤                                                           │
│   9 ┤                                        ●                  │
│   8 ┤                           ●────────────                   │
│   7 ┤              ●────────────                                │
│   6 ┤  ●───────────                                             │
│   5 ┤                                                           │
│     └──────────────────────────────────────────────────────     │
│       Dec 1      Dec 8       Dec 15      Dec 22                 │
│       #1         #2          #3          #4                     │
│                                                                 │
│  Best improvement: Communication (+2.5 over 4 interviews)       │
│  Focus area: Content Quality (declined in last 2)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 8. API Endpoints

```typescript
// src/server/api/routers/feedback.ts

export const feedbackRouter = createTRPCRouter({
  // Get feedback for an interview
  getByInterviewId: flexibleProcedure
    .input(z.object({
      interviewId: z.string(),
      guestToken: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Returns full feedback with dimensions and comparison
    }),

  // Get progress over multiple interviews
  getProgress: protectedProcedure
    .input(z.object({
      templateId: z.string().optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      // Returns array of feedbacks with scores over time
    }),

  // Get block transcripts
  getBlockTranscripts: flexibleProcedure
    .input(z.object({
      interviewId: z.string(),
      guestToken: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Returns per-block transcripts and summaries
    }),
});
```

## 9. Implementation Phases

### Phase 1: Schema Updates
- Add BlockTranscript model
- Extend InterviewFeedback with dimensions JSON
- Add historicalComparison field
- Database migration

### Phase 2: Block Storage
- Per-block transcript storage
- Answer summary generation
- Block result processing

### Phase 3: Extended Feedback Generation
- 9-dimension feedback prompt
- Weighted score calculation
- Historical comparison logic

### Phase 4: Frontend Display
- Dimension cards UI
- Radar chart visualization
- Progress over time chart
- Comparison highlights

### Phase 5: Teacher View (Future)
- Aggregate view of all student progress
- Exportable reports
- Batch feedback comparison

## 10. Migration Strategy

### Backwards Compatibility
- Legacy fields (summary, strengths, etc.) remain populated
- Old feedback records continue to work
- New `dimensions` field is additive

### Data Migration
```sql
-- Migrate existing feedback to new format (optional)
UPDATE "InterviewFeedback"
SET dimensions = json_build_array(
  json_build_object(
    'id', 'legacy_summary',
    'name', 'Overall Impression',
    'score', null,
    'feedback', summary
  ),
  -- ... map other legacy fields
)
WHERE dimensions IS NULL;
```

## 11. Dependencies

- **FEAT27 (Block-Based Interview)** - Block structure, per-question transcripts
- Gemini API for feedback generation
- Chart library for visualizations (recharts or chart.js)

---

## 12. References

- Partner feedback: "6-9 dimensions", "compare with historical interviews"
- Current implementation: [worker/src/utils/feedback.ts](../../worker/src/utils/feedback.ts)
- Related: FEAT27 (Block-Based Interview Architecture)
