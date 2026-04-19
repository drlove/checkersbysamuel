// engine.js — Board logic and move generation for Samuel's Checkers

const E = 0, R = 1, RK = 2, B = 3, BK = 4; // empty, red, red king, black, black king
const HUMAN = 0, AI_P = 1;

function isRed(p) { return p === R || p === RK; }
function isBlack(p) { return p === B || p === BK; }
function isKing(p) { return p === RK || p === BK; }
function pieceOwner(p) { return isRed(p) ? HUMAN : isBlack(p) ? AI_P : -1; }
function oppPlayer(pl) { return pl ^ 1; }

function moveDirs(p) {
  if (p === R) return [[-1,-1],[-1,1]];
  if (p === B) return [[1,-1],[1,1]];
  return [[-1,-1],[-1,1],[1,-1],[1,1]];
}

function tryPromote(p, r) {
  return (p === R && r === 0) ? RK : (p === B && r === 7) ? BK : p;
}

function mkBoard() {
  return Array.from({length:8}, (_,r) =>
    Array.from({length:8}, (_,c) => {
      if (!((r+c)&1)) return E;
      if (r < 3) return B;
      if (r > 4) return R;
      return E;
    })
  );
}

function cloneBoard(b) { return b.map(row => [...row]); }

function applyMove(board, move) {
  const b = cloneBoard(board);
  const [fr, fc] = move.from, [tr, tc] = move.to;
  b[tr][tc] = tryPromote(b[fr][fc], tr);
  b[fr][fc] = E;
  for (const [cr, cc] of (move.captures || [])) b[cr][cc] = E;
  return b;
}

// Generate all legal moves for a player.
// Each move: { from:[r,c], to:[r,c], captures:[[r,c],...], via:[[r,c],...] }
// via = all squares visited after start (including final), for animation
function getMoves(board, player) {
  const jumps = [], steps = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!((r+c)&1)) continue;
      const p = board[r][c];
      if (pieceOwner(p) !== player) continue;

      const pieceJumps = [];

      // DFS over jump sequences; simulates board to handle captures
      (function dfs(b, row, col, piece, caps, via) {
        let foundJump = false;
        for (const [dr, dc] of moveDirs(piece)) {
          const mr = row+dr, mc = col+dc, tr = row+2*dr, tc = col+2*dc;
          if (tr<0||tr>7||tc<0||tc>7) continue;
          if (pieceOwner(b[mr][mc]) !== oppPlayer(player)) continue;
          if (b[tr][tc] !== E) continue;

          foundJump = true;
          const nb = cloneBoard(b);
          nb[row][col] = E;
          nb[mr][mc] = E;
          const promoted = tryPromote(piece, tr);
          nb[tr][tc] = promoted;

          const newCaps = [...caps, [mr, mc]];
          const newVia = [...via, [tr, tc]];

          if (promoted !== piece) {
            // Crowned mid-jump — must stop (American rules)
            pieceJumps.push({from:[r,c], to:[tr,tc], captures:newCaps, via:newVia});
          } else {
            dfs(nb, tr, tc, piece, newCaps, newVia);
          }
        }
        if (!foundJump && caps.length > 0) {
          pieceJumps.push({from:[r,c], to:[row,col], captures:caps, via});
        }
      })(board, r, c, p, [], []);

      jumps.push(...pieceJumps);

      // Only generate steps if no jumps for this piece
      if (pieceJumps.length === 0) {
        for (const [dr, dc] of moveDirs(p)) {
          const tr = r+dr, tc = c+dc;
          if (tr>=0&&tr<8&&tc>=0&&tc<8&&board[tr][tc]===E)
            steps.push({from:[r,c], to:[tr,tc], captures:[], via:[[tr,tc]]});
        }
      }
    }
  }

  // Mandatory jump rule
  return jumps.length ? jumps : steps;
}

function countPieces(board) {
  let red=0, black=0, redK=0, blackK=0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    switch(board[r][c]) {
      case R: red++; break;
      case RK: red++; redK++; break;
      case B: black++; break;
      case BK: black++; blackK++; break;
    }
  }
  return {red, black, redK, blackK};
}

function gameStatus(board) {
  const counts = countPieces(board);
  if (!counts.red || !getMoves(board, HUMAN).length) return 'ai_wins';
  if (!counts.black || !getMoves(board, AI_P).length) return 'human_wins';
  return 'playing';
}
