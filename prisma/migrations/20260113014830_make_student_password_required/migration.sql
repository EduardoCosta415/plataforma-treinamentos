/*
  Warnings:

  - Made the column `passwordHash` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "passwordHash" SET NOT NULL;
