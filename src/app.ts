import express from "express";
import studentRouts from "./routes/student.routes";
import teacherRouts from "./routes/teacher.routes";
import sessionRouts from "./routes/session.routes";
import adminRoutes from "./routes/admin.routes";
import googleRoutes from "./routes/google.routes";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());
app.use("/student", studentRouts);
app.use("/teacher", teacherRouts);
app.use("/session", sessionRouts);
app.use("/admin", adminRoutes);
app.use("/google", googleRoutes);

export default app;
