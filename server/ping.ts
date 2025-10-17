import express from "express";
const app = express();
const port = parseInt(process.env.PORT || "5000", 10);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(port, "0.0.0.0", () => {
  console.log(`PING on :${port}`);
});
