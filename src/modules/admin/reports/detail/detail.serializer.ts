import type {
  Activity,
  ActivityPost,
  ActivityPostPhoto,
  Business,
  BusinessVenue,
  ChatMessage,
  Gender,
  Profile,
  Report,
  ReportReason,
  User,
} from '@prisma/client';
import type { StorageProvider } from '../../../../storage/storage.interface';

interface ProfileBrief {
  username: string;
  displayName: string;
  avatarUrl: string;
}

interface UserBrief {
  id: string;
  email: string;
  profile: ProfileBrief | null;
}

interface UserBriefWithStatus extends UserBrief {
  status: User['status'];
}

interface UserBriefWithStatusAndProfile extends UserBriefWithStatus {
  profile: ProfileBrief | null;
}

interface ActivityBrief {
  id: string;
  emoji: string;
  title: string;
}

export type AdminReportTarget =
  | { kind: 'USER'; user: ReportTargetUser }
  | { kind: 'ACTIVITY'; activity: ReportTargetActivity }
  | { kind: 'MESSAGE'; message: ReportTargetMessage }
  | { kind: 'POST'; post: ReportTargetPost }
  | { kind: 'BUSINESS_VENUE'; businessVenue: ReportTargetBusinessVenue }
  | { kind: 'MISSING' };

export interface ReportTargetUser extends UserBriefWithStatusAndProfile {
  role: User['role'];
  createdAt: string;
  bio: string | null;
  gender: Gender | null;
  placeName: string | null;
}

export interface ReportTargetActivity {
  id: string;
  emoji: string;
  title: string;
  startsAt: string;
  status: Activity['status'];
  placeName: string;
  capacity: number;
  participantCount: number;
  createdAt: string;
  deletedAt: string | null;
  host: UserBrief | null;
}

export interface ReportTargetMessage {
  id: string;
  kind: ChatMessage['kind'];
  body: string | null;
  imageUrl: string | null;
  parentMessageId: string | null;
  createdAt: string;
  deletedAt: string | null;
  sender: UserBrief | null;
  activity: ActivityBrief;
}

export interface ReportTargetPost {
  id: string;
  caption: string | null;
  visibility: ActivityPost['visibility'];
  createdAt: string;
  deletedAt: string | null;
  photoUrls: string[];
  author: UserBrief | null;
  activity: ActivityBrief;
}

export interface ReportTargetBusinessVenue {
  id: string;
  placeName: string;
  placeLat: number;
  placeLng: number;
  matchingKeywords: string[];
  isPaused: boolean;
  createdAt: string;
  business: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    verifiedAt: string | null;
    suspendedAt: string | null;
    autoPausedAt: string | null;
  };
}

export interface AdminReportDetail {
  id: string;
  status: Report['status'];
  targetType: Report['targetType'];
  targetId: string;
  details: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
  reason: {
    id: string;
    code: string;
    label: string;
    description: string | null;
  };
  reporter: UserBriefWithStatusAndProfile;
  target: AdminReportTarget;
}

type UserWithProfile = User & {
  profile: Pick<Profile, 'username' | 'displayName' | 'avatarKey'> | null;
};

function userBrief(storage: StorageProvider, user: UserWithProfile): UserBrief {
  return {
    id: user.id,
    email: user.email,
    profile: user.profile
      ? {
          username: user.profile.username,
          displayName: user.profile.displayName,
          avatarUrl: storage.publicUrl(user.profile.avatarKey),
        }
      : null,
  };
}

function userWithStatus(
  storage: StorageProvider,
  user: UserWithProfile,
): UserBriefWithStatus {
  return { ...userBrief(storage, user), status: user.status };
}

type ReportRow = Report & {
  reason: ReportReason;
  reporter: UserWithProfile;
};

interface ResolvedTargets {
  user?: (User & { profile: Profile | null }) | null;
  activity?: (Activity & { host: UserWithProfile | null }) | null;
  message?:
    | (ChatMessage & {
        sender: UserWithProfile | null;
        activity: Pick<Activity, 'id' | 'emoji' | 'title'>;
      })
    | null;
  post?:
    | (ActivityPost & {
        author: UserWithProfile | null;
        photos: ActivityPostPhoto[];
        activity: Pick<Activity, 'id' | 'emoji' | 'title'>;
      })
    | null;
  businessVenue?: (BusinessVenue & { business: Business }) | null;
}

export function serializeAdminReportDetail(
  storage: StorageProvider,
  report: ReportRow,
  targets: ResolvedTargets,
): AdminReportDetail {
  return {
    id: report.id,
    status: report.status,
    targetType: report.targetType,
    targetId: report.targetId,
    details: report.details,
    createdAt: report.createdAt.toISOString(),
    reviewedAt: report.reviewedAt ? report.reviewedAt.toISOString() : null,
    reviewedById: report.reviewedBy,
    reason: {
      id: report.reason.id,
      code: report.reason.code,
      label: report.reason.label,
      description: report.reason.description,
    },
    reporter: {
      ...userWithStatus(storage, report.reporter),
    },
    target: serializeTarget(storage, report.targetType, targets),
  };
}

function serializeTarget(
  storage: StorageProvider,
  targetType: Report['targetType'],
  targets: ResolvedTargets,
): AdminReportTarget {
  if (targetType === 'USER') {
    const u = targets.user;
    if (!u) return { kind: 'MISSING' };
    const briefProfile = u.profile
      ? {
          username: u.profile.username,
          displayName: u.profile.displayName,
          avatarUrl: storage.publicUrl(u.profile.avatarKey),
        }
      : null;
    return {
      kind: 'USER',
      user: {
        id: u.id,
        email: u.email,
        status: u.status,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        profile: briefProfile,
        bio: u.profile?.bio ?? null,
        gender: u.profile?.gender ?? null,
        placeName: u.profile?.placeName ?? null,
      },
    };
  }
  if (targetType === 'ACTIVITY') {
    const a = targets.activity;
    if (!a) return { kind: 'MISSING' };
    return {
      kind: 'ACTIVITY',
      activity: {
        id: a.id,
        emoji: a.emoji,
        title: a.title,
        startsAt: a.startsAt.toISOString(),
        status: a.status,
        placeName: a.placeName,
        capacity: a.capacity,
        participantCount: a.participantCount,
        createdAt: a.createdAt.toISOString(),
        deletedAt: a.deletedAt ? a.deletedAt.toISOString() : null,
        host: a.host ? userBrief(storage, a.host) : null,
      },
    };
  }
  if (targetType === 'MESSAGE') {
    const m = targets.message;
    if (!m) return { kind: 'MISSING' };
    return {
      kind: 'MESSAGE',
      message: {
        id: m.id,
        kind: m.kind,
        body: m.body,
        imageUrl: m.imageKey ? storage.publicUrl(m.imageKey) : null,
        parentMessageId: m.parentMessageId,
        createdAt: m.createdAt.toISOString(),
        deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
        sender: m.sender ? userBrief(storage, m.sender) : null,
        activity: m.activity,
      },
    };
  }
  if (targetType === 'POST') {
    const p = targets.post;
    if (!p) return { kind: 'MISSING' };
    return {
      kind: 'POST',
      post: {
        id: p.id,
        caption: p.caption,
        visibility: p.visibility,
        createdAt: p.createdAt.toISOString(),
        deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
        photoUrls: p.photos.map((ph) => storage.publicUrl(ph.imageKey)),
        author: p.author ? userBrief(storage, p.author) : null,
        activity: p.activity,
      },
    };
  }
  if (targetType === 'BUSINESS_VENUE') {
    const v = targets.businessVenue;
    if (!v) return { kind: 'MISSING' };
    return {
      kind: 'BUSINESS_VENUE',
      businessVenue: {
        id: v.id,
        placeName: v.placeName,
        placeLat: v.placeLat,
        placeLng: v.placeLng,
        matchingKeywords: v.matchingKeywords,
        isPaused: v.isPaused,
        createdAt: v.createdAt.toISOString(),
        business: {
          id: v.business.id,
          name: v.business.name,
          slug: v.business.slug,
          logoUrl: v.business.logoKey
            ? storage.publicUrl(v.business.logoKey)
            : null,
          verifiedAt: v.business.verifiedAt
            ? v.business.verifiedAt.toISOString()
            : null,
          suspendedAt: v.business.suspendedAt
            ? v.business.suspendedAt.toISOString()
            : null,
          autoPausedAt: v.business.autoPausedAt
            ? v.business.autoPausedAt.toISOString()
            : null,
        },
      },
    };
  }
  return { kind: 'MISSING' };
}
