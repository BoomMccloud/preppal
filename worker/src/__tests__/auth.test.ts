// ABOUTME: Tests for JWT authentication in Cloudflare Worker
// ABOUTME: Validates token verification and payload extraction

import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { validateJWT } from '../auth';

describe('validateJWT', () => {
	const testSecret = 'test-secret-key-minimum-32-chars-long!!';

	const createTestToken = (
		payload: { userId: string; interviewId: string },
		expiresIn: string | number = '1h',
	): string => {
		// @ts-expect-error - jsonwebtoken types are incorrect for this usage
		return jwt.sign(payload, testSecret, {
			algorithm: 'HS256',
			expiresIn,
		}) as string;
	};

	it('should validate a correct JWT token', async () => {
		const payload = {
			userId: 'user123',
			interviewId: 'interview456',
		};

		const token = createTestToken(payload);
		const result = await validateJWT(token, testSecret);

		expect(result.userId).toBe(payload.userId);
		expect(result.interviewId).toBe(payload.interviewId);
		expect(result.iat).toBeDefined();
		expect(result.exp).toBeDefined();
	});

	it('should reject an expired token', async () => {
		const payload = {
			userId: 'user123',
			interviewId: 'interview456',
		};

		const token = createTestToken(payload, '0s');

		// Wait a bit to ensure expiration
		await new Promise((resolve) => setTimeout(resolve, 100));

		await expect(validateJWT(token, testSecret)).rejects.toThrow(
			'JWT validation failed',
		);
	});

	it('should reject a token with wrong secret', async () => {
		const payload = {
			userId: 'user123',
			interviewId: 'interview456',
		};

		const token = createTestToken(payload);
		const wrongSecret = 'wrong-secret-key-minimum-32-chars-long';

		await expect(validateJWT(token, wrongSecret)).rejects.toThrow(
			'JWT validation failed',
		);
	});

	it('should reject an invalid token format', async () => {
		const invalidToken = 'not.a.valid.jwt.token';

		await expect(validateJWT(invalidToken, testSecret)).rejects.toThrow(
			'JWT validation failed',
		);
	});
});
