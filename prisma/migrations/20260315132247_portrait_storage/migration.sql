-- CreateTable
CREATE TABLE "public"."CharacterPortrait" (
    "characterId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterPortrait_pkey" PRIMARY KEY ("characterId")
);

-- CreateTable
CREATE TABLE "public"."TeamKnownFacePortrait" (
    "knownFaceId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamKnownFacePortrait_pkey" PRIMARY KEY ("knownFaceId")
);

-- AddForeignKey
ALTER TABLE "public"."CharacterPortrait" ADD CONSTRAINT "CharacterPortrait_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamKnownFacePortrait" ADD CONSTRAINT "TeamKnownFacePortrait_knownFaceId_fkey" FOREIGN KEY ("knownFaceId") REFERENCES "public"."TeamKnownFace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
