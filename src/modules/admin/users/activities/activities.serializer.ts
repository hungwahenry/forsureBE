import type { Activity, ActivityParticipant } from '@prisma/client';

export interface AdminUserActivityItem {
  participantId: string;
  role: ActivityParticipant['role'];
  joinedAt: string;
  activity: {
    id: string;
    emoji: string;
    title: string;
    startsAt: string;
    status: Activity['status'];
    placeName: string;
    capacity: number;
    participantCount: number;
    deletedAt: string | null;
  };
}

type Row = ActivityParticipant & { activity: Activity };

export function serializeAdminUserActivity(row: Row): AdminUserActivityItem {
  return {
    participantId: row.id,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    activity: {
      id: row.activity.id,
      emoji: row.activity.emoji,
      title: row.activity.title,
      startsAt: row.activity.startsAt.toISOString(),
      status: row.activity.status,
      placeName: row.activity.placeName,
      capacity: row.activity.capacity,
      participantCount: row.activity.participantCount,
      deletedAt: row.activity.deletedAt
        ? row.activity.deletedAt.toISOString()
        : null,
    },
  };
}
