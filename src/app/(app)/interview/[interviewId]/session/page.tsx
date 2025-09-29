"use client";

import React from "react";
import { AIAvatar } from "~/app/_components/AIAvatar";
import { InterviewControls } from "~/app/_components/InterviewControls";
import { InterviewHeader } from "~/app/_components/InterviewHeader";

export default function InterviewSessionPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = React.use(params);

  // These will be replaced with state management later
  const timer = "15:30";
  const aiStatus = "Listening...";
  const handleEndCall = () => {
    // Logic to end the call will go here
    console.log("End call clicked");
  };
  const handleToggleMute = () => {
    // Logic to toggle mute will go here
    console.log("Toggle mute clicked");
  };

  return (
    <div className="h-full flex justify-center">
      <div className="w-full max-w-4xl max-h-[90vh] grid grid-rows-[auto_1fr_auto]">
        <InterviewHeader
          title="Interview Session"
          interviewId={interviewId}
          timer={timer}
        />

        <main className="flex items-center justify-center">
          <AIAvatar status={aiStatus} />
        </main>

        <InterviewControls
          interviewId={interviewId}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
        />
      </div>
    </div>
  );
}
