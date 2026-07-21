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
        age: faker.number.int({ min: 22, max: 60 }),
        origin: faker.location.country(),
        timeZone: "America/New_York",
        subjects: teacherSubjects,
        role: "TEACHER",
        profileImageUrl: faker.image.avatar(), // Fake avatar URL

        // Create the Teacher profile
        teacher: {
          create: {
            introText: faker.lorem.paragraph(),
            hourPrice: faker.number.int({ min: 15, max: 80 }),
            certificateImageUrl: faker.image.url(),
            introVideoUrl: faker.image.url(),
            // We set isApproved to true for seeding so they show up
            // isApproved: true,
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
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
