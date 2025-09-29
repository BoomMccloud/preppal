# Development Login Instructions

This file provides login credentials for development and testing purposes.

## Development Users

In development mode, you can log in using the following test accounts:

| Email | Password | User Name |
|-------|----------|-----------|
| `dev1@preppal.com` | `dev123` | Dev User 1 |
| `dev2@preppal.com` | `dev123` | Dev User 2 |
| `dev3@preppal.com` | `dev123` | Dev User 3 |

## Setup Instructions

1. **Seed the database** (first time setup):
   ```bash
   pnpm db:seed
   ```

2. **Start the development server**:
   ```bash
   pnpm dev
   ```

3. **Navigate to the app** and click "Sign In"

4. **Select "Development Login"** provider

5. **Use any of the test accounts** listed above

## Notes

- The credentials provider is **only available in development mode** (`NODE_ENV=development`)
- Test users are automatically created in the database when they first log in
- All test users have consistent data for predictable testing scenarios
- Google OAuth is still available if `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are configured

## Resetting Test Data

To reset the database with fresh test data:

```bash
# Reset database
pnpm db:push --force-reset

# Re-seed with test users
pnpm db:seed
```