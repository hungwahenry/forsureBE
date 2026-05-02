-- DropForeignKey
ALTER TABLE "UserYearStats" DROP CONSTRAINT IF EXISTS "UserYearStats_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "UserYearStats";
