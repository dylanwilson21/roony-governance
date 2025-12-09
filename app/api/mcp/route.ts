import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/database";
import { agents } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { RoonyMCPServer, parseMCPRequest } from "@/lib/mcp/server";
import { MCPRequest, MCPResponse } from "@/lib/mcp/types";

/**
 * MCP Server Endpoint
 * 
 * This endpoint implements the Model Context Protocol for AI agent integration.
 * Agents authenticate using their API key in the Authorization header.
 * 
 * Supported methods:
 * - initialize: Initialize the MCP session
 * - tools/list: List available tools
 * - tools/call: Execute a tool
 * - resources/list: List available resources (empty)
 * - prompts/list: List available prompts (empty)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { 
          jsonrpc: "2.0", 
          id: null, 
          error: { code: -32000, message: "Missing or invalid Authorization header" } 
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7);
    
    // Hash the API key for comparison
    const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
    
    // Look up agent by API key hash
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.apiKeyHash, apiKeyHash))
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json(
        { 
          jsonrpc: "2.0", 
          id: null, 
          error: { code: -32000, message: "Invalid API key" } 
        },
        { status: 401 }
      );
    }

    const { id: agentId, organizationId, status } = agent[0];

    // Check if agent is active
    if (status !== "active") {
      return NextResponse.json(
        { 
          jsonrpc: "2.0", 
          id: null, 
          error: { code: -32000, message: "Agent is not active" } 
        },
        { status: 403 }
      );
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
      
      return NextResponse.json(responses);
    }

    // Handle single request
    const mcpRequest = parseMCPRequest(body);
    if (!mcpRequest) {
      return NextResponse.json(
        { 
          jsonrpc: "2.0", 
          id: null, 
          error: { code: -32600, message: "Invalid Request" } 
        },
        { status: 400 }
      );
    }

    const server = new RoonyMCPServer(agentId, organizationId);
    const response = await server.handleRequest(mcpRequest);

    return NextResponse.json(response);
  } catch (error) {
    console.error("MCP endpoint error:", error);
    return NextResponse.json(
      { 
        jsonrpc: "2.0", 
        id: null, 
        error: { code: -32603, message: "Internal server error" } 
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for server info and health check
 */
export async function GET(request: NextRequest) {
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
    tools: [
      "request_purchase",
      "check_budget", 
      "list_transactions",
      "get_policy_info",
    ],
    documentation: "/docs/MCP_INTEGRATION.md",
  });
}

