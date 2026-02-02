/*
  Warnings:

  - A unique constraint covering the columns `[cpf]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "workloadHours" INTEGER;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "workloadHours" INTEGER;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "cpf" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_cpf_key" ON "Student"("cpf");
