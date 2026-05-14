import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ReportTargetType } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

function id(prefix: string): string {
  return `${prefix}_${uuidv7().replace(/-/g, '')}`;
}

interface ReasonSeed {
  code: string;
  label: string;
  description?: string;
  isGeneral: boolean;
  applicableTo: ReportTargetType[];
  sortOrder: number;
}

const REASONS: ReasonSeed[] = [
  {
    code: 'spam',
    label: 'Spam or scam',
    description: 'Promotions, bots, or attempts to defraud.',
    isGeneral: true,
    applicableTo: [],
    sortOrder: 10,
  },
  {
    code: 'inappropriate_content',
    label: 'Inappropriate content',
    description: 'Sexual, graphic, or otherwise unsuitable.',
    isGeneral: true,
    applicableTo: [],
    sortOrder: 20,
  },
  {
    code: 'harassment',
    label: 'Harassment or bullying',
    isGeneral: true,
    applicableTo: [],
    sortOrder: 30,
  },
  {
    code: 'hate_speech',
    label: 'Hate speech or discrimination',
    isGeneral: true,
    applicableTo: [],
    sortOrder: 40,
  },
  {
    code: 'fake_profile',
    label: 'Fake profile',
    description: 'Impersonating someone, or clearly not a real person.',
    isGeneral: false,
    applicableTo: [ReportTargetType.USER],
    sortOrder: 50,
  },
  {
    code: 'impersonation',
    label: 'Impersonation',
    description: 'Pretending to be a specific real person or brand.',
    isGeneral: false,
    applicableTo: [ReportTargetType.USER],
    sortOrder: 60,
  },
  {
    code: 'under_age',
    label: 'Under-age account',
    description: 'You believe this person is below the minimum age.',
    isGeneral: false,
    applicableTo: [ReportTargetType.USER],
    sortOrder: 70,
  },
  {
    code: 'misleading',
    label: 'Misleading details',
    description: 'Activity title, time, or location is misleading.',
    isGeneral: false,
    applicableTo: [ReportTargetType.ACTIVITY],
    sortOrder: 80,
  },
  {
    code: 'unsafe',
    label: 'Unsafe or risky activity',
    isGeneral: false,
    applicableTo: [ReportTargetType.ACTIVITY],
    sortOrder: 90,
  },
  {
    code: 'no_show',
    label: 'Host or members no-showed',
    isGeneral: false,
    applicableTo: [ReportTargetType.ACTIVITY],
    sortOrder: 100,
  },
  {
    code: 'threats',
    label: 'Threats or violence',
    isGeneral: false,
    applicableTo: [ReportTargetType.MESSAGE],
    sortOrder: 110,
  },
  {
    code: 'unwanted_contact',
    label: 'Unwanted contact',
    description: 'Sexual advances, repeated DMs after no response, etc.',
    isGeneral: false,
    applicableTo: [ReportTargetType.MESSAGE],
    sortOrder: 120,
  },
  {
    code: 'nudity',
    label: 'Nudity or sexual content',
    isGeneral: false,
    applicableTo: [ReportTargetType.POST],
    sortOrder: 130,
  },
  {
    code: 'violates_privacy',
    label: 'Posted without consent',
    description: 'Photos of someone who did not agree to be shared.',
    isGeneral: false,
    applicableTo: [ReportTargetType.POST],
    sortOrder: 140,
  },
  {
    code: 'venue_closed',
    label: 'Place is closed or doesn’t exist',
    description: 'We went and it’s permanently closed, or it never existed.',
    isGeneral: false,
    applicableTo: [ReportTargetType.BUSINESS_VENUE],
    sortOrder: 150,
  },
  {
    code: 'venue_misleading',
    label: 'Misleading venue info',
    description: 'Name, photos, or location don’t match what’s actually there.',
    isGeneral: false,
    applicableTo: [ReportTargetType.BUSINESS_VENUE],
    sortOrder: 160,
  },
  {
    code: 'venue_unsafe',
    label: 'Unsafe venue',
    description: 'Safety issues with the location or staff.',
    isGeneral: false,
    applicableTo: [ReportTargetType.BUSINESS_VENUE],
    sortOrder: 170,
  },
  {
    code: 'other',
    label: 'Something else',
    description: 'Tell us what happened in the details.',
    isGeneral: true,
    applicableTo: [],
    sortOrder: 999,
  },
];

interface FlagSeed {
  key: string;
  description: string;
  /** Initial enabled state when the flag is first created. Re-running the
   *  seeder will NOT overwrite a flag whose enabled state was changed via
   *  the admin UI — only the description / clientExposed are refreshed. */
  enabledOnCreate: boolean;
  /** When true, the flag is surfaced via the public GET /feature-flags
   *  endpoint so the mobile app can mirror gating in its UI. */
  clientExposed: boolean;
}

const FLAGS: FlagSeed[] = [
  {
    key: 'signup_enabled',
    description: 'Allow new user account creation via email verification.',
    enabledOnCreate: true,
    clientExposed: true,
  },
  {
    key: 'activity_joining_enabled',
    description:
      'Allow users to join new activities. Existing activities keep running when off.',
    enabledOnCreate: true,
    clientExposed: true,
  },
  {
    key: 'activity_chat_enabled',
    description: 'Allow sending chat messages in activities.',
    enabledOnCreate: true,
    clientExposed: true,
  },
  {
    key: 'public_memories_sharing_enabled',
    description:
      'Allow memory posts to be marked PUBLIC and surfaced in the explore feed.',
    enabledOnCreate: true,
    clientExposed: true,
  },
  {
    key: 'push_notifications_enabled',
    description: 'Master kill switch for all push notifications via Expo.',
    enabledOnCreate: true,
    clientExposed: false,
  },
  {
    key: 'inbox_notifications_enabled',
    description:
      'Persist in-app inbox notifications (independent of push delivery).',
    enabledOnCreate: true,
    clientExposed: false,
  },
  {
    key: 'easter_eggs_enabled',
    description: 'Record easter-egg discoveries (e.g. credits egg).',
    enabledOnCreate: true,
    clientExposed: true,
  },
  {
    key: 'business_signup_enabled',
    description: 'Allow new businesses to be created via the onboarding flow.',
    enabledOnCreate: true,
    clientExposed: false,
  },
  {
    key: 'business_subscriptions_enabled',
    description:
      'Allow new Stripe Checkout sessions to start. Existing subscriptions are unaffected.',
    enabledOnCreate: true,
    clientExposed: false,
  },
  {
    key: 'business_venue_suggestions_enabled',
    description:
      'Surface sponsored business venues in the place picker. Mobile also hides the section when off.',
    enabledOnCreate: true,
    clientExposed: true,
  },
  {
    key: 'business_pick_billing_enabled',
    description:
      'Charge the per-pick fee when a consumer creates an activity at a sponsored venue. Off = record the event with chargedCents=0.',
    enabledOnCreate: true,
    clientExposed: false,
  },
  {
    key: 'business_boosts_enabled',
    description:
      'Allow boosts to be created and interleaved into the feed. Existing boost rows stay but stop appearing when off.',
    enabledOnCreate: true,
    clientExposed: true,
  },
  {
    key: 'business_auto_pause_enabled',
    description:
      'Run the hourly cron that auto-pauses businesses with 3+ distinct venue flags in 30 days.',
    enabledOnCreate: true,
    clientExposed: false,
  },
];

async function main() {
  for (const r of REASONS) {
    await prisma.reportReason.upsert({
      where: { code: r.code },
      create: {
        id: id('rsn'),
        code: r.code,
        label: r.label,
        description: r.description ?? null,
        isGeneral: r.isGeneral,
        applicableTo: r.applicableTo,
        sortOrder: r.sortOrder,
      },
      update: {
        label: r.label,
        description: r.description ?? null,
        isGeneral: r.isGeneral,
        applicableTo: r.applicableTo,
        sortOrder: r.sortOrder,
        active: true,
      },
    });
  }
  console.log(`Seeded ${REASONS.length} report reasons.`);

  for (const f of FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      create: {
        key: f.key,
        description: f.description,
        enabled: f.enabledOnCreate,
        clientExposed: f.clientExposed,
      },
      // Preserve operator-toggled `enabled` state on re-seed.
      update: {
        description: f.description,
        clientExposed: f.clientExposed,
      },
    });
  }
  console.log(`Seeded ${FLAGS.length} feature flags.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
