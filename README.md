# Samuel's Checkers

A local-first Progressive Web App (PWA) recreation of Arthur Samuel's classic checker-playing program — the first AI to learn from experience (1959).

## Running the Game

You need a local web server to run the PWA (required for the service worker).

**Python (built-in):**
```bash
cd checkerbysamuel
python3 -m http.server 8765
```

Then open **http://localhost:8765** in your browser.

**Node.js:**
```bash
npx serve .
```

**VS Code:** Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html`, and choose *Open with Live Server*.

## Installing as a PWA (Optional)

Once the game is open in your browser:

- **Chrome/Edge:** Click the install icon (⊕) in the address bar, or use the **Install App** button in the game panel.
- **Safari (iOS):** Tap Share → *Add to Home Screen*.
- **Firefox:** Look for the install icon in the address bar.

After installing, the game runs as a standalone app and works completely offline.

## How to Play

You play as **Red** (bottom). The AI plays as **Black** (top).

### Moving Pieces

1. Click a red piece to select it — valid destination squares will highlight in gold.
2. Click a highlighted square to move there.
3. To reselect, click a different red piece.

### Rules (American Checkers)

- Pieces move **diagonally forward** one square at a time.
- **Jumps are mandatory** — if you can capture an opponent's piece, you must.
- **Chain jumps** — if after a jump you can jump again, the move continues automatically along the full sequence.
- A piece reaching the **opposite back row** becomes a **King** (shown with ♛) and can move diagonally in any direction.
- A piece crowned during a chain jump **stops there** and cannot continue jumping as a King that turn.
- You **win** by capturing all of the AI's pieces or leaving it with no legal moves.

### Controls

| Control | Action |
|---|---|
| Click piece | Select it |
| Click gold square | Move selected piece |
| **New Game** | Start over (confirms first) |
| **Undo** | Take back your last move and the AI's response |
| **AI Level** | Easy / Medium / Hard |

## AI Difficulty

| Level | Search Depth | Style |
|---|---|---|
| Easy | 4 plies | Makes occasional blunders |
| Medium | 6 plies | Solid play, good for most players |
| Hard | 9 plies | Strong — plans several moves ahead |

## About the AI

The AI is inspired by Arthur Samuel's 1959 paper *"Some Studies in Machine Learning Using the Game of Checkers"* — one of the landmark papers in AI history. Samuel's program was the first to demonstrate machine learning by improving through self-play.

This implementation uses:

- **Minimax search with alpha-beta pruning** — same tree-search framework Samuel described
- **Samuel-inspired evaluation features:**
  - Piece and king advantage
  - Advancement (pieces closer to promotion score higher)
  - Back-row defense (keeping pieces in the back row blocks opponent kings)
  - Center control
  - Mobility / denial of occupancy
  - Trade incentive when ahead in material
- **Move ordering** — captures evaluated first, improving pruning efficiency
- **Randomness among equal moves** — makes the AI less predictable

## Project Structure

```
checkerbysamuel/
├── index.html          # Main page
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline caching)
├── css/
│   └── style.css       # Styling
├── js/
│   ├── engine.js       # Board logic, move generation, game rules
│   ├── ai.js           # Minimax AI with Samuel-inspired evaluation
│   └── app.js          # UI, game loop, localStorage persistence
└── icons/
    └── icon.svg        # App icon
```

## Browser Support

Works in any modern browser (Chrome, Firefox, Safari, Edge). PWA install requires Chrome, Edge, or Safari 16.4+.
