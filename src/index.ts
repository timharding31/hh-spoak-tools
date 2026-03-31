import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";
import { registerPrompt } from "./prompt.js";

const server = new McpServer({
  name: "hh-spoak-tools",
  version: "1.0.0",
});

registerTools(server);
registerPrompt(server);

const transport = new StdioServerTransport();
await server.connect(transport);
