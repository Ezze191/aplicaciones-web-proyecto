-- =============================================================================
-- PLATAFORMA MUNICIPAL DE REPORTES CIUDADANOS E INCIDENCIAS URBANAS (S.I.U.)
-- Torreón Alerta — Script Oficial de Base de Datos Local (PostgreSQL 16 + PostGIS 3.4)
-- Basado en el Diccionario de Datos Oficial (Criterio 8 - README.md)
-- =============================================================================

-- 1. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================================================
-- 2. LIMPIEZA PREVIA (Idempotencia para reinicios en entorno local)
-- =============================================================================
DROP TABLE IF EXISTS photographic_evidences CASCADE;
DROP TABLE IF EXISTS citizen_upvotes CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS field_crews CASCADE;
DROP TABLE IF EXISTS report_status_history CASCADE;
DROP TABLE IF EXISTS incident_reports CASCADE;
DROP TABLE IF EXISTS report_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =============================================================================
-- 3. CREACIÓN DE TABLAS (Ordenadas por Integridad Referencial)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla 2: roles (Roles de Control de Acceso - RBAC)
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT chk_role_name CHECK (
        name IN ('ROLE_ADMIN', 'ROLE_SUPERVISOR', 'ROLE_CREW', 'ROLE_CITIZEN')
    )
);

COMMENT ON TABLE roles IS 'Perfiles de autorización en el sistema (Admin General, Supervisor de Dependencia, Cuadrilla de Campo, Ciudadano).';

-- -----------------------------------------------------------------------------
-- Tabla 3: departments (Organismos y Dependencias Municipales)
-- -----------------------------------------------------------------------------
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7) NOT NULL,
    default_sla_hours INTEGER NOT NULL DEFAULT 48,
    CONSTRAINT chk_department_color CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_department_sla CHECK (default_sla_hours > 0)
);

COMMENT ON TABLE departments IS 'Dependencias operativas que atienden servicios urbanos (SIMAS, La OLA, Obras Públicas).';

-- -----------------------------------------------------------------------------
-- Tabla 1: users (Usuarios del Sistema: Ciudadanos y Funcionarios)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL DEFAULT NULL,
    role_id UUID NOT NULL,
    department_id UUID NULL DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_users_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

COMMENT ON TABLE users IS 'Almacena la información de ciudadanos registrados y funcionarios institucionales con acceso al Backoffice.';

-- -----------------------------------------------------------------------------
-- Tabla 5: report_categories (Categorías y Tipologías de Falla)
-- -----------------------------------------------------------------------------
CREATE TABLE report_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    priority_weight INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_categories_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_category_dept_name UNIQUE (department_id, name)
);

COMMENT ON TABLE report_categories IS 'Catálogo jerárquico de fallas por dependencia (Baches, Fugas de Agua, Luminaria Apagada, Alcantarilla Abierta).';

-- -----------------------------------------------------------------------------
-- Tabla 4: incident_reports (Incidencias Urbanas Reportadas)
-- -----------------------------------------------------------------------------
CREATE TABLE incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(25) NOT NULL UNIQUE,
    citizen_id UUID NULL DEFAULT NULL,
    department_id UUID NOT NULL,
    category_id UUID NOT NULL,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'MEDIO',
    current_status VARCHAR(25) NOT NULL DEFAULT 'REGISTRADO',
    location_geom GEOMETRY(Point, 4326) NOT NULL,
    address_reference VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    upvotes_count INTEGER NOT NULL DEFAULT 1,
    master_report_id UUID NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ NULL DEFAULT NULL,
    CONSTRAINT fk_reports_citizen
        FOREIGN KEY (citizen_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_reports_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reports_category
        FOREIGN KEY (category_id) REFERENCES report_categories(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reports_master
        FOREIGN KEY (master_report_id) REFERENCES incident_reports(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_reports_folio_format CHECK (
        folio ~ '^[A-Z]{3}-[0-9]{4}-[0-9]{4,6}$'
    ),
    CONSTRAINT chk_reports_risk_level CHECK (
        risk_level IN ('BAJO', 'MEDIO', 'ALTO', 'CRITICO')
    ),
    CONSTRAINT chk_reports_status CHECK (
        current_status IN ('REGISTRADO', 'VALIDADO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'RECHAZADO')
    ),
    CONSTRAINT chk_reports_upvotes CHECK (upvotes_count >= 1)
);

COMMENT ON TABLE incident_reports IS 'Entidad medular que registra los reportes ciudadanos, datos de geolocalización, folios maestros y estatus.';

-- -----------------------------------------------------------------------------
-- Tabla 6: report_status_history (Bitácora de Trazabilidad y Auditoría)
-- -----------------------------------------------------------------------------
CREATE TABLE report_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL,
    previous_status VARCHAR(25) NOT NULL,
    new_status VARCHAR(25) NOT NULL,
    changed_by_user_id UUID NOT NULL,
    notes TEXT NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_report
        FOREIGN KEY (report_id) REFERENCES incident_reports(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_history_user
        FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE report_status_history IS 'Historial inmutable de cambios de estado para generar la línea de tiempo de auditoría ciudadana.';

-- -----------------------------------------------------------------------------
-- Tabla 8: field_crews (Flotillas y Cuadrillas Operativas de Campo)
-- -----------------------------------------------------------------------------
CREATE TABLE field_crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    coverage_polygon GEOMETRY(Polygon, 4326) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    leader_user_id UUID NOT NULL,
    CONSTRAINT fk_crews_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_crews_leader
        FOREIGN KEY (leader_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE field_crews IS 'Registra las unidades técnicas de trabajo, polígonos de cobertura asignados y supervisores en turno.';

-- -----------------------------------------------------------------------------
-- Tabla 7: work_orders (Órdenes de Trabajo para Cuadrillas)
-- -----------------------------------------------------------------------------
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_folio VARCHAR(30) NOT NULL UNIQUE,
    report_id UUID NOT NULL,
    crew_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sla_deadline TIMESTAMPTZ NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'ASIGNADA',
    field_notes TEXT NULL DEFAULT NULL,
    CONSTRAINT fk_work_orders_report
        FOREIGN KEY (report_id) REFERENCES incident_reports(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_work_orders_crew
        FOREIGN KEY (crew_id) REFERENCES field_crews(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_work_orders_status CHECK (
        status IN ('ASIGNADA', 'EN_RUTA', 'EN_SITIO', 'FINALIZADA')
    )
);

COMMENT ON TABLE work_orders IS 'Vincula un reporte aprobado con una unidad operativa específica y controla los plazos de vencimiento SLA.';

-- -----------------------------------------------------------------------------
-- Tabla 9: citizen_upvotes (Confirmaciones Vecinales Distribuidas)
-- -----------------------------------------------------------------------------
CREATE TABLE citizen_upvotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL,
    device_or_user_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_upvotes_report
        FOREIGN KEY (report_id) REFERENCES incident_reports(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_citizen_upvote_once UNIQUE (report_id, device_or_user_id)
);

COMMENT ON TABLE citizen_upvotes IS 'Registra el respaldo ciudadano ("Sigue ahí") para evitar votos fraudulentos o duplicidad por usuario.';

-- -----------------------------------------------------------------------------
-- Tabla 10: photographic_evidences (Evidencias Fotográficas Auditadas)
-- -----------------------------------------------------------------------------
CREATE TABLE photographic_evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL,
    stage VARCHAR(15) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    capture_coords GEOMETRY(Point, 4326) NOT NULL,
    verified_in_situ BOOLEAN NOT NULL DEFAULT FALSE,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evidences_report
        FOREIGN KEY (report_id) REFERENCES incident_reports(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_evidence_stage CHECK (
        stage IN ('ANTES', 'DESPUES')
    )
);

COMMENT ON TABLE photographic_evidences IS 'Gestiona las imágenes en vivo tomadas durante el reporte inicial (ANTES) y el cierre en campo (DESPUES).';

-- =============================================================================
-- 4. ÍNDICES ESPACIALES (GiST) Y RELACIONALES (B-TREE) PARA RENDIMIENTO < 100ms
-- =============================================================================

-- Índices espaciales PostGIS (GiST)
CREATE INDEX idx_incident_reports_location_gist
    ON incident_reports USING GIST (location_geom);

CREATE INDEX idx_field_crews_coverage_gist
    ON field_crews USING GIST (coverage_polygon);

CREATE INDEX idx_photographic_evidences_coords_gist
    ON photographic_evidences USING GIST (capture_coords);

-- Índices B-Tree para búsquedas frecuentes y filtros en Backoffice
CREATE INDEX idx_incident_reports_folio ON incident_reports (folio);
CREATE INDEX idx_incident_reports_status_dept ON incident_reports (current_status, department_id);
CREATE INDEX idx_incident_reports_created_at ON incident_reports (created_at DESC);
CREATE INDEX idx_work_orders_crew_status ON work_orders (crew_id, status);
CREATE INDEX idx_work_orders_sla_deadline ON work_orders (sla_deadline);
CREATE INDEX idx_status_history_report ON report_status_history (report_id, created_at DESC);

-- =============================================================================
-- 5. FUNCIONES ESPACIALES Y TRIGGERS AUTOMATIZADOS (PostGIS)
-- =============================================================================

-- 5.1 Función de Geo-Desduplicación en un radio de N metros (Por defecto 50m)
-- Uso: SELECT * FROM fn_find_nearby_duplicate_reports(-103.4068, 25.5428, '<category_uuid>', 50);
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

-- 5.2 Trigger que calcula automáticamente verified_in_situ (< 30m del reporte)
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

-- 5.3 Trigger que incrementa automáticamente upvotes_count al insertar en citizen_upvotes
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

-- =============================================================================
-- 6. DATOS SEMILLA (SEED DATA) PARA ENTORNO LOCAL DEL EQUIPO
-- =============================================================================

-- 6.1 Insertar Roles Oficiales
INSERT INTO roles (id, name, description, permissions) VALUES
    ('11111111-1111-4111-8111-111111111111', 'ROLE_ADMIN', 'Administrador General del Sistema Municipal', '["*"]'::jsonb),
    ('22222222-2222-4222-8222-222222222222', 'ROLE_SUPERVISOR', 'Funcionario / Supervisor de Dependencia (Backoffice)', '["reports:read", "reports:assign", "reports:reject", "crews:manage", "kanban:write"]'::jsonb),
    ('33333333-3333-4333-8333-333333333333', 'ROLE_CREW', 'Jefe de Cuadrilla Operativa de Campo', '["work_orders:read", "work_orders:resolve", "evidences:upload"]'::jsonb),
    ('44444444-4444-4444-8444-444444444444', 'ROLE_CITIZEN', 'Ciudadano Registrado en la PWA', '["reports:create", "reports:read", "reports:upvote"]'::jsonb);

-- 6.2 Insertar Dependencias Municipales (Torreón: SIMAS, OLA, Obras Públicas)
INSERT INTO departments (id, code, name, icon_name, color_hex, default_sla_hours) VALUES
    ('aaaa1111-1111-4111-8111-111111111111', 'SIM', 'Sistema Municipal de Aguas y Saneamiento (SIMAS)', 'Droplets', '#0284C7', 24),
    ('bbbb2222-2222-4222-8222-222222222222', 'OLA', 'Dirección de Limpieza Urbana y Espacios Públicos (La OLA)', 'Sparkles', '#10B981', 36),
    ('cccc3333-3333-4333-8333-333333333333', 'OBP', 'Dirección General de Obras Públicas y Bacheo', 'Construction', '#EA580C', 48);

-- 6.3 Insertar Categorías de Fallas por Dependencia
INSERT INTO report_categories (id, department_id, name, description, priority_weight) VALUES
    -- SIMAS
    ('c1111111-1111-4111-8111-111111111111', 'aaaa1111-1111-4111-8111-111111111111', 'Fuga de Agua Potable', 'Ruptura o filtración visible de agua limpia en banqueta o pavimento.', 4),
    ('c1111111-1111-4111-8111-222222222222', 'aaaa1111-1111-4111-8111-111111111111', 'Brote de Aguas Negras / Drenaje Colapsado', 'Desbordamiento de alcantarillado sanitario con riesgo sanitario.', 5),
    ('c1111111-1111-4111-8111-333333333333', 'aaaa1111-1111-4111-8111-111111111111', 'Alcantarilla sin Tapa', 'Registro o boca de tormenta abierta con peligro para peatones y vehículos.', 5),
    -- La OLA (Limpieza, Escombros y Áreas Verdes)
    ('c2222222-2222-4222-8222-111111111111', 'bbbb2222-2222-4222-8222-222222222222', 'Acumulación de Basura / Tiradero Clandestino', 'Desechos sólidos acumulados en vía pública, terrenos baldíos o camellones.', 3),
    ('c2222222-2222-4222-8222-222222222222', 'bbbb2222-2222-4222-8222-222222222222', 'Escombro o Maleza Invadiendo Vialidad', 'Restos de construcción o maleza crecida bloqueando paso peatonal o vehicular.', 4),
    -- Obras Públicas
    ('c3333333-3333-4333-8333-111111111111', 'cccc3333-3333-4333-8333-333333333333', 'Bache Profundo en Vialidad', 'Hundimiento o desprendimiento de carpeta asfáltica en calle o avenida.', 3),
    ('c3333333-3333-4333-8333-222222222222', 'cccc3333-3333-4333-8333-333333333333', 'Hundimiento / Socavón en Pavimento', 'Fractura grave del subsuelo con riesgo de colapso vehicular.', 5);

-- 6.4 Insertar Usuarios de Prueba para el Equipo (Password hash de ejemplo para 'Torreon2026!')
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, department_id) VALUES
    -- Admin General
    ('u0000000-0000-4000-8000-000000000001', 'admin@torreon.gob.mx', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL6.1/2Gy', 'Sergio', 'González Acosta', '8711000001', '11111111-1111-4111-8111-111111111111', NULL),
    -- Supervisores por Dependencia
    ('u0000000-0000-4000-8000-000000000002', 'supervisor.simas@torreon.gob.mx', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL6.1/2Gy', 'Erik Fernando', 'Hernández Ayala', '8711000002', '22222222-2222-4222-8222-222222222222', 'aaaa1111-1111-4111-8111-111111111111'),
    ('u0000000-0000-4000-8000-000000000003', 'supervisor.ola@torreon.gob.mx', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL6.1/2Gy', 'Gema Daniela', 'Castañeda Barraza', '8711000003', '22222222-2222-4222-8222-222222222222', 'bbbb2222-2222-4222-8222-222222222222'),
    ('u0000000-0000-4000-8000-000000000004', 'supervisor.obras@torreon.gob.mx', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL6.1/2Gy', 'César Fabián', 'Reyes Cortinas', '8711000004', '22222222-2222-4222-8222-222222222222', 'cccc3333-3333-4333-8333-333333333333'),
    -- Jefes de Cuadrilla
    ('u0000000-0000-4000-8000-000000000005', 'cuadrilla04.simas@torreon.gob.mx', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL6.1/2Gy', 'Roberto', 'Méndez Lara', '8711000005', '33333333-3333-4333-8333-333333333333', 'aaaa1111-1111-4111-8111-111111111111'),
    ('u0000000-0000-4000-8000-000000000006', 'cuadrilla01.obras@torreon.gob.mx', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL6.1/2Gy', 'Arturo', 'Salazar Ríos', '8711000006', '33333333-3333-4333-8333-333333333333', 'cccc3333-3333-4333-8333-333333333333'),
    -- Ciudadano de Prueba
    ('u0000000-0000-4000-8000-000000000007', 'ciudadano@correo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oL6.1/2Gy', 'Juan Carlos', 'Treviño Garza', '8711000007', '44444444-4444-4444-8444-444444444444', NULL);

-- 6.5 Insertar Cuadrillas Operativas con Polígono de Cobertura en Torreón Centro/Oriente
INSERT INTO field_crews (id, department_id, name, coverage_polygon, is_active, leader_user_id) VALUES
    (
        'fc000000-0000-4000-8000-000000000001',
        'aaaa1111-1111-4111-8111-111111111111',
        'Cuadrilla #04 - Sector Centro (SIMAS)',
        ST_GeomFromText('POLYGON((-103.4650 25.5250, -103.4000 25.5250, -103.4000 25.5650, -103.4650 25.5650, -103.4650 25.5250))', 4326),
        TRUE,
        'u0000000-0000-4000-8000-000000000005'
    ),
    (
        'fc000000-0000-4000-8000-000000000002',
        'cccc3333-3333-4333-8333-333333333333',
        'Cuadrilla #01 - Vialidades Oriente (Obras Públicas)',
        ST_GeomFromText('POLYGON((-103.4000 25.5100, -103.3200 25.5100, -103.3200 25.5800, -103.4000 25.5800, -103.4000 25.5100))', 4326),
        TRUE,
        'u0000000-0000-4000-8000-000000000006'
    );

-- 6.6 Insertar Reportes Ciudadanos de Prueba en Torreón (Plaza Mayor / Blvd. Independencia)
INSERT INTO incident_reports (
    id, folio, citizen_id, department_id, category_id,
    risk_level, current_status, location_geom, address_reference,
    description, upvotes_count
) VALUES
    (
        'f0000000-0000-4000-8000-000000000001',
        'SIM-2026-0842',
        'u0000000-0000-4000-8000-000000000007',
        'aaaa1111-1111-4111-8111-111111111111',
        'c1111111-1111-4111-8111-111111111111',
        'ALTO',
        'ASIGNADO',
        ST_SetSRID(ST_MakePoint(-103.4616, 25.5439), 4326),
        'Av. Morelos y Calle Galeana, Col. Primero de Cobián Centro, Torreón, Coah.',
        'Fuga importante de agua potable frente a la explanada de Plaza Mayor, desperdiciando miles de litros.',
        6
    ),
    (
        'f0000000-0000-4000-8000-000000000002',
        'OBP-2026-0199',
        'u0000000-0000-4000-8000-000000000007',
        'cccc3333-3333-4333-8333-333333333333',
        'c3333333-3333-4333-8333-111111111111',
        'CRITICO',
        'REGISTRADO',
        ST_SetSRID(ST_MakePoint(-103.4321, 25.5592), 4326),
        'Blvd. Independencia #1450 Ote., Col. Navarro, Torreón, Coah.',
        'Bache profundo en carril central que ya dañó neumáticos de varios vehículos.',
        12
    );

-- 6.7 Insertar Historial de Estatus, Orden de Trabajo y Evidencia Inicial
INSERT INTO report_status_history (report_id, previous_status, new_status, changed_by_user_id, notes) VALUES
    ('f0000000-0000-4000-8000-000000000001', 'REGISTRADO', 'ASIGNADO', 'u0000000-0000-4000-8000-000000000002', 'Se canaliza de inmediato a Cuadrilla #04 de SIMAS Sector Centro.');

INSERT INTO work_orders (order_folio, report_id, crew_id, sla_deadline, status, field_notes) VALUES
    ('OT-SIMAS-2026-0144', 'f0000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP + INTERVAL '24 hours', 'ASIGNADA', 'Llevar abrazadera de 4 pulgadas y equipo de corte de pavimento.');

INSERT INTO photographic_evidences (report_id, stage, image_url, capture_coords) VALUES
    ('f0000000-0000-4000-8000-000000000001', 'ANTES', 'https://res.cloudinary.com/demo/image/upload/v1/siu_torreon/sim_2026_0842_antes.webp', ST_SetSRID(ST_MakePoint(-103.46165, 25.54392), 4326));

