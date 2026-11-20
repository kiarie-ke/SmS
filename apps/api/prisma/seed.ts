/**
 * Seeds a realistic Kenyan school: one school, dual grade scales, two academic
 * years, three terms, four classes, five subjects, three teachers, ten students,
 * ten guardians, one fee structure per class, and one login per role.
 */
import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { Prisma } from '../src/generated/prisma/client';
import {
  CBC_GRADE_BANDS,
  KENYAN_844_GRADE_BANDS,
} from '@school-system/shared';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const SCHOOL_ID = '00000000-0000-4000-8000-000000000001';
const PASSWORD_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

async function hash(password: string): Promise<string> {
  return argon2.hash(password, PASSWORD_OPTIONS);
}

async function seedSchool() {
  return prisma.school.upsert({
    where: { id: SCHOOL_ID },
    update: {},
    create: {
      id: SCHOOL_ID,
      name: 'Mwangaza Academy',
      motto: 'Knowledge, Integrity, Service',
      county: 'Nairobi',
      subCounty: 'Westlands',
      type: 'PRIVATE',
      category: 'MIXED',
      levels: ['PRIMARY', 'JSS', 'SECONDARY'],
      gradeScaleType: 'CBC_8_4_4',
      phone: '+254720123456',
      email: 'info@mwangaza.ac.ke',
      address: 'P.O. Box 12345-00100, Nairobi',
      principalName: 'Mrs. Grace Njeri',
      nemisCode: 'NEMIS-NAI-00421',
      knecCenterNumber: '40123456',
    },
  });
}

async function seedGradeScales(schoolId: string) {
  // GradeBand has no index signature, so cast through the Prisma JSON input type.
  const bands844 = [...KENYAN_844_GRADE_BANDS] as unknown as Prisma.InputJsonValue;
  const bandsCbc = [...CBC_GRADE_BANDS] as unknown as Prisma.InputJsonValue;

  await prisma.gradeScale.upsert({
    where: { schoolId_type: { schoolId, type: 'CBC_8_4_4' } },
    update: { bands: bands844 },
    create: {
      schoolId,
      type: 'CBC_8_4_4',
      name: 'Kenyan 8-4-4 Default',
      bands: bands844,
    },
  });

  await prisma.gradeScale.upsert({
    where: { schoolId_type: { schoolId, type: 'CBC' } },
    update: { bands: bandsCbc },
    create: {
      schoolId,
      type: 'CBC',
      name: 'CBC Performance Levels',
      bands: bandsCbc,
    },
  });
}

async function seedUsers() {
  const adminPassword = await hash('Admin@1234');
  const teacherPassword = await hash('Teacher@1234');
  const studentPassword = await hash('Student@1234');
  const parentPassword = await hash('Parent@1234');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mwangaza.ac.ke' },
    update: { passwordHash: adminPassword, role: 'ADMIN' },
    create: {
      email: 'admin@mwangaza.ac.ke',
      phone: '+254720123457',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const teacherUsers = [];
  const teacherAccounts = [
    { email: 'teacher@mwangaza.ac.ke', phone: '+254720123458', password: teacherPassword },
    { email: 'james.kamau@mwangaza.ac.ke', phone: '+254720123459', password: teacherPassword },
    { email: 'esther.chepkoech@mwangaza.ac.ke', phone: '+254720123460', password: teacherPassword },
  ];
  for (const account of teacherAccounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash: account.password, role: 'TEACHER' },
      create: {
        email: account.email,
        phone: account.phone,
        passwordHash: account.password,
        role: 'TEACHER',
      },
    });
    teacherUsers.push(user);
  }

  return { admin, teacherUsers };
}

async function seedAcademicStructure() {
  const currentYear = await prisma.academicYear.upsert({
    where: { name: '2026' },
    update: { isCurrent: true },
    create: {
      name: '2026',
      startDate: new Date('2026-01-05T00:00:00.000Z'),
      endDate: new Date('2026-10-30T00:00:00.000Z'),
      isCurrent: true,
    },
  });

  await prisma.academicYear.upsert({
    where: { name: '2025' },
    update: { isCurrent: false },
    create: {
      name: '2025',
      startDate: new Date('2025-01-06T00:00:00.000Z'),
      endDate: new Date('2025-10-31T00:00:00.000Z'),
      isCurrent: false,
    },
  });

  const termDefinitions = [
    { termNumber: 1, name: 'Term 1', start: '2026-01-05', end: '2026-04-10', isCurrent: false },
    { termNumber: 2, name: 'Term 2', start: '2026-05-04', end: '2026-08-07', isCurrent: true },
    { termNumber: 3, name: 'Term 3', start: '2026-08-31', end: '2026-10-30', isCurrent: false },
  ];
  const terms = [];
  for (const term of termDefinitions) {
    terms.push(
      await prisma.term.upsert({
        where: {
          academicYearId_termNumber: {
            academicYearId: currentYear.id,
            termNumber: term.termNumber,
          },
        },
        update: { isCurrent: term.isCurrent },
        create: {
          academicYearId: currentYear.id,
          termNumber: term.termNumber,
          name: term.name,
          startDate: new Date(`${term.start}T00:00:00.000Z`),
          endDate: new Date(`${term.end}T00:00:00.000Z`),
          isCurrent: term.isCurrent,
        },
      }),
    );
  }

  return { currentYear, terms };
}

async function seedSubjects() {
  const subjectDefinitions = [
    { code: 'ENG', name: 'English', level: 'PRIMARY' as const, isCbc: true },
    { code: 'KIS', name: 'Kiswahili', level: 'PRIMARY' as const, isCbc: true },
    { code: 'MAT', name: 'Mathematics', level: 'JSS' as const, isCbc: true },
    { code: 'SCI', name: 'Integrated Science', level: 'JSS' as const, isCbc: true },
    { code: 'BIO', name: 'Biology', level: 'SECONDARY' as const, isCbc: false },
  ];
  const subjects = [];
  for (const subject of subjectDefinitions) {
    subjects.push(
      await prisma.subject.upsert({
        where: { code: subject.code },
        update: {},
        create: subject,
      }),
    );
  }
  return subjects;
}

async function seedTeachers(teacherUsers: { id: string }[]) {
  const teacherDefinitions = [
    {
      userId: teacherUsers[0].id,
      tscNumber: 'TSC-2019-001234',
      nationalId: '12345678',
      firstName: 'Peter',
      lastName: 'Mwangi',
      phone: '+254720123458',
      email: 'teacher@mwangaza.ac.ke',
      employmentType: 'TSC' as const,
    },
    {
      userId: teacherUsers[1].id,
      tscNumber: 'TSC-2016-004567',
      nationalId: '23456789',
      firstName: 'James',
      lastName: 'Kamau',
      phone: '+254720123459',
      email: 'james.kamau@mwangaza.ac.ke',
      employmentType: 'TSC' as const,
    },
    {
      userId: teacherUsers[2].id,
      tscNumber: 'BOM-2021-007890',
      nationalId: '34567890',
      firstName: 'Esther',
      lastName: 'Chepkoech',
      phone: '+254720123460',
      email: 'esther.chepkoech@mwangaza.ac.ke',
      employmentType: 'BOM' as const,
    },
  ];

  const teachers = [];
  for (const teacher of teacherDefinitions) {
    teachers.push(
      await prisma.teacher.upsert({
        where: { tscNumber: teacher.tscNumber },
        update: {},
        create: teacher,
      }),
    );
  }
  return teachers;
}

async function seedClasses(academicYearId: string, teachers: { id: string }[]) {
  const classDefinitions = [
    { level: 'PP1' as const, name: 'PP1 East', classTeacherId: teachers[2].id },
    { level: 'G4' as const, name: 'Grade 4 North', classTeacherId: teachers[1].id },
    { level: 'G7' as const, name: 'Grade 7 West', classTeacherId: teachers[0].id },
    { level: 'FORM3' as const, name: 'Form 3 South', classTeacherId: teachers[0].id },
  ];

  const classes = [];
  for (const definition of classDefinitions) {
    classes.push(
      await prisma.class.upsert({
        where: {
          academicYearId_level_name: {
            academicYearId,
            level: definition.level,
            name: definition.name,
          },
        },
        update: { classTeacherId: definition.classTeacherId },
        create: { ...definition, academicYearId },
      }),
    );
  }

  const streams = [];
  for (const klass of classes) {
    streams.push(
      await prisma.stream.upsert({
        where: { classId_name: { classId: klass.id, name: 'Main' } },
        update: {},
        create: { classId: klass.id, name: 'Main' },
      }),
    );
  }

  return { classes, streams };
}

async function seedStudents(
  classes: { id: string }[],
  streams: { id: string }[],
  teacherUsers: { id: string }[],
) {
  const studentDefinitions = [
    { first: 'Brian', last: 'Otieno', gender: 'MALE' as const, classIndex: 3 },
    { first: 'Faith', last: 'Wanjiku', gender: 'FEMALE' as const, classIndex: 3 },
    { first: 'Kevin', last: 'Omondi', gender: 'MALE' as const, classIndex: 3 },
    { first: 'Mercy', last: 'Achieng', gender: 'FEMALE' as const, classIndex: 2 },
    { first: 'Brian', last: 'Kiptoo', gender: 'MALE' as const, classIndex: 2 },
    { first: 'Sharon', last: 'Njeri', gender: 'FEMALE' as const, classIndex: 1 },
    { first: 'Daniel', last: 'Mutua', gender: 'MALE' as const, classIndex: 1 },
    { first: 'Linet', last: 'Wekesa', gender: 'FEMALE' as const, classIndex: 0 },
    { first: 'Samuel', last: 'Kariuki', gender: 'MALE' as const, classIndex: 0 },
    { first: 'Joy', last: 'Akinyi', gender: 'FEMALE' as const, classIndex: 3 },
  ];

  const studentPassword = await hash('Student@1234');
  const students = [];
  for (let index = 0; index < studentDefinitions.length; index++) {
    const definition = studentDefinitions[index];
    const admissionNumber = `ADM-2026-${String(index + 1).padStart(3, '0')}`;
    const student = await prisma.student.upsert({
      where: { admissionNumber },
      update: {},
      create: {
        admissionNumber,
        upi: `2001000${String(index + 1).padStart(4, '0')}`,
        firstName: definition.first,
        lastName: definition.last,
        gender: definition.gender,
        dateOfBirth: new Date(
          `${2018 - Math.min(index, 6)}-0${(index % 9) + 1}-1${index % 9}T00:00:00.000Z`,
        ),
        county: 'Nairobi',
        subCounty: 'Westlands',
        boardingStatus: index % 3 === 0 ? 'BOARDER' : 'DAY',
        classId: classes[definition.classIndex].id,
        streamId: streams[definition.classIndex].id,
      },
    });
    students.push(student);
  }

  // A student login linked to the first student.
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@mwangaza.ac.ke' },
    update: { passwordHash: studentPassword, role: 'STUDENT' },
    create: {
      email: 'student@mwangaza.ac.ke',
      phone: '+254720123461',
      passwordHash: studentPassword,
      role: 'STUDENT',
    },
  });
  await prisma.student.update({
    where: { id: students[0].id },
    data: { userId: studentUser.id },
  });

  return { students, teacherUsers };
}

async function seedGuardians(students: { id: string }[]) {
  const guardianDefinitions = [
    { first: 'Joseph', last: 'Otieno', relationship: 'FATHER' as const },
    { first: 'Mary', last: 'Wanjiku', relationship: 'MOTHER' as const },
    { first: 'Alice', last: 'Omondi', relationship: 'MOTHER' as const },
    { first: 'Peter', last: 'Achieng', relationship: 'FATHER' as const },
    { first: 'Grace', last: 'Kiptoo', relationship: 'MOTHER' as const },
    { first: 'Anne', last: 'Njeri', relationship: 'MOTHER' as const },
    { first: 'David', last: 'Mutua', relationship: 'FATHER' as const },
    { first: 'Ruth', last: 'Wekesa', relationship: 'AUNT' as const },
    { first: 'Paul', last: 'Kariuki', relationship: 'GRANDPARENT' as const },
    { first: 'Susan', last: 'Akinyi', relationship: 'MOTHER' as const },
  ];

  const guardians = [];
  for (let index = 0; index < guardianDefinitions.length; index++) {
    const definition = guardianDefinitions[index];
    const phone = `+2547110000${String(index + 10)}`;
    const guardian = await prisma.guardian.upsert({
      where: { phone },
      update: {},
      create: {
        firstName: definition.first,
        lastName: definition.last,
        phone,
        relationship: definition.relationship,
        email: `guardian${index + 1}@example.co.ke`,
        occupation: index % 2 === 0 ? 'Farmer' : 'Trader',
      },
    });
    await prisma.studentGuardian.upsert({
      where: {
        studentId_guardianId: {
          studentId: students[index].id,
          guardianId: guardian.id,
        },
      },
      update: { isPrimary: true },
      create: { studentId: students[index].id, guardianId: guardian.id, isPrimary: true },
    });
    guardians.push(guardian);
  }

  // A parent login linked to the first guardian.
  const parentPassword = await hash('Parent@1234');
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@mwangaza.ac.ke' },
    update: { passwordHash: parentPassword, role: 'PARENT' },
    create: {
      email: 'parent@mwangaza.ac.ke',
      phone: '+254720123462',
      passwordHash: parentPassword,
      role: 'PARENT',
    },
  });
  await prisma.guardian.update({
    where: { id: guardians[0].id },
    data: { userId: parentUser.id },
  });

  return { guardians, parentUser };
}

async function seedClassSubjects(
  classes: { id: string }[],
  subjects: { id: string }[],
  teachers: { id: string }[],
) {
  // English + Mathematics on the Form 3 class, Kiswahili on Grade 7, so the
  // teacher scoping rules have real data to work with.
  const assignments = [
    { classId: classes[3].id, subjectId: subjects[0].id, teacherId: teachers[0].id },
    { classId: classes[3].id, subjectId: subjects[2].id, teacherId: teachers[1].id },
    { classId: classes[2].id, subjectId: subjects[1].id, teacherId: teachers[0].id },
  ];
  for (const assignment of assignments) {
    await prisma.classSubject.upsert({
      where: {
        classId_subjectId: { classId: assignment.classId, subjectId: assignment.subjectId },
      },
      update: { teacherId: assignment.teacherId },
      create: assignment,
    });
  }
}

async function seedFeeStructures(
  classes: { id: string }[],
  termId: string,
  amounts: number[],
) {
  for (let index = 0; index < classes.length; index++) {
    await prisma.feeStructure.upsert({
      where: {
        classId_termId_category: {
          classId: classes[index].id,
          termId,
          category: 'TUITION',
        },
      },
      update: { amount: amounts[index] },
      create: {
        classId: classes[index].id,
        termId,
        category: 'TUITION',
        amount: amounts[index],
        isMandatory: true,
      },
    });
  }
}

async function seedCbcCurriculum(subjects: { id: string; code: string }[]) {
  const math = subjects.find((s) => s.code === 'MAT');
  const eng = subjects.find((s) => s.code === 'ENG');

  if (math) {
    const strand = await prisma.strand.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        subjectId: math.id,
        name: 'Numbers & Operations',
        order: 1,
      },
    });
    const subStrand = await prisma.subStrand.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        strandId: strand.id,
        name: 'Whole Numbers and Fractions',
      },
    });
    await prisma.learningOutcome.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        subStrandId: subStrand.id,
        description: 'Demonstrates understanding of place values up to 10,000',
        order: 1,
      },
    });
    await prisma.learningOutcome.upsert({
      where: { id: '00000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000004',
        subStrandId: subStrand.id,
        description: 'Applies four operations in solving real-life mathematical problems',
        order: 2,
      },
    });
  }

  if (eng) {
    const strand = await prisma.strand.upsert({
      where: { id: '00000000-0000-0000-0000-000000000005' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000005',
        subjectId: eng.id,
        name: 'Listening and Speaking',
        order: 1,
      },
    });
    const subStrand = await prisma.subStrand.upsert({
      where: { id: '00000000-0000-0000-0000-000000000006' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000006',
        strandId: strand.id,
        name: 'Pronunciation and Vocabulary',
      },
    });
    await prisma.learningOutcome.upsert({
      where: { id: '00000000-0000-0000-0000-000000000007' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000007',
        subStrandId: subStrand.id,
        description: 'Uses appropriate vocabulary and intonation in oral presentations',
        order: 1,
      },
    });
  }
}

async function main() {
  console.log('Seeding school system...');
  const school = await seedSchool();
  await seedGradeScales(school.id);
  const { teacherUsers } = await seedUsers();
  const { currentYear, terms } = await seedAcademicStructure();
  const subjects = await seedSubjects();
  const teachers = await seedTeachers(teacherUsers);
  const { classes, streams } = await seedClasses(currentYear.id, teachers);
  const { students } = await seedStudents(classes, streams, teacherUsers);
  const { guardians } = await seedGuardians(students);
  await seedClassSubjects(classes, subjects, teachers);
  await seedCbcCurriculum(subjects);
  await seedFeeStructures(classes, terms[0].id, [15000, 20000, 25000, 30000]);
  await seedFeeStructures(classes, terms[1].id, [15000, 20000, 25000, 30000]);

  console.log(
    [
      'Seed complete:',
      `  school=${school.name}`,
      `  classes=${classes.length} streams=${streams.length} subjects=${subjects.length}`,
      `  teachers=${teachers.length} students=${students.length} guardians=${guardians.length}`,
      '  logins:',
      '    admin@mwangaza.ac.ke / Admin@1234',
      '    teacher@mwangaza.ac.ke / Teacher@1234',
      '    student@mwangaza.ac.ke / Student@1234',
      '    parent@mwangaza.ac.ke / Parent@1234',
    ].join('\n'),
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
