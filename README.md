# Chess MCP Server (In Progress)

This is a Model Context Protocol (MCP) server that provides chess game functionality. You can play chess against this MCP server using MCP-compatible clients like Claude Desktop, Cursor, or VS Code.

## Features

- **Make Moves**: Play chess moves in UCI format (e.g., `e2e4`, `g1f3`)
- **Display Board**: View the current board state with all piece positions
- **Legal Moves**: Gets all legal moves or moves for a specific piece
- **Game Status**: Check for check, checkmate, stalemate, and draw conditions
- **Move History**: Review all moves played in the current game
- **Reset Game**: Start a new game at any time

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/rikusc04/Chess-MCP-Server.git
    ```

2. Cd into the cloned repository
    ```bash
    cd Chess_MCP
    ```

3. Install dependencies:
    ```bash
    npm install
    ```

## Usage
- This MCP Server is currently configured for Cursor and VSCode only

### With Cursor

The `.cursor/mcp.json` file is already configured for Cursor.

### With VS Code

The `.vscode/mcp.json` file is already configured for VS Code with MCP support.

### Standalone Testing

- Run the interactive chess client:
    ```bash
        npx tsx src/play.ts
    ```

- Or run the test suite:
    ```bash
        npx tsx src/test-client.ts
    ```

## Available Tools

- `make_move` - Make a chess move in UCI format
- `display_board_state` - Get complete board state and game status
- `get_moves` - Get legal moves (all or for a specific square)
- `get_move_history` - View all moves played so far
- `reset_game` - Start a new game

## Example
```
User: Let's play chess! Make the move e2e4
Claude: [calls make_move with e2e4]
        ✓ Move played successfully! The pawn moves from e2 to e4.
```

## Requirements
- Node.js >= 18.0.0
- npm or yarn
