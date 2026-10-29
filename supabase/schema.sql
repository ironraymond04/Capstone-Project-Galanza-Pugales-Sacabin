SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."ticket_priority" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."ticket_priority" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'pending',
    'in_progress',
    'resolved',
    'closed',
    'transferred'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'staff',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select role from public.profiles where user_id = auth.uid();
$$;


ALTER FUNCTION "public"."auth_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (user_id, name, email, role, course, year_level, id_number)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    new.raw_user_meta_data ->> 'course',
    (new.raw_user_meta_data ->> 'year_level')::smallint,
    new.raw_user_meta_data ->> 'id_number'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."logs" (
    "log_id" bigint NOT NULL,
    "user_id" "uuid",
    "office_id" bigint,
    "action" character varying(150) NOT NULL,
    "module" character varying(100),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ticket_id" bigint
);


ALTER TABLE "public"."logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."logs_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."logs_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."logs_log_id_seq" OWNED BY "public"."logs"."log_id";



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "notif_id" bigint NOT NULL,
    "ticket_id" bigint,
    "user_id" "uuid" NOT NULL,
    "message" character varying(500) NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."notifications_notif_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notifications_notif_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notifications_notif_id_seq" OWNED BY "public"."notifications"."notif_id";



CREATE TABLE IF NOT EXISTS "public"."offices" (
    "office_id" bigint NOT NULL,
    "office_name" character varying(150) NOT NULL,
    "location" character varying(255),
    "contact_email" character varying(150),
    "head_user_id" "uuid"
);


ALTER TABLE "public"."offices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."offices_office_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."offices_office_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."offices_office_id_seq" OWNED BY "public"."offices"."office_id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "name" character varying(150) NOT NULL,
    "email" character varying(150) NOT NULL,
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "office_id" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "course" character varying(150),
    "year_level" smallint,
    "avatar_url" "text",
    "id_number" character varying(50),
    CONSTRAINT "profiles_year_level_check" CHECK ((("year_level" >= 1) AND ("year_level" <= 6)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_responses" (
    "response_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ticket_id" bigint NOT NULL,
    "rating" integer,
    "feedback" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "survey_responses_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."survey_responses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."survey_responses_response_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."survey_responses_response_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."survey_responses_response_id_seq" OWNED BY "public"."survey_responses"."response_id";



CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "ticket_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "concern_text" "text" NOT NULL,
    "assigned_office" bigint,
    "status" "public"."ticket_status" DEFAULT 'pending'::"public"."ticket_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "transfer_reason" "text",
    "priority" "public"."ticket_priority" DEFAULT 'medium'::"public"."ticket_priority" NOT NULL,
    "classification_confidence" smallint,
    "predicted_offices" bigint[] DEFAULT '{}'::bigint[] NOT NULL,
    CONSTRAINT "tickets_classification_confidence_check" CHECK ((("classification_confidence" >= 0) AND ("classification_confidence" <= 100)))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."tickets_ticket_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tickets_ticket_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tickets_ticket_id_seq" OWNED BY "public"."tickets"."ticket_id";



ALTER TABLE ONLY "public"."logs" ALTER COLUMN "log_id" SET DEFAULT "nextval"('"public"."logs_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notifications" ALTER COLUMN "notif_id" SET DEFAULT "nextval"('"public"."notifications_notif_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."offices" ALTER COLUMN "office_id" SET DEFAULT "nextval"('"public"."offices_office_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."survey_responses" ALTER COLUMN "response_id" SET DEFAULT "nextval"('"public"."survey_responses_response_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tickets" ALTER COLUMN "ticket_id" SET DEFAULT "nextval"('"public"."tickets_ticket_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("notif_id");



ALTER TABLE ONLY "public"."offices"
    ADD CONSTRAINT "offices_pkey" PRIMARY KEY ("office_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("response_id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("ticket_id");



CREATE INDEX "idx_logs_office_id" ON "public"."logs" USING "btree" ("office_id");



CREATE INDEX "idx_logs_ticket_id" ON "public"."logs" USING "btree" ("ticket_id");



CREATE INDEX "idx_logs_user_id" ON "public"."logs" USING "btree" ("user_id");



CREATE INDEX "idx_notif_ticket_id" ON "public"."notifications" USING "btree" ("ticket_id");



CREATE INDEX "idx_notif_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_office_id" ON "public"."profiles" USING "btree" ("office_id");



CREATE INDEX "idx_survey_ticket_id" ON "public"."survey_responses" USING "btree" ("ticket_id");



CREATE INDEX "idx_survey_user_id" ON "public"."survey_responses" USING "btree" ("user_id");



CREATE INDEX "idx_tickets_assigned_office" ON "public"."tickets" USING "btree" ("assigned_office");



CREATE INDEX "idx_tickets_status" ON "public"."tickets" USING "btree" ("status");



CREATE INDEX "idx_tickets_user_id" ON "public"."tickets" USING "btree" ("user_id");



CREATE UNIQUE INDEX "profiles_id_number_key" ON "public"."profiles" USING "btree" ("id_number") WHERE ("id_number" IS NOT NULL);



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("office_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("ticket_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."logs"
    ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("ticket_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offices"
    ADD CONSTRAINT "offices_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("office_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("ticket_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assigned_office_fkey" FOREIGN KEY ("assigned_office") REFERENCES "public"."offices"("office_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



CREATE POLICY "Staff can view tickets assigned to their office" ON "public"."tickets" FOR SELECT USING (("assigned_office" = ( SELECT "profiles"."office_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "logs_insert_authenticated" ON "public"."logs" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "logs_select_admin" ON "public"."logs" FOR SELECT USING (("public"."auth_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "notif_select_own" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notif_update_own" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "offices_admin_update" ON "public"."offices" FOR UPDATE USING (("public"."auth_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "offices_admin_write" ON "public"."offices" USING (("public"."auth_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "offices_select_all" ON "public"."offices" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "profiles_admin_update" ON "public"."profiles" FOR UPDATE USING (("public"."auth_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_select_own_or_admin" ON "public"."profiles" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("public"."auth_role"() = 'admin'::"public"."user_role")));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "survey_insert_own" ON "public"."survey_responses" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "survey_select" ON "public"."survey_responses" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("public"."auth_role"() = ANY (ARRAY['staff'::"public"."user_role", 'admin'::"public"."user_role"]))));



CREATE POLICY "tickets_admin_all" ON "public"."tickets" USING (("public"."auth_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "tickets_insert_own" ON "public"."tickets" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "tickets_select" ON "public"."tickets" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("public"."auth_role"() = 'admin'::"public"."user_role") OR (("public"."auth_role"() = 'staff'::"public"."user_role") AND ("assigned_office" = ( SELECT "profiles"."office_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))))));



CREATE POLICY "tickets_update_staff_admin" ON "public"."tickets" FOR UPDATE USING ((("public"."auth_role"() = 'admin'::"public"."user_role") OR (("public"."auth_role"() = 'staff'::"public"."user_role") AND ("assigned_office" = ( SELECT "profiles"."office_id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."auth_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


GRANT ALL ON TABLE "public"."logs" TO "anon";
GRANT ALL ON TABLE "public"."logs" TO "authenticated";
GRANT ALL ON TABLE "public"."logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."logs_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."logs_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."logs_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_notif_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_notif_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_notif_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."offices" TO "anon";
GRANT ALL ON TABLE "public"."offices" TO "authenticated";
GRANT ALL ON TABLE "public"."offices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."offices_office_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."offices_office_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."offices_office_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_responses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."survey_responses_response_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."survey_responses_response_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."survey_responses_response_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tickets_ticket_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tickets_ticket_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tickets_ticket_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































