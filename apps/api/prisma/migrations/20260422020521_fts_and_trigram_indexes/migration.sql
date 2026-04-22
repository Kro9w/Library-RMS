-- Create trigram extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Create GIN index for Document title
CREATE INDEX document_title_fts_idx ON "Document" USING GIN (to_tsvector('english', "title"));

-- Create GIN index for Document fileName
CREATE INDEX document_filename_fts_idx ON "Document" USING GIN (to_tsvector('english', "fileName"));

-- Indexes from schema.prisma for trigram ops
CREATE INDEX "Document_controlNumber_idx" ON "Document" USING GIN ("controlNumber" gin_trgm_ops);
CREATE INDEX "User_firstName_idx" ON "User" USING GIN ("firstName" gin_trgm_ops);
CREATE INDEX "User_lastName_idx" ON "User" USING GIN ("lastName" gin_trgm_ops);

