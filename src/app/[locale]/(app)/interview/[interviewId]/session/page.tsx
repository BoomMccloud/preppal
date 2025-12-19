"use client";

import React from "react";
import { SessionContent } from "./SessionContent";

export default function InterviewSessionPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = React.use(params);

  return <SessionContent interviewId={interviewId} />;
}
