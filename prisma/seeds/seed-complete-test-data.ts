// ============================================
// seed-complete-test-data.ts
// Script para crear datos de prueba completos
// ============================================

import 'dotenv/config';
import { PrismaClient as PrismaUsers } from '@prisma/client-users';
import { PrismaClient as PrismaProfiles } from '@prisma/client-profiles';
import { PrismaClient as PrismaAcademic } from '@prisma/client-academic';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

// Configurar clientes Prisma
const poolUsers = new Pool({ connectionString: process.env.DATABASE_URL_USERS });
const poolProfiles = new Pool({ connectionString: process.env.DATABASE_URL_PROFILES });
const poolAcademic = new Pool({ connectionString: process.env.DATABASE_URL_ACADEMIC });

const prismaUsers = new PrismaUsers({ adapter: new PrismaPg(poolUsers) });
const prismaProfiles = new PrismaProfiles({ adapter: new PrismaPg(poolProfiles) });
const prismaAcademic = new PrismaAcademic({ adapter: new PrismaPg(poolAcademic) });

async function main() {
  console.log('🌱 Iniciando seed de datos de prueba...\n');

  // ============================================
  // 1. CREAR ROLES EN BD USERS
  // ============================================
  console.log('📋 Creando roles...');
  const roles = [
    { id: 1, name: 'ADMIN' },
    { id: 2, name: 'TEACHER' },
    { id: 3, name: 'STUDENT' },
  ];

  for (const role of roles) {
    await prismaUsers.role.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }
  console.log('✅ Roles creados\n');

  // ============================================
  // 2. CREAR ESPECIALIDADES, CARRERAS, CICLOS
  // ============================================
  console.log('🎓 Creando datos académicos...');

  // Especialidades
  const specialities = [
    { id: 1, name: 'Tecnología', description: 'Especialidad en tecnología' },
    { id: 2, name: 'Salud', description: 'Especialidad en salud' },
    { id: 3, name: 'Ciencias Sociales', description: 'Especialidad en ciencias sociales' },
  ];

  for (const speciality of specialities) {
    await prismaAcademic.speciality.upsert({
      where: { id: speciality.id },
      update: {},
      create: speciality,
    });
  }

  // Carreras
  const careers = [
    { id: 1, name: 'Ingeniería en Software', totalCicles: 10, durationYears: 5 },
    { id: 2, name: 'Medicina', totalCicles: 12, durationYears: 6 },
  ];

  for (const career of careers) {
    await prismaAcademic.career.upsert({
      where: { id: career.id },
      update: {},
      create: career,
    });
  }

  // Ciclo Activo
  await prismaAcademic.cycle.upsert({
    where: { year_period: { year: 2025, period: 1 } },
    update: {},
    create: {
      id: 1,
      name: '2025-1',
      year: 2025,
      period: 1,
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-06-30'),
      isActive: true,
    },
  });

  // Materias de Ingeniería en Software
  const subjects = [
    { id: 1, name: 'Programación I', careerId: 1, cicleNumber: 1, cycleId: 1 },
    { id: 2, name: 'Matemáticas I', careerId: 1, cicleNumber: 1, cycleId: 1 },
    { id: 3, name: 'Introducción a la Ingeniería', careerId: 1, cicleNumber: 1, cycleId: 1 },
    { id: 4, name: 'Programación II', careerId: 1, cicleNumber: 2, cycleId: 1 },
    { id: 5, name: 'Estructuras de Datos', careerId: 1, cicleNumber: 2, cycleId: 1 },
    { id: 6, name: 'Base de Datos', careerId: 1, cicleNumber: 3, cycleId: 1 },
    { id: 7, name: 'Desarrollo Web', careerId: 1, cicleNumber: 3, cycleId: 1 },
  ];

  for (const subject of subjects) {
    await prismaAcademic.subject.upsert({
      where: {
        careerId_cicleNumber_name: {
          careerId: subject.careerId,
          cicleNumber: subject.cicleNumber,
          name: subject.name,
        },
      },
      update: {},
      create: subject,
    });
  }
  console.log('✅ Datos académicos creados\n');

  // ============================================
  // 3. SINCRONIZAR A BD PROFILES (REFERENCIAS)
  // ============================================
  console.log('🔄 Sincronizando referencias...');

  for (const speciality of specialities) {
    await prismaProfiles.specialityReference.upsert({
      where: { id: speciality.id },
      update: {},
      create: { id: speciality.id, name: speciality.name },
    });
  }

  for (const career of careers) {
    await prismaProfiles.careerReference.upsert({
      where: { id: career.id },
      update: {},
      create: { id: career.id, name: career.name, totalCicles: career.totalCicles },
    });
  }

  for (const subject of subjects) {
    await prismaProfiles.subjectReference.upsert({
      where: { id: subject.id },
      update: {},
      create: {
        id: subject.id,
        name: subject.name,
        careerId: subject.careerId,
        cicleNumber: subject.cicleNumber,
      },
    });
  }
  console.log('✅ Referencias sincronizadas\n');

  // ============================================
  // 4. CREAR PROFESORES
  // ============================================
  console.log('👨‍🏫 Creando profesores...');

  const teachers = [
    {
      id: 100,
      name: 'Dr. Carlos Méndez',
      email: 'carlos.mendez@sudamericano.edu.ec',
      password: bcrypt.hashSync('teacher123', 10),
      roleId: 2,
      status: 'active',
      specialityId: 1,
      careerId: 1,
    },
    {
      id: 101,
      name: 'Ing. María López',
      email: 'maria.lopez@sudamericano.edu.ec',
      password: bcrypt.hashSync('teacher123', 10),
      roleId: 2,
      status: 'active',
      specialityId: 1,
      careerId: 1,
    },
  ];

  for (const teacher of teachers) {
    // Crear en BD Users
    const user = await prismaUsers.user.upsert({
      where: { email: teacher.email },
      update: {},
      create: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        password: teacher.password,
        roleId: teacher.roleId,
        status: teacher.status,
      },
    });

    // Crear en BD Profiles
    await prismaProfiles.userReference.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        status: user.status,
        teacherProfile: {
          create: {
            specialityId: teacher.specialityId,
            careerId: teacher.careerId,
          },
        },
      },
    });

    console.log(`  ✅ Profesor creado: ${teacher.name}`);
  }
  console.log('✅ Profesores creados\n');

  // ============================================
  // 5. ASIGNAR MATERIAS A PROFESORES
  // ============================================
  console.log('📚 Asignando materias a profesores...');

  const teacherProfile1 = await prismaProfiles.teacherProfile.findFirst({
    where: { userId: 100 },
  });

  const teacherProfile2 = await prismaProfiles.teacherProfile.findFirst({
    where: { userId: 101 },
  });

  if (teacherProfile1) {
    // Dr. Carlos enseña 3 materias
    await prismaProfiles.subjectAssignment.upsert({
      where: {
        teacherProfileId_subjectId: {
          teacherProfileId: teacherProfile1.id,
          subjectId: 1,
        },
      },
      update: {},
      create: { teacherProfileId: teacherProfile1.id, subjectId: 1 },
    });

    await prismaProfiles.subjectAssignment.upsert({
      where: {
        teacherProfileId_subjectId: {
          teacherProfileId: teacherProfile1.id,
          subjectId: 4,
        },
      },
      update: {},
      create: { teacherProfileId: teacherProfile1.id, subjectId: 4 },
    });

    await prismaProfiles.subjectAssignment.upsert({
      where: {
        teacherProfileId_subjectId: {
          teacherProfileId: teacherProfile1.id,
          subjectId: 6,
        },
      },
      update: {},
      create: { teacherProfileId: teacherProfile1.id, subjectId: 6 },
    });

    console.log('  ✅ Dr. Carlos asignado a 3 materias');
  }

  if (teacherProfile2) {
    // Ing. María enseña 2 materias
    await prismaProfiles.subjectAssignment.upsert({
      where: {
        teacherProfileId_subjectId: {
          teacherProfileId: teacherProfile2.id,
          subjectId: 2,
        },
      },
      update: {},
      create: { teacherProfileId: teacherProfile2.id, subjectId: 2 },
    });

    await prismaProfiles.subjectAssignment.upsert({
      where: {
        teacherProfileId_subjectId: {
          teacherProfileId: teacherProfile2.id,
          subjectId: 3,
        },
      },
      update: {},
      create: { teacherProfileId: teacherProfile2.id, subjectId: 3 },
    });

    console.log('  ✅ Ing. María asignada a 2 materias');
  }
  console.log('✅ Materias asignadas\n');

  // ============================================
  // 6. CREAR ESTUDIANTES
  // ============================================
  console.log('👨‍🎓 Creando estudiantes...');

  const students = [
    {
      id: 200,
      name: 'Juan Pérez',
      email: 'juan.perez@sudamericano.edu.ec',
      password: bcrypt.hashSync('student123', 10),
      phone: '0987654321',
      age: 20,
      roleId: 3,
      status: 'active',
      careerId: 1,
      currentCicle: 1,
    },
    {
      id: 201,
      name: 'María García',
      email: 'maria.garcia@sudamericano.edu.ec',
      password: bcrypt.hashSync('student123', 10),
      phone: '0987654322',
      age: 19,
      roleId: 3,
      status: 'active',
      careerId: 1,
      currentCicle: 1,
    },
    {
      id: 202,
      name: 'Pedro Sánchez',
      email: 'pedro.sanchez@sudamericano.edu.ec',
      password: bcrypt.hashSync('student123', 10),
      phone: '0987654323',
      age: 21,
      roleId: 3,
      status: 'active',
      careerId: 1,
      currentCicle: 2,
    },
    {
      id: 203,
      name: 'Ana Rodríguez',
      email: 'ana.rodriguez@sudamericano.edu.ec',
      password: bcrypt.hashSync('student123', 10),
      phone: '0987654324',
      age: 20,
      roleId: 3,
      status: 'suspended', // Estudiante suspendido para probar filtros
      careerId: 1,
      currentCicle: 1,
    },
  ];

  for (const student of students) {
    // Crear en BD Users
    const user = await prismaUsers.user.upsert({
      where: { email: student.email },
      update: {},
      create: {
        id: student.id,
        name: student.name,
        email: student.email,
        password: student.password,
        phone: student.phone,
        age: student.age,
        roleId: student.roleId,
        status: student.status,
      },
    });

    // Crear en BD Profiles
    await prismaProfiles.userReference.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        status: user.status,
        studentProfile: {
          create: {
            careerId: student.careerId,
            currentCicle: student.currentCicle,
          },
        },
      },
    });

    console.log(`  ✅ Estudiante creado: ${student.name} (${student.status})`);
  }
  console.log('✅ Estudiantes creados\n');

  // ============================================
  // 7. CREAR MATRÍCULAS
  // ============================================
  console.log('📝 Creando matrículas...');

  const studentProfile1 = await prismaProfiles.studentProfile.findFirst({
    where: { userId: 200 },
  });

  const studentProfile2 = await prismaProfiles.studentProfile.findFirst({
    where: { userId: 201 },
  });

  const studentProfile3 = await prismaProfiles.studentProfile.findFirst({
    where: { userId: 202 },
  });

  if (studentProfile1) {
    // Juan Pérez: 3 materias del ciclo 1
    for (const subjectId of [1, 2, 3]) {
      await prismaProfiles.studentSubject.upsert({
        where: {
          studentProfileId_subjectId: {
            studentProfileId: studentProfile1.id,
            subjectId: subjectId,
          },
        },
        update: {},
        create: {
          studentProfileId: studentProfile1.id,
          subjectId: subjectId,
          status: 'enrolled',
          grade: null,
        },
      });
    }
    console.log('  ✅ Juan Pérez matriculado en 3 materias');
  }

  if (studentProfile2) {
    // María García: 2 materias del ciclo 1
    for (const subjectId of [1, 2]) {
      await prismaProfiles.studentSubject.upsert({
        where: {
          studentProfileId_subjectId: {
            studentProfileId: studentProfile2.id,
            subjectId: subjectId,
          },
        },
        update: {},
        create: {
          studentProfileId: studentProfile2.id,
          subjectId: subjectId,
          status: 'enrolled',
          grade: null,
        },
      });
    }
    console.log('  ✅ María García matriculada en 2 materias');
  }

  if (studentProfile3) {
    // Pedro Sánchez: 2 materias del ciclo 2
    for (const subjectId of [4, 5]) {
      await prismaProfiles.studentSubject.upsert({
        where: {
          studentProfileId_subjectId: {
            studentProfileId: studentProfile3.id,
            subjectId: subjectId,
          },
        },
        update: {},
        create: {
          studentProfileId: studentProfile3.id,
          subjectId: subjectId,
          status: 'enrolled',
          grade: null,
        },
      });
    }
    console.log('  ✅ Pedro Sánchez matriculado en 2 materias');
  }

  console.log('✅ Matrículas creadas\n');

  // ============================================
  // RESUMEN
  // ============================================
  console.log('📊 RESUMEN DE DATOS CREADOS:');
  console.log('================================');
  console.log('Roles:          3');
  console.log('Especialidades: 3');
  console.log('Carreras:       2');
  console.log('Ciclos:         1 (activo)');
  console.log('Materias:       7');
  console.log('Profesores:     2 (con 3 y 2 materias)');
  console.log('Estudiantes:    4 (3 activos, 1 suspendido)');
  console.log('Matrículas:     7\n');

  console.log('🎉 ¡Seed completado exitosamente!\n');

  console.log('📝 CREDENCIALES DE PRUEBA:');
  console.log('================================');
  console.log('PROFESORES:');
  console.log('  Email: carlos.mendez@sudamericano.edu.ec');
  console.log('  Pass:  teacher123\n');
  console.log('  Email: maria.lopez@sudamericano.edu.ec');
  console.log('  Pass:  teacher123\n');
  console.log('ESTUDIANTES:');
  console.log('  Email: juan.perez@sudamericano.edu.ec');
  console.log('  Pass:  student123\n');
  console.log('  Email: maria.garcia@sudamericano.edu.ec');
  console.log('  Pass:  student123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaUsers.$disconnect();
    await prismaProfiles.$disconnect();
    await prismaAcademic.$disconnect();
  });