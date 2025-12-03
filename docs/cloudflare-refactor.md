# Cloudflare Worker Refactoring Plan

## Overview
This document outlines a detailed plan to refactor the `GeminiSession` class in the Cloudflare Worker to improve separation of concerns, testability, maintainability, and error handling.

## Current Issues
The `GeminiSession` class currently suffers from several issues:
1. Violation of Single Responsibility Principle - handles too many concerns
2. Tight coupling with external dependencies making testing difficult
3. Inconsistent error handling and verbose logging
4. Use of `any` types reducing type safety
5. Large class size making maintenance challenging

## Refactoring Goals
1. Improve separation of concerns by extracting distinct responsibilities
2. Enhance testability through dependency injection and mocking capabilities
3. Implement consistent error handling and structured logging
4. Increase type safety by eliminating `any` types
5. Improve overall code maintainability and readability

## Phase 1: Service Extraction

### 1.1 Audio Conversion Service
Create a dedicated service for audio format conversions.

```typescript
// File: worker/src/services/audio-conversion-service.ts
export interface IAudioConversionService {
  binaryToBase64(binary: Uint8Array): string;
  base64ToBinary(base64: string): Uint8Array;
}

export class AudioConversionService implements IAudioConversionService {
  binaryToBase64(binary: Uint8Array): string {
    // Implementation from AudioConverter
  }
  
  base64ToBinary(base64: string): Uint8Array {
    // Implementation from AudioConverter
  }
}
```

### 1.2 Transcript Management Service
Extract transcript handling logic.

```typescript
// File: worker/src/services/transcript-service.ts
export interface ITranscriptService {
  addUserTranscript(text: string): void;
  addAITranscript(text: string): void;
  getTranscript(): TranscriptEntry[];
  clear(): void;
}

export class TranscriptService implements ITranscriptService {
  // Implementation from TranscriptManager
}
```

### 1.3 API Client Service
Enhance the existing API client with better error handling.

```typescript
// File: worker/src/services/api-service.ts
export interface IApiService {
  updateStatus(interviewId: string, status: string): Promise<void>;
  submitTranscript(interviewId: string, transcript: TranscriptEntry[], endedAt: string): Promise<void>;
}

export class ApiService implements IApiService {
  // Enhanced implementation with better error handling
}
```

### 1.4 Gemini Client Service
Create a wrapper around the Gemini Live API.

```typescript
// File: worker/src/services/gemini-service.ts
export interface IGeminiService {
  connect(config: any): Promise<any>;
  sendRealtimeInput(input: any): void;
  sendClientContent(content: any): void;
  close(): void;
}

export class GeminiService implements IGeminiService {
  // Wrapper implementation around GoogleGenAI
}
```

## Phase 2: Message Handling

### 2.1 WebSocket Message Handler
Extract WebSocket message handling logic.

```typescript
// File: worker/src/handlers/websocket-message-handler.ts
export interface IWebSocketMessageHandler {
  handleBinaryMessage(buffer: ArrayBuffer): Promise<void>;
  handleAudioChunk(audioChunk: preppal.IAudioChunk): Promise<void>;
  handleEndRequest(): Promise<void>;
}

export class WebSocketMessageHandler implements IWebSocketMessageHandler {
  // Implementation extracted from GeminiSession
}
```

### 2.2 Gemini Message Handler
Extract Gemini message processing logic.

```typescript
// File: worker/src/handlers/gemini-message-handler.ts
export interface IGeminiMessageHandler {
  handleMessage(message: any): void;
}

export class GeminiMessageHandler implements IGeminiMessageHandler {
  // Implementation extracted from handleGeminiMessage
}
```

## Phase 3: Core Session Logic

### 3.1 Session Orchestrator
Create a new orchestrator class that coordinates all services.

```typescript
// File: worker/src/orchestrators/session-orchestrator.ts
export interface ISessionOrchestrator {
  initialize(): Promise<void>;
  handleWebSocketMessage(event: MessageEvent): Promise<void>;
  handleWebSocketClose(): void;
  handleWebSocketError(event: ErrorEvent): void;
  cleanup(): void;
}

export class SessionOrchestrator implements ISessionOrchestrator {
  constructor(
    private audioConversionService: IAudioConversionService,
    private transcriptService: ITranscriptService,
    private apiService: IApiService,
    private geminiService: IGeminiService,
    private webSocketMessageHandler: IWebSocketMessageHandler,
    private geminiMessageHandler: IGeminiMessageHandler,
    private logger: ILogger
  ) {}
  
  // Coordinate all services
}
```

## Phase 4: Enhanced Error Handling and Logging

### 4.1 Custom Error Types
Create domain-specific error types.

```typescript
// File: worker/src/errors/custom-errors.ts
export class GeminiConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConnectionError';
  }
}

export class TranscriptSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptSubmissionError';
  }
}

// Additional custom errors...
```

### 4.2 Structured Logging Service
Implement a centralized logging service.

```typescript
// File: worker/src/services/logging-service.ts
export interface ILogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
}

export class Logger implements ILogger {
  // Structured logging implementation
}
```

## Phase 5: Refactored Durable Object

### 5.1 Simplified GeminiSession
The refactored `GeminiSession` will become a thin layer that delegates to the orchestrator.

```typescript
// File: worker/src/gemini-session.ts
export class GeminiSession implements DurableObject {
  private orchestrator: ISessionOrchestrator;
  private logger: ILogger;
  
  constructor(private state: DurableObjectState, private env: Env) {
    // Initialize services and orchestrator
    const audioConversionService = new AudioConversionService();
    const transcriptService = new TranscriptService();
    const apiService = new ApiService(env.NEXT_PUBLIC_API_URL, env.WORKER_SHARED_SECRET);
    const geminiService = new GeminiService(env.GEMINI_API_KEY);
    const webSocketMessageHandler = new WebSocketMessageHandler(/* dependencies */);
    const geminiMessageHandler = new GeminiMessageHandler(/* dependencies */);
    this.logger = new Logger();
    
    this.orchestrator = new SessionOrchestrator(
      audioConversionService,
      transcriptService,
      apiService,
      geminiService,
      webSocketMessageHandler,
      geminiMessageHandler,
      this.logger
    );
  }
  
  async fetch(request: Request): Promise<Response> {
    // Thin wrapper that delegates to orchestrator
    // Handle WebSocket upgrade
    // Setup event listeners that delegate to orchestrator methods
  }
  
  private safeSend(ws: WebSocket, data: ArrayBuffer | string) {
    // Keep this utility method
  }
}
```

## Phase 6: Configuration Management

### 6.1 Configuration Service
Centralize configuration management.

```typescript
// File: worker/src/config/configuration.ts
export interface IConfiguration {
  gemini: {
    model: string;
    apiKey: string;
  };
  api: {
    baseUrl: string;
    sharedSecret: string;
  };
  websocket: {
    // WebSocket specific configurations
  };
}

export class Configuration implements IConfiguration {
  // Implementation that reads from Env
}
```

## Phase 7: Dependency Injection

### 7.1 Service Container
Implement a simple service container for dependency injection.

```typescript
// File: worker/src/container/service-container.ts
export class ServiceContainer {
  private services: Map<string, any> = new Map();
  
  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory());
  }
  
  get<T>(key: string): T {
    return this.services.get(key);
  }
}
```

## Phase 8: Testing Strategy

### 8.1 Unit Tests
Write comprehensive unit tests for each extracted service.

```typescript
// File: worker/src/__tests__/services/audio-conversion-service.test.ts
describe('AudioConversionService', () => {
  let service: AudioConversionService;
  
  beforeEach(() => {
    service = new AudioConversionService();
  });
  
  describe('binaryToBase64', () => {
    it('should convert binary to base64 correctly', () => {
      // Test implementation
    });
  });
  
  // Additional tests...
});
```

### 8.2 Integration Tests
Write integration tests for the orchestrator.

```typescript
// File: worker/src/__tests__/orchestrators/session-orchestrator.test.ts
describe('SessionOrchestrator', () => {
  let orchestrator: SessionOrchestrator;
  let mocks: Record<string, any>;
  
  beforeEach(() => {
    // Setup mocks
    mocks = {
      audioConversionService: mockAudioConversionService(),
      transcriptService: mockTranscriptService(),
      // ... other mocks
    };
    
    orchestrator = new SessionOrchestrator(
      mocks.audioConversionService,
      mocks.transcriptService,
      // ... other dependencies
    );
  });
  
  describe('initialize', () => {
    it('should initialize all services correctly', async () => {
      // Test implementation
    });
  });
  
  // Additional tests...
});
```

## Migration Steps

1. **Phase 1**: Implement all new services and handlers without modifying existing code
2. **Phase 2**: Write comprehensive unit tests for new components
3. **Phase 3**: Create the session orchestrator that uses the new services
4. **Phase 4**: Modify the `GeminiSession` class to delegate to the orchestrator
5. **Phase 5**: Update integration tests to work with the new structure
6. **Phase 6**: Remove deprecated code and update documentation
7. **Phase 7**: Perform thorough testing and deploy to staging environment

## Expected Benefits

1. **Improved Testability**: Each service can be tested in isolation with mocked dependencies
2. **Better Maintainability**: Smaller, focused classes are easier to understand and modify
3. **Enhanced Reusability**: Services can be reused in other parts of the application
4. **Stronger Type Safety**: Elimination of `any` types improves compile-time safety
5. **Consistent Error Handling**: Centralized error handling strategies improve reliability
6. **Structured Logging**: Better diagnostic capabilities for debugging
7. **Easier Debugging**: Clear separation of concerns makes it easier to isolate issues
8. **Scalability**: Modular design makes it easier to extend functionality in the future

## Risk Mitigation

1. **Gradual Migration**: Implement new components alongside existing code to minimize risk
2. **Comprehensive Testing**: Ensure full test coverage before removing old code
3. **Thorough Documentation**: Document all new components and their interactions
4. **Staging Deployment**: Deploy to staging environment before production release
5. **Rollback Plan**: Maintain ability to rollback to previous implementation if needed