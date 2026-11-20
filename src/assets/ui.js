// Small helpers that wire a tool's form to a render function.
// Recalculates on every input; no submit button needed.
// Load order on every page: mc.js, ksp.js, ui.js, then the page's own script.
(function () {
  "use strict";
  var Calc = window.Calc = window.Calc || {};
  var fmts = {};
  function nf(d) {
    if (!fmts[d]) fmts[d] = new Intl.NumberFormat("en-US", { maximumFractionDigits: d });
    return fmts[d];
  }

  Calc.fmt = {
    // num(1234.567) -> "1,234.57"; num(x, 0) -> whole number
    num: function (x, d) { return isFinite(x) ? nf(d === undefined ? 2 : d).format(x) : "-"; },
    int: function (x) { return isFinite(x) ? nf(0).format(Math.round(x)) : "-"; },
    pct: function (x, d) { return isFinite(x) ? (x * 100).toFixed(d === undefined ? 1 : d) + "%" : "-"; }
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  Calc.esc = esc;

  // rows: [[label, value, isHeadline?], ...]
  Calc.table = function (rows) {
    return '<dl class="rows">' + rows.map(function (r) {
      return '<div class="row' + (r[2] ? " big" : "") + '"><dt>' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
    }).join("") + "</dl>";
  };

  Calc.values = function (form) {
    var v = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") v[el.name] = el.checked;
      else if (el.type === "radio") { if (el.checked) v[el.name] = el.value; }
      else if (el.type === "number") v[el.name] = el.value === "" ? NaN : parseFloat(el.value);
      else v[el.name] = el.value;
    });
    return v;
  };

  Calc.cssVar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  // Draws a block grid on a canvas. colors: rows of CSS colours (or null for empty).
  // opts: { cell (px, default fits the wrapper), major (heavier line every n blocks, from originI/originJ),
  //         originI, originJ, outline: [i, j] block to ring }. Returns the cell size used.
  Calc.drawGrid = function (canvas, colors, opts) {
    opts = opts || {};
    var rows = colors.length, cols = rows ? colors[0].length : 0;
    var wrap = canvas.parentElement;
    var avail = Math.max(120, (wrap ? wrap.clientWidth : 320) - 2);
    var cell = opts.cell || Math.max(4, Math.min(24, Math.floor(avail / Math.max(cols, 1))));
    var dpr = window.devicePixelRatio || 1;
    canvas.width = cols * cell * dpr; canvas.height = rows * cell * dpr;
    canvas.style.width = cols * cell + "px"; canvas.style.height = rows * cell + "px";
    var g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = Calc.cssVar("--card"); g.fillRect(0, 0, cols * cell, rows * cell);
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      if (colors[j][i]) { g.fillStyle = colors[j][i]; g.fillRect(i * cell, j * cell, cell, cell); }
    }
    var line = Calc.cssVar("--line"), muted = Calc.cssVar("--muted");
    var major = opts.major || 0, oi = opts.originI || 0, oj = opts.originJ || 0;
    function drawLines(isMajor) {
      g.beginPath();
      for (var x = 0; x <= cols; x++) {
        var m = major && (x - oi) % major === 0;
        if (m === isMajor && (cell >= 6 || m)) { g.moveTo(x * cell + 0.5, 0); g.lineTo(x * cell + 0.5, rows * cell); }
      }
      for (var y = 0; y <= rows; y++) {
        var n = major && (y - oj) % major === 0;
        if (n === isMajor && (cell >= 6 || n)) { g.moveTo(0, y * cell + 0.5); g.lineTo(cols * cell, y * cell + 0.5); }
      }
      g.strokeStyle = isMajor ? muted : line; g.lineWidth = 1; g.stroke();
    }
    drawLines(false);
    if (major) drawLines(true);
    if (opts.outline) {
      g.strokeStyle = Calc.cssVar("--bad"); g.lineWidth = 2;
      g.strokeRect(opts.outline[0] * cell + 1, opts.outline[1] * cell + 1, cell - 2, cell - 2);
    }
    return cell;
  };

  // render(values, form) returns HTML for the element with id formId + "-out".
  // Returns update() so a page can re-run it after changing the form itself.
  Calc.ui = function (formId, render) {
    var form = document.getElementById(formId);
    var out = document.getElementById(formId + "-out");
    if (!form || !out) return function () {};
    function update() {
      try { out.innerHTML = render(Calc.values(form), form); }
      catch (e) { out.innerHTML = '<p class="note">Check the numbers above.</p>'; if (window.console) console.error(e); }
    }
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", function (e) { e.preventDefault(); update(); });
    update();
    return update;
  };
})();
