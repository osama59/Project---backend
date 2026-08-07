import { prisma } from "../src/prisma";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Clean up existing data (to avoid duplicates)
  await prisma.rating.deleteMany();
  await prisma.session.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.language.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned up old data.");

  // 2. List of subjects and languages to rotate
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

  // 3. Create 30 Teachers
  for (let i = 0; i < 30; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });
    const hashedPw = await bcrypt.hash("password123", 10);

    // Pick 1-3 random subjects for this teacher
    const teacherSubjects = faker.helpers.arrayElements(subjects, {
      min: 1,
      max: 3,
    });

    // Pick 1-2 random languages for this teacher (they TEACH these)
    const teacherLanguages = faker.helpers.arrayElements(languageNames, {
      min: 1,
      max: 2,
    });

    // Create the User and Teacher in a transaction
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPw,
        firstName,
        lastName,
        birthDate: faker.date.birthdate(),
        origin: faker.location.country(),
        timeZone: "America/New_York",
        subjects: teacherSubjects,
        role: "TEACHER",
        profileImageUrl: faker.image.avatar(), // Fake avatar URL
        status: "APPROVED",
        // Create the Teacher profile
        teacher: {
          create: {
            introText: faker.lorem.paragraph(),
            hourPrice: faker.number.int({ min: 15, max: 80 }),
            certificateImageUrl: faker.image.url(),
            introVideoUrl: faker.image.url(),
          },
        },

        // Create the Languages for this user
        languages: {
          create: teacherLanguages.map((lang) => ({
            name: lang,
            level: faker.number.int({ min: 3, max: 5 }),
            languageType: "TEACH", // They are teachers
          })),
        },
      },
      include: {
        teacher: true,
      },
    });

    // 4. Add Availabilities for each teacher (2 slots each)
    const days = ["MONDAY", "WEDNESDAY", "FRIDAY", "TUESDAY", "THURSDAY"];
    const selectedDays = faker.helpers.arrayElements(days, 2);

    for (const day of selectedDays) {
      // Random time between 8 AM and 6 PM
      const startHour = faker.number.int({ min: 8, max: 16 });
      const endHour = startHour + faker.number.int({ min: 1, max: 3 });

      // Format time for Prisma (we just store the time part)
      const fromTime = new Date();
      fromTime.setHours(startHour, 0, 0, 0);
      const toTime = new Date();
      toTime.setHours(endHour, 0, 0, 0);

      await prisma.availability.create({
        data: {
          teacherId: user.teacher!.id, // Use the created teacher ID
          day: day as any,
          fromTime: fromTime,
          toTime: toTime,
        },
      });
    }

    // Log progress
    console.log(`✅ Created teacher: ${firstName} ${lastName} (${email})`);
  }

  console.log("🎉 Seeding complete! 30 teachers created.");

  // === NEW: Create random ratings ===
  console.log("⭐ Creating random ratings...");

  // 1. Get all teachers and students
  const allTeachers = await prisma.teacher.findMany();
  const allStudents = await prisma.student.findMany();

  let students = allStudents;

  // 4. Create some students (so they can leave ratings)
  const studentUsers = [];
  for (let i = 0; i < 5; i++) {
    const studentSubjects = faker.helpers.arrayElements(subjects, {
      min: 1,
      max: 3,
    });
    // Pick 1-2 random languages for this teacher (they TEACH these)
    const studentLanguages = faker.helpers.arrayElements(languageNames, {
      min: 1,
      max: 2,
    });

    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: await bcrypt.hash("password123", 10),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        birthDate: faker.date.birthdate(),
        origin: faker.location.country(),
        timeZone: "America/New_York",
        subjects: studentSubjects,
        role: "STUDENT",
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
    studentUsers.push(user);
  }

  students = await prisma.student.findMany();
  console.log("✅ Created 5 students for testing");

  // 3. For each teacher, add random ratings
  for (const teacher of allTeachers) {
    const numRatings = faker.number.int({ min: 3, max: 10 });
    const shuffledStudents = faker.helpers.shuffle(students);
    const selectedStudents = shuffledStudents.slice(0, numRatings);

    for (const student of selectedStudents) {
      // Create a dummy session for this student-teacher pair
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

  console.log(`✅ Created ratings for ${allTeachers.length} teachers`);

  // Creating a new admin:
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
    },
  });
  if (admin) {
    console.log(`✅ Created Admin account`);
  } else {
    console.log(` ❌ Failed Admin account`);
  }
}
main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
