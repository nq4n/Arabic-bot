import type { TutorialConfig } from "./types";
import { biographyWritingTutorial } from "./biographyWriting";
import { bookPresentationTutorial } from "./bookPresentation";
import { dialogueTextTutorial } from "./dialogueText";
import { discussingIssueTutorial } from "./discussingIssue";
import { freeExpressionTutorial } from "./freeExpression";
import { landscapeDescriptionTutorial } from "./landscapeDescription";
import { paragraphWritingTutorial } from "./paragraphWriting";
import { reportWritingTutorial } from "./reportWriting";
import { storytellingTutorial } from "./storytelling";
import { summarizationTutorial } from "./summarization";
import { topicPlanningTutorial } from "./topicPlanning";

export const TUTORIAL_CONFIGS: Record<string, TutorialConfig> = {
  "landscape-description": landscapeDescriptionTutorial,
  "report-writing": reportWritingTutorial,
  "discussing-issue": discussingIssueTutorial,
  "dialogue-text": dialogueTextTutorial,
  "free-expression": freeExpressionTutorial,
  "paragraph-writing": paragraphWritingTutorial,
  "topic-planning": topicPlanningTutorial,
  summarization: summarizationTutorial,
  "biography-writing": biographyWritingTutorial,
  "book-presentation": bookPresentationTutorial,
  storytelling: storytellingTutorial,
};
