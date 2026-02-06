import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from "readline";

// Unicode chess pieces
const PIECES: Record<string, string> = {
  "wK": "♔",
  "wQ": "♕",
  "wR": "♖",
  "wB": "♗",
  "wN": "♘",
  "wP": "♙",
  "bK": "♚",
  "bQ": "♛",
  "bR": "♜",
  "bB": "♝",
  "bN": "♞",
  "bP": "♟",
};

type Square = {
  square: string;
  type: string | null;
  color: string | null;
};

type BoardData = {
  board: Square[][];
  fen: string;
  turn: string;
  inCheck: boolean;
  inCheckmate: boolean;
  inStalemate: boolean;
  inDraw: boolean;
  gameOver: boolean;
};

function getPieceSymbol(type: string | null, color: string | null): string {
  if (!type || !color) return "·";
  const key = `${color[0]}${type.toUpperCase()}`;
  return PIECES[key] || "·";
}

function displayBoard(boardData: BoardData) {
  console.log("\n");
  console.log("   a b c d e f g h");
  console.log("  ─────────────────");
  
  const board = boardData.board;
  for (let rank = 0; rank < 8; rank++) {
    const row = board[rank];
    if (!row) continue;
    
    const rankNum = 8 - rank;
    let line = `${rankNum} │`;
    
    for (let file = 0; file < 8; file++) {
      const square = row[file];
      if (!square) continue;
      
      const piece = getPieceSymbol(square.type, square.color);
      line += `${piece} `;
    }
    
    line += `│ ${rankNum}`;
    console.log(line);
  }
  
  console.log("  ─────────────────");
  console.log("   a b c d e f g h");
  console.log();
}

function displayGameStatus(data: BoardData) {
  const turn = data.turn === "w" ? "White" : "Black";
  console.log(`Turn: ${turn}`);
  
  if (data.inCheck) {
    console.log(`⚠️  ${turn} is in CHECK!`);
  }
  
  if (data.inCheckmate) {
    console.log(`🏁 CHECKMATE! ${turn === "White" ? "Black" : "White"} wins!`);
  } else if (data.inStalemate) {
    console.log(`🤝 STALEMATE - Draw!`);
  } else if (data.inDraw) {
    console.log(`🤝 DRAW!`);
  } else if (data.gameOver) {
    console.log(`🏁 Game Over!`);
  }
  
  console.log(`FEN: ${data.fen}`);
  console.log();
}

type MoveData = {
  moves: Array<{
    from: string;
    to: string;
    promotion?: string;
  }>;
  count: number;
};

function displayLegalMoves(moves: MoveData['moves']) {
  if (moves.length === 0) {
    console.log("No legal moves available.");
    return;
  }
  
  console.log(`Legal moves (${moves.length}):`);
  const movesBySquare: Record<string, string[]> = {};
  
  moves.forEach((move) => {
    if (!movesBySquare[move.from]) {
      movesBySquare[move.from] = [];
    }
    movesBySquare[move.from]!.push(move.to);
  });
  
  Object.entries(movesBySquare).forEach(([from, tos]) => {
    console.log(`  ${from}: ${tos.join(", ")}`);
  });
  console.log();
}

async function getInput(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function playChess() {
  console.log("♔ Chess MCP Client - Interactive Game ♔\n");
  console.log("Connecting to server...");

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/main.ts"],
  });

  const client = new Client(
    {
      name: "chess-cli-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log("✓ Connected!\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let gameActive = true;

    while (gameActive) {
      // Display board
      const boardResult = await client.callTool({
        name: "display_board_state",
        arguments: {},
      });

      if (boardResult.structuredContent) {
        const boardData = boardResult.structuredContent as BoardData;
        displayBoard(boardData);
        displayGameStatus(boardData);

        if (boardData.gameOver) {
          gameActive = false;
          break;
        }
      }

      // Get legal moves
      const movesResult = await client.callTool({
        name: "get_moves",
        arguments: {},
      });

      if (movesResult.structuredContent) {
        const movesData = movesResult.structuredContent as MoveData;
        displayLegalMoves(movesData.moves);
      }

      // Get move from user
      const moveInput = await getInput(
        rl,
        "Enter move (UCI format, e.g., 'e2e4') or 'quit' to exit: "
      );

      if (moveInput.toLowerCase() === "quit" || moveInput.toLowerCase() === "q") {
        console.log("\nThanks for playing!");
        break;
      }

      if (moveInput.toLowerCase() === "help" || moveInput.toLowerCase() === "h") {
        console.log("\nCommands:");
        console.log("  <move>  - Make a move in UCI format (e.g., 'e2e4', 'g1f3')");
        console.log("  quit/q  - Exit the game");
        console.log("  help/h  - Show this help\n");
        continue;
      }

      // Make the move
      try {
        const moveResult = await client.callTool({
          name: "make_move",
          arguments: { move: moveInput },
        });

        if (moveResult.structuredContent) {
          const result = moveResult.structuredContent as any;
          if (result.success) {
            console.log(`✓ Move ${result.move} played successfully!\n`);
          } else {
            console.log(`✗ Invalid move: ${result.move}\n`);
          }
        }
      } catch (error) {
        console.log(`✗ Error making move: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      }
    }

    rl.close();
    await client.close();
  } catch (error) {
    console.error("Error:", error);
    await client.close().catch(() => {});
    process.exit(1);
  }
}

playChess().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});