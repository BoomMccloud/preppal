import React from "react";

export type InterviewStatus =
  | "idle"
  | "initializing"
  | "requestingPermissions"
  | "permissionsDenied"
  | "connecting"
  | "live"
  | "reconnecting"
  | "ending"
  | "processingResults"
  | "resultsReady"
  | "error"
  | "listening"
  | "speaking";

interface StatusIndicatorProps {
  status: InterviewStatus;
}

const statusMap: Record<InterviewStatus, { text: string; className: string }> =
  {
    idle: { text: "Idle", className: "text-secondary-text" },
    initializing: { text: "Initializing...", className: "text-info" },
    requestingPermissions: {
      text: "Requesting Permissions...",
      className: "text-info",
    },
    permissionsDenied: {
      text: "Permissions Denied",
      className: "text-danger",
    },
    connecting: { text: "Connecting...", className: "text-info" },
    live: { text: "Live", className: "text-success" },
    reconnecting: { text: "Reconnecting...", className: "text-warning" },
    ending: { text: "Ending...", className: "text-secondary-text" },
    processingResults: { text: "Processing...", className: "text-info" },
    resultsReady: { text: "Results Ready", className: "text-success" },
    error: { text: "Error", className: "text-danger" },
    listening: { text: "Listening", className: "text-success" },
    speaking: { text: "Speaking", className: "text-info" },
  };

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { text, className } = statusMap[status];

  return <span className={className}>{text}</span>;
};
