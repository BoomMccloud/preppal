---
name: maintain
description: Evaluate whether code and implementation specs will be maintainable 6 months later by the same person or a new team member. Use when reviewing specs, PRs, or implementation plans to ensure the code can be understood when context is lost.
---

# Maintainability Assessment

This skill evaluates whether a proposed implementation or existing code will be understandable 6 months from now - when you've forgotten the context, or when a new team member encounters it for the first time.

## When to Use This Skill

**Trigger conditions:**

- Reviewing an implementation spec before coding
- PR review for significant features
- User asks "will this make sense later?" or "is this maintainable?"
- Evaluating code that feels clever or non-obvious
- Planning a refactor of complex code
- Onboarding concerns about existing code

**Initial Assessment:**

When triggered, explain that you'll evaluate the implementation against the "6-Month Test" - imagining you've completely forgotten the context and are reading this code for the first time.

## The 6-Month Test Framework

### 1. The "Fresh Eyes" Test

**Core Question: "Can someone understand this without asking the author?"**

**What to Check:**

- **Names tell the story** - Do function/variable/file names explain intent?
  - Bad: `handleData()`, `processStuff()`, `utils.ts`
  - Good: `validateUserInput()`, `calculateTaxFromSubtotal()`, `priceFormatters.ts`

- **Flow is traceable** - Can you follow execution without jumping around?
  - Bad: 7 files to understand one user action
  - Good: Related logic lives together, clear entry points

- **Behavior is predictable** - Does code do what its name suggests?
  - Bad: `getUser()` that also updates a cache and logs analytics
  - Good: `getUser()` returns a user, that's it

**Red Flags:**

- Comments that explain WHAT (code should do that)
- Magic numbers or strings without explanation
- Acronyms or abbreviations that aren't universally known
- "Helper" or "Utils" files with unrelated functions

**Green Flags:**

- Code reads like prose
- Tests serve as documentation
- Clear separation between "what" (business logic) and "how" (infrastructure)

### 2. The "Why Not What" Test

**Core Question: "Are non-obvious decisions explained?"**

**What to Check:**

- **Decisions are documented** - Why this approach over alternatives?
  - Bad: Complex code with no explanation
  - Good: Comment or doc explaining the tradeoff

- **Constraints are visible** - Are limitations/requirements noted?
  - Bad: Workaround code that looks wrong
  - Good: `// API returns max 100 items, so we paginate`

- **Historical context preserved** - Why does this weird thing exist?
  - Bad: Legacy code that no one dares touch
  - Good: `// Workaround for Safari bug, see issue #123`

**Documentation Levels:**

1. **Code comments** - For "why" at the line level
2. **Function/class docs** - For contracts and edge cases
3. **README files** - For architectural decisions
4. **Spec documents** - For feature-level context

**Red Flags:**

- Complex logic with no explanation
- Workarounds without links to issues
- "TODO: fix later" without context
- Configuration values without explanation

**Green Flags:**

- Spec documents that survive implementation
- Comments explaining business rules, not code mechanics
- Links to external docs/issues where relevant

### 3. The "Mental Model" Test

**Core Question: "Can I build a correct mental model in 5 minutes?"**

**What to Check:**

- **Clear entry points** - Where does execution start?
  - Bad: Scattered initialization across files
  - Good: Single entry point, clear initialization

- **Obvious state ownership** - Who owns what data?
  - Bad: State scattered across components/modules
  - Good: Clear single source of truth, documented

- **Predictable patterns** - Same problems solved the same way?
  - Bad: Three different error handling approaches
  - Good: Consistent patterns throughout

**Complexity Budget:**

Every feature has a "complexity budget" - how much a reader can hold in their head:

| Complexity          | Budget  |
| ------------------- | ------- |
| Files to understand | 3-5 max |
| State locations     | 1-2 max |
| Abstraction layers  | 2-3 max |
| Concepts to learn   | 3-5 max |

**Red Flags:**

- Multiple valid interpretations of how code works
- State that can be modified from many places
- Patterns that differ from rest of codebase
- Circular dependencies

**Green Flags:**

- "Aha!" moment comes quickly
- State flows in one direction
- Consistent with codebase conventions

### 4. The "Grep Test"

**Core Question: "Can I find what I'm looking for?"**

**What to Check:**

- **Searchable names** - Unique, greppable identifiers
  - Bad: `status`, `data`, `handler`, `type`
  - Good: `InterviewStatus`, `BlockCompletionData`, `onBlockTransition`

- **Colocated related code** - Things that change together live together
  - Bad: Types in `/types`, logic in `/utils`, components in `/components`
  - Good: Feature folder with all related code

- **Discoverable structure** - File names match what's inside
  - Bad: `helpers.ts` with 20 unrelated functions
  - Good: `priceCalculation.ts` with price calculation functions

**Red Flags:**

- Generic names used everywhere
- `index.ts` files with lots of logic
- Re-exports that obscure location
- Deeply nested folder structures

**Green Flags:**

- Can find any function in < 30 seconds
- File names are descriptive
- Related code is adjacent

### 5. The "Change Confidence" Test

**Core Question: "Could I safely modify this code?"**

**What to Check:**

- **Blast radius is clear** - What else might break?
  - Bad: Changing one thing ripples everywhere
  - Good: Clear boundaries, obvious dependencies

- **Tests explain behavior** - What should this code do?
  - Bad: No tests, or tests that test implementation
  - Good: Tests describe behavior, serve as spec

- **Rollback is possible** - Can we undo this safely?
  - Bad: Migrations that can't be reversed
  - Good: Feature flags, reversible changes

**Red Flags:**

- "Don't touch this" warnings
- No test coverage
- Implicit dependencies (globals, singletons)
- Tightly coupled modules

**Green Flags:**

- High test coverage with descriptive test names
- Clear module boundaries
- Changes can be isolated

### 6. The "Onboarding" Test

**Core Question: "Could a new team member work on this?"**

**What to Check:**

- **Setup is documented** - How do I run this?
- **Architecture is explained** - How do pieces fit together?
- **Vocabulary is defined** - What do domain terms mean?
- **Examples exist** - How has similar work been done?

**Red Flags:**

- Tribal knowledge required
- "Ask X, they know how this works"
- Setup requires multiple undocumented steps
- Domain terms used without definition

**Green Flags:**

- README with quick start
- Architecture diagrams or docs
- Glossary of domain terms
- Similar features to reference

## The Maintainability Evaluation Process

### Step 1: Understand the Scope

Review the spec/code and identify:

- What is the feature/change?
- What files/modules are involved?
- What are the key decisions made?

### Step 2: Apply the Six Tests

For each test, evaluate:

- **PASS**: Maintainable, will be understood later
- **WARNING**: Some concerns, may need attention
- **FAIL**: Will cause confusion, needs improvement

### Step 3: Score and Prioritize

| Score    | Meaning                           |
| -------- | --------------------------------- |
| 6/6 PASS | Ship it                           |
| 4-5 PASS | Good, minor improvements optional |
| 2-3 PASS | Address failures before shipping  |
| 0-1 PASS | Major rework needed               |

### Step 4: Provide Recommendations

For each WARNING or FAIL:

- What specifically is the problem?
- What's the risk in 6 months?
- What's the concrete fix?

## Spec Document Evaluation

When evaluating a spec document (like FEAT44), check:

### Document Structure

- [ ] Problem statement is clear
- [ ] Root cause is explained (not just symptoms)
- [ ] Solution approach is justified
- [ ] Alternatives were considered
- [ ] Files to modify are listed
- [ ] Acceptance criteria are testable

### Code Changes Clarity

- [ ] Before/after code examples
- [ ] Clear diff of what changes
- [ ] No ambiguous instructions
- [ ] Edge cases addressed

### Future Reader Value

- [ ] Explains WHY this approach
- [ ] Links to related issues/specs
- [ ] Documents tradeoffs made
- [ ] Survives as useful reference

## Example Evaluation

### Example: FEAT44 Session Architecture Simplification

**Fresh Eyes Test:** PASS

- Clear problem statement with specific bug description
- Before/after code examples show the change
- Diagrams explain the flow

**Why Not What Test:** PASS

- Root cause analysis explains the hidden state problem
- First-principle analysis documents WHY this design
- Tradeoffs explicitly discussed

**Mental Model Test:** PASS

- Single concept: "make driver stateless"
- State topology diagram shows before/after
- Flow diagrams are clear

**Grep Test:** PASS

- Command names are unique (`CONNECT_FOR_BLOCK`)
- File locations explicitly listed
- Searchable terms used

**Change Confidence Test:** PASS

- Tests listed with grep patterns
- Acceptance criteria are checkable
- Single PR approach reduces risk

**Onboarding Test:** PASS

- Appendix provides architecture comparison
- First-principle checklist serves as learning material
- Self-contained document

**Overall: 6/6 - This spec will be maintainable**

The document itself will serve as valuable context 6 months later. A new developer could read this and understand both the change AND the architectural principles behind it.

## Anti-Patterns to Flag

### 1. "Clever" Code

```typescript
// Bad: Clever, hard to understand later
const result = items.reduce(
  (a, b) => ({ ...a, [b.id]: (a[b.id] || 0) + b.val }),
  {},
);

// Good: Clear, boring, maintainable
const result: Record<string, number> = {};
for (const item of items) {
  result[item.id] = (result[item.id] || 0) + item.val;
}
```

### 2. Implicit Dependencies

```typescript
// Bad: Requires knowing global state exists
function processOrder() {
  const user = getCurrentUser(); // Where does this come from?
  const cart = getCart(); // Global state?
}

// Good: Explicit dependencies
function processOrder(user: User, cart: Cart) {
  // Clear what's needed
}
```

### 3. Naming That Requires Context

```typescript
// Bad: Need context to understand
const flag = true;
const temp = getData();
handleIt(temp);

// Good: Self-documenting
const isUserAuthenticated = true;
const userPreferences = await fetchUserPreferences();
applyUserPreferences(userPreferences);
```

### 4. Missing "Why" Comments

```typescript
// Bad: No explanation for non-obvious code
setTimeout(callback, 100);

// Good: Explains the why
// Delay needed because DOM needs to repaint before measurement
// See: https://github.com/org/repo/issues/123
setTimeout(callback, 100);
```

## Integration with Other Skills

This skill works well with:

- **KISS**: Simple code is more maintainable. Use KISS first, then verify maintainability.
- **First-Principle**: Good architecture is inherently more maintainable. First-principle ensures the design is sound, maintainability ensures it's understandable.
- **Verify**: After verifying a spec is implementable, check if it's maintainable.

## The Maintainability Mantra

**"Write code for the person who will read it in 6 months - it might be you, and you will have forgotten everything."**

Remember:

- Names matter more than comments
- Boring is better than clever
- Explicit is better than implicit
- Consistency beats perfection
- Documents decay slower than memory
