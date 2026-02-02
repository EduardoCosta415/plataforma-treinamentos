/*
  Warnings:

  - Added the required column `updatedAt` to the `StudentLessonProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StudentLessonProgress" ADD COLUMN     "lastPosition" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "watchedSeconds" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "StudentLessonProgress_studentId_idx" ON "StudentLessonProgress"("studentId");

-- CreateIndex
CREATE INDEX "StudentLessonProgress_lessonId_idx" ON "StudentLessonProgress"("lessonId");
