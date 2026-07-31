-- Run once after `prisma migrate deploy` to add the ANN index on career_memory.
-- The `vector` extension itself is created by the Prisma migration (postgresqlExtensions).
-- ivfflat needs data before it is efficient; lists can be tuned as the table grows.

CREATE INDEX IF NOT EXISTS career_memory_embedding_idx
  ON "CareerMemory"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
