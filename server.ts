import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middlewares
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check endpoint (for Cloud Run & container health checks)
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      appName: "Jimpitan RT - Scanner QR Siskamling & Kas Ronda",
      timestamp: new Date().toISOString(),
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robustly resolve production static directory
    const candidates = [
      path.join(process.cwd(), "dist"),
      typeof __dirname !== "undefined" ? __dirname : "",
      typeof __dirname !== "undefined" ? path.join(__dirname, "dist") : "",
      path.resolve("dist"),
    ].filter(Boolean);

    let distPath = path.join(process.cwd(), "dist");
    for (const cand of candidates) {
      if (fs.existsSync(path.join(cand, "index.html"))) {
        distPath = cand;
        break;
      }
    }

    app.use(express.static(distPath, { maxAge: "1d" }));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application index.html not found. Please build the application.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jimpitan RT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
