/**
 * app.js — Canvas DrawBoard
 * ─────────────────────────────────────────────────────────────
 * A simple canvas drawing application designed as a test target
 * for WebProfiler. All functions are deliberately named so the
 * JS Self-Profiling API shows readable names without minification.
 *
 * Tools: Pen, Rectangle, Circle, Eraser
 * Features: Undo, Clear, Color picker, Size slider
 * ─────────────────────────────────────────────────────────────
 */

// ── State ────────────────────────────────────────────────────
var canvas  = document.getElementById('canvas');
var ctx     = canvas.getContext('2d');
var status  = document.getElementById('status');

var drawingState = {
  tool:       'pen',
  color:      '#0077cc',
  lineWidth:  4,
  isDrawing:  false,
  startX:     0,
  startY:     0,
  lastX:      0,
  lastY:      0,
  strokes:    [],        // undo history
  snapshot:   null,      // canvas snapshot before shape drawing
};

// ── Canvas Setup ─────────────────────────────────────────────

function resizeCanvas() {
  var container = document.getElementById('canvas-container');
  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width  = container.clientWidth;
  canvas.height = container.clientHeight;
  ctx.putImageData(imageData, 0, 0);
  applyContextDefaults();
}

function applyContextDefaults() {
  ctx.lineCap   = 'round';
  ctx.lineJoin  = 'round';
  ctx.lineWidth = drawingState.lineWidth;
  ctx.strokeStyle = drawingState.color;
  ctx.fillStyle   = drawingState.color;
}

// ── Tool Management ──────────────────────────────────────────

function setTool(toolName) {
  drawingState.tool = toolName;
  document.querySelectorAll('.tool-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });
  var btn = document.getElementById('btn-' + toolName);
  if (btn) btn.classList.add('active');
  updateStatus('tool: ' + toolName);
}

function updateStatus(message) {
  status.textContent = message;
}

// ── Drawing Operations ───────────────────────────────────────

function beginStroke(x, y) {
  drawingState.isDrawing = true;
  drawingState.startX = x;
  drawingState.startY = y;
  drawingState.lastX  = x;
  drawingState.lastY  = y;

  if (drawingState.tool === 'pen' || drawingState.tool === 'eraser') {
    ctx.beginPath();
    ctx.moveTo(x, y);
  } else {
    // Save snapshot for shape preview
    drawingState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

function continueStroke(x, y) {
  if (!drawingState.isDrawing) return;

  if (drawingState.tool === 'pen') {
    renderPenStroke(x, y);
  } else if (drawingState.tool === 'eraser') {
    renderEraserStroke(x, y);
  } else if (drawingState.tool === 'rect') {
    renderRectPreview(x, y);
  } else if (drawingState.tool === 'circle') {
    renderCirclePreview(x, y);
  }

  drawingState.lastX = x;
  drawingState.lastY = y;
}

function endStroke(x, y) {
  if (!drawingState.isDrawing) return;
  drawingState.isDrawing = false;

  if (drawingState.tool === 'rect') {
    renderFinalRect(x, y);
  } else if (drawingState.tool === 'circle') {
    renderFinalCircle(x, y);
  }

  saveStrokeToHistory();
  updateStatus('strokes: ' + drawingState.strokes.length);
}

// ── Render Functions ─────────────────────────────────────────

function renderPenStroke(x, y) {
  ctx.lineWidth   = drawingState.lineWidth;
  ctx.strokeStyle = drawingState.color;
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineTo(x, y);
  ctx.stroke();
}

function renderEraserStroke(x, y) {
  ctx.lineWidth   = drawingState.lineWidth * 4;
  ctx.strokeStyle = '#ffffff';
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

function renderRectPreview(x, y) {
  restoreSnapshot();
  drawRect(
    drawingState.startX,
    drawingState.startY,
    x - drawingState.startX,
    y - drawingState.startY
  );
}

function renderCirclePreview(x, y) {
  restoreSnapshot();
  var radius = calculateRadius(drawingState.startX, drawingState.startY, x, y);
  drawCircle(drawingState.startX, drawingState.startY, radius);
}

function renderFinalRect(x, y) {
  restoreSnapshot();
  drawRect(
    drawingState.startX,
    drawingState.startY,
    x - drawingState.startX,
    y - drawingState.startY
  );
}

function renderFinalCircle(x, y) {
  restoreSnapshot();
  var radius = calculateRadius(drawingState.startX, drawingState.startY, x, y);
  drawCircle(drawingState.startX, drawingState.startY, radius);
}

// ── Primitive Draw Calls ─────────────────────────────────────

function drawRect(x, y, w, h) {
  ctx.lineWidth   = drawingState.lineWidth;
  ctx.strokeStyle = drawingState.color;
  ctx.strokeRect(x, y, w, h);
}

function drawCircle(cx, cy, radius) {
  ctx.lineWidth   = drawingState.lineWidth;
  ctx.strokeStyle = drawingState.color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function restoreSnapshot() {
  if (drawingState.snapshot) {
    ctx.putImageData(drawingState.snapshot, 0, 0);
  }
}

function calculateRadius(x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── History ──────────────────────────────────────────────────

function saveStrokeToHistory() {
  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  drawingState.strokes.push(imageData);
  if (drawingState.strokes.length > 20) {
    drawingState.strokes.shift(); // keep last 20 strokes
  }
}

function undoStroke() {
  if (drawingState.strokes.length === 0) {
    updateStatus('nothing to undo');
    return;
  }
  drawingState.strokes.pop();
  if (drawingState.strokes.length > 0) {
    ctx.putImageData(drawingState.strokes[drawingState.strokes.length - 1], 0, 0);
  } else {
    clearCanvas();
  }
  updateStatus('undone — strokes: ' + drawingState.strokes.length);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawingState.strokes = [];
  updateStatus('canvas cleared');
}

// ── Coordinate Helpers ───────────────────────────────────────

function getPointerX(e) {
  var rect = canvas.getBoundingClientRect();
  return (e.clientX - rect.left) * (canvas.width / rect.width);
}

function getPointerY(e) {
  var rect = canvas.getBoundingClientRect();
  return (e.clientY - rect.top) * (canvas.height / rect.height);
}

// ── Event Listeners ──────────────────────────────────────────

function handlePointerDown(e) {
  e.preventDefault();
  var x = getPointerX(e);
  var y = getPointerY(e);
  beginStroke(x, y);
}

function handlePointerMove(e) {
  e.preventDefault();
  if (!drawingState.isDrawing) return;
  var x = getPointerX(e);
  var y = getPointerY(e);
  continueStroke(x, y);
}

function handlePointerUp(e) {
  e.preventDefault();
  var x = getPointerX(e);
  var y = getPointerY(e);
  endStroke(x, y);
}

canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
canvas.addEventListener('pointerup',   handlePointerUp,   { passive: false });
canvas.addEventListener('pointercancel', handlePointerUp, { passive: false });

// Color and size controls
document.getElementById('color-picker').addEventListener('input', function(e) {
  drawingState.color = e.target.value;
  applyContextDefaults();
});
document.getElementById('size-range').addEventListener('input', function(e) {
  drawingState.lineWidth = parseInt(e.target.value);
  applyContextDefaults();
});

// Resize
window.addEventListener('resize', resizeCanvas);

// ── Init ─────────────────────────────────────────────────────

function initializeApp() {
  resizeCanvas();
  applyContextDefaults();
  updateStatus('ready — pick a tool and draw');
}

initializeApp();
