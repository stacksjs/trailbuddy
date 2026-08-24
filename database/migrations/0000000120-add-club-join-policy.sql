-- `is_private` controls VISIBILITY. Whether a stranger may join is a separate
-- question, and a closed team (Rappid Run) answers it differently: visible in
-- the directory, joinable only through a ClubInvite.
ALTER TABLE "clubs" ADD COLUMN "join_policy" TEXT CHECK ("join_policy" IN ('open', 'request', 'invite_only')) NOT NULL DEFAULT 'open';
ALTER TABLE "clubs" ADD COLUMN "website" TEXT;
