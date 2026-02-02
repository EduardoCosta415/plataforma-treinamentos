/*
  Warnings:

  - You are about to drop the column `createdAt` on the `StudentExamAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `finishedAt` on the `StudentExamAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `passed` on the `StudentExamAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `StudentExamAttempt` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_courseId_fkey";

-- DropForeignKey
ALTER TABLE "ExamOption" DROP CONSTRAINT "ExamOption_questionId_fkey";

-- DropForeignKey
ALTER TABLE "ExamQuestion" DROP CONSTRAINT "ExamQuestion_examId_fkey";

-- DropForeignKey
ALTER TABLE "StudentExamAnswer" DROP CONSTRAINT "StudentExamAnswer_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "StudentExamAnswer" DROP CONSTRAINT "StudentExamAnswer_optionId_fkey";

-- DropForeignKey
ALTER TABLE "StudentExamAnswer" DROP CONSTRAINT "StudentExamAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "StudentExamAttempt" DROP CONSTRAINT "StudentExamAttempt_examId_fkey";

-- DropForeignKey
ALTER TABLE "StudentExamAttempt" DROP CONSTRAINT "StudentExamAttempt_studentId_fkey";

-- DropIndex
DROP INDEX "StudentExamAttempt_studentId_examId_idx";

-- AlterTable
ALTER TABLE "StudentExamAttempt" DROP COLUMN "createdAt",
DROP COLUMN "finishedAt",
DROP COLUMN "passed",
DROP COLUMN "score";

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamOption" ADD CONSTRAINT "ExamOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamAttempt" ADD CONSTRAINT "StudentExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamAttempt" ADD CONSTRAINT "StudentExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamAnswer" ADD CONSTRAINT "StudentExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "StudentExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamAnswer" ADD CONSTRAINT "StudentExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamAnswer" ADD CONSTRAINT "StudentExamAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ExamOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
