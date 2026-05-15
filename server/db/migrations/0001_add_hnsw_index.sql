-- HNSW index for fast cosine-similarity nearest-neighbour search on embeddings.
-- Requires the pgvector extension (CREATE EXTENSION IF NOT EXISTS vector) to be
-- installed before this migration runs.
CREATE INDEX IF NOT EXISTS "embeddings_hnsw_idx"
ON "embeddings"
USING hnsw ("embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
