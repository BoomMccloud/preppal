# FEAT20: Interview Language Support (AI Speaks Multiple Languages)

## Objective

Allow users to practice interviews in any of 12 major languages, independent of the UI language. The AI interviewer (powered by Gemini) will conduct the entire interview in the user's selected language.

## Summary of Decisions

| Decision | Choice |
|----------|--------|
| Supported Languages | 12 major languages (see list below) |
| Default Language | Match user's UI language if available, else English |
| Prompt Injection | Simple instruction: "Conduct this interview entirely in {language}" |
| Storage | `language` field on Interview model (already exists) |

**Supported AI Interview Languages:**
1. English
2. Spanish
3. Mandarin Chinese
4. French
5. German
6. Japanese
7. Korean
8. Portuguese
9. Italian
10. Russian
11. Arabic
12. Hindi

---

## Status Checklist

- [ ] **2.1** Create AI languages constants file
- [ ] **2.2** Add `defaultInterviewLanguage` to User model
- [ ] **2.3** Update tRPC `createSession` to accept `language` parameter
- [ ] **2.4** Update tRPC `getContext` to return `language`
- [ ] **2.5** Update Worker `InterviewContext` interface
- [ ] **2.6** Modify `buildSystemPrompt` to inject language instruction
- [ ] **2.7** Update `GeminiSession` to handle language in context
- [ ] **2.8** Add language dropdown to CreateInterview form
- [ ] **2.9** Default dropdown to user's UI/preferred language
- [ ] **2.10** Test interviews in multiple languages

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| FEAT19 (UI Localization) | Optional | If implemented, use user's `uiLanguage` as default |
| Interview `language` field | Done | Already exists in Prisma schema with `@default("en")` |

This feature can be implemented **independently** of UI localization. The language dropdown will work even if the UI is English-only.

---

## Detailed Implementation Steps

### 2.1 Create AI Languages Constants File

**Create file:** `src/lib/constants/ai-languages.ts`

```typescript
/**
 * Languages supported for AI interview practice
 * These are languages Gemini can speak - independent from UI translations
 */

export interface AILanguage {
  code: string;       // ISO 639-1 code
  name: string;       // English name (for non-localized contexts)
  nativeName: string; // Name in the native language
}

/**
 * List of languages the AI interviewer can speak
 * Order determines display order in dropdowns
 */
export const AI_LANGUAGES: AILanguage[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Espanol" },
  { code: "zh", name: "Mandarin Chinese", nativeName: "中文" },
  { code: "fr", name: "French", nativeName: "Francais" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "pt", name: "Portuguese", nativeName: "Portugues" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
];

/**
 * Map of language codes to full names (for prompt building)
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Mandarin Chinese",
  fr: "French",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
};

/**
 * Get AI language by code
 * @returns The language object, or English as fallback
 */
export function getAILanguage(code: string): AILanguage {
  return AI_LANGUAGES.find((lang) => lang.code === code) ?? AI_LANGUAGES[0]!;
}

/**
 * Check if a language code is supported for AI interviews
 */
export function isAILanguageSupported(code: string): boolean {
  return AI_LANGUAGES.some((lang) => lang.code === code);
}

/**
 * Get the display name for a language code
 * Shows native name with English name in parentheses
 */
export function getLanguageDisplayName(code: string): string {
  const lang = getAILanguage(code);
  if (lang.code === "en") return lang.name;
  return `${lang.nativeName} (${lang.name})`;
}
```

---

### 2.2 Add `defaultInterviewLanguage` to User Model

**Modify file:** `prisma/schema.prisma`

Add field to the `User` model:
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?

  uiLanguage              String @default("en")  // From FEAT19
  defaultInterviewLanguage String @default("en") // ADD THIS - preferred interview language

  accounts      Account[]
  sessions      Session[]
  // ... other relations
}
```

**Run migration:**
```bash
pnpm db:push
```

---

### 2.3 Update tRPC `createSession` to Accept `language`

**Modify file:** `src/server/api/routers/interview.ts`

**Step A: Update the input schema**

Find the `createSession` mutation (around line 38) and add `language` to the input:

```typescript
createSession: protectedProcedure
  .input(
    z.object({
      jobDescription: JobDescriptionInput,
      resume: ResumeInput,
      idempotencyKey: z.string().min(1),
      persona: z.string().optional(),
      language: z.string().default("en"), // ADD THIS LINE
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // ... existing logic
  }),
```

**Step B: Save language when creating the interview**

Find where the interview is created (around line 70) and add `language`:

```typescript
const interview = await ctx.db.interview.create({
  data: {
    userId: ctx.session.user.id,
    idempotencyKey: input.idempotencyKey,
    jobTitleSnapshot: input.jobDescription.content.slice(0, 100),
    jobDescriptionSnapshot: input.jobDescription.content,
    resumeSnapshot: input.resume.content,
    persona: input.persona,
    language: input.language, // ADD THIS LINE
  },
});
```

---

### 2.4 Update tRPC `getContext` to Return `language`

**Modify file:** `src/server/api/routers/interview.ts`

Find the `getContext` query (around line 469) and update it:

```typescript
getContext: workerProcedure
  .input(z.object({ interviewId: z.string() }))
  .query(async ({ ctx, input }) => {
    const interview = await ctx.db.interview.findUnique({
      where: { id: input.interviewId },
      select: {
        jobDescriptionSnapshot: true,
        resumeSnapshot: true,
        persona: true,
        language: true, // ADD THIS LINE
      },
    });

    if (!interview) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Interview not found",
      });
    }

    return {
      jobDescription: interview.jobDescriptionSnapshot ?? "",
      resume: interview.resumeSnapshot ?? "",
      persona: interview.persona ?? "professional interviewer",
      language: interview.language ?? "en", // ADD THIS LINE
    };
  }),
```

---

### 2.5 Update Worker `InterviewContext` Interface

**Modify file:** `worker/src/interfaces/index.ts`

```typescript
/**
 * Context passed to the AI for conducting the interview
 */
export interface InterviewContext {
  jobDescription: string;
  resume: string;
  persona: string;
  language: string; // ADD THIS LINE - ISO 639-1 code (e.g., "en", "es", "zh")
}
```

---

### 2.6 Modify `buildSystemPrompt` to Inject Language Instruction

**Modify file:** `worker/src/utils/build-system-prompt.ts`

```typescript
import { type InterviewContext } from "../interfaces";

/**
 * Map of language codes to full names for prompt injection
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Mandarin Chinese",
  fr: "French",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
};

/**
 * Get human-readable language name from ISO code
 * Falls back to the code itself if not found
 */
function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

/**
 * Builds the system prompt for the Gemini interview AI
 * Includes job description, resume, persona, and language instruction
 */
export function buildSystemPrompt(context: InterviewContext): string {
  // Build optional sections
  const jdSection = context.jobDescription
    ? `\n\nJOB DESCRIPTION:\n${context.jobDescription}`
    : "";

  const resumeSection = context.resume
    ? `\n\nCANDIDATE RESUME:\n${context.resume}`
    : "";

  // Language instruction - only add if NOT English
  const languageInstruction =
    context.language && context.language !== "en"
      ? `\n\nIMPORTANT LANGUAGE INSTRUCTION: Conduct this entire interview in ${getLanguageName(context.language)}. All your questions, responses, and feedback must be in ${getLanguageName(context.language)}. Do not switch to English unless the candidate explicitly requests it.`
      : "";

  return `You are a ${context.persona}.
Your goal is to conduct a behavioral interview for the candidate.${jdSection}${resumeSection}${languageInstruction}

Start by introducing yourself briefly and asking the candidate to introduce themselves.`;
}
```

---

### 2.7 Update `GeminiSession` to Handle Language in Context

**Modify file:** `worker/src/gemini-session.ts`

**Step A: Update the default interviewContext (around line 35)**

```typescript
private interviewContext: InterviewContext = {
  jobDescription: "",
  resume: "",
  persona: "professional interviewer",
  language: "en", // ADD THIS LINE
};
```

**Step B: Update where context is fetched and assigned**

Find the method that fetches context from the API (look for `fetchInterviewContext` or similar) and ensure language is included:

```typescript
// When parsing the API response:
this.interviewContext = {
  jobDescription: contextData.jobDescription ?? "",
  resume: contextData.resume ?? "",
  persona: contextData.persona ?? "professional interviewer",
  language: contextData.language ?? "en", // ADD THIS LINE
};
```

---

### 2.8 Add Language Dropdown to CreateInterview Form

**Modify file:** `src/app/(app)/create-interview/page.tsx`
(or `src/app/[locale]/(app)/create-interview/page.tsx` if FEAT19 is implemented)

**Step A: Add import at the top**

```typescript
import { AI_LANGUAGES, getLanguageDisplayName } from "@/lib/constants/ai-languages";
```

**Step B: Add state for language**

```typescript
const [language, setLanguage] = useState("en");
```

**Step C: Add the dropdown in the form (after the persona field)**

```typescript
{/* Interview Language */}
<div>
  <label
    htmlFor="language"
    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
  >
    Interview Language
  </label>
  <select
    id="language"
    value={language}
    onChange={(e) => setLanguage(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  >
    {AI_LANGUAGES.map((lang) => (
      <option key={lang.code} value={lang.code}>
        {lang.nativeName} ({lang.name})
      </option>
    ))}
  </select>
  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
    The AI interviewer will conduct the interview in this language
  </p>
</div>
```

**Step D: Update the mutation call**

```typescript
createInterviewMutation.mutate({
  jobDescription: { type: "text", content: jobDescription },
  resume: { type: "text", content: resume },
  idempotencyKey,
  persona: persona.trim() || undefined,
  language, // ADD THIS LINE
});
```

---

### 2.9 Default Dropdown to User's Preferred Language

**Option A: If FEAT19 (UI Localization) is implemented**

Use the current locale from next-intl:

```typescript
import { useLocale } from "next-intl";
import { isAILanguageSupported } from "@/lib/constants/ai-languages";

export default function CreateInterviewPage() {
  const locale = useLocale();

  // Default to current UI locale if it's a supported AI language, else "en"
  const defaultLanguage = isAILanguageSupported(locale) ? locale : "en";
  const [language, setLanguage] = useState(defaultLanguage);

  // ... rest of component
}
```

**Option B: If FEAT19 is NOT implemented**

Fetch user's preference from the database:

```typescript
import { api } from "@/trpc/react";
import { isAILanguageSupported } from "@/lib/constants/ai-languages";

export default function CreateInterviewPage() {
  const { data: profile } = api.user.getProfile.useQuery();

  // Default to user's preference if available and supported
  const defaultLanguage =
    profile?.defaultInterviewLanguage &&
    isAILanguageSupported(profile.defaultInterviewLanguage)
      ? profile.defaultInterviewLanguage
      : "en";

  const [language, setLanguage] = useState(defaultLanguage);

  // Update state when profile loads
  useEffect(() => {
    if (profile?.defaultInterviewLanguage) {
      setLanguage(profile.defaultInterviewLanguage);
    }
  }, [profile]);

  // ... rest of component
}
```

---

### 2.10 (Optional) Add Language Preference to Profile Page

**Modify file:** `src/app/(app)/profile/page.tsx`

Allow users to set their default interview language:

```typescript
import { AI_LANGUAGES } from "@/lib/constants/ai-languages";

// In the form:
<div>
  <label
    htmlFor="defaultInterviewLanguage"
    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
  >
    Default Interview Language
  </label>
  <select
    id="defaultInterviewLanguage"
    value={defaultInterviewLanguage}
    onChange={(e) => setDefaultInterviewLanguage(e.target.value)}
    className="w-full px-3 py-2 border rounded-md"
  >
    {AI_LANGUAGES.map((lang) => (
      <option key={lang.code} value={lang.code}>
        {lang.nativeName} ({lang.name})
      </option>
    ))}
  </select>
  <p className="mt-1 text-sm text-gray-500">
    This will be pre-selected when you create new interviews
  </p>
</div>
```

**Update user router to save this preference:**

```typescript
// In src/server/api/routers/user.ts
updateProfile: protectedProcedure
  .input(
    z.object({
      defaultInterviewLanguage: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: {
        defaultInterviewLanguage: input.defaultInterviewLanguage,
      },
    });
    return { success: true };
  }),
```

---

## Testing Checklist

### Frontend Tests
- [ ] Language dropdown appears on CreateInterview form
- [ ] Dropdown shows all 12 languages with native names
- [ ] Selecting a language updates the state
- [ ] Form submits with selected language
- [ ] Default language matches user preference (if implemented)

### Backend Tests
- [ ] `createSession` accepts `language` parameter
- [ ] Interview is created with correct `language` value in database
- [ ] `getContext` returns the interview's `language`
- [ ] Worker receives `language` in the context

### Integration Tests
- [ ] Create interview with Spanish selected
- [ ] Verify AI greets user in Spanish
- [ ] AI asks questions in Spanish throughout
- [ ] AI provides feedback in Spanish
- [ ] Create interview with English - verify no language instruction in prompt

### Database Tests
```sql
-- Verify language is stored correctly
SELECT id, language FROM Interview WHERE userId = 'test-user-id';
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/constants/ai-languages.ts` | Create | AI language definitions |
| `prisma/schema.prisma` | Modify | Add `defaultInterviewLanguage` to User |
| `src/server/api/routers/interview.ts` | Modify | Add language to createSession input and getContext return |
| `worker/src/interfaces/index.ts` | Modify | Add `language` to InterviewContext |
| `worker/src/utils/build-system-prompt.ts` | Modify | Add language instruction to prompt |
| `worker/src/gemini-session.ts` | Modify | Handle language in context |
| `src/app/(app)/create-interview/page.tsx` | Modify | Add language dropdown |
| `src/app/(app)/profile/page.tsx` | Modify | (Optional) Add default language preference |
| `src/server/api/routers/user.ts` | Modify | (Optional) Add updateProfile for language pref |

---

## Estimated Effort

| Task | Complexity | Notes |
|------|------------|-------|
| Create constants file | Low | Straightforward |
| Update Prisma schema | Low | Single field addition |
| Update tRPC procedures | Low | Small changes to 2 procedures |
| Update Worker interfaces | Low | Single field addition |
| Modify system prompt | Low | Simple string injection |
| Update CreateInterview form | Medium | UI changes + state management |
| Testing | Medium | Need to verify AI actually speaks correct language |

**Total Estimated Effort:** 2-4 hours for a developer familiar with the codebase.

---

## Troubleshooting

### AI doesn't speak in the selected language
1. Check the Interview record in the database - is `language` correct?
2. Check the worker logs - is `language` in the context?
3. Check `buildSystemPrompt` output - is the language instruction present?
4. Try a more explicit prompt instruction

### Language dropdown doesn't show
1. Verify `ai-languages.ts` is correctly exported
2. Check for import errors in browser console
3. Ensure the component is rendering the select element

### Default language not working
1. Check if user profile query is returning `defaultInterviewLanguage`
2. Verify `useEffect` runs when profile data loads
3. Check `isAILanguageSupported` returns true for the code

---

## Future Enhancements

1. **Language detection**: Auto-detect user's language from browser settings
2. **Language-specific personas**: Different interviewer styles per culture
3. **Accent/dialect options**: e.g., Latin American Spanish vs. Castilian
4. **Voice selection**: Different Gemini voices for different languages
5. **Bilingual interviews**: Allow switching mid-interview
