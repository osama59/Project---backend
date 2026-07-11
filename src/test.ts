import { prisma } from "../src/prisma";

async function clearUsers() {
  await prisma.language.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  console.log("All users cleared.");
}

async function showAllUsers() {
  const user = await prisma.user.findMany({
    include: {
      student: true,
      languages: true,
    },
  });
  console.dir(user, { depth: null });
}
// clearUsers().then(() => process.exit(0))

showAllUsers().then(() => process.exit(0));



// Dealing with the image from the user
// ✔️ Use Multer to receive the file
// ✔️ Upload to Supabase Storage
// ✔️ Save URL in DB
// ✔️ Return URL to frontend
// This keeps your registration endpoint clean and simple.
