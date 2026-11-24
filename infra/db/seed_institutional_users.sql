-- =============================================================================
-- S.I.U. Torreón Alerta — Alta de Usuarios Institucionales Predeterminados
-- Crea los administradores y operadores iniciales por dependencia (SIMAS, La OLA,
-- Obras Públicas) y vincula sus cuadrillas operativas en field_crews.
--
-- CREDENCIALES DE INICIO DE SESIÓN:
--   SIMAS (Admin)          | admin@simas.com.mx                      | SimasAdmin2026!
--   SIMAS (Operador)       | operador@operador.simas.com.mx          | SimasOper2026!
--   La OLA (Admin)         | admin@laola.com.mx                      | LaOlaAdmin2026!
--   La OLA (Operador)      | operador@operador.laola.com.mx          | LaOlaOper2026!
--   Obras Públicas (Admin) | admin@obraspublicas.com.mx              | ObrasAdmin2026!
--   Obras Públicas (Oper.) | operador@operador.obraspublicas.com.mx  | ObrasOper2026!
-- =============================================================================

BEGIN;

INSERT INTO users (
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    role_id,
    department_id,
    is_active
) VALUES
    -- SIMAS
    (
        'admin@simas.com.mx',
        crypt('SimasAdmin2026!', gen_salt('bf', 10)),
        'Administrador',
        'SIMAS',
        '8711001001',
        (SELECT id FROM roles WHERE name = 'ROLE_SUPERVISOR'),
        (SELECT id FROM departments WHERE code = 'SIM'),
        TRUE
    ),
    (
        'operador@operador.simas.com.mx',
        crypt('SimasOper2026!', gen_salt('bf', 10)),
        'Operador',
        'SIMAS',
        '8711001002',
        (SELECT id FROM roles WHERE name = 'ROLE_CREW'),
        (SELECT id FROM departments WHERE code = 'SIM'),
        TRUE
    ),
    -- La OLA
    (
        'admin@laola.com.mx',
        crypt('LaOlaAdmin2026!', gen_salt('bf', 10)),
        'Administrador',
        'La OLA',
        '8711002001',
        (SELECT id FROM roles WHERE name = 'ROLE_SUPERVISOR'),
        (SELECT id FROM departments WHERE code = 'OLA'),
        TRUE
    ),
    (
        'operador@operador.laola.com.mx',
        crypt('LaOlaOper2026!', gen_salt('bf', 10)),
        'Operador',
        'La OLA',
        '8711002002',
        (SELECT id FROM roles WHERE name = 'ROLE_CREW'),
        (SELECT id FROM departments WHERE code = 'OLA'),
        TRUE
    ),
    -- Obras Públicas
    (
        'admin@obraspublicas.com.mx',
        crypt('ObrasAdmin2026!', gen_salt('bf', 10)),
        'Administrador',
        'Obras Públicas',
        '8711003001',
        (SELECT id FROM roles WHERE name = 'ROLE_SUPERVISOR'),
        (SELECT id FROM departments WHERE code = 'OBP'),
        TRUE
    ),
    (
        'operador@operador.obraspublicas.com.mx',
        crypt('ObrasOper2026!', gen_salt('bf', 10)),
        'Operador',
        'Obras Públicas',
        '8711003002',
        (SELECT id FROM roles WHERE name = 'ROLE_CREW'),
        (SELECT id FROM departments WHERE code = 'OBP'),
        TRUE
    )
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name    = EXCLUDED.first_name,
    last_name     = EXCLUDED.last_name,
    role_id       = EXCLUDED.role_id,
    department_id = EXCLUDED.department_id,
    is_active     = TRUE;

-- Cuadrillas operativas vinculadas a cada operador (necesario para asignar/ver tickets)
INSERT INTO field_crews (department_id, name, coverage_polygon, is_active, leader_user_id)
SELECT
    (SELECT id FROM departments WHERE code = 'SIM'),
    'Cuadrilla Principal - Operador SIMAS',
    ST_GeomFromText('POLYGON((-103.4650 25.5250, -103.4000 25.5250, -103.4000 25.5650, -103.4650 25.5650, -103.4650 25.5250))', 4326),
    TRUE,
    (SELECT id FROM users WHERE email = 'operador@operador.simas.com.mx')
WHERE NOT EXISTS (
    SELECT 1 FROM field_crews
    WHERE leader_user_id = (SELECT id FROM users WHERE email = 'operador@operador.simas.com.mx')
);

INSERT INTO field_crews (department_id, name, coverage_polygon, is_active, leader_user_id)
SELECT
    (SELECT id FROM departments WHERE code = 'OLA'),
    'Cuadrilla Principal - Operador La OLA',
    ST_GeomFromText('POLYGON((-103.4700 25.5300, -103.4100 25.5300, -103.4100 25.5700, -103.4700 25.5700, -103.4700 25.5300))', 4326),
    TRUE,
    (SELECT id FROM users WHERE email = 'operador@operador.laola.com.mx')
WHERE NOT EXISTS (
    SELECT 1 FROM field_crews
    WHERE leader_user_id = (SELECT id FROM users WHERE email = 'operador@operador.laola.com.mx')
);

INSERT INTO field_crews (department_id, name, coverage_polygon, is_active, leader_user_id)
SELECT
    (SELECT id FROM departments WHERE code = 'OBP'),
    'Cuadrilla Principal - Operador Obras Públicas',
    ST_GeomFromText('POLYGON((-103.4000 25.5100, -103.3200 25.5100, -103.3200 25.5800, -103.4000 25.5800, -103.4000 25.5100))', 4326),
    TRUE,
    (SELECT id FROM users WHERE email = 'operador@operador.obraspublicas.com.mx')
WHERE NOT EXISTS (
    SELECT 1 FROM field_crews
    WHERE leader_user_id = (SELECT id FROM users WHERE email = 'operador@operador.obraspublicas.com.mx')
);

COMMIT;
