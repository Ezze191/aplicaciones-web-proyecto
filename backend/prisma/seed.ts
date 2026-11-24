import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Roles Oficiales
  const roles = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'ROLE_ADMIN',
      description: 'Administrador General del Sistema Municipal',
      permissions: ['*'],
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'ROLE_SUPERVISOR',
      description: 'Funcionario / Supervisor de Dependencia (Backoffice)',
      permissions: [
        'reports:read',
        'reports:assign',
        'reports:reject',
        'crews:manage',
        'kanban:write',
      ],
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'ROLE_CREW',
      description: 'Jefe de Cuadrilla Operativa de Campo',
      permissions: [
        'work_orders:read',
        'work_orders:resolve',
        'evidences:upload',
      ],
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'ROLE_CITIZEN',
      description: 'Ciudadano Registrado en la PWA',
      permissions: ['reports:create', 'reports:read', 'reports:upvote'],
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      },
      create: role,
    });
  }

  // 2. Dependencias Municipales
  const departments = [
    {
      id: 'aaaa1111-1111-4111-8111-111111111111',
      code: 'SIM',
      name: 'Sistema Municipal de Aguas y Saneamiento (SIMAS)',
      iconName: 'Droplets',
      colorHex: '#0284C7',
      defaultSlaHours: 24,
    },
    {
      id: 'bbbb2222-2222-4222-8222-222222222222',
      code: 'OLA',
      name: 'Dirección de Limpieza Urbana y Espacios Públicos (La OLA)',
      iconName: 'Sparkles',
      colorHex: '#10B981',
      defaultSlaHours: 36,
    },
    {
      id: 'cccc3333-3333-4333-8333-333333333333',
      code: 'OBP',
      name: 'Dirección General de Obras Públicas y Bacheo',
      iconName: 'Construction',
      colorHex: '#EA580C',
      defaultSlaHours: 48,
    },
  ];

  for (const department of departments) {
    await prisma.department.upsert({
      where: { id: department.id },
      update: {
        code: department.code,
        name: department.name,
        iconName: department.iconName,
        colorHex: department.colorHex,
        defaultSlaHours: department.defaultSlaHours,
      },
      create: department,
    });
  }

  // 3. Categorías de Fallas por Dependencia
  const categories = [
    {
      id: 'c1111111-1111-4111-8111-111111111111',
      departmentId: 'aaaa1111-1111-4111-8111-111111111111',
      name: 'Fuga de Agua Potable',
      description:
        'Ruptura o filtración visible de agua limpia en banqueta o pavimento.',
      priorityWeight: 4,
    },
    {
      id: 'c1111111-1111-4111-8111-222222222222',
      departmentId: 'aaaa1111-1111-4111-8111-111111111111',
      name: 'Brote de Aguas Negras / Drenaje Colapsado',
      description: 'Desbordamiento de alcantarillado sanitario con riesgo sanitario.',
      priorityWeight: 5,
    },
    {
      id: 'c1111111-1111-4111-8111-333333333333',
      departmentId: 'aaaa1111-1111-4111-8111-111111111111',
      name: 'Alcantarilla sin Tapa',
      description:
        'Registro o boca de tormenta abierta con peligro para peatones y vehículos.',
      priorityWeight: 5,
    },
    {
      id: 'c1111111-1111-4111-8111-444444444444',
      departmentId: 'aaaa1111-1111-4111-8111-111111111111',
      name: 'Falta de Agua o Baja Presión',
      description:
        'Interrupción del suministro de agua potable o presión insuficiente en la red hidráulica.',
      priorityWeight: 4,
    },
    {
      id: 'c1111111-1111-4111-8111-555555555555',
      departmentId: 'aaaa1111-1111-4111-8111-111111111111',
      name: 'Azolve o Encharcamiento en Colector / Cárcamo',
      description:
        'Línea de drenaje azolvada o encharcamiento persistente que requiere desazolve con Vactor.',
      priorityWeight: 4,
    },
    {
      id: 'c2222222-2222-4222-8222-111111111111',
      departmentId: 'bbbb2222-2222-4222-8222-222222222222',
      name: 'Acumulación de Basura / Tiradero Clandestino',
      description:
        'Desechos sólidos acumulados en vía pública, terrenos baldíos o camellones.',
      priorityWeight: 3,
    },
    {
      id: 'c2222222-2222-4222-8222-222222222222',
      departmentId: 'bbbb2222-2222-4222-8222-222222222222',
      name: 'Escombro o Maleza Invadiendo Vialidad',
      description:
        'Restos de construcción o maleza crecida bloqueando paso peatonal o vehicular.',
      priorityWeight: 4,
    },
    {
      id: 'c2222222-2222-4222-8222-333333333333',
      departmentId: 'bbbb2222-2222-4222-8222-222222222222',
      name: 'Falta de Barrido en Vialidad o Camellón',
      description:
        'Calle, avenida, bulevar o camellón central con residuos que requiere barrido manual.',
      priorityWeight: 2,
    },
    {
      id: 'c2222222-2222-4222-8222-444444444444',
      departmentId: 'bbbb2222-2222-4222-8222-222222222222',
      name: 'Limpieza de Plaza, Parque o Contenedor',
      description:
        'Plaza, parque, paseo público, monumento o contenedor de basura desbordado.',
      priorityWeight: 3,
    },
    {
      id: 'c3333333-3333-4333-8333-111111111111',
      departmentId: 'cccc3333-3333-4333-8333-333333333333',
      name: 'Bache Profundo en Vialidad',
      description:
        'Hundimiento o desprendimiento de carpeta asfáltica en calle o avenida.',
      priorityWeight: 3,
    },
    {
      id: 'c3333333-3333-4333-8333-222222222222',
      departmentId: 'cccc3333-3333-4333-8333-333333333333',
      name: 'Hundimiento / Socavón en Pavimento',
      description: 'Fractura grave del subsuelo con riesgo de colapso vehicular.',
      priorityWeight: 5,
    },
    {
      id: 'c3333333-3333-4333-8333-333333333333',
      departmentId: 'cccc3333-3333-4333-8333-333333333333',
      name: 'Daño en Banqueta, Guarnición o Paso Vial',
      description:
        'Banqueta fracturada, guarnición destruida o daño en paso a desnivel o puente vehicular.',
      priorityWeight: 3,
    },
    {
      id: 'c3333333-3333-4333-8333-444444444444',
      departmentId: 'cccc3333-3333-4333-8333-333333333333',
      name: 'Deterioro en Parque, Techumbre o Espacio Comunitario',
      description:
        'Daño estructural en infraestructura de plaza, parque, techumbre escolar o centro comunitario.',
      priorityWeight: 3,
    },
  ];

  for (const category of categories) {
    await prisma.reportCategory.upsert({
      where: { id: category.id },
      update: {
        departmentId: category.departmentId,
        name: category.name,
        description: category.description,
        priorityWeight: category.priorityWeight,
      },
      create: category,
    });
  }

  // 4. Usuarios de Prueba (Password local: 'Torreon2026!')
  const defaultPasswordHash =
    '$2b$10$hctKvcsELqi0k6LbrSjurO6AwV/kZjtS7MiBSlb/fc8XejZ6iv3XW';

  const users = [
    {
      id: 'd0000000-0000-4000-8000-000000000001',
      email: 'admin@torreon.gob.mx',
      passwordHash: defaultPasswordHash,
      firstName: 'Sergio',
      lastName: 'González Acosta',
      phone: '8711000001',
      roleId: '11111111-1111-4111-8111-111111111111',
      departmentId: null,
    },
    {
      id: 'd0000000-0000-4000-8000-000000000002',
      email: 'supervisor.simas@torreon.gob.mx',
      passwordHash: defaultPasswordHash,
      firstName: 'Erik Fernando',
      lastName: 'Hernández Ayala',
      phone: '8711000002',
      roleId: '22222222-2222-4222-8222-222222222222',
      departmentId: 'aaaa1111-1111-4111-8111-111111111111',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000003',
      email: 'supervisor.ola@torreon.gob.mx',
      passwordHash: defaultPasswordHash,
      firstName: 'Gema Daniela',
      lastName: 'Castañeda Barraza',
      phone: '8711000003',
      roleId: '22222222-2222-4222-8222-222222222222',
      departmentId: 'bbbb2222-2222-4222-8222-222222222222',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000004',
      email: 'supervisor.obras@torreon.gob.mx',
      passwordHash: defaultPasswordHash,
      firstName: 'César Fabián',
      lastName: 'Reyes Cortinas',
      phone: '8711000004',
      roleId: '22222222-2222-4222-8222-222222222222',
      departmentId: 'cccc3333-3333-4333-8333-333333333333',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000005',
      email: 'cuadrilla04.simas@torreon.gob.mx',
      passwordHash: defaultPasswordHash,
      firstName: 'Roberto',
      lastName: 'Méndez Lara',
      phone: '8711000005',
      roleId: '33333333-3333-4333-8333-333333333333',
      departmentId: 'aaaa1111-1111-4111-8111-111111111111',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000006',
      email: 'cuadrilla01.obras@torreon.gob.mx',
      passwordHash: defaultPasswordHash,
      firstName: 'Arturo',
      lastName: 'Salazar Ríos',
      phone: '8711000006',
      roleId: '33333333-3333-4333-8333-333333333333',
      departmentId: 'cccc3333-3333-4333-8333-333333333333',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000008',
      email: 'cuadrilla01.ola@torreon.gob.mx',
      passwordHash: defaultPasswordHash,
      firstName: 'Carlos',
      lastName: 'Mendoza Vega',
      phone: '8711000008',
      roleId: '33333333-3333-4333-8333-333333333333',
      departmentId: 'bbbb2222-2222-4222-8222-222222222222',
    },
    {
      id: 'd0000000-0000-4000-8000-000000000007',
      email: 'ciudadano@correo.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Juan Carlos',
      lastName: 'Treviño Garza',
      phone: '8711000007',
      roleId: '44444444-4444-4444-8444-444444444444',
      departmentId: null,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        roleId: user.roleId,
        departmentId: user.departmentId,
      },
      create: user,
    });
  }

  // 5. Cuadrillas Operativas con Polígono de Cobertura PostGIS
  await prisma.$executeRaw`
    INSERT INTO field_crews (id, department_id, name, coverage_polygon, is_active, leader_user_id) VALUES
      (
        'fc000000-0000-4000-8000-000000000001'::uuid,
        'aaaa1111-1111-4111-8111-111111111111'::uuid,
        'Cuadrilla #04 - Sector Centro (SIMAS)',
        ST_GeomFromText('POLYGON((-103.4650 25.5250, -103.4000 25.5250, -103.4000 25.5650, -103.4650 25.5650, -103.4650 25.5250))', 4326),
        TRUE,
        'd0000000-0000-4000-8000-000000000005'::uuid
      ),
      (
        'fc000000-0000-4000-8000-000000000002'::uuid,
        'cccc3333-3333-4333-8333-333333333333'::uuid,
        'Cuadrilla #01 - Vialidades Oriente (Obras Públicas)',
        ST_GeomFromText('POLYGON((-103.4000 25.5100, -103.3200 25.5100, -103.3200 25.5800, -103.4000 25.5800, -103.4000 25.5100))', 4326),
        TRUE,
        'd0000000-0000-4000-8000-000000000006'::uuid
      ),
      (
        'fc000000-0000-4000-8000-000000000003'::uuid,
        'bbbb2222-2222-4222-8222-222222222222'::uuid,
        'Cuadrilla #01 - Limpieza Centro (La OLA)',
        ST_GeomFromText('POLYGON((-103.4700 25.5300, -103.4100 25.5300, -103.4100 25.5700, -103.4700 25.5700, -103.4700 25.5300))', 4326),
        TRUE,
        'd0000000-0000-4000-8000-000000000008'::uuid
      )
    ON CONFLICT (id) DO NOTHING;
  `;

  // 6. Reportes Ciudadanos de Prueba en Torreón
  await prisma.$executeRaw`
    INSERT INTO incident_reports (
      id, folio, citizen_id, department_id, category_id,
      risk_level, current_status, location_geom, address_reference,
      description, upvotes_count
    ) VALUES
      (
        'f0000000-0000-4000-8000-000000000001'::uuid,
        'SIM-2026-0842',
        'd0000000-0000-4000-8000-000000000007'::uuid,
        'aaaa1111-1111-4111-8111-111111111111'::uuid,
        'c1111111-1111-4111-8111-111111111111'::uuid,
        'ALTO',
        'ASIGNADO',
        ST_SetSRID(ST_MakePoint(-103.4616, 25.5439), 4326),
        'Av. Morelos y Calle Galeana, Col. Primero de Cobián Centro, Torreón, Coah.',
        'Fuga importante de agua potable frente a la explanada de Plaza Mayor, desperdiciando miles de litros.',
        6
      ),
      (
        'f0000000-0000-4000-8000-000000000002'::uuid,
        'OBP-2026-0199',
        'd0000000-0000-4000-8000-000000000007'::uuid,
        'cccc3333-3333-4333-8333-333333333333'::uuid,
        'c3333333-3333-4333-8333-111111111111'::uuid,
        'CRITICO',
        'REGISTRADO',
        ST_SetSRID(ST_MakePoint(-103.4321, 25.5592), 4326),
        'Blvd. Independencia #1450 Ote., Col. Navarro, Torreón, Coah.',
        'Bache profundo en carril central que ya dañó neumáticos de varios vehículos.',
        12
      )
    ON CONFLICT (id) DO NOTHING;
  `;

  // 7. Historial, Orden de Trabajo y Evidencia Inicial (idempotente)
  const existingHistory = await prisma.reportStatusHistory.findFirst({
    where: { reportId: 'f0000000-0000-4000-8000-000000000001' },
  });
  if (!existingHistory) {
    await prisma.reportStatusHistory.create({
      data: {
        reportId: 'f0000000-0000-4000-8000-000000000001',
        previousStatus: 'REGISTRADO',
        newStatus: 'ASIGNADO',
        changedByUserId: 'd0000000-0000-4000-8000-000000000002',
        notes:
          'Se canaliza de inmediato a Cuadrilla #04 de SIMAS Sector Centro.',
      },
    });
  }

  await prisma.workOrder.upsert({
    where: { orderFolio: 'OT-SIMAS-2026-0144' },
    update: {},
    create: {
      orderFolio: 'OT-SIMAS-2026-0144',
      reportId: 'f0000000-0000-4000-8000-000000000001',
      crewId: 'fc000000-0000-4000-8000-000000000001',
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'ASIGNADA',
      fieldNotes:
        'Llevar abrazadera de 4 pulgadas y equipo de corte de pavimento.',
    },
  });

  await prisma.$executeRaw`
    INSERT INTO photographic_evidences (report_id, stage, image_url, capture_coords)
    SELECT
      'f0000000-0000-4000-8000-000000000001'::uuid,
      'ANTES',
      'https://res.cloudinary.com/demo/image/upload/v1/siu_torreon/sim_2026_0842_antes.webp',
      ST_SetSRID(ST_MakePoint(-103.46165, 25.54392), 4326)
    WHERE NOT EXISTS (
      SELECT 1 FROM photographic_evidences
      WHERE report_id = 'f0000000-0000-4000-8000-000000000001'::uuid
        AND stage = 'ANTES'
    );
  `;

  console.log('✅ Seed de Prisma completado correctamente.');
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando el seed de Prisma:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
