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
    code: 'other',
    label: 'Something else',
    description: 'Tell us what happened in the details.',
    isGeneral: true,
    applicableTo: [],
    sortOrder: 999,
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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
