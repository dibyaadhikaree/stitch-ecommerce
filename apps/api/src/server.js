import cors from "cors";
import express, { application } from "express";
import path from "node:path";
import morgan from "morgan";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { ensureSeedData } from "./seed.js";

const app = express();

const allowedOrigins = (env.clientUrl || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");
      callback(null, allowedOrigins.includes(normalizedOrigin));
    },
    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.json({
    name: "STITCH Studio API",
    description:
      "Express backend for commerce, admin, analytics, and inventory.",
  });
});

app.use("/api", routes);

app.use((err, _req, res, _next) => {
  const status = err.status ?? err.statusCode ?? 500;
  res
    .status(status)
    .json({ message: status < 500 ? err.message : "Internal server error" });
});

connectDatabase(env.mongodbUri).finally(async () => {
  // if (process.env.MONGODB_URI) {
  //   try {
  //     await ensureSeedData();
  //   } catch (error) {
  //     console.warn("Seed skipped:", error.message);
  //   }
  // }

  app.listen(env.port, () => {
    console.log(`API server running on http://localhost:${env.port}`);
  });
});
