-- DropForeignKey
ALTER TABLE "public"."Article" DROP CONSTRAINT "Article_feedId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Article" ADD CONSTRAINT "Article_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "public"."RSSFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
