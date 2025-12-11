// Data structures and constants
const ROWS = 7;
const COLS = 9;
const PLAYER_RED = 'red';
const PLAYER_GREEN = 'green';

// Board cell types for quick lookup
const CELL_TYPES = {
  river: 'river',
  bridge: 'bridge',
  fortressRed: 'fortress-red',
  fortressGreen: 'fortress-green',
  fortressCenter: 'fortress-center',
  normal: 'normal'
};

// Piece symbols for rendering
const PIECE_SYMBOL = {
  tree: 'T',
  elephant: 'V',
  tiger: 'H',
  cat: 'M',
  snake: 'R',
  dog: 'C',
  rat: 'U'
};

// Capture permission per piece type
const CAPTURE_RULES = {
  tree: ['elephant', 'tiger', 'cat', 'snake', 'dog', 'rat'],
  elephant: ['tree', 'elephant', 'tiger', 'dog', 'cat', 'snake'],
  tiger: ['tree', 'tiger', 'dog', 'cat', 'snake', 'rat'],
  cat: ['tree', 'cat', 'snake', 'rat'],
  snake: ['tree', 'cat', 'snake', 'rat'],
  dog: ['tree', 'cat', 'snake', 'rat', 'dog'],
  rat: ['tree', 'rat', 'elephant']
};

// Descriptions for sidebar info
const PIECE_INFO = {
  tree: 'Cây Cổ Thụ: đi 1 ô 8 hướng trong thành trì của mình, không đối mặt trực diện.',
  elephant: 'Voi: đi 1-2 ô thẳng hoặc chéo, không bị chặn giữa, qua sông bằng cầu.',
  tiger: 'Hổ: đi chéo 1-2 ô, không qua sông.',
  cat: 'Mèo: đi 1 ô lên/xuống/trái/phải, chỉ qua sông bằng cầu.',
  snake: 'Rắn: đi 2 ô thẳng, có thể bơi qua sông, không bị chặn giữa.',
  dog: 'Chó: đi 2 ô 8 hướng, đường thẳng có thể bơi qua sông, không chéo qua sông.',
  rat: 'Chuột: đi 1 ô tiến hoặc ngang, không lùi, qua sông bằng cầu, có phong cấp.'
};

let board = [];
let currentPlayer = PLAYER_RED;
let selected = null; // {row, col}
let legalMoves = [];
let canMoveThisTurn = false;
let moveCounterWithoutCapture = 0;
let gameOver = false;

const boardEl = document.getElementById('board');
const currentPlayerEl = document.getElementById('current-player');
const logEl = document.getElementById('log-list');
const messageEl = document.getElementById('message');
const pieceInfoEl = document.getElementById('piece-info');

// Initialize board data with pieces and cell types
function initBoard() {
  board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ piece: null, cellType: CELL_TYPES.normal }))
  );

  // River along column E (index 4) with bridges on rows 0, 3, 6
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c === 4) {
        board[r][c].cellType = CELL_TYPES.river;
        if ([0, 3, 6].includes(r)) {
          board[r][c].cellType = CELL_TYPES.bridge;
        }
      }
      const isRedFortress = r >= 1 && r <= 5 && c >= 0 && c <= 2 && !([1, 5].includes(r) && c <= 2);
      const isGreenFortress = r >= 1 && r <= 5 && c >= 6 && c <= 8 && !([1, 5].includes(r) && c >= 6);

      if (isRedFortress) {
        board[r][c].cellType = CELL_TYPES.fortressRed;
      }
      if (isGreenFortress) {
        board[r][c].cellType = CELL_TYPES.fortressGreen;
      }
      if ((r === 3 && c === 0) || (r === 3 && c === 8)) {
        board[r][c].cellType = CELL_TYPES.fortressCenter;
      }
    }
  }

  placeInitialPieces();
  currentPlayer = PLAYER_RED;
  canMoveThisTurn = false;
  selected = null;
  legalMoves = [];
  moveCounterWithoutCapture = 0;
  gameOver = false;
  renderBoard();
  updateStatus();
  clearLog();
  setMessage('Bấm "Trả lời đúng" để được đi quân.');
}

// Place symmetric starting pieces
function placeInitialPieces() {
  const layout = [
    { type: 'elephant', positions: [ [0,0], [6,0] ] },
    { type: 'tiger', positions: [ [2,0], [5,0] ] },
    { type: 'cat', positions: [ [1,0], [4,0] ] },
    { type: 'snake', positions: [ [1,1], [5,1] ] },
    { type: 'dog', positions: [ [4,1] ] },
    { type: 'rat', positions: [ [0,1], [2,1], [3,1], [6,1] ] },
    { type: 'tree', positions: [ [3,0] ] }
  ];

  layout.forEach(({ type, positions }) => {
    positions.forEach(([r, c]) => {
      board[r][c].piece = { type, color: PLAYER_RED };
      const mirrorRow = r;
      const mirrorCol = COLS - 1 - c;
      board[mirrorRow][mirrorCol].piece = { type, color: PLAYER_GREEN };
    });
  });
}

// Render board grid and pieces
function renderBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      const cellData = board[r][c];
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.dataset.type = cellData.cellType;
      cell.classList.add(cellData.cellType.replace('fortress', 'fortress'));
      if (cellData.cellType === CELL_TYPES.bridge) cell.textContent = 'Cầu';
      if (cellData.cellType === CELL_TYPES.fortressCenter) cell.classList.add('fortress-center');

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = `${String.fromCharCode(65 + c)}${r + 1}`;
      cell.appendChild(label);

      const orderNumber = getCellOrderNumber(r, c);
      if (orderNumber !== null) {
        const order = document.createElement('span');
        order.className = 'order';
        order.textContent = orderNumber;
        cell.appendChild(order);
      }

      if (selected && selected.row === r && selected.col === c) {
        cell.classList.add('selected');
      }
      if (legalMoves.some(m => m.row === r && m.col === c)) {
        cell.classList.add('highlight');
      }

      const piece = cellData.piece;
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece ${piece.color}`;
        pieceEl.textContent = PIECE_SYMBOL[piece.type];
        pieceEl.title = `${pieceName(piece)} ${piece.color === PLAYER_RED ? 'đỏ' : 'xanh'}`;
        cell.appendChild(pieceEl);
      }

      cell.addEventListener('click', () => handleCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }
}

function getCellOrderNumber(row, col) {
  if (col === 4) return null; // River column is unnumbered

  const effectiveColumn = col > 4 ? col - 1 : col; // Skip river column in ordering
  const startNumber = effectiveColumn * ROWS + 1;

  if (effectiveColumn % 2 === 0) {
    return startNumber + row; // top-to-bottom
  }

  return startNumber + (ROWS - 1 - row); // bottom-to-top
}

function pieceName(piece) {
  const map = {
    tree: 'Cây Cổ Thụ',
    elephant: 'Voi',
    tiger: 'Hổ',
    cat: 'Mèo',
    snake: 'Rắn',
    dog: 'Chó',
    rat: 'Chuột'
  };
  return map[piece.type] || '';
}

// Handle click on a cell
function handleCellClick(row, col) {
  if (gameOver) return;
  const clickedPiece = board[row][col].piece;

  if (clickedPiece && clickedPiece.color === currentPlayer) {
    selectPiece(row, col);
    return;
  }

  // Move attempt
  if (selected && canMoveThisTurn) {
    const target = legalMoves.find(m => m.row === row && m.col === col);
    if (target) {
      movePiece(selected, { row, col });
    } else {
      setMessage('Ô đến không hợp lệ cho quân đã chọn.');
    }
  }
}

// Select a piece and show its legal moves
function selectPiece(row, col) {
  selected = { row, col };
  const piece = board[row][col].piece;
  pieceInfoEl.textContent = PIECE_INFO[piece.type];
  legalMoves = getLegalMoves(piece, { row, col });
  renderBoard();
}

// Check cell helpers
const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
const isRiver = (r, c) => board[r][c].cellType === CELL_TYPES.river;
const isBridge = (r, c) => board[r][c].cellType === CELL_TYPES.bridge;
const isFortress = (color, r, c) => {
  if (color === PLAYER_RED) return r >= 1 && r <= 5 && c >= 0 && c <= 2;
  return r >= 1 && r <= 5 && c >= 6 && c <= 8;
};

// Generate legal moves respecting each piece rule
function getLegalMoves(piece, position) {
  const moves = [];
  const directions = {
    orthogonal: [ [1,0], [-1,0], [0,1], [0,-1] ],
    diagonal: [ [1,1], [1,-1], [-1,1], [-1,-1] ]
  };

  const addMoveIfValid = (r, c) => {
    if (!inBounds(r, c)) return;
    if (!canEnterCell(piece, r, c)) return;
    const targetPiece = board[r][c].piece;
    if (targetPiece && targetPiece.color === piece.color) return;
    if (targetPiece && !CAPTURE_RULES[piece.type].includes(targetPiece.type)) return;
    moves.push({ row: r, col: c });
  };

  const { row, col } = position;

  switch (piece.type) {
    case 'tree': {
      [...directions.orthogonal, ...directions.diagonal].forEach(([dr, dc]) => {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc)) return;
        if (!isFortress(piece.color, nr, nc)) return;
        const targetPiece = board[nr][nc].piece;
        if (targetPiece && targetPiece.type === 'tree') return;
        if (targetPiece && !CAPTURE_RULES.tree.includes(targetPiece.type)) return;
        // Check facing rule after hypothetical move
        if (!wouldFaceTrees(position, { row: nr, col: nc })) {
          moves.push({ row: nr, col: nc });
        }
      });
      break;
    }
    case 'elephant': {
      const allDirs = [...directions.orthogonal, ...directions.diagonal];
      [1, 2].forEach(step => {
        allDirs.forEach(([dr, dc]) => {
          const nr = row + dr * step;
          const nc = col + dc * step;
          if (!inBounds(nr, nc)) return;
          if (step === 2 && board[row + dr][col + dc].piece) return;
          // Voi qua sông bằng cầu: nếu đi qua hoặc đứng trên sông thì phải là cầu
          if (!pathRespectRiver({ row, col }, { row: nr, col: nc }, step, dr, dc, true)) return;
          addMoveIfValid(nr, nc);
        });
      });
      break;
    }
    case 'tiger': {
      [1, 2].forEach(step => {
        directions.diagonal.forEach(([dr, dc]) => {
          const nr = row + dr * step;
          const nc = col + dc * step;
          if (!inBounds(nr, nc)) return;
          if (step === 2 && board[row + dr][col + dc].piece) return;
          if (pathCrossRiver({ row, col }, { row: nr, col: nc })) return; // Hổ không qua sông
          addMoveIfValid(nr, nc);
        });
      });
      break;
    }
    case 'cat': {
      directions.orthogonal.forEach(([dr, dc]) => {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc)) return;
        if (isRiver(nr, nc) && !isBridge(nr, nc)) return; // chỉ qua cầu
        addMoveIfValid(nr, nc);
      });
      break;
    }
    case 'snake': {
      directions.orthogonal.forEach(([dr, dc]) => {
        const nr = row + dr * 2;
        const nc = col + dc * 2;
        if (!inBounds(nr, nc)) return;
        if (board[row + dr][col + dc].piece) return;
        addMoveIfValid(nr, nc);
      });
      break;
    }
    case 'dog': {
      [...directions.orthogonal, ...directions.diagonal].forEach(([dr, dc]) => {
        const nr = row + dr * 2;
        const nc = col + dc * 2;
        if (!inBounds(nr, nc)) return;
        if (board[row + dr][col + dc].piece) return;
        // chéo không được bơi sông
        if (dr !== 0 && dc !== 0 && pathCrossRiver({ row, col }, { row: nr, col: nc })) return;
        addMoveIfValid(nr, nc);
      });
      break;
    }
    case 'rat': {
      const forward = piece.color === PLAYER_RED ? 1 : -1;
      const candidates = [ [0, forward], [1,0], [-1,0] ];
      candidates.forEach(([dr, dc]) => {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBounds(nr, nc)) return;
        if (dc === -forward) return; // lùi
        if (isRiver(nr, nc) && !isBridge(nr, nc)) return;
        addMoveIfValid(nr, nc);
      });
      break;
    }
  }

  return moves;
}

// Check whether path crosses river cells (non-bridge)
function pathCrossRiver(start, end) {
  const dr = Math.sign(end.row - start.row);
  const dc = Math.sign(end.col - start.col);
  let r = start.row + dr;
  let c = start.col + dc;
  while (r !== end.row || c !== end.col) {
    if (isRiver(r, c) && !isBridge(r, c)) return true;
    r += dr;
    c += dc;
  }
  return isRiver(end.row, end.col) && !isBridge(end.row, end.col);
}

// Special river rule for elephant: must land or cross on bridge if river encountered
function pathRespectRiver(start, end, steps, dr, dc, onlyBridge) {
  let r = start.row;
  let c = start.col;
  for (let i = 1; i <= steps; i++) {
    r += dr;
    c += dc;
    if (isRiver(r, c) && onlyBridge && !isBridge(r, c)) return false;
  }
  return true;
}

// Cell validation shared by pieces
function canEnterCell(piece, r, c) {
  if (!inBounds(r, c)) return false;
  // Tree restricted to fortress
  if (piece.type === 'tree' && !isFortress(piece.color, r, c)) return false;
  // Tiger cannot stand on river
  if (piece.type === 'tiger' && isRiver(r, c)) return false;
  // Cat cannot on river unless bridge handled earlier
  return true;
}

// Check facing rule if tree would move
function wouldFaceTrees(from, to) {
  const movingPiece = board[from.row][from.col].piece;
  const otherTreePos = findTree(movingPiece.color === PLAYER_RED ? PLAYER_GREEN : PLAYER_RED);
  if (!otherTreePos) return false;

  const hypotheticalBoardPiece = board[to.row][to.col].piece;
  // Temporarily move
  board[to.row][to.col].piece = movingPiece;
  board[from.row][from.col].piece = null;
  const facing = treesFacing();
  board[from.row][from.col].piece = movingPiece;
  board[to.row][to.col].piece = hypotheticalBoardPiece;
  return facing;
}

// Find tree position for given color
function findTree(color) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c].piece;
      if (piece && piece.type === 'tree' && piece.color === color) return { row: r, col: c };
    }
  }
  return null;
}

// Facing rule detection
function treesFacing() {
  const redTree = findTree(PLAYER_RED);
  const greenTree = findTree(PLAYER_GREEN);
  if (!redTree || !greenTree || redTree.row !== greenTree.row) return false;

  const row = redTree.row;
  const start = Math.min(redTree.col, greenTree.col) + 1;
  const end = Math.max(redTree.col, greenTree.col);
  for (let c = start; c < end; c++) {
    if (board[row][c].piece) return false;
  }
  return true;
}

// Move execution with validation
function movePiece(from, to) {
  const piece = board[from.row][from.col].piece;
  const targetPiece = board[to.row][to.col].piece;

  // extra facing rule for tree after move
  if (piece.type === 'tree' && wouldFaceTrees(from, to)) {
    setMessage('Cây Cổ Thụ không được đối mặt trực tiếp.');
    return;
  }

  // Prevent any move that leads to facing rule between trees
  board[from.row][from.col].piece = null;
  board[to.row][to.col].piece = piece;
  const facing = treesFacing();
  // revert if facing true
  if (facing) {
    board[from.row][from.col].piece = piece;
    board[to.row][to.col].piece = targetPiece;
    setMessage('Luật không đối mặt: di chuyển này bị cấm.');
    renderBoard();
    return;
  }

  let captureText = '';
  if (targetPiece) {
    captureText = `, ăn ${pieceName(targetPiece)} ${targetPiece.color === PLAYER_RED ? 'đỏ' : 'xanh'}`;
    moveCounterWithoutCapture = 0;
  } else {
    moveCounterWithoutCapture += 1;
  }

  // Promotion for rat
  if (piece.type === 'rat') {
    const lastCol = piece.color === PLAYER_RED ? COLS - 1 : 0;
    if (to.col === lastCol) {
      const choice = prompt('Phong cấp Chuột thành: voi, hổ, mèo, rắn, chó, chuột (nhập chữ)');
      const map = {
        voi: 'elephant',
        hổ: 'tiger',
        ho: 'tiger',
        mèo: 'cat',
        meo: 'cat',
        rắn: 'snake',
        ran: 'snake',
        chó: 'dog',
        cho: 'dog',
        chuột: 'rat',
        chuot: 'rat'
      };
      const normalized = choice ? choice.toLowerCase().trim() : '';
      const newType = map[normalized] || 'rat';
      piece.type = newType;
    }
  }

  board[from.row][from.col].piece = null;
  board[to.row][to.col].piece = piece;

  logMove(piece, from, to, captureText);
  selected = null;
  legalMoves = [];
  canMoveThisTurn = false;

  if (checkWinCondition()) {
    renderBoard();
    return;
  }
  if (moveCounterWithoutCapture >= 40) {
    setMessage('Ván cờ hòa sau 40 nước không ăn quân.');
    gameOver = true;
    renderBoard();
    return;
  }

  switchPlayer();
  renderBoard();
}

function logMove(piece, from, to, captureText) {
  const item = document.createElement('li');
  const colorLabel = piece.color === PLAYER_RED ? 'Đỏ' : 'Xanh';
  const fromLabel = `${String.fromCharCode(65 + from.col)}${from.row + 1}`;
  const toLabel = `${String.fromCharCode(65 + to.col)}${to.row + 1}`;
  item.textContent = `${colorLabel}: ${pieceName(piece)} từ ${fromLabel} → ${toLabel}${captureText}`;
  logEl.prepend(item);
}

function clearLog() {
  logEl.innerHTML = '';
}

function switchPlayer() {
  currentPlayer = currentPlayer === PLAYER_RED ? PLAYER_GREEN : PLAYER_RED;
  updateStatus();
  setMessage('Bấm "Trả lời đúng" để được đi quân.');
}

function updateStatus() {
  currentPlayerEl.textContent = currentPlayer === PLAYER_RED ? 'Quân Đỏ' : 'Quân Xanh';
  currentPlayerEl.style.color = currentPlayer === PLAYER_RED ? '#c0392b' : '#1e8449';
}

function setMessage(msg) {
  messageEl.textContent = msg;
}

// Button handlers
function setupControls() {
  document.getElementById('answer-correct').addEventListener('click', () => {
    if (gameOver) return;
    canMoveThisTurn = true;
    setMessage('Bạn được phép chọn quân và đi.');
  });

  document.getElementById('answer-wrong').addEventListener('click', () => {
    if (gameOver) return;
    canMoveThisTurn = false;
    selected = null;
    legalMoves = [];
    renderBoard();
    setMessage('Trả lời sai, chuyển lượt đối phương.');
    switchPlayer();
  });

  document.getElementById('reset').addEventListener('click', () => initBoard());
}

// Win conditions
function checkWinCondition() {
  const redTree = findTree(PLAYER_RED);
  const greenTree = findTree(PLAYER_GREEN);
  if (!redTree) {
    announceWinner('Xanh thắng nhờ ăn Cây Cổ Thụ.');
    return true;
  }
  if (!greenTree) {
    announceWinner('Đỏ thắng nhờ ăn Cây Cổ Thụ.');
    return true;
  }

  const redPieces = countPieces(PLAYER_RED);
  const greenPieces = countPieces(PLAYER_GREEN);
  if (greenPieces.total === 0 && redPieces.total > 0 && !treesFacing()) {
    announceWinner('Đỏ thắng vì ăn hết quân đối thủ.');
    return true;
  }
  if (redPieces.total === 0 && greenPieces.total > 0 && !treesFacing()) {
    announceWinner('Xanh thắng vì ăn hết quân đối thủ.');
    return true;
  }
  return false;
}

function countPieces(color) {
  let total = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c].piece;
      if (piece && piece.color === color) total++;
    }
  }
  return { total };
}

function announceWinner(text) {
  gameOver = true;
  setMessage(text);
}

// Attach listeners and start
setupControls();
initBoard();
