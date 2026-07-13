CREATE TABLE "aira_messages" (
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"source" text,
	"image_key" text,
	"created_at" timestamp with time zone NOT NULL,
	"inserted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aira_messages_user_id_client_id_pk" PRIMARY KEY("user_id","client_id")
);
--> statement-breakpoint
CREATE INDEX "aira_messages_user_id_created_at_idx" ON "aira_messages" USING btree ("user_id","created_at");
