-- Phone uniqueness is per gym (public QR registration); drop global phone unique if present.
DROP INDEX IF EXISTS "Member_phone_key";

-- One non-null phone per gym; PostgreSQL allows multiple (gymId, NULL) rows.
CREATE UNIQUE INDEX "Member_gymId_phone_key" ON "Member"("gymId", "phone");
