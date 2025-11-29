// MCP Protocol Types
// Based on Model Context Protocol specification

export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

// MCP Standard Methods
export type MCPMethod = 
  | "initialize"
  | "initialized"
  | "tools/list"
  | "tools/call"
  | "resources/list"
  | "resources/read"
  | "prompts/list"
  | "prompts/get";

// Server capabilities
export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
}

export interface MCPServerInfo {
  name: string;
  version: string;
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: MCPServerInfo;
}

