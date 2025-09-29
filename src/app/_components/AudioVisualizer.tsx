
import React from 'react';

interface AudioVisualizerProps {
  audioLevel: number; // A value between 0 and 1
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioLevel }) => {
  const clampedAudioLevel = Math.max(0, Math.min(1, audioLevel));

  return (
    <div data-testid="audio-visualizer" style={{ transform: `scaleY(${clampedAudioLevel})` }}>
      <div className="w-[50px] h-[50px] bg-accent" />
    </div>
  );
};
