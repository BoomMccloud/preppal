---
name: verify
description: Verify that a feature specification is implementable against the actual codebase. Use when a user has written a spec/design doc that references files, methods, libraries, data models, or naming conventions and wants to validate these exist and are correct before implementation begins. Produces a detailed verification report with actionable fixes.
---

# Spec Verification

Verify that a feature specification aligns with the actual codebase before implementation begins. This skill analyzes specs to catch mismatches between what the spec assumes and what the codebase actually contains.

## When to Use This Skill

Use this skill when:

- User has written a feature spec, technical design doc, or implementation plan
- The spec references specific files, methods, classes, libraries, or data models
- User wants to validate the spec is implementable before starting work
- User asks to "verify", "validate", or "check" a spec against the codebase

## Verification Workflow

### Stage 1: Spec Analysis

First, parse the spec to extract all verifiable claims:

1. **File References**: Extract all file paths mentioned
   - Source files to modify
   - Config files to update
   - Test files to create/modify

2. **Code References**: Extract all code entities mentioned
   - Classes, interfaces, types
   - Methods, functions
   - Constants, enums
   - Module exports

3. **Library/Dependency References**: Extract external dependencies
   - Package names and versions
   - Import statements
   - API calls to external libraries

4. **Data Model References**: Extract data structures
   - Database tables/collections
   - Schema definitions
   - API request/response shapes

5. **Naming Conventions**: Extract naming patterns used
   - Variable/function naming style
   - File naming patterns
   - Directory structure assumptions

### Stage 2: Codebase Verification

For each extracted reference, verify against the actual codebase:

#### File Verification

```
For each file path in spec:
  1. Check if file exists at specified path
  2. If not found, search for similar filenames
  3. Record: EXISTS | NOT_FOUND | SIMILAR_FOUND (with suggestions)
```

#### Method/Function Verification

```
For each method reference:
  1. Locate the containing file
  2. Parse to find the method/function
  3. Verify it is exported/public (callable from intended context)
  4. Compare signature (parameters, return type) if specified in spec
  5. Record: MATCH | NOT_FOUND | SIGNATURE_MISMATCH | NOT_EXPORTED
```

#### Library Verification

```
For each library reference:
  1. Check package manifest (package.json, requirements.txt, Cargo.toml, go.mod, etc.)
  2. Determine if library is installed
  3. If spec mentions library A but codebase uses library B for same purpose, flag it
  4. Record: INSTALLED | NOT_INSTALLED | ALTERNATIVE_IN_USE (with details)
```

#### Data Model Verification

```
For each data model reference:
  1. Search for type definitions, schemas, or model files
  2. Compare field names and types
  3. Check for missing or extra fields
  4. Record: MATCH | NOT_FOUND | FIELDS_DIFFER (with diff)
```

#### Naming Convention Verification

```
For naming patterns:
  1. Sample existing code in relevant directories
  2. Infer naming conventions (camelCase, snake_case, PascalCase, etc.)
  3. Compare spec's proposed names against inferred patterns
  4. Record: CONSISTENT | INCONSISTENT (with codebase examples)
```

### Automated Verification with verify.ts

This skill includes a TypeScript helper script at `.claude/skills/verify/verify.ts` that automates verification checks. **Use this script instead of manual grep/find commands.**

#### Running the Script

```bash
npx ts-node .claude/skills/verify/verify.ts <command> [options]
```

#### Command Reference

| Verification Task | Script Command |
|-------------------|----------------|
| Check if file exists | `find-file <path>` |
| Find function/method | `find-function <name> [--file <hint>]` |
| Check dependency installed | `check-dependency <package>` |
| Verify symbol is exported | `check-export <symbol> <file>` |
| Compare function signature | `check-signature <symbol> <file> [--expected "<sig>"]` |
| Analyze naming conventions | `naming-convention [--sample-size <n>]` |
| Get all types in a file | `analyze-types <file>` |

#### Example Usage

```bash
# File verification
npx ts-node .claude/skills/verify/verify.ts find-file src/services/AuthService.ts

# Method verification with file hint
npx ts-node .claude/skills/verify/verify.ts find-function createUser --file src/services/UserService.ts

# Library verification
npx ts-node .claude/skills/verify/verify.ts check-dependency axios

# Export verification
npx ts-node .claude/skills/verify/verify.ts check-export UserService src/services/UserService.ts

# Signature comparison
npx ts-node .claude/skills/verify/verify.ts check-signature findById src/repositories/UserRepository.ts --expected "(id: string): Promise<User>"

# Naming convention analysis
npx ts-node .claude/skills/verify/verify.ts naming-convention --sample-size 50

# Full type analysis of a file
npx ts-node .claude/skills/verify/verify.ts analyze-types src/models/User.ts
```

The script outputs JSON results with status codes (`EXISTS`, `NOT_FOUND`, `INSTALLED`, `EXPORTED`, `MATCH`, `MISMATCH`, etc.) that can be directly incorporated into the verification report.

### Stage 3: Report Generation

Generate a structured verification report with the following sections:

## Report Format

```markdown
# Spec Verification Report

**Spec**: [spec filename or title]
**Verified**: [timestamp]
**Overall Status**: ✅ PASS | ⚠️ WARNINGS | ❌ BLOCKING ISSUES

---

## Summary

- **Files**: X verified, Y issues
- **Methods/Functions**: X verified, Y issues
- **Libraries**: X verified, Y issues
- **Data Models**: X verified, Y issues
- **Naming**: X consistent, Y inconsistent

---

## Blocking Issues

Issues that must be fixed before implementation can proceed.

### [ISSUE-001] File not found: `src/services/AuthService.ts`

**Spec says**: Modify `src/services/AuthService.ts` to add new method
**Reality**: File does not exist

**Suggested fix**:

- Did you mean `src/services/auth/AuthenticationService.ts`?
- Or this is a new file that needs to be created first

---

### [ISSUE-002] Method signature mismatch: `UserRepository.findByEmail`

**Spec says**: `findByEmail(email: string): Promise<User>`
**Reality**: `findByEmail(email: string, includeDeleted?: boolean): Promise<User | null>`

**Suggested fix**:

- Update spec to include optional `includeDeleted` parameter
- Note that return type is `User | null`, not `User`

---

## Warnings

Non-blocking issues that should be reviewed.

### [WARN-001] Library mismatch

**Spec says**: Use `axios` for HTTP requests
**Reality**: Codebase uses `fetch` wrapper in `src/lib/http.ts`

**Recommendation**: Use existing `http` module for consistency

---

### [WARN-002] Naming inconsistency

**Spec proposes**: `getUserData()`
**Codebase pattern**: Methods use `fetch` prefix: `fetchUser()`, `fetchOrders()`

**Recommendation**: Rename to `fetchUserData()` for consistency

---

## Verified Items ✅

Items that passed verification.

| Category | Reference              | Status                       |
| -------- | ---------------------- | ---------------------------- |
| File     | `src/models/User.ts`   | ✅ Exists                    |
| Method   | `UserService.create()` | ✅ Exists, signature matches |
| Library  | `zod`                  | ✅ Installed (v3.22.0)       |
| Model    | `UserSchema`           | ✅ Fields match              |

---

## Recommendations

1. **Before implementing**: Fix all blocking issues listed above
2. **Consider**: Addressing warnings for better codebase consistency
3. **Missing context**: [Any areas where verification was inconclusive]
```

## Language-Specific Verification

Adapt verification approach based on detected language:

### JavaScript/TypeScript

- Check `package.json` for dependencies
- Parse with TypeScript compiler API or AST for exports
- Look for `.d.ts` files for type definitions
- Check `tsconfig.json` paths for import aliases

### Python

- Check `requirements.txt`, `pyproject.toml`, or `setup.py`
- Look for `__init__.py` exports
- Check type hints in function signatures
- Examine `__all__` for explicit exports

### Go

- Check `go.mod` for dependencies
- Verify exported functions (capitalized names)
- Check interface implementations

### Rust

- Check `Cargo.toml` for dependencies
- Verify `pub` visibility modifiers
- Check trait implementations

### Java/Kotlin

- Check `pom.xml` or `build.gradle` for dependencies
- Verify `public` access modifiers
- Check package structure

## Verification Commands

Use these shell commands to aid verification:

```bash
# Find files by name pattern
find . -name "*.ts" -path "*/src/*" | grep -i "auth"

# Search for function/method definitions
grep -rn "function methodName\|def methodName\|func methodName" --include="*.{ts,js,py,go}"

# Check if export exists (JS/TS)
grep -rn "export.*ClassName\|export default" src/

# List dependencies
cat package.json | jq '.dependencies, .devDependencies'
pip list
go list -m all

# Find type/interface definitions
grep -rn "interface.*TypeName\|type.*TypeName\|class.*ClassName" --include="*.ts"
```

## Handling Ambiguity

When verification is inconclusive:

1. **Multiple matches**: List all candidates and ask user to clarify
2. **Partial matches**: Show what was found and what's missing
3. **Dynamic code**: Flag that static analysis can't verify (e.g., dynamic imports, metaprogramming)
4. **External services**: Note that API contracts can't be verified without additional context

## Output

Always produce the full verification report as a markdown file. Save to a sensible location like:

- `spec-verification-report.md` in the same directory as the spec
- Or a dedicated `docs/` or `reports/` directory if one exists

After generating the report, summarize the key findings conversationally and highlight the most critical issues that need attention.
