import { describe, it, expect } from 'vitest';
import * as interview_pb from './interview_pb';

describe('Protobuf Usage', () => {
  describe('Message Creation', () => {
    it('should create a StartRequest message', () => {
      const startRequestPayload = interview_pb.interview_prep.v1.StartRequest.create({
        interview_id: 'test-interview-id',
        auth_token: 'test-jwt-token',
      });

      expect(startRequestPayload.interview_id).toBe('test-interview-id');
      expect(startRequestPayload.auth_token).toBe('test-jwt-token');
    });

    it('should encode and decode messages', () => {
      // Create a simple message
      const message = interview_pb.interview_prep.v1.ClientToServerMessage.create({
        end_request: {},
      });

      // Encode the message to a Uint8Array (binary buffer)
      const buffer = interview_pb.interview_prep.v1.ClientToServerMessage.encode(message).finish();

      // Decode it back
      const decodedMessage = interview_pb.interview_prep.v1.ClientToServerMessage.decode(buffer);

      // Check that we can access the decoded message
      expect(decodedMessage).toBeDefined();
    });
  });
});