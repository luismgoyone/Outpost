DROP INDEX "stats_cache_repo_key_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "stats_cache_repo_key_idx" ON "stats_cache" USING btree ("repo_id","key");