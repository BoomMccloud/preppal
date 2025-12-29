/**
 * SessionContent Component Tests
 * Tests environment-aware view selection (Dev vs Prod)
 * In dev mode, provides toggle to preview prod view without reload
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, vi, describe, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import type { SessionState } from "~/app/[locale]/(interview)/interview/[interviewId]/session/types";

// --- Mocks ---

// Mock SessionContentDev - simple div with test ID and toggle button
vi.mock(
  "~/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentDev",
  () => ({
    SessionContentDev: ({
      onToggleProdView,
    }: {
      onToggleProdView?: () => void;
    }) => (
      <div data-testid="session-dev">
        Dev View
        {onToggleProdView && (
          <button data-testid="toggle-prod" onClick={onToggleProdView}>
            Toggle Prod
          </button>
        )}
      </div>
    ),
  }),
);

// Mock SessionContentProd - simple div with test ID and toggle button
vi.mock(
  "~/app/[locale]/(interview)/interview/[interviewId]/session/SessionContentProd",
  () => ({
    SessionContentProd: ({
      onToggleDevView,
    }: {
      onToggleDevView?: () => void;
    }) => (
      <div data-testid="session-prod">
        Prod View
        {onToggleDevView && (
          <button data-testid="toggle-dev" onClick={onToggleDevView}>
            Toggle Dev
          </button>
        )}
      </div>
    ),
  }),
);

// Import after mocks are defined (mocks are hoisted automatically)
import { SessionContent } from "~/app/[locale]/(interview)/interview/[interviewId]/session/SessionContent";

// --- Test Data ---

const mockDispatch = vi.fn();

const baseState: SessionState = {
  status: "WAITING_FOR_CONNECTION",
  connectionState: "initializing",
  transcript: [],
  pendingUser: "",
  pendingAI: "",
  elapsedTime: 0,
  error: null,
  isAiSpeaking: false,
};

const mockProps = {
  interviewId: "test-interview-id",
  guestToken: undefined,
  state: baseState,
  dispatch: mockDispatch,
  onConnectionReady: undefined,
};

describe("SessionContent", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  test("renders dev view in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    render(<SessionContent {...mockProps} />);

    expect(screen.getByTestId("session-dev")).toBeInTheDocument();
    expect(screen.queryByTestId("session-prod")).not.toBeInTheDocument();
  });

  test("renders prod view in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");

    render(<SessionContent {...mockProps} />);

    expect(screen.getByTestId("session-prod")).toBeInTheDocument();
    expect(screen.queryByTestId("session-dev")).not.toBeInTheDocument();
  });

  test("toggles to prod view when clicking toggle button in dev mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    render(<SessionContent {...mockProps} />);

    // Initially shows dev view
    expect(screen.getByTestId("session-dev")).toBeInTheDocument();
    expect(screen.queryByTestId("session-prod")).not.toBeInTheDocument();

    // Click toggle button
    fireEvent.click(screen.getByTestId("toggle-prod"));

    // Now shows prod view
    expect(screen.getByTestId("session-prod")).toBeInTheDocument();
    expect(screen.queryByTestId("session-dev")).not.toBeInTheDocument();
  });

  test("toggles back to dev view from prod preview", () => {
    vi.stubEnv("NODE_ENV", "development");

    render(<SessionContent {...mockProps} />);

    // Toggle to prod
    fireEvent.click(screen.getByTestId("toggle-prod"));
    expect(screen.getByTestId("session-prod")).toBeInTheDocument();

    // Toggle back to dev
    fireEvent.click(screen.getByTestId("toggle-dev"));
    expect(screen.getByTestId("session-dev")).toBeInTheDocument();
  });

  test("prod mode does not show toggle button", () => {
    vi.stubEnv("NODE_ENV", "production");

    render(<SessionContent {...mockProps} />);

    expect(screen.getByTestId("session-prod")).toBeInTheDocument();
    // No toggle buttons in production
    expect(screen.queryByTestId("toggle-dev")).not.toBeInTheDocument();
    expect(screen.queryByTestId("toggle-prod")).not.toBeInTheDocument();
  });
});
