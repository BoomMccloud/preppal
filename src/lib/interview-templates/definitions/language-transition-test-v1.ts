/**
 * Language Transition Test template definition.
 * 6-block template alternating between Chinese and English to test
 * language transition handling and multi-block consistency.
 * Each block contains exactly one question.
 */
import type { InterviewTemplate } from "../schema";

export const languageTransitionTestV1: InterviewTemplate = {
  id: "language-transition-test-v1",
  name: "Language Transition Test",
  description:
    "Test template for validating language transitions and multi-block consistency",
  persona:
    "Professional interviewer testing bilingual communication skills. Neutral and consistent.",
  answerTimeLimitSec: 25,
  blocks: [
    {
      language: "zh",
      question: {
        content: "Please introduce yourself briefly.",
        translation: "请简单介绍一下你自己。",
      },
    },
    {
      language: "en",
      question: {
        content: "What is your greatest strength?",
      },
    },
    {
      language: "zh",
      question: {
        content: "Describe a challenge you recently overcame.",
        translation: "描述一个你最近克服的挑战。",
      },
    },
    {
      language: "en",
      question: {
        content: "Why are you interested in this opportunity?",
      },
    },
    {
      language: "zh",
      question: {
        content: "What are your goals for the next five years?",
        translation: "你未来五年的目标是什么？",
      },
    },
    {
      language: "en",
      question: {
        content: "Do you have any questions for me?",
      },
    },
  ],
};
