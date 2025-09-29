
import React from 'react';

export type InterviewStatus = 'idle' | 'initializing' | 'requestingPermissions' | 'permissionsDenied' | 'connecting' | 'live' | 'reconnecting' | 'ending' | 'processingResults' | 'resultsReady' | 'error';

interface StatusIndicatorProps {
  status: InterviewStatus;
}

const statusMap: Record<InterviewStatus, { text: string; color: string }> = {
  idle: { text: 'Idle', color: 'gray' },
  initializing: { text: 'Initializing...', color: 'blue' },
  requestingPermissions: { text: 'Requesting Permissions...', color: 'blue' },
  permissionsDenied: { text: 'Permissions Denied', color: 'red' },
  connecting: { text: 'Connecting...', color: 'blue' },
  live: { text: 'Live', color: 'green' },
  reconnecting: { text: 'Reconnecting...', color: 'orange' },
  ending: { text: 'Ending...', color: 'gray' },
  processingResults: { text: 'Processing...', color: 'purple' },
  resultsReady: { text: 'Results Ready', color: 'green' },
  error: { text: 'Error', color: 'red' },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { text, color } = statusMap[status];

  return (
    <div style={{ color }}>
      {text}
    </div>
  );
};
