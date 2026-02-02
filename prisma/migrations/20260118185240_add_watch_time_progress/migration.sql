-- 1) cria coluna updatedAt com DEFAULT para não gerar NULL nos registros existentes
ALTER TABLE "StudentLessonProgress"
  ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "finishedVideo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT NOW();

-- 2) garante que qualquer registro antigo fique preenchido
UPDATE "StudentLessonProgress"
SET "updatedAt" = NOW()
WHERE "updatedAt" IS NULL;

-- 3) agora sim pode travar como NOT NULL
ALTER TABLE "StudentLessonProgress"
  ALTER COLUMN "updatedAt" SET NOT NULL;
