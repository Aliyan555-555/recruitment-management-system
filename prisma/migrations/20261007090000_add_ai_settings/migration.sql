-- CreateTable
CREATE TABLE "ai_settings" (
    "id" BIGSERIAL NOT NULL,
    "endpoint" VARCHAR(500),
    "model" VARCHAR(200),
    "encrypted_token" TEXT,
    "token_hint" VARCHAR(8),
    "updated_by" BIGINT,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);
