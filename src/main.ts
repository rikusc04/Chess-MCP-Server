import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Chess } from "chess.js";
import { z } from "zod";

// Initialize game engine
const game = new Chess();

// Initialize MCP server
const server = new McpServer({
  name: "ChessMaster-MCP",
  version: "1.0.0",
});

// Tool: make_move
server.registerTool(
  "make_move",
  {
    description: "Make a chess move in UCI format (e.g., 'e2e4', 'g1f3', 'e1g1' for castling)",
    inputSchema: z.object({
      move: z.string().describe("Move in UCI format: from square + to square (e.g., 'e2e4'). For promotions, append piece: 'e7e8q'"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      move: z.string(),
      fen: z.string(),
      turn: z.string(),
      inCheck: z.boolean(),
      inCheckmate: z.boolean(),
      inStalemate: z.boolean(),
      inDraw: z.boolean(),
      gameOver: z.boolean(),
    }),
  },
  async (args) => {
    try {
      // Convert UCI to chess.js move format
      const move = game.move({
        from: args.move.substring(0, 2),
        to: args.move.substring(2, 4),
        promotion: args.move.length > 4 ? args.move[4] : undefined,
      });

      if (!move) {
        const result = {
          success: false,
          move: args.move,
          fen: game.fen(),
          turn: game.turn(),
          inCheck: game.inCheck(),
          inCheckmate: game.isCheckmate(),
          inStalemate: game.isStalemate(),
          inDraw: game.isDraw(),
          gameOver: game.isGameOver(),
        };
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
        };
      }

      const result = {
        success: true,
        move: args.move,
        fen: game.fen(),
        turn: game.turn(),
        inCheck: game.inCheck(),
        inCheckmate: game.isCheckmate(),
        inStalemate: game.isStalemate(),
        inDraw: game.isDraw(),
        gameOver: game.isGameOver(),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    } catch (error) {
      const result = {
        success: false,
        move: args.move,
        fen: game.fen(),
        turn: game.turn(),
        inCheck: false,
        inCheckmate: false,
        inStalemate: false,
        inDraw: false,
        gameOver: false,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    }
  }
);

// Tool: display_board_state
server.registerTool(
  "display_board_state",
  {
    description: "Get the current board state (all 64 squares) and full game status. Use this for a complete snapshot: position, turn, castling, and whether the game is in check, checkmate, stalemate, or draw.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      board: z.array(
        z.array(
          z.object({
            square: z.string(),
            type: z.string().nullable(),
            color: z.string().nullable(),
          })
        )
      ),
      fen: z.string(),
      turn: z.string(),
      castling: z.string(),
      enPassant: z.string().nullable(),
      halfmoveClock: z.number(),
      fullmoveNumber: z.number(),
      inCheck: z.boolean(),
      inCheckmate: z.boolean(),
      inStalemate: z.boolean(),
      inDraw: z.boolean(),
      gameOver: z.boolean(),
    }),
  },
  async () => {
    const board = game.board();
    const fen = game.fen();
    const fenParts = fen.split(" ");
    
    const result = {
      board: board.map((row, rank) =>
        row.map((piece, file) => ({
          square: String.fromCharCode(97 + file) + (8 - rank),
          type: piece ? piece.type : null,
          color: piece ? piece.color : null,
        }))
      ),
      fen: fen,
      turn: game.turn(),
      castling: fenParts[2] || "-",
      enPassant: fenParts[3] === "-" ? null : fenParts[3],
      halfmoveClock: parseInt(fenParts[4] || "0", 10),
      fullmoveNumber: parseInt(fenParts[5] || "1", 10),
      inCheck: game.inCheck(),
      inCheckmate: game.isCheckmate(),
      inStalemate: game.isStalemate(),
      inDraw: game.isDraw(),
      gameOver: game.isGameOver(),
    };
    
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

// Tool: reset_game
server.registerTool(
  "reset_game",
  {
    description: "Start a new game from the initial position. Use after checkmate, stalemate, or when starting a new game.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      success: z.boolean(),
      fen: z.string(),
    }),
  },
  async () => {
    game.reset();
    const result = {
      success: true,
      fen: game.fen(),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

// Tool: get_move_history
server.registerTool(
  "get_move_history",
  {
    description: "Get the list of moves played so far in the game. Returns each move in UCI format (from+to) and SAN for Cursor reasoning.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      moves: z.array(
        z.object({
          uci: z.string(),
          san: z.string(),
          color: z.string(),
        })
      ),
      count: z.number(),
    }),
  },
  async () => {
    const history = game.history({ verbose: true });
    const moveObjects = history.map((move) => ({
      uci: (move.from + move.to) + (move.promotion ? move.promotion : ""),
      san: move.san,
      color: move.color,
    }));
    const result = {
      moves: moveObjects,
      count: moveObjects.length,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
);

// Tool: get_moves
server.registerTool(
  "get_moves",
  {
    description: "Get legal moves. If square is provided, returns moves for that square only. Otherwise returns all legal moves.",
    inputSchema: z.object({
      square: z.string().optional().describe("Optional square (e.g., 'e2') to get moves for a specific piece"),
    }),
    outputSchema: z.object({
      moves: z.array(
        z.object({
          from: z.string(),
          to: z.string(),
          promotion: z.string().optional(),
        })
      ),
      count: z.number(),
    }),
  },
  async (args) => {
    try {
      let moves;
      
      if (args.square) {
        // Get moves for specific square
        moves = game.moves({ square: args.square as any, verbose: true });
      } else {
        // Get all legal moves
        moves = game.moves({ verbose: true });
      }

      const moveObjects = moves.map((move) => ({
        from: move.from as string,
        to: move.to as string,
        promotion: move.promotion ? (move.promotion as string) : undefined,
      }));

      const result = {
        moves: moveObjects,
        count: moveObjects.length,
      };
      
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    } catch (error) {
      const result = {
        moves: [],
        count: 0,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    }
  }
);

// Connect to stdio transport and start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Chess MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
