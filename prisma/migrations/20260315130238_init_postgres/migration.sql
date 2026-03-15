-- CreateEnum
CREATE TYPE "public"."TalentSource" AS ENUM ('group', 'concept', 'icon', 'other');

-- CreateEnum
CREATE TYPE "public"."OriginCulture" AS ENUM ('firstcome', 'zenithian');

-- CreateEnum
CREATE TYPE "public"."OriginSystem" AS ENUM ('algol', 'mira', 'kua', 'dabaran', 'zalos', 'other');

-- CreateEnum
CREATE TYPE "public"."Upbringing" AS ENUM ('plebeian', 'stationary', 'privileged');

-- CreateEnum
CREATE TYPE "public"."TeamNoteTag" AS ENUM ('mission', 'npc', 'faction', 'ship', 'mystery', 'debt', 'session');

-- CreateEnum
CREATE TYPE "public"."TeamFactionStance" AS ENUM ('ally', 'neutral', 'enemy');

-- CreateEnum
CREATE TYPE "public"."TeamCrewRole" AS ENUM ('captain', 'engineer', 'pilot', 'sensorOperator', 'gunner');

-- CreateTable
CREATE TABLE "public"."Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "background" TEXT NOT NULL DEFAULT '',
    "originCulture" "public"."OriginCulture",
    "originSystem" "public"."OriginSystem",
    "upbringing" "public"."Upbringing",
    "concept" TEXT NOT NULL DEFAULT '',
    "groupConcept" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '',
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "personalProblem" TEXT NOT NULL DEFAULT '',
    "face" TEXT NOT NULL DEFAULT '',
    "clothing" TEXT NOT NULL DEFAULT '',
    "portraitPath" TEXT,
    "strength" INTEGER NOT NULL DEFAULT 2,
    "agility" INTEGER NOT NULL DEFAULT 2,
    "wits" INTEGER NOT NULL DEFAULT 2,
    "empathy" INTEGER NOT NULL DEFAULT 2,
    "maxHitPoints" INTEGER NOT NULL DEFAULT 4,
    "currentHitPoints" INTEGER NOT NULL DEFAULT 4,
    "maxMindPoints" INTEGER NOT NULL DEFAULT 4,
    "currentMindPoints" INTEGER NOT NULL DEFAULT 4,
    "radiation" INTEGER NOT NULL DEFAULT 0,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "criticalInjuries" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "myCabinDescription" TEXT NOT NULL DEFAULT '',
    "myCabinGear" TEXT NOT NULL DEFAULT '',
    "myCabinOther" TEXT NOT NULL DEFAULT '',
    "birr" INTEGER NOT NULL DEFAULT 0,
    "armorName" TEXT NOT NULL DEFAULT '',
    "armorRating" INTEGER NOT NULL DEFAULT 0,
    "armorComment" TEXT NOT NULL DEFAULT '',
    "dexterity" INTEGER NOT NULL DEFAULT 0,
    "force" INTEGER NOT NULL DEFAULT 0,
    "infiltration" INTEGER NOT NULL DEFAULT 0,
    "manipulation" INTEGER NOT NULL DEFAULT 0,
    "meleeCombat" INTEGER NOT NULL DEFAULT 0,
    "observation" INTEGER NOT NULL DEFAULT 0,
    "rangedCombat" INTEGER NOT NULL DEFAULT 0,
    "survival" INTEGER NOT NULL DEFAULT 0,
    "command" INTEGER NOT NULL DEFAULT 0,
    "culture" INTEGER NOT NULL DEFAULT 0,
    "dataDjinn" INTEGER NOT NULL DEFAULT 0,
    "medicurgy" INTEGER NOT NULL DEFAULT 0,
    "mysticPowers" INTEGER NOT NULL DEFAULT 0,
    "pilot" INTEGER NOT NULL DEFAULT 0,
    "science" INTEGER NOT NULL DEFAULT 0,
    "technology" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Bridge Dossier',
    "manifesto" TEXT NOT NULL DEFAULT '',
    "story" TEXT NOT NULL DEFAULT '',
    "groupConcept" TEXT NOT NULL DEFAULT '',
    "groupTalent" TEXT NOT NULL DEFAULT '',
    "patron" TEXT NOT NULL DEFAULT '',
    "nemesis" TEXT NOT NULL DEFAULT '',
    "shipName" TEXT NOT NULL DEFAULT '',
    "shipType" TEXT NOT NULL DEFAULT '',
    "shipClass" TEXT NOT NULL DEFAULT '',
    "shipProblem" TEXT NOT NULL DEFAULT '',
    "shipDebt" INTEGER NOT NULL DEFAULT 0,
    "shipUpgrades" TEXT NOT NULL DEFAULT '',
    "currentGoal" TEXT NOT NULL DEFAULT '',
    "nextLead" TEXT NOT NULL DEFAULT '',
    "reward" TEXT NOT NULL DEFAULT '',
    "deadline" TEXT NOT NULL DEFAULT '',
    "unresolvedMystery" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamCrewPosition" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "role" "public"."TeamCrewRole" NOT NULL,
    "primaryCharacterId" TEXT,
    "backupCharacterId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamCrewPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamStoryBeat" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamStoryBeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamNote" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "tag" "public"."TeamNoteTag" NOT NULL DEFAULT 'session',
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamKnownFace" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "concept" TEXT NOT NULL DEFAULT '',
    "faction" TEXT NOT NULL DEFAULT '',
    "lastSeen" TEXT NOT NULL DEFAULT '',
    "trustLevel" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT NOT NULL DEFAULT '',
    "portraitPath" TEXT,
    "promotedCharacterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamKnownFace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamFactionTie" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "faction" TEXT NOT NULL DEFAULT '',
    "stance" "public"."TeamFactionStance" NOT NULL DEFAULT 'neutral',
    "heat" INTEGER NOT NULL DEFAULT 0,
    "leverageHolder" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFactionTie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CharacterRelationship" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetName" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "isBuddy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CharacterTalent" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "source" "public"."TalentSource" NOT NULL DEFAULT 'other',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterTalent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CharacterWeapon" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "presetId" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "bonus" INTEGER NOT NULL DEFAULT 0,
    "initiative" INTEGER NOT NULL DEFAULT 0,
    "damage" INTEGER NOT NULL DEFAULT 0,
    "crit" TEXT NOT NULL DEFAULT '',
    "range" TEXT NOT NULL DEFAULT '',
    "comments" TEXT NOT NULL DEFAULT '',
    "reloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterWeapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CharacterGearItem" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "presetId" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "bonus" TEXT NOT NULL DEFAULT '',
    "comment" TEXT NOT NULL DEFAULT '',
    "encumbranceUnits" INTEGER NOT NULL DEFAULT 2,
    "isTiny" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterGearItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CharacterContact" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "concept" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamCrewPosition_teamId_order_idx" ON "public"."TeamCrewPosition"("teamId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TeamCrewPosition_teamId_role_key" ON "public"."TeamCrewPosition"("teamId", "role");

-- CreateIndex
CREATE INDEX "TeamStoryBeat_teamId_order_idx" ON "public"."TeamStoryBeat"("teamId", "order");

-- CreateIndex
CREATE INDEX "TeamNote_teamId_order_idx" ON "public"."TeamNote"("teamId", "order");

-- CreateIndex
CREATE INDEX "TeamKnownFace_teamId_order_idx" ON "public"."TeamKnownFace"("teamId", "order");

-- CreateIndex
CREATE INDEX "TeamFactionTie_teamId_order_idx" ON "public"."TeamFactionTie"("teamId", "order");

-- CreateIndex
CREATE INDEX "CharacterRelationship_characterId_order_idx" ON "public"."CharacterRelationship"("characterId", "order");

-- CreateIndex
CREATE INDEX "CharacterTalent_characterId_order_idx" ON "public"."CharacterTalent"("characterId", "order");

-- CreateIndex
CREATE INDEX "CharacterWeapon_characterId_order_idx" ON "public"."CharacterWeapon"("characterId", "order");

-- CreateIndex
CREATE INDEX "CharacterGearItem_characterId_order_idx" ON "public"."CharacterGearItem"("characterId", "order");

-- CreateIndex
CREATE INDEX "CharacterContact_characterId_order_idx" ON "public"."CharacterContact"("characterId", "order");

-- AddForeignKey
ALTER TABLE "public"."TeamCrewPosition" ADD CONSTRAINT "TeamCrewPosition_backupCharacterId_fkey" FOREIGN KEY ("backupCharacterId") REFERENCES "public"."Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamCrewPosition" ADD CONSTRAINT "TeamCrewPosition_primaryCharacterId_fkey" FOREIGN KEY ("primaryCharacterId") REFERENCES "public"."Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamCrewPosition" ADD CONSTRAINT "TeamCrewPosition_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamStoryBeat" ADD CONSTRAINT "TeamStoryBeat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamNote" ADD CONSTRAINT "TeamNote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamKnownFace" ADD CONSTRAINT "TeamKnownFace_promotedCharacterId_fkey" FOREIGN KEY ("promotedCharacterId") REFERENCES "public"."Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamKnownFace" ADD CONSTRAINT "TeamKnownFace_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamFactionTie" ADD CONSTRAINT "TeamFactionTie_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharacterRelationship" ADD CONSTRAINT "CharacterRelationship_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharacterTalent" ADD CONSTRAINT "CharacterTalent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharacterWeapon" ADD CONSTRAINT "CharacterWeapon_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharacterGearItem" ADD CONSTRAINT "CharacterGearItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CharacterContact" ADD CONSTRAINT "CharacterContact_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
