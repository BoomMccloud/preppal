import React from "react";

export interface TranscriptEntry {
  speaker: "USER" | "AI";
  content: string;
}

interface TranscriptDisplayProps {
  entries: TranscriptEntry[];
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  entries,
}) => {
  if (!entries || entries.length === 0) {
    return null;
  }

  return (
    <div>
      {entries.map((entry, index) => (
        <div key={index}>
          <strong>{entry.speaker}:</strong> {entry.content}
        </div>
      ))}
    </div>
  );
};
