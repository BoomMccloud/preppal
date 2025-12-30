# Implementation Guide: User Profile Image Upload

**Based on Spec**: `specs/profile-image-upload.md`
**Verification Report**: `reports/profile-image-verification.md`
**Generated**: 2025-01-15
**Estimated Total Time**: 3-4 hours

---

## 📋 Overview

### What You're Building

You're adding the ability for users to upload a profile image. This involves adding a new service method to handle the upload, a new API endpoint, and the controller logic to connect them.

### 💡 Core Concept (The "North Star")

**"Thin Controllers, Fat Services, Dumb Drivers."**
In this architecture, the **Controller** is a traffic cop (handling HTTP status codes), the **Service** is the brain (executing business logic and validation), and the **Storage Driver** is the hardware (performing the actual file write). Keep your logic in the Service so it can be tested without a web server.

### Deliverables

After completing this guide, you will have:

- [ ] A new `uploadProfileImage` method in UserService
- [ ] A new POST endpoint at `/api/users/:id/profile-image`
- [ ] Controller logic to handle the upload request
- [ ] Unit tests for the new functionality

### Files You Will Modify

| File                                         | Action | Summary                          |
| -------------------------------------------- | ------ | -------------------------------- |
| `src/services/UserService.ts`                | Modify | Add `uploadProfileImage` method  |
| `src/controllers/UserController.ts`          | Modify | Add `uploadProfileImage` handler |
| `src/routes/user.routes.ts`                  | Modify | Add POST route for image upload  |
| `src/services/__tests__/UserService.test.ts` | Modify | Add unit tests                   |

---

## 🔧 Prerequisites

### 1. Environment Setup

```bash
# Verify you're in the project root
pwd
# Should show: /home/you/projects/user-service

# Install dependencies (if not already done)
npm install

# Verify the project builds
npm run build
```

### 2. Verify Tests Pass

```bash
npm test
```

✅ **All tests should pass before you start.**

---

## 📍 Phase 1: Data & Business Logic (Est. 60 mins)

### [ ] Step 1.1: Add Service Method

#### Goal

Add the `uploadProfileImage` method to UserService to handle the business logic: verify user, upload image, and update record.

#### 📁 File

`src/services/UserService.ts`

#### 🔍 Find This Location

Open the file and navigate to **line 67**. You should see the end of the `updateById` method:

```typescript
// Line 63
  async updateById(id: string, data: Partial<User>): Promise<User> {
// Line 64
    return this.userRepository.updateById(id, data);
// Line 65
  }
```

#### ✏️ Action: Add New Method

Insert the following at **line 67**, between `updateById` and `delete`:

```typescript
/**
 * Upload a profile image for a user
 * @param userId - The user's ID
 * @param imageBuffer - The image file as a Buffer
 * @returns The URL of the uploaded image
 */
async uploadProfileImage(userId: string, imageBuffer: Buffer): Promise<string> {
  // Verify user exists first
  const user = await this.userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError(`User not found: ${userId}`);
  }

  // Validate image buffer
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new ValidationError('Image buffer is empty');
  }

  // Upload to storage service
  const uploadResult = await this.imageStorage.uploadImage(imageBuffer, {
    folder: 'profile-images',
    userId,
  });

  // Update user record with new image URL
  await this.userRepository.updateById(userId, {
    profileImageUrl: uploadResult.url,
  });

  return uploadResult.url;
}
```

#### 📥 Add Required Import

**Current (Lines 1-4):**
```typescript
import { UserRepository } from "../repositories/UserRepository";
import { ImageStorage } from "../lib/storage/ImageStorage";
import { NotFoundError } from "../errors/NotFoundError";
import { User } from "../models/User";
```

**Replace With:**
```typescript
import { UserRepository } from "../repositories/UserRepository";
import { ImageStorage } from "../lib/storage/ImageStorage";
import { NotFoundError } from "../errors/NotFoundError";
import { ValidationError } from "../errors/ValidationError"; // ← NEW
import { User } from "../models/User";
```

#### ⚠️ Common Mistakes
- **Mistake**: Forgetting `await` on `uploadImage()`. This returns a Promise immediately, so the user record will be updated with `[object Promise]` instead of a URL.

### [ ] Step 1.2: Add Unit Tests

#### Goal
Verify the service logic immediately before building the API layer.

#### 📁 File
`src/services/__tests__/UserService.test.ts`

#### ✏️ Action: Add Describe Block
Insert at the end of the file, before the final `});`:

```typescript
describe("uploadProfileImage", () => {
  it("should upload image and return URL when user exists", async () => {
    mockUserRepository.findById.mockResolvedValue({ id: '123' });
    mockImageStorage.uploadImage.mockResolvedValue({ url: 'http://test.com/img.jpg' });
    
    const result = await userService.uploadProfileImage('123', Buffer.from('data'));
    expect(result).toBe('http://test.com/img.jpg');
  });
});
```

#### ✅ Verification Gate
```bash
npx tsc --noEmit src/services/UserService.ts
npm test src/services/__tests__/UserService.test.ts
```

---

## 📍 Phase 2: API & Routing (Est. 45 mins)

### [ ] Step 2.1: Add API Route

#### 📁 File
`src/routes/user.routes.ts`

#### ✏️ Action: Insert Route
Insert at **line 24** (between GET and PUT routes):

```typescript
// Profile image upload
router.post(
  "/:id/profile-image",
  authenticate,
  uploadMiddleware.single("image"),
  userController.uploadProfileImage,
);
```

### [ ] Step 2.2: Add Controller Method

#### 📁 File
`src/controllers/UserController.ts`

#### ✏️ Action: Add Handler
Insert at **line 54** (between `update` and `delete`):

```typescript
async uploadProfileImage(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image file provided' });
      return;
    }

    const imageUrl = await this.userService.uploadProfileImage(id, req.file.buffer);
    res.status(200).json({ success: true, imageUrl });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, error: error.message });
      return;
    }
    throw error;
  }
}
```

---

## 🎯 Final Success Criteria

Before submitting your PR, verify the following:

- [ ] **Functional**: A POST to `/api/users/:id/profile-image` successfully updates the user's `profileImageUrl` in the database.
- [ ] **Validation**: Sending an empty file results in a `400 Bad Request` with message "No image file provided".
- [ ] **Security**: Attempting to upload without an `Authorization` header results in a `401 Unauthorized`.
- [ ] **Technical**: `npm run typecheck` and `npm run lint` both pass with zero errors.
- [ ] **Coverage**: All 9 tests in `UserService.test.ts` pass.

---

## 🔍 Troubleshooting
- **Error**: `Cannot find module '../errors/ValidationError'`
  - **Fix**: Check if the file is named `ValidationError.ts` or `validation.error.ts`.
- **Error**: `Property 'buffer' does not exist on type 'Request'`
  - **Fix**: Ensure `uploadMiddleware.single("image")` is called BEFORE the controller in the route file.