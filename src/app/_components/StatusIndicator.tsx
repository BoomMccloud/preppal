
import React from 'react';

export type InterviewStatus = 'idle' | 'initializing' | 'requestingPermissions' | 'permissionsDenied' | 'connecting' | 'live' | 'reconnecting' | 'ending' | 'processingResults' | 'resultsReady' | 'error';

interface StatusIndicatorProps {
  status: InterviewStatus;
}

const statusMap: Record<InterviewStatus, { text: string; className: string }> = {
  idle: { text: 'Idle', className: 'text-secondary-text' },
  initializing: { text: 'Initializing...', className: 'text-blue-500' },
  requestingPermissions: { text: 'Requesting Permissions...', className: 'text-blue-500' },
  permissionsDenied: { text: 'Permissions Denied', className: 'text-red-500' },
  connecting: { text: 'Connecting...', className: 'text-blue-500' },
  live: { text: 'Live', className: 'text-green-500' },
  reconnecting: { text: 'Reconnecting...', className: 'text-orange-500' },
  ending: { text: 'Ending...', className: 'text-secondary-text' },
  processingResults: { text: 'Processing...', className: 'text-purple-500' },
  resultsReady: { text: 'Results Ready', className: 'text-green-500' },
  error: { text: 'Error', className: 'text-red-500' },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { text, className } = statusMap[status];

  return (
    <span className={className}>
      {text}
    </span>
  );
};
