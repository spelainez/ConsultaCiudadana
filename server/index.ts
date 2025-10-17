import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { pgPool as pool } from "./db";

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: ["http://localhost:8080"],
    credentials: true,
  })
);
app.use(express.json());



const PORT = Number(process.env.PORT || 5000);

(async () => {
  await registerRoutes(app);
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
})();
