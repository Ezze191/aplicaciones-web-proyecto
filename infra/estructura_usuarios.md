# ESTRUCTURA DE USUARIOS Y CREDENCIALES — S.I.U. TORREÓN ALERTA

Guía rápida diseñada para leerse directamente desde el editor/IDE.
Todas las cuentas institucionales de abajo se crean manualmente en PostgreSQL
(NO se pueden registrar desde la página web `/registro`).


================================================================================
1. CREDENCIALES DE INICIO DE SESIÓN (COPIAR Y PEGAR)
================================================================================

--- SIMAS (Código: SIM) --------------------------------------------------------

[Administrador SIMAS]
  Correo:     admin@simas.com.mx
  Contraseña: SimasAdmin2026!
  Rol:        ROLE_SUPERVISOR
  Panel:      /dashboard-admins (filtrado solo a SIMAS)

[Operador SIMAS]
  Correo:     operador@operador.simas.com.mx
  Contraseña: SimasOper2026!
  Rol:        ROLE_CREW
  Panel:      /dashboard-tecnicos (tickets asignados por SIMAS)


--- LA OLA (Código: OLA) -------------------------------------------------------

[Administrador La OLA]
  Correo:     admin@laola.com.mx
  Contraseña: LaOlaAdmin2026!
  Rol:        ROLE_SUPERVISOR
  Panel:      /dashboard-admins (filtrado solo a La OLA)

[Operador La OLA]
  Correo:     operador@operador.laola.com.mx
  Contraseña: LaOlaOper2026!
  Rol:        ROLE_CREW
  Panel:      /dashboard-tecnicos (tickets asignados por La OLA)


--- OBRAS PÚBLICAS (Código: OBP) -----------------------------------------------

[Administrador Obras Públicas]
  Correo:     admin@obraspublicas.com.mx
  Contraseña: ObrasAdmin2026!
  Rol:        ROLE_SUPERVISOR
  Panel:      /dashboard-admins (filtrado solo a Obras Públicas)

[Operador Obras Públicas]
  Correo:     operador@operador.obraspublicas.com.mx
  Contraseña: ObrasOper2026!
  Rol:        ROLE_CREW
  Panel:      /dashboard-tecnicos (tickets asignados por Obras Públicas)


--- OTRAS CUENTAS DE PRUEBA (SEED INICIAL) -------------------------------------

[Administrador General — ve todas las dependencias]
  Correo:     admin@torreon.gob.mx
  Contraseña: Torreon2026!
  Rol:        ROLE_ADMIN
  Panel:      /dashboard-admins (todas las dependencias)

[Ciudadano de prueba]
  Correo:     ciudadano@correo.com
  Contraseña: Torreon2026!
  Rol:        ROLE_CITIZEN
  Panel:      /dashboard-ciudadano


================================================================================
2. CÓMO FUNCIONA EL ACCESO POR DOMINIO Y LAS SESIONES JWT
================================================================================

A) Validación de usuario y contraseña
   - Al iniciar sesión (`POST /auth/login`), el usuario DEBE existir en la tabla
     `users`, tener `is_active = true` y su contraseña debe coincidir con el
     hash bcrypt (`password_hash`).

B) Enrutamiento automático por dominio (sin importar el nombre antes del @)
   - Ejemplos válidos: `jesus@simas.com.mx` o `roberto@operador.simas.com.mx`.
   - El backend detecta automáticamente el rol, la dependencia y el panel según
     el dominio del correo:

     * @simas.com.mx                  -> Admin SIMAS            (/dashboard-admins)
     * @operador.simas.com.mx         -> Operador SIMAS         (/dashboard-tecnicos)
     * @laola.com.mx                  -> Admin La OLA           (/dashboard-admins)
     * @operador.laola.com.mx         -> Operador La OLA        (/dashboard-tecnicos)
     * @obraspublicas.com.mx          -> Admin Obras Públicas   (/dashboard-admins)
     * @operador.obraspublicas.com.mx -> Operador Obras Púb.    (/dashboard-tecnicos)
     * Cualquier otro dominio         -> Ciudadano              (/dashboard-ciudadano)

C) Registro público desde la web (`/registro`)
   - Cualquier persona que se registre en la web recibe rol `ROLE_CITIZEN`
     para levantar y dar seguimiento a reportes ciudadanos.
   - Si alguien intenta registrarse desde la web usando cualquiera de los 6
     dominios institucionales, el backend bloquea el registro (`403 Forbidden`).

D) Sesiones JWT (30 minutos + persistencia entre pestañas)
   - Todos los tokens JWT expiran automáticamente a los 30 minutos (`JWT_EXPIRES_IN=30m`).
   - Si ya iniciaste sesión y abres la app en otra pestaña del mismo navegador,
     te redirige automáticamente a tu panel activo en lugar de pedir login.
   - Al cumplirse los 30 minutos o al cerrar sesión en una pestaña, se cierra
     automáticamente en todas las pestañas abiertas.
   - Las cuentas institucionales aplican sesión única (`active_session_id`):
     si alguien inicia sesión con la misma cuenta en otro dispositivo, la
     sesión anterior se invalida.

E) Requisito importante para Operadores (`ROLE_CREW`)
   - Cada operador necesita un registro vinculado en `field_crews`
     (`leader_user_id = id_del_operador`) para que su administrador pueda
     asignarle tickets y el operador los vea en `/dashboard-tecnicos`.


================================================================================
3. SCRIPTS SQL PARA CREAR USUARIOS EN POSTGRESQL (`siu_db`)
================================================================================

El script completo con los 6 usuarios iniciales + sus 3 cuadrillas está en:
  infra/db/seed_institutional_users.sql

--- Plantilla: Agregar un nuevo Administrador (ej. jesus@simas.com.mx) ---------
Cambia el correo, contraseña, nombre y código de dependencia ('SIM', 'OLA', 'OBP'):

```sql
INSERT INTO users (
    email, password_hash, first_name, last_name, phone, role_id, department_id, is_active
) VALUES (
    'jesus@simas.com.mx',
    crypt('TuPasswordSeguro2026!', gen_salt('bf', 10)),
    'Jesús',
    'Apellido',
    '8710000000',
    (SELECT id FROM roles WHERE name = 'ROLE_SUPERVISOR'),
    (SELECT id FROM departments WHERE code = 'SIM'),
    TRUE
);
```

--- Plantilla: Agregar un nuevo Operador (ej. roberto@operador.simas.com.mx) ---
Crea el usuario y su cuadrilla en `field_crews` en una sola consulta:

```sql
WITH nuevo_operador AS (
    INSERT INTO users (
        email, password_hash, first_name, last_name, phone, role_id, department_id, is_active
    ) VALUES (
        'roberto@operador.simas.com.mx',
        crypt('TuPasswordSeguro2026!', gen_salt('bf', 10)),
        'Roberto',
        'Apellido',
        '8710000000',
        (SELECT id FROM roles WHERE name = 'ROLE_CREW'),
        (SELECT id FROM departments WHERE code = 'SIM'),
        TRUE
    )
    RETURNING id, department_id
)
INSERT INTO field_crews (department_id, name, coverage_polygon, is_active, leader_user_id)
SELECT
    department_id,
    'Cuadrilla Roberto - SIMAS',
    ST_GeomFromText('POLYGON((-103.4650 25.5250, -103.4000 25.5250, -103.4000 25.5650, -103.4650 25.5650, -103.4650 25.5250))', 4326),
    TRUE,
    id
FROM nuevo_operador;
```
