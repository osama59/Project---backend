import express from "express";
import userRouts from "./routes/user.routes";
import studentRouts from "./routes/student.routes";
import teacherRouts from "./routes/teacher.routes";
import sessionRouts from "./routes/session.routes";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import messagesRoutes from "./routes/messages.routes";
import reportRoutes from "./routes/report.routes";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());
app.use("/user", userRouts);
app.use("/student", studentRouts);
app.use("/teacher", teacherRouts);
app.use("/session", sessionRouts);
app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);
app.use("/messages", messagesRoutes);
app.use("/report", reportRoutes);

export default app;
