@echo off
rem Emergency repair for the OpenCode MCP servers.
rem Run from C:\PROJECTS\.mcp-servers\ after a machine change, node reinstall,
rem or accidental deletion of node_modules. Blocked frida scripts (REA optional
rem dependency) are expected and harmless.
echo Installing pinned versions from package.json ...
call npm install --no-audit --no-fund
echo.
echo Verifying MCP handshakes ... (expect serverInfo from Playwright and rea)
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}} | node node_modules\@playwright\mcp\cli.js 2>nul | findstr "serverInfo"
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}} | node node_modules\rea-agents\scripts\rea.mjs --mcp 2>nul | findstr "serverInfo"
echo.
echo Done. Run "opencode mcp list" in the TUI directory to confirm all show connected.
