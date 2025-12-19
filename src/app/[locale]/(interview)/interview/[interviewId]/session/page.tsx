"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { SessionContent } from "./SessionContent";

export default function InterviewSessionPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = React.use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? undefined;

  return <SessionContent interviewId={interviewId} guestToken={token} />;
}
