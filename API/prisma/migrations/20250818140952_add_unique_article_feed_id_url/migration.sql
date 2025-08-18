/*
  Warnings:

  - A unique constraint covering the columns `[feedId,url]` on the table `Article` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Article_feedId_url_key" ON "public"."Article"("feedId", "url");
