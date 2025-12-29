/**
 * MBA Behavioral Interview template definition.
 * Standard MBA admissions behavioral interview with Chinese and English blocks.
 */
import type { InterviewTemplate } from "../schema";

export const mbaBehavioralV1: InterviewTemplate = {
  id: "mba-behavioral-v1",
  name: "MBA Behavioral Interview",
  description: "Standard MBA admissions behavioral interview",
  persona:
    "Senior admissions officer at a top-10 MBA program. Professional, warm, evaluating leadership potential.",
  answerTimeLimitSec: 90,
  blocks: [
    {
      language: "zh",
      durationSec: 180,
      questions: [
        {
          content:
            "Tell me about a time you led a team through a difficult period.",
          translation: "请描述一次你带领团队度过困难时期的经历。",
        },
        {
          content:
            "Describe a situation where you failed and what you learned from it.",
          translation: "请描述一个你失败的情况，以及你从中学到了什么。",
        },
        {
          content:
            "Why do you want to pursue an MBA at this point in your career?",
          translation: "为什么你想在职业生涯的这个阶段攻读MBA？",
        },
      ],
    },
    {
      language: "en",
      durationSec: 180,
      questions: [
        {
          content:
            "Tell me about a time you had to influence someone without formal authority.",
        },
        {
          content: "What is your greatest professional achievement?",
        },
        {
          content: "Where do you see yourself in 10 years?",
        },
      ],
    },
  ],
};
