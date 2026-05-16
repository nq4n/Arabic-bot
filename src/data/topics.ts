/* eslint-disable no-useless-escape */
// src/data/topics.ts

import { semester1Topics } from "./semester1Topics";
import { semester2Topics } from "./semester2Topics";

export { semester1Topics } from "./semester1Topics";
export { semester2Topics } from "./semester2Topics";

export type PredefinedQuestion = {
  id: string;
  question: string;
  answer: string;
};

export type LessonStep = {
  step: number;
  icon: string;
  title: string;
  description: string;
  options?: string[];
};

export type Activity = {
  activity: number;
  icon: string;
  title?: string;
  description: string;
  objective?: string;
  instructions?: string[];
  output?: string;
  example?: string;
};

export type SceneChoice = {
  id: string;
  title: string;
  scene: string;
  imageUrl: string;
  imageAlt: string;
  options: string[];
};

export type InteractiveActivity =
  | {
    type: "assemble";
    id: string;
    title: string;
    instructions: string;
    prompt: string;
    parts: string[];
    activityId: number;
  }
  | {
    type: "scene-choice";
    id: string;
    title: string;
    instructions: string;
    prompt: string;
    activityId: number;
    timeLimitSeconds?: number;
    scenes: SceneChoice[];
  };

export type WritingSection = {
  id: string;
  title: string;
  placeholder?: string;
  description: string;
  rubricId?: string; // اختياري لربط القسم بملف rubrics لاحقًا
};

/**
 * البنية الرئيسية للموضوع
 */
export type Topic = {
  id: string;
  semester: 1 | 2;
  title: string;
  description: string;

  lesson: {
    header: string;
    goals?: string[];
    introduction: {
      tahdid: string;
      importance: string;
    };
    steps: LessonStep[];
    videoUrl?: string;
  };

  // النموذج الكتابي
  writingModel: {
    header: string;
    content: string;
  };

  activities: {
    header: string;
    list: Activity[];
  };

  interactiveActivity?: InteractiveActivity;

  writingPrompts: {
    header: string;
    list: string[];
  };

  reviewQuestions: PredefinedQuestion[];

  // أقسام خاصة بمهام الكتابة والتقييم لكل درس
  writingSections?: WritingSection[];

  evaluationTask: {
    title: string;
    description: string;
    mode?: "writing" | "discussion" | "report" | "dialogue";
  };
};

export const topicsBySemester = {
  1: semester1Topics,
  2: semester2Topics,
} as const;

export const topics: Topic[] = [...semester1Topics, ...semester2Topics];
