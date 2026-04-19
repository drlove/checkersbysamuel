// app.js — UI, game loop, localStorage persistence, PWA registration

const DEPTH_MAP = {easy: 4, medium: 6, hard: 9};

const state = {
  board: null,
  currentPlayer: HUMAN,
  allMoves: [],
  selectedFrom: null,
  status: 'playing',
  aiDepth: 6,
  isAIThinking: false,
  history: [],          // [{board, player}] for undo
  animating: false,
  redCount: 12,
  blackCount: 12,
};

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderBoard() {
  const boardEl = document.getElementById('board');
  const frag = document.createDocumentFragment();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + (((r+c)&1) ? 'dark' : 'light');
      cell.dataset.r = r;
      cell.dataset.c = c;

      if ((r+c)&1) {
        const p = state.board[r][c];

        // Highlight valid destination squares
        if (state.selectedFrom) {
          const isMoveTarget = state.allMoves.some(m =>
            m.from[0]===state.selectedFrom[0] && m.from[1]===state.selectedFrom[1] &&
            m.to[0]===r && m.to[1]===c
          );
          if (isMoveTarget) cell.classList.add('highlight');
        }

        // Highlight all pieces that can move (if none selected)
        if (!state.selectedFrom && state.currentPlayer === HUMAN && !state.isAIThinking) {
          const canMove = state.allMoves.some(m => m.from[0]===r && m.from[1]===c);
          if (canMove) cell.classList.add('can-move');
        }

        if (p !== E) {
          const piece = document.createElement('div');
          piece.className = 'piece ' + (isRed(p) ? 'red' : 'black');
          if (isKing(p)) piece.classList.add('king');
          if (state.selectedFrom && state.selectedFrom[0]===r && state.selectedFrom[1]===c)
            piece.classList.add('selected');
          cell.appendChild(piece);
        }
      }

      cell.addEventListener('click', () => handleCellClick(r, c));
      frag.appendChild(cell);
    }
  }

  boardEl.innerHTML = '';
  boardEl.appendChild(frag);
}

function updateUI() {
  renderBoard();
  const counts = countPieces(state.board);
  document.getElementById('red-count').textContent = counts.red;
  document.getElementById('black-count').textContent = counts.black;

  const statusEl = document.getElementById('status');
  const undoBtn = document.getElementById('undo-btn');

  if (state.status === 'ai_wins') {
    statusEl.textContent = '★ AI wins!';
    statusEl.className = 'status lose';
  } else if (state.status === 'human_wins') {
    statusEl.textContent = '★ You win!';
    statusEl.className = 'status win';
  } else if (state.isAIThinking) {
    statusEl.textContent = '⟳ AI is thinking…';
    statusEl.className = 'status thinking';
  } else if (state.currentPlayer === HUMAN) {
    const hasJump = state.allMoves.some(m => m.captures.length > 0);
    statusEl.textContent = hasJump ? 'Your turn — jump available!' : 'Your turn';
    statusEl.className = 'status your-turn';
  } else {
    statusEl.textContent = 'AI\'s turn';
    statusEl.className = 'status ai-turn';
  }

  undoBtn.disabled = state.history.length < 2 || state.isAIThinking || state.status !== 'playing';
  saveState();
}

// ─── Move handling ─────────────────────────────────────────────────────────────

function handleCellClick(r, c) {
  if (state.currentPlayer !== HUMAN || state.isAIThinking ||
      state.status !== 'playing' || state.animating) return;

  const p = state.board[r][c];

  if (state.selectedFrom) {
    const [sr, sc] = state.selectedFrom;

    // Check if clicking a valid destination
    const move = state.allMoves.find(m =>
      m.from[0]===sr && m.from[1]===sc && m.to[0]===r && m.to[1]===c
    );

    if (move) {
      executeHumanMove(move);
      return;
    }

    // Reselect another movable piece
    if (pieceOwner(p) === HUMAN) {
      const hasMoves = state.allMoves.some(m => m.from[0]===r && m.from[1]===c);
      if (hasMoves) {
        state.selectedFrom = [r, c];
        updateUI();
        return;
      }
    }

    // Deselect
    state.selectedFrom = null;
    updateUI();
  } else {
    if (pieceOwner(p) === HUMAN) {
      const hasMoves = state.allMoves.some(m => m.from[0]===r && m.from[1]===c);
      if (hasMoves) {
        state.selectedFrom = [r, c];
        updateUI();
      }
    }
  }
}

function executeHumanMove(move) {
  state.history.push({board: state.board, player: state.currentPlayer});
  state.selectedFrom = null;
  state.animating = true;

  animateMove(move, () => {
    state.board = applyMove(state.board, move);
    state.animating = false;
    advanceTurn();
  });
}

function animateMove(move, callback) {
  // Flash captured squares before removing
  const captured = move.captures || [];
  if (captured.length) {
    for (const [cr, cc] of captured) {
      const cell = getCell(cr, cc);
      if (cell) {
        const piece = cell.querySelector('.piece');
        if (piece) piece.classList.add('captured');
      }
    }
  }

  // Animate the moving piece along via path
  const steps = [[...move.from], ...move.via];
  let stepIdx = 0;

  function nextStep() {
    if (stepIdx >= steps.length - 1) {
      setTimeout(callback, 50);
      return;
    }
    stepIdx++;
    setTimeout(nextStep, 160);
  }

  setTimeout(nextStep, captured.length ? 200 : 0);
}

function advanceTurn() {
  state.status = gameStatus(state.board);
  if (state.status !== 'playing') {
    state.allMoves = [];
    updateUI();
    return;
  }

  state.currentPlayer = oppPlayer(state.currentPlayer);
  state.allMoves = getMoves(state.board, state.currentPlayer);
  updateUI();

  if (state.currentPlayer === AI_P) {
    scheduleAIMove();
  }
}

function scheduleAIMove() {
  state.isAIThinking = true;
  updateUI();

  setTimeout(() => {
    const move = getBestMove(state.board, AI_P, state.aiDepth);
    state.isAIThinking = false;

    if (!move) {
      state.status = 'human_wins';
      updateUI();
      return;
    }

    state.history.push({board: state.board, player: state.currentPlayer});
    state.animating = true;

    animateMove(move, () => {
      state.board = applyMove(state.board, move);
      state.animating = false;
      advanceTurn();
    });
  }, 80); // slight delay so UI updates first
}

// ─── Controls ─────────────────────────────────────────────────────────────────

function newGame() {
  state.board = mkBoard();
  state.currentPlayer = HUMAN;
  state.allMoves = getMoves(state.board, HUMAN);
  state.selectedFrom = null;
  state.status = 'playing';
  state.isAIThinking = false;
  state.animating = false;
  state.history = [];
  updateUI();
}

function undoMove() {
  if (state.history.length < 2) return;
  // Undo AI move then human move
  state.history.pop();
  const prev = state.history.pop();
  state.board = prev.board;
  state.currentPlayer = HUMAN;
  state.allMoves = getMoves(state.board, HUMAN);
  state.selectedFrom = null;
  state.status = 'playing';
  state.isAIThinking = false;
  updateUI();
}

// ─── Persistence ───────────────────────────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem('checkers_state', JSON.stringify({
      board: state.board,
      currentPlayer: state.currentPlayer,
      status: state.status,
      aiDepth: state.aiDepth,
      history: state.history.slice(-20) // keep last 20 moves
    }));
  } catch (_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('checkers_state');
    if (!raw) return false;
    const saved = JSON.parse(raw);
    state.board = saved.board;
    state.currentPlayer = saved.currentPlayer;
    state.status = saved.status;
    state.aiDepth = saved.aiDepth || 6;
    state.history = saved.history || [];
    state.allMoves = state.status === 'playing'
      ? getMoves(state.board, state.currentPlayer)
      : [];
    return true;
  } catch (_) {
    return false;
  }
}

// ─── Cell helper ───────────────────────────────────────────────────────────────

function getCell(r, c) {
  return document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

// ─── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const loaded = loadState();
  if (!loaded) newGame();
  else updateUI();

  document.getElementById('new-game-btn').addEventListener('click', () => {
    if (confirm('Start a new game?')) newGame();
  });

  document.getElementById('undo-btn').addEventListener('click', undoMove);

  document.getElementById('difficulty-select').addEventListener('change', e => {
    state.aiDepth = DEPTH_MAP[e.target.value] || 6;
    saveState();
  });

  // Restore difficulty selector
  const depthSelect = document.getElementById('difficulty-select');
  const entry = Object.entries(DEPTH_MAP).find(([,v]) => v === state.aiDepth);
  if (entry) depthSelect.value = entry[0];

  // If it was AI's turn when page was closed, trigger AI
  if (state.status === 'playing' && state.currentPlayer === AI_P) {
    scheduleAIMove();
  }

  // PWA install popup
  let deferredPrompt;
  const installPopup = document.getElementById('install-popup');
  const installBtn = document.getElementById('install-popup-btn');
  const dismissBtn = document.getElementById('install-popup-dismiss');

  function showInstallPopup() {
    installPopup.hidden = false;
    // Trigger transition after paint
    requestAnimationFrame(() => requestAnimationFrame(() => {
      installPopup.style.opacity = '';
    }));
  }

  function hideInstallPopup() {
    installPopup.style.opacity = '0';
    installPopup.style.transform = 'translateX(-50%) translateY(120px)';
    setTimeout(() => { installPopup.hidden = true; installPopup.style.transform = ''; }, 350);
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Short delay so user can orient to the game first
    setTimeout(showInstallPopup, 2500);
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    hideInstallPopup();
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });

  dismissBtn.addEventListener('click', () => {
    hideInstallPopup();
    deferredPrompt = null;
  });

  window.addEventListener('appinstalled', () => hideInstallPopup());

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
