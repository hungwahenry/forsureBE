import type { ContactLead } from '@prisma/client';

export interface AdminContactLeadListItem {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: string;
  createdAt: string;
}

export function serializeContactLeadListItem(
  row: ContactLead,
): AdminContactLeadListItem {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
