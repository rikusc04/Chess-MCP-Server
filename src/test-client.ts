import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testChessServer() {
  console.log("Starting Chess MCP Server test...\n");

  // Create transport - it will spawn the server process automatically
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/main.ts"],
  });

  const client = new Client(
    {
      name: "chess-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    // Connect to server
    await client.connect(transport);
    console.log("✓ Connected to server\n");

    // Test 1: List available tools
    console.log("Test 1: Listing available tools...");
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Test 2: Display initial board state
    console.log("Test 2: Displaying initial board state...");
    const boardResult = await client.callTool({
      name: "display_board_state",
      arguments: {},
    });
    console.log("Board state result:");
    if (boardResult.content && Array.isArray(boardResult.content) && boardResult.content.length > 0) {
      const content = boardResult.content[0];
      if (content && content.type === "text") {
        const data = JSON.parse(content.text);
        console.log(`  FEN: ${data.fen}`);
        console.log(`  Turn: ${data.turn}`);
        console.log(`  Castling: ${data.castling}`);
      }
    }
    if (boardResult.structuredContent) {
      console.log(`  Structured: ${JSON.stringify(boardResult.structuredContent, null, 2)}`);
    }
    console.log();

    // Test 3: Get all legal moves
    console.log("Test 3: Getting all legal moves...");
    const movesResult = await client.callTool({
      name: "get_moves",
      arguments: {},
    });
    if (movesResult.structuredContent) {
      const moves = movesResult.structuredContent as { moves: any[]; count: number };
      console.log(`  Found ${moves.count} legal moves`);
      console.log(`  First 5 moves: ${moves.moves.slice(0, 5).map((m) => `${m.from}${m.to}`).join(", ")}`);
    }
    console.log();

    // Test 4: Get moves for a specific square
    console.log("Test 4: Getting moves for e2...");
    const e2MovesResult = await client.callTool({
      name: "get_moves",
      arguments: { square: "e2" },
    });
    if (e2MovesResult.structuredContent) {
      const moves = e2MovesResult.structuredContent as { moves: any[]; count: number };
      console.log(`  Found ${moves.count} moves for e2`);
      moves.moves.forEach((m) => {
        console.log(`    ${m.from} → ${m.to}`);
      });
    }
    console.log();

    // Test 5: Make a move
    console.log("Test 5: Making move e2e4...");
    const moveResult = await client.callTool({
      name: "make_move",
      arguments: { move: "e2e4" },
    });
    if (moveResult.structuredContent) {
      const result = moveResult.structuredContent as any;
      console.log(`  Success: ${result.success}`);
      console.log(`  Move: ${result.move}`);
      console.log(`  Turn: ${result.turn}`);
      console.log(`  In Check: ${result.inCheck}`);
      console.log(`  Game Over: ${result.gameOver}`);
    }
    console.log();

    // Test 6: Display board after move
    console.log("Test 6: Displaying board after move...");
    const boardAfterResult = await client.callTool({
      name: "display_board_state",
      arguments: {},
    });
    if (boardAfterResult.structuredContent) {
      const data = boardAfterResult.structuredContent as any;
      console.log(`  FEN: ${data.fen}`);
      console.log(`  Turn: ${data.turn}`);
    }
    console.log();

    // Test 7: Make another move (black's turn)
    console.log("Test 7: Making move e7e5...");
    const move2Result = await client.callTool({
      name: "make_move",
      arguments: { move: "e7e5" },
    });
    if (move2Result.structuredContent) {
      const result = move2Result.structuredContent as any;
      console.log(`  Success: ${result.success}`);
      console.log(`  Move: ${result.move}`);
      console.log(`  Turn: ${result.turn}`);
    }
    console.log();

    console.log("✓ All tests completed successfully!");

    // Close connection
    await client.close();
  } catch (error) {
    console.error("✗ Test failed:", error);
    await client.close().catch(() => {});
    process.exit(1);
  }
}

testChessServer().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});