
import React from 'react';

interface InterviewControlsProps {
  onStart: () => void;
  onEnd: () => void;
}

export const InterviewControls: React.FC<InterviewControlsProps> = ({ onStart, onEnd }) => {
  return (
    <div>
      <button onClick={onStart}>Start Interview</button>
      <button onClick={onEnd}>End Interview</button>
    </div>
  );
};
