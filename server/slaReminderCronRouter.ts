import type { Express, Request, Response } from "express";
import { evaluateHourlySlaReminderPolicyByTaskUid } from "./controlPlaneExpansionStore";
import { sdk } from "./_core/sdk";

/**
 * Heartbeat invokes this only after a platform operator has explicitly activated
 * a deployed reminder policy. The handler never delivers external messages or
 * escalates cases; it writes idempotent in-app reminder and activity records.
 */
export function registerSlaReminderCronRoutes(app: Express) {
  app.post("/api/scheduled/investigation-sla-reminders", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ ok: false, error: "A verified scheduled-task identity is required." });
      }
      const result = await evaluateHourlySlaReminderPolicyByTaskUid(user.taskUid);
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      console.error("[SLA reminder schedule] evaluation failed", error);
      return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Scheduled SLA reminder evaluation failed." });
    }
  });
}
