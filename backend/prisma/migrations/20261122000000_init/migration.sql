-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]'::jsonb,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "icon_name" VARCHAR(50) NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "default_sla_hours" INTEGER NOT NULL DEFAULT 48,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "role_id" UUID NOT NULL,
    "department_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_session_id" VARCHAR(255),
    "reset_token" VARCHAR(255),
    "reset_token_expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "department_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "priority_weight" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "report_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "folio" VARCHAR(25) NOT NULL,
    "citizen_id" UUID,
    "department_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "risk_level" VARCHAR(20) NOT NULL DEFAULT 'MEDIO',
    "current_status" VARCHAR(25) NOT NULL DEFAULT 'REGISTRADO',
    "location_geom" geometry(Point, 4326) NOT NULL,
    "address_reference" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "upvotes_count" INTEGER NOT NULL DEFAULT 1,
    "master_report_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "previous_status" VARCHAR(25) NOT NULL,
    "new_status" VARCHAR(25) NOT NULL,
    "changed_by_user_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_crews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "department_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "coverage_polygon" geometry(Polygon, 4326) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "leader_user_id" UUID NOT NULL,

    CONSTRAINT "field_crews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_folio" VARCHAR(30) NOT NULL,
    "report_id" UUID NOT NULL,
    "crew_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sla_deadline" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(25) NOT NULL DEFAULT 'ASIGNADA',
    "field_notes" TEXT,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizen_upvotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "device_or_user_id" VARCHAR(100) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citizen_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photographic_evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "stage" VARCHAR(15) NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "capture_coords" geometry(Point, 4326) NOT NULL,
    "verified_in_situ" BOOLEAN NOT NULL DEFAULT false,
    "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photographic_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "department_id" UUID,
    "report_id" UUID,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'INFO',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_category_dept_name" ON "report_categories"("department_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "incident_reports_folio_key" ON "incident_reports"("folio");

-- CreateIndex
CREATE INDEX "idx_incident_reports_location_gist" ON "incident_reports" USING GIST ("location_geom");

-- CreateIndex
CREATE INDEX "idx_incident_reports_folio" ON "incident_reports"("folio");

-- CreateIndex
CREATE INDEX "idx_incident_reports_status_dept" ON "incident_reports"("current_status", "department_id");

-- CreateIndex
CREATE INDEX "idx_incident_reports_created_at" ON "incident_reports"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_status_history_report" ON "report_status_history"("report_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_field_crews_coverage_gist" ON "field_crews" USING GIST ("coverage_polygon");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_order_folio_key" ON "work_orders"("order_folio");

-- CreateIndex
CREATE INDEX "idx_work_orders_crew_status" ON "work_orders"("crew_id", "status");

-- CreateIndex
CREATE INDEX "idx_work_orders_sla_deadline" ON "work_orders"("sla_deadline");

-- CreateIndex
CREATE UNIQUE INDEX "uq_citizen_upvote_once" ON "citizen_upvotes"("report_id", "device_or_user_id");

-- CreateIndex
CREATE INDEX "idx_photographic_evidences_coords_gist" ON "photographic_evidences" USING GIST ("capture_coords");

-- CreateIndex
CREATE INDEX "idx_notifications_user_read" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_dept_read" ON "notifications"("department_id", "is_read", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_categories" ADD CONSTRAINT "report_categories_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "report_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_master_report_id_fkey" FOREIGN KEY ("master_report_id") REFERENCES "incident_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_status_history" ADD CONSTRAINT "report_status_history_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_status_history" ADD CONSTRAINT "report_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_crews" ADD CONSTRAINT "field_crews_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_crews" ADD CONSTRAINT "field_crews_leader_user_id_fkey" FOREIGN KEY ("leader_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_crew_id_fkey" FOREIGN KEY ("crew_id") REFERENCES "field_crews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_upvotes" ADD CONSTRAINT "citizen_upvotes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photographic_evidences" ADD CONSTRAINT "photographic_evidences_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "incident_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CheckConstraints (desde infra/db/init.sql)
ALTER TABLE "roles" ADD CONSTRAINT "chk_role_name" CHECK (
    "name" IN ('ROLE_ADMIN', 'ROLE_SUPERVISOR', 'ROLE_CREW', 'ROLE_CITIZEN')
);

ALTER TABLE "departments" ADD CONSTRAINT "chk_department_color" CHECK ("color_hex" ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE "departments" ADD CONSTRAINT "chk_department_sla" CHECK ("default_sla_hours" > 0);

ALTER TABLE "incident_reports" ADD CONSTRAINT "chk_reports_folio_format" CHECK (
    "folio" ~ '^[A-Z]{3}-[0-9]{4}-[0-9]{4,6}$'
);
ALTER TABLE "incident_reports" ADD CONSTRAINT "chk_reports_risk_level" CHECK (
    "risk_level" IN ('BAJO', 'MEDIO', 'ALTO', 'CRITICO')
);
ALTER TABLE "incident_reports" ADD CONSTRAINT "chk_reports_status" CHECK (
    "current_status" IN ('REGISTRADO', 'VALIDADO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'RECHAZADO')
);
ALTER TABLE "incident_reports" ADD CONSTRAINT "chk_reports_upvotes" CHECK ("upvotes_count" >= 1);

ALTER TABLE "work_orders" ADD CONSTRAINT "chk_work_orders_status" CHECK (
    "status" IN ('ASIGNADA', 'EN_RUTA', 'EN_SITIO', 'FINALIZADA')
);

ALTER TABLE "photographic_evidences" ADD CONSTRAINT "chk_evidence_stage" CHECK (
    "stage" IN ('ANTES', 'DESPUES')
);

-- Funciones Espaciales y Triggers Automatizados (PostGIS)
CREATE OR REPLACE FUNCTION fn_find_nearby_duplicate_reports(
    p_longitude DOUBLE PRECISION,
    p_latitude DOUBLE PRECISION,
    p_category_id UUID,
    p_radius_meters DOUBLE PRECISION DEFAULT 50.0
)
RETURNS TABLE (
    report_id UUID,
    folio VARCHAR,
    current_status VARCHAR,
    upvotes_count INTEGER,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ir.id AS report_id,
        ir.folio,
        ir.current_status,
        ir.upvotes_count,
        ST_Distance(
            ir.location_geom::geography,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
        ) AS distance_meters
    FROM incident_reports ir
    WHERE ir.category_id = p_category_id
      AND ir.current_status NOT IN ('RESUELTO', 'RECHAZADO')
      AND ir.master_report_id IS NULL
      AND ST_DWithin(
          ir.location_geom::geography,
          ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
          p_radius_meters
      )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_verify_evidence_in_situ()
RETURNS TRIGGER AS $$
DECLARE
    v_report_geom GEOMETRY(Point, 4326);
BEGIN
    SELECT location_geom INTO v_report_geom
    FROM incident_reports
    WHERE id = NEW.report_id;

    IF v_report_geom IS NOT NULL THEN
        NEW.verified_in_situ := ST_DWithin(
            v_report_geom::geography,
            NEW.capture_coords::geography,
            30.0
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verify_evidence_in_situ
BEFORE INSERT OR UPDATE ON photographic_evidences
FOR EACH ROW
EXECUTE FUNCTION fn_verify_evidence_in_situ();

CREATE OR REPLACE FUNCTION fn_increment_report_upvotes()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE incident_reports
    SET upvotes_count = upvotes_count + 1
    WHERE id = NEW.report_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_report_upvotes
AFTER INSERT ON citizen_upvotes
FOR EACH ROW
EXECUTE FUNCTION fn_increment_report_upvotes();
