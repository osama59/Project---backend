import { prisma } from "../src/prisma";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import {
  LanguageType,
  TransactionStatus,
} from "../src/generated/prisma/client";
import { email } from "zod";

// ==========================================
// 1. Utility & Helper Functions
// ==========================================

const SUBJECTS = [
  "Math",
  "Physics",
  "Chemistry",
  "English",
  "Spanish",
  "Korean",
  "Arabic",
  "History",
  "Music",
  "Coding",
];
const LANGUAGES = [
  "English",
  "Spanish",
  "Korean",
  "Arabic",
  "French",
  "Japanese",
];
const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

/**
 * Fetches multiple realistic users from randomuser.me in a single API call
 */
async function fetchRandomUsers(
  count: number,
  gender?: string,
): Promise<any[]> {
  let url = `https://randomuser.me/api/?results=${count}&inc=name,email,dob,location,picture`;
  if (gender) url += `&gender=${gender}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as { results?: any[] };
    return data.results || [];
  } catch (error) {
    console.warn(
      `⚠️ Failed to fetch from randomuser.me, falling back to faker-generated data.`,
    );
    // Generate fake users locally
    const fakeUsers = [];
    for (let i = 0; i < count; i++) {
      const genderFaker = faker.person.sex() as "female" | "generic" | "male";
      fakeUsers.push({
        name: {
          first: faker.person.firstName(genderFaker),
          last: faker.person.lastName(genderFaker),
        },
        email: faker.internet.email(),
        dob: {
          date: faker.date
            .birthdate({ min: 18, max: 60, mode: "age" })
            .toISOString(),
        },
        location: { country: faker.location.country() },
        picture: { large: faker.image.avatar() },
      });
    }
    return fakeUsers;
  }
}
// ==========================================
// 2. Database Cleanup
// ==========================================

async function cleanDatabase() {
  console.log("🧹 Cleaning up old data...");

  // Delete in order to respect foreign key constraints
  await prisma.rating.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.report.deleteMany();
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.language.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database cleaned.");
}

// ==========================================
// 3. Entity Creation Functions
// ==========================================

async function createTeachers(count: number) {
  console.log(`👨‍🏫 Creating ${count} teachers...`);
  const persons = await fetchRandomUsers(count);

  for (const person of persons) {
    const hashedPw = await bcrypt.hash("password123", 10);
    const teacherSubjects = faker.helpers.arrayElements(SUBJECTS, {
      min: 1,
      max: 4,
    });

    // In createTeachers()
    const teacherLanguages = [
      // Speak their native/target languages (high proficiency)
      ...faker.helpers
        .arrayElements(LANGUAGES, { min: 1, max: 2 })
        .map((lang) => ({
          name: lang,
          level: faker.number.int({ min: 4, max: 5 }), // native/fluent
          languageType: LanguageType.SPEAK,
        })),
      // Teach specific subjects (high/medium proficiency)
      ...faker.helpers
        .arrayElements(LANGUAGES, { min: 1, max: 3 })
        .map((lang) => ({
          name: lang,
          level: faker.number.int({ min: 3, max: 5 }),
          languageType: LanguageType.TEACH,
        })),
    ];
    const user = await prisma.user.create({
      data: {
        email: person.email,
        password: hashedPw,
        firstName: person.name.first,
        lastName: person.name.last,
        birthDate: new Date(person.dob.date),
        origin: person.location.country,
        timeZone: "America/New_York",
        subjects: teacherSubjects,
        role: "TEACHER",
        profileImageUrl: person.picture.large,
        status: "APPROVED",
        teacher: {
          create: {
            introText: faker.lorem.paragraph(),
            hourPrice: faker.number.float({
              min: 15,
              max: 80,
              fractionDigits: 2,
            }),
            certificateImageUrl: faker.image.url(),
            introVideoUrl: faker.image.url(),
          },
        },
        languages: {
          create: teacherLanguages,
        },
      },
      include: { teacher: true },
    });

    // Add Availabilities (2-4 slots per teacher)
    const selectedDays = faker.helpers.arrayElements(
      DAYS,
      faker.number.int({ min: 2, max: 4 }),
    );
    for (const day of selectedDays) {
      const startHour = faker.number.int({ min: 8, max: 16 });
      const endHour = startHour + faker.number.int({ min: 1, max: 3 });

      const fromTime = new Date();
      fromTime.setHours(startHour, 0, 0, 0);
      const toTime = new Date();
      toTime.setHours(endHour, 0, 0, 0);

      await prisma.availability.create({
        data: {
          teacherId: user.teacher!.id,
          day: day as any,
          fromTime,
          toTime,
        },
      });
    }
    console.log(`✅ ${user.email}  ${user.firstName} teacher `);
  }
  console.log(
    `✅ ${count} teachers created with availabilities and languages.`,
  );
}

async function createStudents(count: number) {
  console.log(`👩‍🎓 Creating ${count} students...`);
  const persons = await fetchRandomUsers(count);

  for (const person of persons) {
    const hashedPw = await bcrypt.hash("password123", 10);
    const studentSubjects = faker.helpers.arrayElements(SUBJECTS, {
      min: 1,
      max: 3,
    });
    // In createStudents()
    const studentLanguages = [
      // Speak their native language (high proficiency)
      ...faker.helpers
        .arrayElements(LANGUAGES, { min: 1, max: 1 })
        .map((lang) => ({
          name: lang,
          level: faker.number.int({ min: 4, max: 5 }),
          languageType: LanguageType.SPEAK,
        })),
      // Learn new languages (lower proficiency)
      ...faker.helpers
        .arrayElements(LANGUAGES, { min: 1, max: 2 })
        .map((lang) => ({
          name: lang,
          level: faker.number.int({ min: 1, max: 3 }),
          languageType: LanguageType.LEARN,
        })),
    ];
    await prisma.user.create({
      data: {
        email: person.email,
        password: hashedPw,
        firstName: person.name.first,
        lastName: person.name.last,
        birthDate: new Date(person.dob.date),
        origin: person.location.country,
        timeZone: "America/New_York",
        subjects: studentSubjects,
        role: "STUDENT",
        profileImageUrl: person.picture.large,
        status: "CONFIRMED",
        student: {
          create: {
            preferedPriceMin: faker.number.float({
              min: 5,
              max: 20,
              fractionDigits: 2,
            }),
            preferedPriceMax: faker.number.float({
              min: 30,
              max: 60,
              fractionDigits: 2,
            }),
          },
        },
        languages: {
          create: studentLanguages,
        },
      },
    });
  }
  console.log(`✅ ${count} students created with preferences and languages.`);
}

async function createAdmin() {
  console.log("👑 Creating admin...");
  const hashedPw = await bcrypt.hash(process.env.ADMIN_PWD || "Admin123!", 10);

  await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL || "admin@fluenzy.com",
      password: hashedPw,
      firstName: "Osama",
      lastName: "Reema",
      birthDate: faker.date.birthdate({ min: 25, max: 50, mode: "age" }),
      origin: "Syria",
      timeZone: "Asia/Damascus",
      role: "ADMIN",
      status: "CONFIRMED",
    },
  });
  console.log("✅ Admin account created.");
}

// ==========================================
// 4. Relational Data Functions
// ==========================================

async function createSessionsAndTransactions(
  teachers: any[],
  students: any[],
  count: number,
) {
  console.log(`📅 Creating ${count} sessions and transactions...`);

  for (let i = 0; i < count; i++) {
    const randomTeacher = faker.helpers.arrayElement(teachers);
    const randomStudent = faker.helpers.arrayElement(students);

    const startTime = faker.date.future();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour session
    const sessionStatus = faker.helpers.arrayElement([
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
    ]);

    const session = await prisma.session.create({
      data: {
        studentId: randomStudent.id,
        teacherId: randomTeacher.id,
        startTime,
        endTime,
        status: sessionStatus,
      },
    });

    // Create Transaction for the session
    const scheduledAmount = randomTeacher.hourPrice;
    const platformFee = scheduledAmount * 0.2; // 20% platform fee

    let transactionStatus: TransactionStatus = TransactionStatus.ESCROW;
    let actualAmount = scheduledAmount; // Default to scheduled
    let teacherEarn = scheduledAmount - platformFee;

    if (sessionStatus === "COMPLETED") {
      transactionStatus = TransactionStatus.RELEASED;
    } else if (sessionStatus === "CANCELLED") {
      transactionStatus = TransactionStatus.REFUNDED;
      actualAmount = 0;
      teacherEarn = 0;
    }

    await prisma.transaction.create({
      data: {
        sessionId: session.id,
        studentId: randomStudent.id,
        teacherId: randomTeacher.id,
        scheduledAmount,
        actualAmount,
        platformFee,
        teacherEarn,
        status: transactionStatus,
        releasedAt:
          transactionStatus === "RELEASED" ? faker.date.recent() : null,
        createdAt: faker.date.past(),
      },
    });

    // If session is completed, create a rating
    if (sessionStatus === "COMPLETED" && faker.datatype.boolean(0.8)) {
      await prisma.rating.create({
        data: {
          studentId: randomStudent.id,
          teacherId: randomTeacher.id,
          sessionId: session.id,
          rating: faker.number.int({ min: 3, max: 5 }),
          review: faker.helpers.maybe(() => faker.lorem.sentence(), {
            probability: 0.7,
          }),
        },
      });
    }
  }
  console.log(`✅ ${count} sessions, transactions, and ratings created.`);
}

async function createMessages(users: any[], count: number) {
  console.log(`💬 Creating ${count} messages...`);

  for (let i = 0; i < count; i++) {
    const sender = faker.helpers.arrayElement(users);
    let receiver = faker.helpers.arrayElement(users);

    // Ensure sender and receiver are not the same
    while (receiver.id === sender.id) {
      receiver = faker.helpers.arrayElement(users);
    }

    await prisma.message.create({
      data: {
        senderId: sender.id,
        reciverId: receiver.id, // Note: Keeping schema typo 'reciverId'
        text: faker.lorem.sentence({ min: 3, max: 12 }),
        isRead: faker.datatype.boolean(),
        createdAt: faker.date.recent({ days: 10 }),
      },
    });
  }
  console.log(`✅ ${count} messages created.`);
}

async function createReports(users: any[], messages: any[], count: number) {
  console.log(`📢 Creating ${count} reports...`);

  for (let i = 0; i < count; i++) {
    const reporter = faker.helpers.arrayElement(users);
    let reported = faker.helpers.arrayElement(users);

    while (reported.id === reporter.id) {
      reported = faker.helpers.arrayElement(users);
    }

    const randomMessage = faker.helpers.maybe(
      () => faker.helpers.arrayElement(messages),
      { probability: 0.4 },
    );

    await prisma.report.create({
      data: {
        reporterId: reporter.id,
        reportedId: reported.id,
        category: faker.helpers.arrayElements(
          [
            "Inappropriate behavior",
            "Spam",
            "Harassment",
            "Fake credentials",
            "No-show",
          ],
          { min: 1, max: 2 },
        ),
        description: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.6,
        }),
        messageId: randomMessage?.id || null,
        status: faker.helpers.arrayElement([
          "PENDING",
          "REVIEWD",
          "DISMISSED",
          "ACTION_TAKEN",
        ]),
        createdAt: faker.date.recent({ days: 5 }),
      },
    });
  }
  console.log(`✅ ${count} reports created.`);
}

async function createReceipts(users: any[], count: number) {
  console.log(`🧾 Creating ${count} receipts...`);

  for (let i = 0; i < count; i++) {
    const randomUser = faker.helpers.arrayElement(users);

    await prisma.receipt.create({
      data: {
        userId: randomUser.id,
        amount: faker.number.int({ min: 10, max: 100 }),
        status: faker.helpers.arrayElement(["PENDING", "PROCESSED"]),
        createdAt: faker.date.recent({ days: 15 }),
      },
    });
  }
  console.log(`✅ ${count} receipts created.`);
}

// ==========================================
// 5. Main Execution Function
// ==========================================

async function main() {
  console.log("🌱 Starting database seeding...");

  await cleanDatabase();

  // Configuration
  const NUM_TEACHERS = 300;
  const NUM_STUDENTS = 100;
  const NUM_SESSIONS = 300;
  const NUM_MESSAGES = 300;
  const NUM_REPORTS = 50;
  const NUM_RECEIPTS = 100;

  // 1. Create Base Entities
  await createTeachers(NUM_TEACHERS);
  await createStudents(NUM_STUDENTS);
  await createAdmin();

  // 2. Fetch Relations for Relational Data
  const teachers = await prisma.teacher.findMany();
  const students = await prisma.student.findMany();
  const users = await prisma.user.findMany();

  // 3. Create Relational Data
  await createSessionsAndTransactions(teachers, students, NUM_SESSIONS);

  await createMessages(users, NUM_MESSAGES);
  const messages = await prisma.message.findMany();
  await createReports(users, messages, NUM_REPORTS);
  await createReceipts(users, NUM_RECEIPTS);

  console.log("🎉 Seeding complete successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
