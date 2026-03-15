CREATE TYPE "ConditionModifierTarget" AS ENUM ('hitPoints', 'mindPoints', 'radiation');

ALTER TABLE "Character"
ADD COLUMN "maxRadiation" INTEGER NOT NULL DEFAULT 10;

CREATE TABLE "CharacterConditionModifier" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "target" "ConditionModifierTarget" NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterConditionModifier_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CharacterConditionModifier_characterId_order_idx" ON "CharacterConditionModifier"("characterId", "order");

ALTER TABLE "CharacterConditionModifier"
ADD CONSTRAINT "CharacterConditionModifier_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
