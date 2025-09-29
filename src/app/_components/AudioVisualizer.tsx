
import React from 'react';

interface AudioVisualizerProps {
  audioLevel: number; // A value between 0 and 1
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioLevel }) => {
  const clampedAudioLevel = Math.max(0, Math.min(1, audioLevel));

  return (
    <div data-testid="audio-visualizer" style={{ transform: `scaleY(${clampedAudioLevel})` }}>
      {/* You can put a visual element here, e.g., a div with a background color */}
      <div style={{ width: '50px', height: '50px', backgroundColor: 'blue' }} />
    </div>
  );
};
