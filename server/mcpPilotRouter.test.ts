import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateRequest = vi.hoisted(() => vi.fn());
const executeMcpPilotTool = vi.hoisted(() => vi.fn());
const authenticatePilotApiKey = vi.hoisted(() => vi.fn());

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest } }));
vi.mock("./controlPlaneExpansionStore", () => ({
  executeMcpPilotTool,
  authenticatePilotApiKey,
  pilotMcpTools: [{ name: "tenant.inspect", description: "Inspect a tenant", inputSchema: { type: "object" } }],
}));

import { registerMcpPilotRoutes } from "./mcpPilotRouter";

describe("MCP pilot router", () => {
  let handler: (req: any, res: any) => Promise<void>;
  let res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authenticateRequest.mockResolvedValue({ id: 77 });
    authenticatePilotApiKey.mockResolvedValue({ id: "key_pilot", createdByUserId: 91 });
    executeMcpPilotTool.mockResolvedValue({ tenant: { id: "tenant_alpha" } });
    const app = { post: vi.fn((_path, captured) => { handler = captured; }) };
    registerMcpPilotRoutes(app as any);
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  });

  it("advertises pilot protocol boundaries during initialize", async () => {
    await handler({ body: { jsonrpc: "2.0", id: 1, method: "initialize" } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ result: expect.objectContaining({ protocolVersion: "2024-11-05" }) }));
    expect(res.json.mock.calls[0][0].result.notice).toContain("No streaming");
  });

  it("requires a tenant id for tool calls", async () => {
    await handler({ body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "tenant.inspect", arguments: {} } } }, res);
    expect(executeMcpPilotTool).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: -32602 }) }));
  });

  it("dispatches an authenticated tool call with the session user and tenant scope", async () => {
    await handler({ body: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "tenant.inspect", arguments: { tenantId: "tenant_alpha" } } } }, res);
    expect(executeMcpPilotTool).toHaveBeenCalledWith(77, expect.objectContaining({ tenantId: "tenant_alpha", toolName: "tenant.inspect" }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ result: expect.objectContaining({ content: expect.any(Array) }) }));
  });

  it("accepts a scoped pilot bearer token when a browser session is absent", async () => {
    authenticateRequest.mockRejectedValue(new Error("No session"));
    await handler({
      headers: { authorization: "Bearer dcp_pilot_example" },
      body: { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "tenant.inspect", arguments: { tenantId: "tenant_alpha" } } },
    }, res);
    expect(authenticatePilotApiKey).toHaveBeenCalledWith("dcp_pilot_example", "tenant_alpha", "tenant.inspect");
    expect(executeMcpPilotTool).toHaveBeenCalledWith(91, expect.objectContaining({ apiKeyId: "key_pilot", tenantId: "tenant_alpha" }));
  });
});
