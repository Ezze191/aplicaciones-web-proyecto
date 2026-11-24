-- =============================================================================
-- S.I.U. Torreón Alerta — Padrón Simulado de Trabajadores por Dependencia
-- Inserta 20 empleados por cada dependencia (SIMAS, La OLA, Obras Públicas = 60)
-- para asignarlos a flotillas desde el panel de Administración -> Flotillas.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SIMAS (20 trabajadores)
-- -----------------------------------------------------------------------------
INSERT INTO department_workers (department_id, employee_code, first_name, last_name, phone, position)
SELECT d.id, v.employee_code, v.first_name, v.last_name, v.phone, v.position
FROM departments d
CROSS JOIN (VALUES
    ('SIM-EMP-001', 'Jorge Luis', 'Mendoza Ríos', '8712100101', 'Operador de Camión Vactor'),
    ('SIM-EMP-002', 'Héctor Manuel', 'Salazar Luna', '8712100102', 'Técnico Hidráulico Senior'),
    ('SIM-EMP-003', 'Ricardo', 'Trevino Morales', '8712100103', 'Plomero de Red de Agua Potable'),
    ('SIM-EMP-004', 'Miguel Ángel', 'Castillo Vega', '8712100104', 'Auxiliar de Desazolve y Alcantarillado'),
    ('SIM-EMP-005', 'Fernando', 'Gutiérrez Ortiz', '8712100105', 'Operador de Retroexcavadora'),
    ('SIM-EMP-006', 'Óscar Eduardo', 'Ramos Silva', '8712100106', 'Especialista en Detección de Fugas'),
    ('SIM-EMP-007', 'Alejandro', 'Chávez Delgado', '8712100107', 'Técnico de Válvulas y Presión'),
    ('SIM-EMP-008', 'Raúl', 'Paredes Soto', '8712100108', 'Soldador de Tubería Hidráulica'),
    ('SIM-EMP-009', 'David', 'Ibarra Contreras', '8712100109', 'Auxiliar de Cuadrilla Hidráulica'),
    ('SIM-EMP-010', 'Jesús Adrián', 'Núñez Vargas', '8712100110', 'Operador de Máquina de Desazolve'),
    ('SIM-EMP-011', 'Edgar Iván', 'Flores Carrillo', '8712100111', 'Técnico de Cárcamos y Bombeo'),
    ('SIM-EMP-012', 'Rubén', 'Guerrero Tapia', '8712100112', 'Instalador de Tomas Domiciliarias'),
    ('SIM-EMP-013', 'Arturo', 'Aguilar Espinoza', '8712100113', 'Ayudante General de Saneamiento'),
    ('SIM-EMP-014', 'Luis Alberto', 'Vázquez Rocha', '8712100114', 'Chofer de Unidad de Servicio'),
    ('SIM-EMP-015', 'Marco Antonio', 'Ríos Herrera', '8712100115', 'Técnico de Medidores y Red'),
    ('SIM-EMP-016', 'Daniel', 'Cárdenas Mejía', '8712100116', 'Operador de Cortadora de Pavimento'),
    ('SIM-EMP-017', 'Javier', 'Estrada Ponce', '8712100117', 'Auxiliar de Alcantarillado'),
    ('SIM-EMP-018', 'Gerardo', 'Lozano Campos', '8712100118', 'Técnico de Colectores Sanitarios'),
    ('SIM-EMP-019', 'Samuel', 'Peña Domínguez', '8712100119', 'Ayudante de Reparación de Fugas'),
    ('SIM-EMP-020', 'Iván Mauricio', 'Santana Cruz', '8712100120', 'Operador de Pipa de Apoyo')
) AS v(employee_code, first_name, last_name, phone, position)
WHERE d.code = 'SIM'
ON CONFLICT (employee_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. LA OLA (20 trabajadores)
-- -----------------------------------------------------------------------------
INSERT INTO department_workers (department_id, employee_code, first_name, last_name, phone, position)
SELECT d.id, v.employee_code, v.first_name, v.last_name, v.phone, v.position
FROM departments d
CROSS JOIN (VALUES
    ('OLA-EMP-001', 'María Guadalupe', 'Reyes Moreno', '8712200201', 'Brigadista de Barrido Manual'),
    ('OLA-EMP-002', 'José Refugio', 'Hernández Díaz', '8712200202', 'Operador de Camión de Retiro'),
    ('OLA-EMP-003', 'Patricia', 'Sánchez Juárez', '8712200203', 'Brigadista de Limpieza de Plazas'),
    ('OLA-EMP-004', 'Juan Manuel', 'Martínez López', '8712200204', 'Auxiliar de Deshierbe y Maleza'),
    ('OLA-EMP-005', 'Rosa Elena', 'Torres Aguilar', '8712200205', 'Brigadista de Camellones y Bulevares'),
    ('OLA-EMP-006', 'Francisco Javier', 'Gómez Navarro', '8712200206', 'Operador de Desbrozadora'),
    ('OLA-EMP-007', 'Leticia', 'Ramírez Castro', '8712200207', 'Brigadista de Espacios Públicos'),
    ('OLA-EMP-008', 'Armando', 'Vargas Medina', '8712200208', 'Auxiliar de Retiro de Escombro'),
    ('OLA-EMP-009', 'Verónica', 'Cruz Jiménez', '8712200209', 'Brigadista de Turno Matutino'),
    ('OLA-EMP-010', 'Salvador', 'Morales Ortega', '8712200210', 'Chofer de Unidad de Limpieza'),
    ('OLA-EMP-011', 'Norma Angélica', 'Ortiz Delgado', '8712200211', 'Brigadista de Centro Histórico'),
    ('OLA-EMP-012', 'Enrique', 'Ruiz Salazar', '8712200212', 'Auxiliar de Poda y Desecho Vegetal'),
    ('OLA-EMP-013', 'Claudia', 'Mendoza Flores', '8712200213', 'Brigadista de Parques y Monumentos'),
    ('OLA-EMP-014', 'Alfredo', 'Silva Guzmán', '8712200214', 'Operador de Contenedores y Acopio'),
    ('OLA-EMP-015', 'Beatriz', 'Domínguez Pérez', '8712200215', 'Brigadista de Turno Vespertino'),
    ('OLA-EMP-016', 'Gustavo', 'Carrillo Luna', '8712200216', 'Auxiliar de Atención a Tiraderos'),
    ('OLA-EMP-017', 'Mónica', 'Herrera Campos', '8712200217', 'Brigadista de Limpieza Urbana'),
    ('OLA-EMP-018', 'Víctor Hugo', 'Ponce Romero', '8712200218', 'Operador de Cargador Frontal Ligero'),
    ('OLA-EMP-019', 'Silvia', 'Cárdenas Soto', '8712200219', 'Brigadista de Operativos Especiales'),
    ('OLA-EMP-020', 'Pedro Antonio', 'Lara Fuentes', '8712200220', 'Auxiliar General de La OLA')
) AS v(employee_code, first_name, last_name, phone, position)
WHERE d.code = 'OLA'
ON CONFLICT (employee_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. OBRAS PÚBLICAS (20 trabajadores)
-- -----------------------------------------------------------------------------
INSERT INTO department_workers (department_id, employee_code, first_name, last_name, phone, position)
SELECT d.id, v.employee_code, v.first_name, v.last_name, v.phone, v.position
FROM departments d
CROSS JOIN (VALUES
    ('OBP-EMP-001', 'Rogelio', 'Castañeda Vela', '8712300301', 'Operador de Bacheo Asfáltico'),
    ('OBP-EMP-002', 'Ernesto', 'Villalobos Cruz', '8712300302', 'Maestro Albañil de Guarniciones'),
    ('OBP-EMP-003', 'Sergio Omar', 'Escobar Nava', '8712300303', 'Operador de Rodillo Compactador'),
    ('OBP-EMP-004', 'Mauricio', 'Gallegos Ríos', '8712300304', 'Técnico de Pavimentación'),
    ('OBP-EMP-005', 'Gabriel', 'Montoya Pérez', '8712300305', 'Operador de Cortadora de Concreto'),
    ('OBP-EMP-006', 'César Augusto', 'Valdez Molina', '8712300306', 'Auxiliar de Cuadrilla de Bacheo'),
    ('OBP-EMP-007', 'Ismael', 'Quiroz Herrera', '8712300307', 'Chofer de Camión de Volteo'),
    ('OBP-EMP-008', 'Fabián', 'Serrano Delgado', '8712300308', 'Técnico de Señalización Vial'),
    ('OBP-EMP-009', 'Alfonso', 'Rangel Castro', '8712300309', 'Oficial de Banquetas y Rampas'),
    ('OBP-EMP-010', 'Esteban', 'Bautista Gómez', '8712300310', 'Operador de Retroexcavadora'),
    ('OBP-EMP-011', 'Julio César', 'Alvarado Torres', '8712300311', 'Técnico en Atención a Socavones'),
    ('OBP-EMP-012', 'Noé', 'Pacheco Morales', '8712300312', 'Soldador de Estructuras y Techumbres'),
    ('OBP-EMP-013', 'Saúl', 'Zúñiga Ortiz', '8712300313', 'Ayudante de Obra Civil'),
    ('OBP-EMP-014', 'Benjamín', 'Acosta Mendoza', '8712300314', 'Operador de Mezcla Asfáltica'),
    ('OBP-EMP-015', 'Tomás', 'Gamboa Silva', '8712300315', 'Técnico de Mantenimiento de Puentes'),
    ('OBP-EMP-016', 'Leonel', 'Bravo Sánchez', '8712300316', 'Auxiliar de Infraestructura Urbana'),
    ('OBP-EMP-017', 'Hugo Alberto', 'Salgado Romero', '8712300317', 'Operador de Mini Cargador Bobcat'),
    ('OBP-EMP-018', 'Ignacio', 'Cuevas Reyes', '8712300318', 'Albañil de Espacios Comunitarios'),
    ('OBP-EMP-019', 'Rodrigo', 'Zamora Flores', '8712300319', 'Ayudante de Bacheo Nocturno'),
    ('OBP-EMP-020', 'Cristian', 'Meza Carrillo', '8712300320', 'Supervisor Técnico de Campo')
) AS v(employee_code, first_name, last_name, phone, position)
WHERE d.code = 'OBP'
ON CONFLICT (employee_code) DO NOTHING;

COMMIT;
