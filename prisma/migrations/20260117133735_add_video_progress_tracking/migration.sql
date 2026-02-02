-- AlterTable
ALTER TABLE "StudentLessonProgress" ADD COLUMN     "lastPosition" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "watchedSeconds" INTEGER NOT NULL DEFAULT 0;
