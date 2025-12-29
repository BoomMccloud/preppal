/**
 * SessionContent - Environment-aware wrapper for interview session UI
 * Selects dev or prod view based on NODE_ENV.
 * In development, provides a toggle to preview prod view without reload.
 */
"use client";

import { useState, type Dispatch } from "react";
import type { SessionState, SessionEvent } from "./types";
import { SessionContentDev } from "./SessionContentDev";
import { SessionContentProd } from "./SessionContentProd";

interface SessionContentProps {
  interviewId: string;
  guestToken?: string;
  state: SessionState;
  dispatch: Dispatch<SessionEvent>;
  onConnectionReady?: () => void;
}

export function SessionContent(props: SessionContentProps) {
  // In dev mode, allow toggling to prod view preview
  const [previewProd, setPreviewProd] = useState(false);

  // Check at runtime for testability
  const isDev = process.env.NODE_ENV === "development";

  // Production always shows prod view
  if (!isDev) {
    return <SessionContentProd {...props} />;
  }

  // Development: show prod preview or dev view with toggle
  if (previewProd) {
    return (
      <SessionContentProd
        {...props}
        onToggleDevView={() => setPreviewProd(false)}
      />
    );
  }

  return (
    <SessionContentDev
      {...props}
      onToggleProdView={() => setPreviewProd(true)}
    />
  );
}
