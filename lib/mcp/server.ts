import { 
  MCPRequest, 
  MCPResponse, 
  MCPInitializeResult, 
  MCPToolResult,
  MCPError 
} from "./types";
import { ROONY_TOOLS, RoonyToolName } from "./tools";
import { executeRequestPurchase, executeCheckBudget, executeListTransactions, executeGetPolicyInfo } from "./handlers";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "roony";
const SERVER_VERSION = "1.0.0";

// MCP Error Codes
const ErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
};

export class RoonyMCPServer {
  private agentId: string;
  private organizationId: string;

  constructor(agentId: string, organizationId: string) {
    this.agentId = agentId;
    this.organizationId = organizationId;
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case "initialize":
          return this.handleInitialize(request);
        
        case "initialized":
          return this.handleInitialized(request);
        
        case "tools/list":
          return this.handleToolsList(request);
        
        case "tools/call":
          return await this.handleToolsCall(request);
        
        case "resources/list":
          return this.handleResourcesList(request);
        
        case "prompts/list":
          return this.handlePromptsList(request);
        
        default:
          return this.errorResponse(request.id, ErrorCodes.MethodNotFound, `Method not found: ${request.method}`);
      }
    } catch (error) {
      console.error("MCP Server Error:", error);
      return this.errorResponse(
        request.id, 
        ErrorCodes.InternalError, 
        error instanceof Error ? error.message : "Internal server error"
      );
    }
  }

  private handleInitialize(request: MCPRequest): MCPResponse {
    const result: MCPInitializeResult = {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: {
          listChanged: false,
        },
        resources: {
          subscribe: false,
          listChanged: false,
        },
        prompts: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    };

    return {
      jsonrpc: "2.0",
      id: request.id,
      result,
    };
  }

  private handleInitialized(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {},
    };
  }

  private handleToolsList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        tools: ROONY_TOOLS,
      },
    };
  }

  private async handleToolsCall(request: MCPRequest): Promise<MCPResponse> {
    const params = request.params as { name: string; arguments?: Record<string, unknown> } | undefined;
    
    if (!params?.name) {
      return this.errorResponse(request.id, ErrorCodes.InvalidParams, "Missing tool name");
    }

    const toolName = params.name as RoonyToolName;
    const toolArgs = params.arguments || {};

    let result: MCPToolResult;

    switch (toolName) {
      case "request_purchase":
        result = await executeRequestPurchase(this.agentId, this.organizationId, toolArgs);
        break;
      
      case "check_budget":
        result = await executeCheckBudget(this.agentId, this.organizationId, toolArgs);
        break;
      
      case "list_transactions":
        result = await executeListTransactions(this.agentId, this.organizationId, toolArgs);
        break;
      
      case "get_policy_info":
        result = await executeGetPolicyInfo(this.agentId, this.organizationId);
        break;
      
      default:
        return this.errorResponse(request.id, ErrorCodes.MethodNotFound, `Unknown tool: ${params.name}`);
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      result,
    };
  }

  private handleResourcesList(request: MCPRequest): MCPResponse {
    // Roony doesn't expose resources currently
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        resources: [],
      },
    };
  }

  private handlePromptsList(request: MCPRequest): MCPResponse {
    // Roony doesn't expose prompts currently
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        prompts: [],
      },
    };
  }

  private errorResponse(id: string | number, code: number, message: string): MCPResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
      },
    };
  }
}

// Parse and validate incoming MCP request
export function parseMCPRequest(body: unknown): MCPRequest | null {
  if (!body || typeof body !== "object") return null;
  
  const req = body as Record<string, unknown>;
  
  if (req.jsonrpc !== "2.0") return null;
  if (typeof req.method !== "string") return null;
  if (req.id === undefined) return null;
  
  return {
    jsonrpc: "2.0",
    id: req.id as string | number,
    method: req.method,
    params: req.params as Record<string, unknown> | undefined,
  };
}

