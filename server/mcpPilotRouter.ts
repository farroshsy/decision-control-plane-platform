import type { Express, Request, Response } from "express";
import { authenticatePilotApiKey, executeMcpPilotTool, pilotMcpTools } from "./controlPlaneExpansionStore";
import { sdk } from "./_core/sdk";

type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, any> };

function reply(res: Response, id: JsonRpcRequest["id"], result: unknown) {
  res.status(200).json({ jsonrpc: "2.0", id: id ?? null, result });
}

function failure(res: Response, id: JsonRpcRequest["id"], code: number, message: string) {
  res.status(200).json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

/**
 * A deliberately bounded, session-authenticated MCP HTTP endpoint for the pilot.
 * It supports request/response JSON-RPC only; it does not advertise streaming,
 * outbound credentials, retry queues, or independent external-service delivery.
 */
export function registerMcpPilotRoutes(app: Express) {
  app.post("/api/mcp", async (req: Request, res: Response) => {
    const payload = (req.body ?? {}) as JsonRpcRequest;
    if (payload.jsonrpc !== "2.0" || !payload.method) return failure(res, payload.id, -32600, "Invalid JSON-RPC request.");
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      user = null;
    }
    try {
      if (payload.method === "initialize") {
        return reply(res, payload.id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "decision-control-plane-pilot", version: "0.1.0" },
          notice: "Pilot request/response endpoint. No streaming, external API-key authentication, or autonomous infrastructure operations are enabled.",
        });
      }
      if (payload.method === "tools/list") return reply(res, payload.id, { tools: pilotMcpTools });
      if (payload.method === "tools/call") {
        const name = String(payload.params?.name ?? "");
        const args = (payload.params?.arguments ?? {}) as Record<string, unknown>;
        const tenantId = String(args.tenantId ?? "");
        if (!tenantId) return failure(res, payload.id, -32602, "tools/call requires arguments.tenantId.");
        let apiKeyId: string | undefined;
        if (!user) {
          const authorization = req.headers.authorization;
          const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
          if (!token) return failure(res, payload.id, -32001, "A valid user session or tenant-scoped pilot Bearer token is required.");
          const key = await authenticatePilotApiKey(token, tenantId, name);
          user = { id: key.createdByUserId };
          apiKeyId = key.id;
        }
        const result = await executeMcpPilotTool(user.id, { tenantId, toolName: name, args, apiKeyId });
        return reply(res, payload.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      }
      return failure(res, payload.id, -32601, `Unsupported pilot MCP method: ${payload.method}`);
    } catch (error) {
      return failure(res, payload.id, -32000, error instanceof Error ? error.message : "Pilot MCP invocation failed.");
    }
  });
}
