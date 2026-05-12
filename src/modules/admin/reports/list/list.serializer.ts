import type { Profile, Report, ReportReason, User } from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

export interface AdminReportListItem {
  id: string;
  status: Report['status'];
  targetType: Report['targetType'];
  targetId: string;
  details: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reason: {
    id: string;
    code: string;
    label: string;
  };
  reporter: {
    id: string;
    email: string;
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
    } | null;
  };
}

type Row = Report & {
  reason: Pick<ReportReason, 'id' | 'code' | 'label'>;
  reporter: Pick<User, 'id' | 'email'> & {
    profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
  };
};

export function serializeAdminReportListItem(
  storage: StorageProvider,
  row: Row,
): AdminReportListItem {
  return {
    id: row.id,
    status: row.status,
    targetType: row.targetType,
    targetId: row.targetId,
    details: row.details,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reason: row.reason,
    reporter: {
      id: row.reporter.id,
      email: row.reporter.email,
      profile: row.reporter.profile
        ? {
            username: row.reporter.profile.username,
            displayName: row.reporter.profile.displayName,
            avatarUrl: storage.publicUrl(row.reporter.profile.avatarKey),
          }
        : null,
    },
  };
}
