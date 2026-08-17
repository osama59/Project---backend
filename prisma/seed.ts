import { prisma } from "../src/prisma";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

// Helper: Fetch a realistic user from randomuser.me
async function fetchRandomUser(
  gender?: string,
  minAge?: number,
  maxAge?: number,
): Promise<{
  name: { first: string; last: string };
  email: string;
  dob: { date: string; age: number };
  location: { country: string };
  picture: { large: string };
}> {
  let url = "https://randomuser.me/api/?inc=name,email,dob,location,picture";
  if (gender) url += `&gender=${gender}`;
  if (minAge && maxAge) url += `&age=${minAge},${maxAge}`;

  const response = await fetch(url);
  const data = (await response.json()) as {
    results?: Array<{
      name: { first: string; last: string };
      email: string;
      dob: { date: string; age: number };
      location: { country: string };
      picture: { large: string };
    }>;
  };

  const person = data.results?.[0];
  if (!person) {
    throw new Error("Failed to fetch a random user from randomuser.me");
  }

  return person;
}

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Clean up existing data (to avoid duplicates)
  await prisma.rating.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.report.deleteMany();
  await prisma.session.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.language.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned up old data.");

  // 2. Lists of subjects and languages to rotate
  const subjects = [
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
  const languageNames = [
    "English",
    "Spanish",
    "Korean",
    "Arabic",
    "French",
    "Japanese",
  ];

  // 3. Create 30 Teachers (using randomuser.me API)
  console.log("👨‍🏫 Creating 30 teachers with realistic data...");

  for (let i = 0; i < 300; i++) {
    // Fetch a realistic person (mixed gender, ages 28-55)
    const person = await fetchRandomUser(undefined, 28, 55);
    const hashedPw = await bcrypt.hash("password123", 10);

    const teacherSubjects = faker.helpers.arrayElements(subjects, {
      min: 1,
      max: 3,
    });
    const teacherLanguages = faker.helpers.arrayElements(languageNames, {
      min: 1,
      max: 2,
    });

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
            hourPrice: faker.number.int({ min: 15, max: 80 }),
            certificateImageUrl: faker.image.url(),
            introVideoUrl: faker.image.url(),
          },
        },
        languages: {
          create: teacherLanguages.map((lang) => ({
            name: lang,
            level: faker.number.int({ min: 3, max: 5 }),
            languageType: "TEACH",
          })),
        },
      },
      include: { teacher: true },
    });

    // 4. Add Availabilities (2 slots each)
    const days = ["MONDAY", "WEDNESDAY", "FRIDAY", "TUESDAY", "THURSDAY"];
    const selectedDays = faker.helpers.arrayElements(days, 2);

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
          fromTime: fromTime,
          toTime: toTime,
        },
      });
    }

    console.log(
      `✅ Created teacher: ${person.name.first} ${person.name.last} (${person.email})`,
    );
  }

  console.log("🎉 30 teachers created!");

  // 5. Create 5 Students (using randomuser.me API, younger)
  console.log("👩‍🎓 Creating 5 students with realistic data...");

  for (let i = 0; i < 5; i++) {
    const person = await fetchRandomUser(undefined, 18, 30);
    const hashedPw = await bcrypt.hash("password123", 10);

    const studentSubjects = faker.helpers.arrayElements(subjects, {
      min: 1,
      max: 3,
    });
    const studentLanguages = faker.helpers.arrayElements(languageNames, {
      min: 1,
      max: 2,
    });

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
            preferedPriceMin: faker.number.int({ min: 1, max: 50 }),
            preferedPriceMax: faker.number.int({ min: 50, max: 100 }),
          },
        },
        languages: {
          create: studentLanguages.map((lang) => ({
            name: lang,
            level: faker.number.int({ min: 3, max: 5 }),
            languageType: "LEARN",
          })),
        },
      },
    });
  }

  console.log("✅ 5 students created!");

  // 6. Get all teachers and students for seeding relations
  const allTeachers = await prisma.teacher.findMany();
  const allStudents = await prisma.student.findMany();

  // 7. Seed Transactions
  console.log("💰 Creating transactions...");

  for (let i = 0; i < 5; i++) {
    const randomTeacher = faker.helpers.arrayElement(allTeachers);
    const randomStudent = faker.helpers.arrayElement(allStudents);

    const session = await prisma.session.create({
      data: {
        studentId: randomStudent.id,
        teacherId: randomTeacher.id,
        startTime: faker.date.past(),
        endTime: faker.date.future(),
        status: "COMPLETED",
      },
    });

    const scheduledAmount = faker.number.int({ min: 20, max: 80 });
    const platformFee = 0.2;
    const teacherEarn = scheduledAmount * (1 - platformFee);

    await prisma.transaction.create({
      data: {
        sessionId: session.id,
        studentId: randomStudent.id,
        teacherId: randomTeacher.id,
        scheduledAmount: scheduledAmount,
        platformFee: platformFee,
        teacherEarn: teacherEarn,
        status: "RELEASED",
        createdAt: faker.date.past(),
      },
    });
  }
  console.log("✅ 5 transactions created!");

  // 8. Seed Messages
  console.log("💬 Creating messages...");

  for (let i = 0; i < 3; i++) {
    const teacher = faker.helpers.arrayElement(allTeachers);
    const student = faker.helpers.arrayElement(allStudents);
    const numMessages = faker.number.int({ min: 3, max: 8 });

    for (let j = 0; j < numMessages; j++) {
      const sender = faker.helpers.arrayElement([
        teacher.userId,
        student.userId,
      ]);
      const receiver =
        sender === teacher.userId ? student.userId : teacher.userId;

      await prisma.message.create({
        data: {
          senderId: sender,
          reciverId: receiver,
          text: faker.lorem.sentence({ min: 3, max: 12 }),
          createdAt: faker.date.recent({ days: 10 }),
        },
      });
    }
  }
  console.log("✅ Messages created for 3 conversations!");

  // 9. Seed Reports
  console.log("📢 Creating reports...");

  const allMessages = await prisma.message.findMany();

  for (let i = 0; i < 3; i++) {
    const reporter = faker.helpers.arrayElement(allStudents);
    const reported = faker.helpers.arrayElement(allTeachers);
    const randomMessage = faker.helpers.maybe(
      () => faker.helpers.arrayElement(allMessages),
      { probability: 0.5 },
    );

    await prisma.report.create({
      data: {
        reporterId: reporter.userId,
        reportedId: reported.userId,
        category: [
          faker.helpers.arrayElement([
            "Inappropriate behavior",
            "Spam",
            "Harassment",
            "Fake credentials",
            "No-show",
          ]),
        ],
        description: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.6,
        }),
        messageId: randomMessage?.id || undefined,
        status: "PENDING",
        createdAt: faker.date.recent({ days: 5 }),
      },
    });
  }
  console.log("✅ 3 pending reports created!");

  // 10. Seed Receipts
  console.log("🧾 Creating receipts...");

  const allUsers = await prisma.user.findMany();

  for (let i = 0; i < 5; i++) {
    const randomUser = faker.helpers.arrayElement(allUsers);

    await prisma.receipt.create({
      data: {
        userId: randomUser.id,
        amount: faker.number.int({ min: 10, max: 100 }),
        createdAt: faker.date.recent({ days: 15 }),
      },
    });
  }
  console.log("✅ 5 receipts created!");

  // 11. Seed Ratings
  console.log("⭐ Creating ratings...");

  for (const teacher of allTeachers) {
    const numRatings = faker.number.int({ min: 3, max: 10 });
    const shuffledStudents = faker.helpers.shuffle(allStudents);
    const selectedStudents = shuffledStudents.slice(0, numRatings);

    for (const student of selectedStudents) {
      const dummySession = await prisma.session.create({
        data: {
          studentId: student.id,
          teacherId: teacher.id,
          startTime: new Date(),
          endTime: new Date(),
          status: "COMPLETED",
        },
      });

      await prisma.rating.create({
        data: {
          studentId: student.id,
          teacherId: teacher.id,
          sessionId: dummySession.id,
          rating: faker.number.int({ min: 1, max: 5 }),
          review: faker.helpers.maybe(() => faker.lorem.sentence(), {
            probability: 0.7,
          }),
        },
      });
    }
  }

  console.log(`✅ Ratings created for ${allTeachers.length} teachers!`);

  // 12. Create Admin
  console.log("👑 Creating admin...");

  const admin = await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL!,
      password: await bcrypt.hash(process.env.ADMIN_PWD!, 10),
      firstName: "Osama",
      lastName: "Reema",
      birthDate: faker.date.birthdate(),
      origin: "Syria",
      timeZone: "America/New_York",
      role: "ADMIN",
      status: "CONFIRMED",
    },
  });

  if (admin) {
    console.log("✅ Admin account created!");
  } else {
    console.log("❌ Admin creation failed!");
  }

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
