ALTER TABLE "public"."TeamStoryBeat"
ADD COLUMN "parentBeatId" TEXT;

CREATE INDEX "TeamStoryBeat_teamId_parentBeatId_order_idx"
ON "public"."TeamStoryBeat"("teamId", "parentBeatId", "order");

ALTER TABLE "public"."TeamStoryBeat"
ADD CONSTRAINT "TeamStoryBeat_parentBeatId_fkey"
FOREIGN KEY ("parentBeatId") REFERENCES "public"."TeamStoryBeat"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
