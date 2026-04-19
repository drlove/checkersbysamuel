// ai.js — Arthur Samuel-inspired checkers AI using minimax + alpha-beta pruning
//
// Samuel's 1959 paper described an evaluation function with features like:
// piece advantage, king advantage, center control, advancement, back-row defense,
// mobility (denial of occupancy), and trade incentives when ahead.
// This implementation approximates those ideas with alpha-beta pruning.

function evaluate(board) {
  // Returns score from AI (Black) perspective; positive = good for AI
  let score = 0;
  let aiPieces = 0, humanPieces = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === E) continue;

      const ai = isBlack(p);
      const s = ai ? 1 : -1;
      const king = isKing(p);

      // Material value (Samuel: piece advantage)
      score += s * (king ? 175 : 100);
      ai ? aiPieces++ : humanPieces++;

      if (!king) {
        // Advancement toward promotion (Samuel: advancement feature)
        // Black advances row 0→7, Red advances row 7→0
        const adv = ai ? r : (7 - r);
        score += s * adv * 5;

        // Back-row defense (Samuel: back row bridge)
        // Keeping pieces in back row prevents opponent from gaining kings there
        if (ai && r === 0) score += 15;
        if (!ai && r === 7) score -= 15;
      }

      // Center control (Samuel: center control feature)
      if (r >= 2 && r <= 5 && c >= 2 && c <= 5) score += s * 6;
      if (r >= 3 && r <= 4 && c >= 3 && c <= 4) score += s * 4; // inner center

      // Kings prefer center; edge penalty (Samuel: cramp feature)
      if (king && (c === 0 || c === 7)) score -= s * 8;

      // Triangle / oreo formations (safe positions near own back row)
      if (ai && r <= 1 && king) score += 5;
      if (!ai && r >= 6 && king) score -= 5;
    }
  }

  // Mobility: number of available moves (Samuel: mobility / denial of occupancy)
  const aiMoves = getMoves(board, AI_P).length;
  const humanMoves = getMoves(board, HUMAN).length;
  score += (aiMoves - humanMoves) * 4;

  // Trade incentive: when ahead in pieces, simplify by forcing trades (Samuel)
  const delta = aiPieces - humanPieces;
  if (delta > 0) score += delta * 8;

  return score;
}

function evaluateFor(board, player) {
  const base = evaluate(board);
  return player === AI_P ? base : -base;
}

let nodeCount = 0;

function negamax(board, player, depth, alpha, beta) {
  nodeCount++;
  const moves = getMoves(board, player);
  if (!moves.length) return -9000 - depth; // loss; penalize earlier loss more
  if (depth === 0) return evaluateFor(board, player);

  // Move ordering: captures first, multi-captures before singles (improves pruning)
  moves.sort((a, b) => b.captures.length - a.captures.length);

  let best = -Infinity;
  for (const move of moves) {
    const nb = applyMove(board, move);
    const val = -negamax(nb, oppPlayer(player), depth - 1, -beta, -alpha);
    if (val > best) best = val;
    if (val > alpha) alpha = val;
    if (alpha >= beta) break; // alpha-beta cutoff
  }
  return best;
}

function getBestMove(board, player, depth) {
  const moves = getMoves(board, player);
  if (!moves.length) return null;

  // Move ordering for root: captures first
  moves.sort((a, b) => b.captures.length - a.captures.length);

  nodeCount = 0;
  let bestVal = -Infinity;
  const scored = [];

  for (const move of moves) {
    const nb = applyMove(board, move);
    const val = -negamax(nb, oppPlayer(player), depth - 1, -Infinity, Infinity);
    scored.push({move, val});
    if (val > bestVal) bestVal = val;
  }

  // Among equally-best moves, pick randomly (less predictable play)
  const best = scored.filter(s => s.val >= bestVal - 1);
  const chosen = best[Math.floor(Math.random() * best.length)];
  chosen.move._nodes = nodeCount;
  return chosen.move;
}
