import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
const data = HealthCheckResponse.parse({ status: "ok" });
res.json(data);
});

router.get("/db-health", async (_req, res) => {
try {
await pool.query("SELECT 1");
res.json({
success: true,
database: "connected",
});
} catch {
res.status(503).json({
success: false,
database: "disconnected",
});
}
});

export default router;
