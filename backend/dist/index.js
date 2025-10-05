import express, {} from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import authRouter from "./routes/auth.js";
import classesRouter from "./routes/class.js";
import adminRouter from "./routes/admin.js";
import teacherRouter from "./routes/teacher.js";
import studentRouter from "./routes/student.js";
const app = express();
app.use(cors({
    origin: "https://7eae7ebc942c.ngrok-free.app",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Origin"],
}));
app.use(express.json());
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.get("/test", (req, res) => {
    res.send("Healthy server");
});
app.use("/auth", authRouter);
app.use("/classes", classesRouter);
app.use("/admin", adminRouter);
app.use("/teacher", teacherRouter);
app.use("/student", studentRouter);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map