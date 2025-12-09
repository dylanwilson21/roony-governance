import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/database";
import { agents } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { RoonyMCPServer, parseMCPRequest, isNotification } from "@/lib/mcp/server";
import { MCPRequest, MCPResponse } from "@/lib/mcp/types";

// CORS headers for MCP clients
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Store active SSE sessions (in production, use Redis)
const sessions = new Map<string, {
  agentId: string;
  organizationId: string;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
}>();

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Authenticate request and return agent info
 */
async function authenticateRequest(request: NextRequest): Promise<{
  agentId: string;
  organizationId: string;
} | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const authParam = request.nextUrl.searchParams.get("token");
  
  const apiKey = authHeader?.startsWith("Bearer ") 
    ? authHeader.slice(7) 
    : authParam;

  if (!apiKey) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Missing authorization" } },
      { status: 401, headers: corsHeaders }
    );
  }

  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
  
  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKeyHash, apiKeyHash))
    .limit(1);

  if (agent.length === 0) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Invalid API key" } },
      { status: 401, headers: corsHeaders }
    );
  }

  const { id: agentId, organizationId, status } = agent[0];

  if (status !== "active") {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Agent is not active" } },
      { status: 403, headers: corsHeaders }
    );
  }

  return { agentId, organizationId };
}

/**
 * GET endpoint - SSE for MCP streaming
 */
export async function GET(request: NextRequest) {
  // Check if this is an SSE request
  const accept = request.headers.get("accept");
  const isSSE = accept?.includes("text/event-stream");

  if (!isSSE) {
    // Return server info for non-SSE requests
    return NextResponse.json({
      name: "roony",
      version: "1.0.0",
      protocol: "MCP",
      protocolVersion: "2024-11-05",
      description: "Roony - Financial firewall for AI agents",
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
      tools: ["request_purchase", "check_budget", "list_transactions", "get_policy_info"],
      documentation: "/docs/MCP_INTEGRATION.md",
    }, { headers: corsHeaders });
  }

  // Authenticate for SSE
  const auth = await authenticateRequest(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { agentId, organizationId } = auth;
  const sessionId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Store session
      sessions.set(sessionId, { agentId, organizationId, controller, encoder });

      // Send endpoint event - tell client where to POST messages
      const endpointUrl = `/api/mcp?sessionId=${sessionId}`;
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));

      // Keep alive with periodic pings
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
          sessions.delete(sessionId);
        }
      }, 15000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        sessions.delete(sessionId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      ...corsHeaders,
    },
  });
}

/**
 * POST endpoint - Handle MCP JSON-RPC requests
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    
    let agentId: string;
    let organizationId: string;
    let sseSession: {
      agentId: string;
      organizationId: string;
      controller: ReadableStreamDefaultController;
      encoder: TextEncoder;
    } | undefined;

    // Check if this is part of an SSE session
    if (sessionId && sessions.has(sessionId)) {
      sseSession = sessions.get(sessionId)!;
      agentId = sseSession.agentId;
      organizationId = sseSession.organizationId;
    } else {
      // Authenticate via header
      const auth = await authenticateRequest(request);
      if (auth instanceof NextResponse) {
        return auth;
      }
      agentId = auth.agentId;
      organizationId = auth.organizationId;
    }

    // Parse request body
    const body = await request.json();
    
    // Handle batch requests
    if (Array.isArray(body)) {
      const server = new RoonyMCPServer(agentId, organizationId);
      const responses: MCPResponse[] = [];
      
      for (const item of body) {
        const mcpRequest = parseMCPRequest(item);
        if (mcpRequest) {
          const response = await server.handleRequest(mcpRequest);
          responses.push(response);
        } else {
          responses.push({
            jsonrpc: "2.0",
            id: (item as { id?: string | number }).id || null as unknown as string,
            error: { code: -32600, message: "Invalid Request" },
          });
        }
      }

      // Send via SSE if session exists
      if (sseSession) {
        for (const response of responses) {
          const event = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
          sseSession.controller.enqueue(sseSession.encoder.encode(event));
        }
        return new NextResponse(null, { status: 202, headers: corsHeaders });
      }
      
      return NextResponse.json(responses, { headers: corsHeaders });
    }

    // Check if it's a notification (no id) - these don't need a response
    if (isNotification(body)) {
      // Handle notification silently - just acknowledge receipt
      // Common notifications: notifications/initialized, notifications/cancelled
      if (sseSession) {
        return new NextResponse(null, { status: 202, headers: corsHeaders });
      }
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    // Handle single request
    const mcpRequest = parseMCPRequest(body);
    if (!mcpRequest) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } },
        { status: 400, headers: corsHeaders }
      );
    }

    const server = new RoonyMCPServer(agentId, organizationId);
    const response = await server.handleRequest(mcpRequest);

    // Send via SSE if session exists
    if (sseSession) {
      const event = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
      sseSession.controller.enqueue(sseSession.encoder.encode(event));
      return new NextResponse(null, { status: 202, headers: corsHeaders });
    }

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error("MCP endpoint error:", error);
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal server error" } },
      { status: 500, headers: corsHeaders }
    );
  }
}
