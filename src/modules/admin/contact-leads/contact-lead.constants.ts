export const CONTACT_LEAD_STATUSES = ['NEW', 'HANDLED', 'ARCHIVED'] as const;

export type ContactLeadStatus = (typeof CONTACT_LEAD_STATUSES)[number];
