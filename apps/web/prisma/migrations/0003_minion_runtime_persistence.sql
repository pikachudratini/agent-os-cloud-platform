-- Persist full self-hosted Minion runtime state for Prisma/Postgres mode.
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "blueprintName" TEXT;
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "minionId" TEXT;
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "workspaceRoot" TEXT;
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "hermesProfilePath" TEXT;
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "hermesConfigPath" TEXT;
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "credentialVaultPath" TEXT;
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "supervisorPath" TEXT;
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "logPath" TEXT;
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "processSupervisor" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "MinionRuntime" ADD COLUMN IF NOT EXISTS "availableActions" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "MinionRuntime"
SET "minionId" = COALESCE("minionId", concat('runtime-', substr("id"::text, 1, 8))),
    "blueprintName" = COALESCE("blueprintName", "blueprintId")
WHERE "minionId" IS NULL OR "blueprintName" IS NULL;

ALTER TABLE "MinionRuntime" ALTER COLUMN "minionId" SET NOT NULL;
ALTER TABLE "MinionRuntime" ALTER COLUMN "blueprintName" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "MinionRuntime_orgId_minionId_key" ON "MinionRuntime"("orgId", "minionId");
CREATE INDEX IF NOT EXISTS "MinionRuntime_owner_minion_idx" ON "MinionRuntime"("ownerUserId", "minionId");
