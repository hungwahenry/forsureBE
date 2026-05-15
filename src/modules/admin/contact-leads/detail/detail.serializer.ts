import type { ContactLead } from '@prisma/client';
import {
  serializeContactLeadListItem,
  type AdminContactLeadListItem,
} from '../list/list.serializer';

export interface AdminContactLeadDetail extends AdminContactLeadListItem {
  ipAddress: string | null;
  userAgent: string | null;
}

export function serializeContactLeadDetail(
  row: ContactLead,
): AdminContactLeadDetail {
  return {
    ...serializeContactLeadListItem(row),
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
  };
}
