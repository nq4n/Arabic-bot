import type { ReactElement } from "react";

export type TutorialStep = {
  id: string;
  title: string;
  caption: string;
};

export type TutorialConfig = {
  steps: TutorialStep[];
  demo: (stepId: string) => ReactElement;
};

export type AssembleDemoConfig = {
  partLabel: string;
  parts: string[];
  chips: string[];
  note: string;
  submitLabel: string;
};

export type ChoiceDemoConfig = {
  cards: Array<{ label: string; text: string; selected?: boolean }>;
  previewTitle: string;
  previewText: string;
  chips: string[];
  submitLabel: string;
};
