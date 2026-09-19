-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "watchers" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "watchlists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email_notifs" BOOLEAN NOT NULL DEFAULT true,
    "push_notifs" BOOLEAN NOT NULL DEFAULT true,
    "in_app_notifs" BOOLEAN NOT NULL DEFAULT true,
    "profile_public" BOOLEAN NOT NULL DEFAULT false,
    "show_activity" BOOLEAN NOT NULL DEFAULT true,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlists_user_id_idx" ON "watchlists"("user_id");

-- CreateIndex
CREATE INDEX "watchlists_listing_id_idx" ON "watchlists"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlists_user_id_listing_id_key" ON "watchlists"("user_id", "listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
