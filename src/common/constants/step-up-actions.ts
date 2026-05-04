export const STEP_UP_ACTION = {
  DELETE_ACCOUNT: 'DELETE_ACCOUNT',
} as const;

export type StepUpAction =
  (typeof STEP_UP_ACTION)[keyof typeof STEP_UP_ACTION];

export const STEP_UP_ACTION_CODES = Object.values(
  STEP_UP_ACTION,
) as StepUpAction[];

export function isStepUpAction(v: string): v is StepUpAction {
  return (STEP_UP_ACTION_CODES as string[]).includes(v);
}

/** Human-readable label rendered into the email subject + body. */
export const STEP_UP_ACTION_LABEL: Record<StepUpAction, string> = {
  DELETE_ACCOUNT: 'delete your account',
};
