import app from "./app";
import { prisma } from "./prisma";


app.listen(3000, () => {
  console.log("Server running on port 3000");
});
