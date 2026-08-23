export type FeedbackCue = 'tap' | 'select' | 'correct' | 'wrong' | 'hint' | 'celebrate';

/** Names stay stable before licensed audio assets are introduced. */
export const sfxCueByFeedback: Record<FeedbackCue, string> = {
  tap: 'ui.tap',
  select: 'ui.select',
  correct: 'feedback.correct',
  wrong: 'feedback.wrong',
  hint: 'feedback.hint',
  celebrate: 'christmas.win',
};
