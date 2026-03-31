-- Configurable public registration fields per gym; optional member attributes from public join.
ALTER TABLE "Gym" ADD COLUMN "memberFormConfig" JSONB;

ALTER TABLE "Member" ADD COLUMN "meta" JSONB;
