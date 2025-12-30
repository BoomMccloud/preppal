---
name: mentor
description: Transform a feature spec and verification report into a detailed, step-by-step implementation guide for junior developers or interns. Use when you have a spec that needs to be turned into foolproof implementation instructions with exact file locations, code snippets, common mistakes to avoid, and test verification gates. Produces a single comprehensive document that requires no additional questions.
---

# Mentor

Transform feature specs into detailed implementation guides that an intern with no repository knowledge can follow without asking questions.

## When to Use This Skill

Use this skill when:

- You have a feature spec AND a verification report from the spec-verification skill
- You need to hand off implementation to a junior developer or intern
- You want step-by-step instructions with exact code snippets
- You need verification gates (tests) at each step
- You want to prevent common mistakes proactively

## Required Inputs

1. **Feature Spec**: The original spec document describing what to build
2. **Verification Report**: Output from the spec-verification skill showing what exists/doesn't exist
3. **Codebase Access**: Ability to read the actual repository files

## Mentor Workflow

### Phase 1: Analyze and Reconcile

Before writing instructions, reconcile the spec with verification findings:

#### 1.1 Fix Spec Errors

For each blocking issue in the verification report:

- Determine the correct file path, method name, or signature
- Note the correction for the implementation guide
- Read the actual file to understand context

#### 1.2 Identify Ambiguities

Flag and resolve ambiguities in the spec:

| Ambiguous Phrase   | Questions to Resolve                             |
| ------------------ | ------------------------------------------------ |
| "Add a method"     | New method? Modify existing? Which class?        |
| "Update the API"   | New endpoint? Modify existing? Which controller? |
| "Store the data"   | Database? Cache? File? Existing table or new?    |
| "Validate input"   | Which validation library? Existing patterns?     |
| "Handle errors"    | Throw? Return null? Log? Existing error types?   |
| "Make it secure"   | Auth? Rate limiting? Input sanitization?         |
| "Create a service" | New file? Add to existing? Which directory?      |
| "Add tests"        | Unit? Integration? Which test file?              |
| "Update the model" | Add field? Change type? Migration needed?        |
| "Call the API"     | Which method? What parameters? Error handling?   |

#### 1.3 Check for Duplication

**CRITICAL**: Before any "create new" instruction, search for existing implementations.

```bash
# Search for similar functionality
grep -rn "uploadImage\|imageUpload\|upload.*image" src/ --include="*.ts"

# Search for similar class/service names
find src -name "*Image*" -o -name "*Upload*"

# Search for existing API endpoints
grep -rn "router\.\(get\|post\|put\|delete\)" src/routes/
```

If similar functionality exists:

- ⛔ DO NOT instruct to create duplicate code
- ✅ Instruct to use or extend existing functionality
- 📝 Note in the guide: "We're using existing X instead of creating new"

#### 1.4 Map Exact Locations

For each change, read the actual file and identify:

```
File: src/services/UserService.ts
├── Line 1-5: Imports
├── Line 7: Class declaration starts
├── Line 10-25: constructor
├── Line 27-45: createUser method ← INSERT AFTER THIS
├── Line 47-62: findById method
└── Line 64: Class closes
```

Record:

- Exact line number for insertion
- 5 lines of context before
- 5 lines of context after
- Any imports needed (and where to add them)

### Phase 2: Generate Implementation Guide

Produce a single markdown file with this structure:

---

## Implementation Guide Format

````markdown
# Implementation Guide: [Feature Name]

**Based on Spec**: [spec filename]
**Verification Report**: [report filename]  
**Generated**: [date]
**Estimated Time**: [X hours for an intern]

---

## 📋 Overview

### What You're Building

[2-3 sentences explaining the feature in plain English]

### Deliverables

After completing this guide, you will have:

- [ ] [Specific deliverable 1]
- [ ] [Specific deliverable 2]
- [ ] [Specific deliverable 3]

### Files You Will Modify

| File                                         | Action | Summary                         |
| -------------------------------------------- | ------ | ------------------------------- |
| `src/services/UserService.ts`                | Modify | Add `uploadProfileImage` method |
| `src/routes/user.routes.ts`                  | Modify | Add new route                   |
| `src/services/__tests__/UserService.test.ts` | Modify | Add tests                       |

### ⛔ Out of Scope - DO NOT MODIFY

These files/areas are **not part of this task**. Do not modify them even if you think they need changes:

- `src/database/migrations/` - Database changes are a separate ticket
- `src/models/User.ts` - Model changes require migration (separate ticket)
- `src/middleware/auth.ts` - Auth changes need security review
- Any file not listed in "Files You Will Modify"

If you think something outside this scope needs changing, **stop and ask**.

---

## 🔧 Prerequisites

Before starting, complete these checks:

### 1. Environment Setup

```bash
# Verify you're in the correct directory
pwd
# Should output: /path/to/project

# Install dependencies
npm install

# Verify build works
npm run build
```
````

### 2. Verify Tests Pass

```bash
npm test
```

✅ All tests should pass before you start. If tests fail, **stop and report the issue**.

### 3. Create Your Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/[feature-name]
```

---

## 📍 Step 1: [First Task Title]

### Goal

[One sentence: what this step accomplishes and why]

### 📁 File

`src/services/UserService.ts`

### 🔍 Find This Location

Open the file and navigate to **line 45**. You should see this code:

```typescript
// Line 43
async findById(id: string): Promise<User | null> {
// Line 44
  return this.userRepository.findById(id);
// Line 45
}
// Line 46
// Line 47 (empty line)
```

You will add code **after line 47** (after the empty line following `findById`).

### ✏️ Add This Code

Insert the following code at **line 48**:

```typescript
/**
 * Upload a profile image for a user
 * @param userId - The user's ID
 * @param imageBuffer - The image file as a Buffer
 * @returns The URL of the uploaded image
 * @throws NotFoundError if user doesn't exist
 * @throws ValidationError if image is invalid
 */
async uploadProfileImage(userId: string, imageBuffer: Buffer): Promise<string> {
  // Verify user exists
  const user = await this.userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError(`User not found: ${userId}`);
  }

  // Validate image
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new ValidationError('Image buffer is empty');
  }

  // Upload to storage
  const uploadResult = await this.imageStorage.uploadImage(imageBuffer, {
    folder: 'profile-images',
    userId,
  });

  // Update user record
  await this.userRepository.updateById(userId, {
    profileImageUrl: uploadResult.url,
  });

  return uploadResult.url;
}
```

### 📥 Add Required Import

Go to **line 3** (with the other imports). Add this import:

```typescript
import { ValidationError } from "../errors/ValidationError";
```

Your imports section (lines 1-5) should now look like:

```typescript
import { UserRepository } from "../repositories/UserRepository";
import { ImageStorage } from "../lib/storage/ImageStorage";
import { ValidationError } from "../errors/ValidationError"; // ← NEW
import { NotFoundError } from "../errors/NotFoundError";
import { User } from "../models/User";
```

### ⚠️ Common Mistakes for This Step

#### Mistake 1: Wrong method name on ImageStorage

```typescript
// ❌ WRONG - this method doesn't exist
await this.imageStorage.upload(imageBuffer);

// ✅ CORRECT - use uploadImage
await this.imageStorage.uploadImage(imageBuffer, options);
```

#### Mistake 2: Missing await

```typescript
// ❌ WRONG - forgetting await causes silent failures
const user = this.userRepository.findById(userId);

// ✅ CORRECT - always await async calls
const user = await this.userRepository.findById(userId);
```

#### Mistake 3: Wrong import path

```typescript
// ❌ WRONG - old path structure
import { ValidationError } from "@/errors";

// ✅ CORRECT - current path structure
import { ValidationError } from "../errors/ValidationError";
```

#### Mistake 4: Wrong updateById signature

```typescript
// ❌ WRONG - missing userId parameter
await this.userRepository.update({ profileImageUrl: url });

// ✅ CORRECT - updateById requires id as first param
await this.userRepository.updateById(userId, { profileImageUrl: url });
```

### ✅ Verification Gate

Run this specific test file:

```bash
npm test src/services/__tests__/UserService.test.ts
```

**Expected Result:**

- All existing tests still pass
- You may see "uploadProfileImage" tests as pending/skipped (we'll write them in Step 3)
- **No TypeScript errors**
- **No lint errors**

**If You See Errors:**

| Error                                            | Likely Cause      | Fix                            |
| ------------------------------------------------ | ----------------- | ------------------------------ |
| `Cannot find module '../errors/ValidationError'` | Import path wrong | Check path matches exactly     |
| `Property 'uploadImage' does not exist`          | Wrong method name | Use `uploadImage` not `upload` |
| `Expected 2 arguments, but got 1`                | Missing parameter | Check method signatures        |
| `Type 'void' is not assignable`                  | Missing return    | Add `return uploadResult.url`  |

---

## 📍 Step 2: [Second Task Title]

### Goal

[What this step accomplishes]

### 📁 File

`src/routes/user.routes.ts`

### 🔍 Find This Location

Open the file and find **line 28**. You should see:

```typescript
// Line 26
router.get("/:id", userController.getById);
// Line 27
// Line 28
router.put("/:id", validateBody(updateUserSchema), userController.update);
// Line 29
```

You will add a new route **between line 27 and 28**.

### ✏️ Add This Code

Insert at **line 28** (the existing line 28 will become line 32):

```typescript
// Profile image upload
router.post(
  "/:id/profile-image",
  authenticate,
  uploadMiddleware.single("image"),
  userController.uploadProfileImage,
);
```

### 📥 Add Required Import

The `uploadMiddleware` import should already exist. Verify at the top of the file (around line 5):

```typescript
import { uploadMiddleware } from "../middleware/upload";
```

If it's missing, add it after the other middleware imports.

### ⚠️ Common Mistakes for This Step

#### Mistake 1: Wrong route order

```typescript
// ❌ WRONG - put after /:id routes, will never match
router.put('/:id', ...);
router.delete('/:id', ...);
router.post('/:id/profile-image', ...);  // Too late!

// ✅ CORRECT - specific routes before generic /:id
router.post('/:id/profile-image', ...);  // Specific first
router.put('/:id', ...);
router.delete('/:id', ...);
```

Actually in this case the route order is fine because `/:id/profile-image` is more specific.

#### Mistake 2: Missing authenticate middleware

```typescript
// ❌ WRONG - no auth, anyone can upload
router.post('/:id/profile-image', uploadMiddleware.single('image'), ...);

// ✅ CORRECT - require authentication
router.post('/:id/profile-image', authenticate, uploadMiddleware.single('image'), ...);
```

#### Mistake 3: Wrong field name in uploadMiddleware

```typescript
// ❌ WRONG - field name must match what frontend sends
uploadMiddleware.single("file");
uploadMiddleware.single("profileImage");

// ✅ CORRECT - use 'image' to match frontend
uploadMiddleware.single("image");
```

### ✅ Verification Gate

Run the route tests:

```bash
npm test src/routes/__tests__/user.routes.test.ts
```

Then verify no TypeScript errors in the routes file:

```bash
npx tsc --noEmit src/routes/user.routes.ts
```

---

## 📍 Step 3: Add Controller Method

### Goal

Add the controller method that handles the HTTP request

### 📁 File

`src/controllers/UserController.ts`

### 🔍 Find This Location

Find the `update` method (around **line 52**). You'll add the new method after it.

```typescript
// Line 58
  async update(req: Request, res: Response): Promise<void> {
// ...
// Line 67
  }
// Line 68 (empty line)
```

### ✏️ Add This Code

Insert at **line 69**:

```typescript
/**
 * Handle profile image upload
 * POST /:id/profile-image
 */
async uploadProfileImage(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Verify file was uploaded
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const imageUrl = await this.userService.uploadProfileImage(
      id,
      req.file.buffer
    );

    res.status(200).json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    // Re-throw unexpected errors for global error handler
    throw error;
  }
}
```

### 📥 Add Required Imports

Verify these imports exist at the top of the file. Add any that are missing:

```typescript
import { NotFoundError } from "../errors/NotFoundError";
import { ValidationError } from "../errors/ValidationError";
```

### ⚠️ Common Mistakes for This Step

#### Mistake 1: Not handling missing file

```typescript
// ❌ WRONG - crashes if no file uploaded
const imageUrl = await this.userService.uploadProfileImage(id, req.file.buffer);

// ✅ CORRECT - check for file first
if (!req.file) {
  res.status(400).json({ error: "No image file provided" });
  return;
}
```

#### Mistake 2: Wrong property on req.file

```typescript
// ❌ WRONG - 'data' doesn't exist
req.file.data;

// ❌ WRONG - 'content' doesn't exist
req.file.content;

// ✅ CORRECT - multer uses 'buffer'
req.file.buffer;
```

#### Mistake 3: Forgetting return after res.json()

```typescript
// ❌ WRONG - continues execution after sending response
if (!req.file) {
  res.status(400).json({ error: "No file" });
}
// Code here still runs!

// ✅ CORRECT - return to stop execution
if (!req.file) {
  res.status(400).json({ error: "No file" });
  return;
}
```

### ✅ Verification Gate

```bash
npm test src/controllers/__tests__/UserController.test.ts
```

---

## 📍 Step 4: Write Unit Tests

### Goal

Add tests for the new functionality

### 📁 File

`src/services/__tests__/UserService.test.ts`

### 🔍 Find This Location

Find the end of the existing test suite, before the final `});`. Around **line 89**:

```typescript
// Line 87
    });
// Line 88
  });
// Line 89
}); // ← End of describe('UserService')
```

### ✏️ Add This Code

Insert at **line 89** (before the final `});`):

```typescript
describe("uploadProfileImage", () => {
  const mockUserId = "user-123";
  const mockImageBuffer = Buffer.from("fake-image-data");
  const mockImageUrl =
    "https://storage.example.com/profile-images/user-123.jpg";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should upload image and return URL", async () => {
    // Arrange
    mockUserRepository.findById.mockResolvedValue({
      id: mockUserId,
      email: "test@example.com",
    });
    mockImageStorage.uploadImage.mockResolvedValue({ url: mockImageUrl });
    mockUserRepository.updateById.mockResolvedValue(undefined);

    // Act
    const result = await userService.uploadProfileImage(
      mockUserId,
      mockImageBuffer,
    );

    // Assert
    expect(result).toBe(mockImageUrl);
    expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId);
    expect(mockImageStorage.uploadImage).toHaveBeenCalledWith(mockImageBuffer, {
      folder: "profile-images",
      userId: mockUserId,
    });
    expect(mockUserRepository.updateById).toHaveBeenCalledWith(mockUserId, {
      profileImageUrl: mockImageUrl,
    });
  });

  it("should throw NotFoundError if user does not exist", async () => {
    // Arrange
    mockUserRepository.findById.mockResolvedValue(null);

    // Act & Assert
    await expect(
      userService.uploadProfileImage(mockUserId, mockImageBuffer),
    ).rejects.toThrow(NotFoundError);

    expect(mockImageStorage.uploadImage).not.toHaveBeenCalled();
  });

  it("should throw ValidationError if image buffer is empty", async () => {
    // Arrange
    mockUserRepository.findById.mockResolvedValue({ id: mockUserId });
    const emptyBuffer = Buffer.alloc(0);

    // Act & Assert
    await expect(
      userService.uploadProfileImage(mockUserId, emptyBuffer),
    ).rejects.toThrow(ValidationError);

    expect(mockImageStorage.uploadImage).not.toHaveBeenCalled();
  });
});
```

### 📥 Add Required Imports

At the top of the test file (around line 3), add:

```typescript
import { NotFoundError } from "../../errors/NotFoundError";
import { ValidationError } from "../../errors/ValidationError";
```

### ⚠️ Common Mistakes for This Step

#### Mistake 1: Forgetting to mock all dependencies

```typescript
// ❌ WRONG - missing mock causes real call or undefined error
mockUserRepository.findById.mockResolvedValue(user);
// Forgot to mock updateById!

// ✅ CORRECT - mock everything that's called
mockUserRepository.findById.mockResolvedValue(user);
mockImageStorage.uploadImage.mockResolvedValue({ url: mockImageUrl });
mockUserRepository.updateById.mockResolvedValue(undefined);
```

#### Mistake 2: Wrong mock return shape

```typescript
// ❌ WRONG - uploadImage returns { url: string }, not string
mockImageStorage.uploadImage.mockResolvedValue(mockImageUrl);

// ✅ CORRECT - match the actual return type
mockImageStorage.uploadImage.mockResolvedValue({ url: mockImageUrl });
```

#### Mistake 3: Using mockReturnValue for async

```typescript
// ❌ WRONG - mockReturnValue doesn't work for promises
mockUserRepository.findById.mockReturnValue(user);

// ✅ CORRECT - use mockResolvedValue for async
mockUserRepository.findById.mockResolvedValue(user);
```

### ✅ Verification Gate

Run the complete test suite for UserService:

```bash
npm test src/services/__tests__/UserService.test.ts
```

**Expected Result:**

```
 PASS  src/services/__tests__/UserService.test.ts
  UserService
    createUser
      ✓ should create user (5 ms)
    findById
      ✓ should find user by id (3 ms)
    uploadProfileImage
      ✓ should upload image and return URL (4 ms)
      ✓ should throw NotFoundError if user does not exist (2 ms)
      ✓ should throw ValidationError if image buffer is empty (2 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

All 3 new tests should pass. If any fail, check:

1. Mock setup matches what the code actually calls
2. Error types match what the code throws
3. Import paths are correct

---

## 🎯 Final Integration Verification

### Run All Tests

```bash
npm test
```

**All tests must pass.**

### Run Type Check

```bash
npm run typecheck
```

**No errors should appear.**

### Run Linter

```bash
npm run lint
```

**Fix any lint errors before submitting.**

### Manual Test (Optional)

If you want to test manually:

1. Start the server: `npm run dev`
2. Use curl or Postman:

```bash
curl -X POST http://localhost:3000/api/users/user-123/profile-image \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/test-image.jpg"
```

3. Verify response contains `{ "success": true, "imageUrl": "..." }`

---

## 🔍 Troubleshooting

### Error: "Cannot find module '../errors/ValidationError'"

**Cause**: Import path is incorrect

**Fix**: Verify the errors directory structure:

```bash
ls src/errors/
```

Adjust import path to match actual location.

### Error: "Property 'uploadImage' does not exist on type 'ImageStorage'"

**Cause**: Wrong method name

**Fix**: Check actual method name:

```bash
grep -n "upload" src/lib/storage/ImageStorage.ts
```

Use the correct method name from the output.

### Error: "Type 'null' is not assignable to type 'User'"

**Cause**: findById returns `User | null` but code expects `User`

**Fix**: Add null check:

```typescript
const user = await this.userRepository.findById(userId);
if (!user) {
  throw new NotFoundError("User not found");
}
// Now TypeScript knows user is not null
```

### Error: Test times out

**Cause**: Async mock not set up correctly

**Fix**: Ensure using `mockResolvedValue` not `mockReturnValue`:

```typescript
// ✅ Correct for async functions
mockRepo.findById.mockResolvedValue(user);
```

### Error: "Jest encountered an unexpected token"

**Cause**: Missing or wrong Jest config for TypeScript

**Fix**: This is an environment issue. Run:

```bash
npm install
```

If still failing, report to mentor.

---

## ✅ Pre-Submission Checklist

Before creating your pull request:

- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No lint errors: `npm run lint`
- [ ] Only modified files listed in this guide
- [ ] No `console.log` statements in production code
- [ ] No commented-out code
- [ ] Branch is rebased on latest main
- [ ] Commit messages are clear

### Files Changed

Verify your changes match this list exactly:

| File                                         | Status   |
| -------------------------------------------- | -------- |
| `src/services/UserService.ts`                | Modified |
| `src/controllers/UserController.ts`          | Modified |
| `src/routes/user.routes.ts`                  | Modified |
| `src/services/__tests__/UserService.test.ts` | Modified |

Run `git status` to verify. If you modified other files, **undo those changes**.

---

## 🆘 Getting Help

If you're stuck after:

1. Re-reading the step instructions
2. Checking "Common Mistakes"
3. Looking at "Troubleshooting"
4. Verifying line numbers (they may have shifted)

Then ask your mentor with:

- Which step you're on
- The exact error message (full text)
- What you've tried
- The relevant code snippet

```

---

### Phase 3: Quality Checks

Before delivering the implementation guide, verify:

#### 3.1 Code Snippet Accuracy

For every code snippet in the guide:
- [ ] Actually read the target file
- [ ] Verify imports match existing patterns
- [ ] Verify types exist and are spelled correctly
- [ ] Verify method signatures match interfaces
- [ ] Run the code through TypeScript compiler mentally

#### 3.2 Line Number Accuracy

For every line reference:
- [ ] Open the actual file
- [ ] Go to that line number
- [ ] Verify the context matches what you wrote
- [ ] Note if earlier steps will shift these numbers

#### 3.3 Test Verification

For every test command:
- [ ] Test file exists at that path
- [ ] Test will catch the changes being made
- [ ] Expected output is realistic

#### 3.4 Common Mistakes

For each step, include mistakes based on:
- Verification report findings (wrong method names, signatures)
- Codebase patterns (import paths, naming)
- General junior developer mistakes (async/await, null checks)

---

## Writing Guidelines

### Be Extremely Explicit

Every instruction must be unambiguous:

| ❌ Vague | ✅ Explicit |
|----------|-------------|
| "Add the method" | "Add the following method at line 48, after the `findById` method" |
| "Import the error" | "Add `import { ValidationError } from '../errors/ValidationError';` at line 3" |
| "Handle the error" | "Throw a `NotFoundError` with message `User not found: ${userId}`" |
| "Update the test" | "Insert the following test block at line 89, before the final `});`" |

### Visual Markers

Use consistently:
- 📁 File paths
- 🔍 "Find this location" sections
- ✏️ Code to add
- 📥 Imports to add
- ⚠️ Common mistakes
- ✅ Verification gates
- ⛔ Things NOT to do
- 💡 Tips
- 🎯 Final verification
- 🔍 Troubleshooting
- 🆘 Getting help

### Line Number Strategy

Since line numbers shift:

1. **Order edits bottom-to-top** when possible
2. **Warn about shifts**: "Note: After completing this step, line numbers below this point will increase by ~15"
3. **Use anchors**: "After the `findById` method" in addition to line numbers
4. **Show context**: 5 lines before/after so they can find the right spot even if numbers shifted

### Code Snippet Rules

1. **Complete implementations only** - never partial code with "add implementation here"
2. **Show context** - what comes before and after
3. **Mark new vs existing** - use comments to clarify
4. **Include JSDoc** - document parameters and return types
5. **Match codebase style** - formatting, naming, patterns
```
