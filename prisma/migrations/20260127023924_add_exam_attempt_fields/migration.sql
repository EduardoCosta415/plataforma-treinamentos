/*
  Warnings:

  - A unique constraint covering the columns `[studentId,examId,attemptNumber]` on the table `StudentExamAttempt` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `attemptNumber` to the `StudentExamAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StudentExamAttempt" ADD COLUMN     "attemptNumber" INTEGER NOT NULL,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "passed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scorePercent" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "StudentExamAttempt_studentId_examId_idx" ON "StudentExamAttempt"("studentId", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentExamAttempt_studentId_examId_attemptNumber_key" ON "StudentExamAttempt"("studentId", "examId", "attemptNumber");
