(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var headshot = document.getElementById("random-headshot");
    var images = window.siteHeadshots || [];
    if (headshot && images.length) {
      var selectedHeadshot = null;
      try { selectedHeadshot = sessionStorage.getItem("siteHeadshot"); } catch (error) {}
      if (!selectedHeadshot || images.indexOf(selectedHeadshot) === -1) {
        selectedHeadshot = images[Math.floor(Math.random() * images.length)];
        try { sessionStorage.setItem("siteHeadshot", selectedHeadshot); } catch (error) {}
      }
      if (headshot.getAttribute("src") !== selectedHeadshot) {
        var headshotLoader = new Image();
        headshotLoader.decoding = "async";
        headshotLoader.onload = function () { headshot.src = selectedHeadshot; };
        headshotLoader.src = selectedHeadshot;
      }
    }

    function copyTextFromCard(card) {
      var text = card && (card.getAttribute("data-copy") || card.getAttribute("data-email"));
      if (!text) return;

      function showCopied() {
        card.classList.add("copied");
        window.setTimeout(function () { card.classList.remove("copied"); }, 900);
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(showCopied).catch(function () {
          window.prompt("Copy email:", text);
        });
      } else {
        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try { document.execCommand("copy"); } catch (error) {}
        document.body.removeChild(textarea);
        showCopied();
      }
    }

    document.addEventListener("click", function (event) {
      var card = event.target.closest && event.target.closest(".link-card.copy");
      if (card) copyTextFromCard(card);
    });

    document.addEventListener("keydown", function (event) {
      var card = event.target.closest && event.target.closest(".link-card.copy");
      if ((event.key === "Enter" || event.key === " ") && card) {
        event.preventDefault();
        copyTextFromCard(card);
      }
    });

    var siteWindow = document.getElementById("container");
    var windowBar = siteWindow && siteWindow.querySelector(".window-bar");
    var closeButton = document.querySelector('[data-window-action="close"]');
    var maximizeButton = document.querySelector('[data-window-action="maximize"]');
    var browserLauncher = document.getElementById("browser-launcher");
    var windowMode = "default";
    var windowStateKey = "siteWindowStateV1";
    var newBrowserWindowKey = "siteNewBrowserWindow";
    var windowState = {
      mode: "default",
      left: null,
      top: null
    };

    function loadWindowState() {
      try {
        if (sessionStorage.getItem(newBrowserWindowKey) === "true") {
          sessionStorage.removeItem(newBrowserWindowKey);
          windowState.mode = "default";
          windowState.left = null;
          windowState.top = null;
          return;
        }
        var storedState = sessionStorage.getItem(windowStateKey);
        if (!storedState) return;
        var parsedState = JSON.parse(storedState);
        if (parsedState && parsedState.mode === "minimized") parsedState.mode = "default";
        if (parsedState && ["default", "closed", "maximized"].indexOf(parsedState.mode) !== -1) {
          windowState.mode = parsedState.mode;
        }
        if (typeof parsedState.left === "number") windowState.left = parsedState.left;
        if (typeof parsedState.top === "number") windowState.top = parsedState.top;
      } catch (error) {}
    }

    function saveWindowState() {
      try { sessionStorage.setItem(windowStateKey, JSON.stringify(windowState)); } catch (error) {}
    }

    function applySavedPosition() {
      if (!siteWindow || windowState.left === null || windowState.top === null) return;
      var rect = siteWindow.getBoundingClientRect();
      var maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
      var maxTop = Math.max(8, window.innerHeight - rect.height - 8);
      var nextLeft = Math.min(Math.max(8, windowState.left), maxLeft);
      var nextTop = Math.min(Math.max(8, windowState.top), maxTop);
      siteWindow.classList.add("is-positioned");
      siteWindow.style.left = nextLeft + "px";
      siteWindow.style.top = nextTop + "px";
      windowState.left = Math.round(nextLeft);
      windowState.top = Math.round(nextTop);
      document.documentElement.setAttribute("data-window-positioned", "true");
      document.documentElement.style.setProperty("--boot-window-left", siteWindow.style.left);
      document.documentElement.style.setProperty("--boot-window-top", siteWindow.style.top);
    }

    function setWindowMode(nextMode, persist) {
      if (!siteWindow) return;
      windowMode = nextMode;
      siteWindow.classList.toggle("is-closed", nextMode === "closed");
      siteWindow.classList.toggle("is-maximized", nextMode === "maximized");
      document.body.classList.toggle("window-is-maximized", nextMode === "maximized");
      document.documentElement.setAttribute("data-window-mode", nextMode);

      if (nextMode === "default") {
        applySavedPosition();
      } else {
        siteWindow.classList.remove("is-positioned");
        siteWindow.style.left = "";
        siteWindow.style.top = "";
        document.documentElement.removeAttribute("data-window-positioned");
      }

      if (maximizeButton) maximizeButton.setAttribute("aria-pressed", nextMode === "maximized" ? "true" : "false");
      if (browserLauncher) {
        var launcherLabel = nextMode === "closed" ? "Reopen browser" : "Open another browser window";
        browserLauncher.setAttribute("aria-label", launcherLabel);
        browserLauncher.setAttribute("title", "Double-click to " + launcherLabel.toLowerCase());
      }

      windowState.mode = nextMode;
      if (persist !== false) saveWindowState();
    }

    loadWindowState();
    setWindowMode(windowState.mode, false);

    if (closeButton) {
      closeButton.addEventListener("click", function () { setWindowMode("closed"); });
    }

    if (maximizeButton) {
      maximizeButton.addEventListener("click", function () {
        setWindowMode(windowMode === "maximized" ? "default" : "maximized");
      });
    }

    function activateBrowserLauncher() {
      if (windowMode === "closed") {
        setWindowMode("default");
        return;
      }
      try { sessionStorage.setItem(newBrowserWindowKey, "true"); } catch (error) {}
      window.open(window.location.href, "_blank", "noopener");
      try { sessionStorage.removeItem(newBrowserWindowKey); } catch (error) {}
    }

    if (browserLauncher) {
      browserLauncher.addEventListener("click", function (event) {
        browserLauncher.classList.add("is-selected");
        if (event.detail === 0 || event.detail >= 2) activateBrowserLauncher();
      });

      document.addEventListener("click", function (event) {
        if (event.target !== browserLauncher && !browserLauncher.contains(event.target)) {
          browserLauncher.classList.remove("is-selected");
        }
      });
    }

    if (windowBar) {
      windowBar.addEventListener("dblclick", function (event) {
        if (event.target.closest && event.target.closest(".window-control")) return;
        setWindowMode(windowMode === "maximized" ? "default" : "maximized");
      });
    }

    var draggingWindow = false;
    var dragOffsetX = 0;
    var dragOffsetY = 0;

    if (windowBar && siteWindow) {
      windowBar.addEventListener("pointerdown", function (event) {
        if (event.button !== 0 || windowMode !== "default") return;
        if (event.target.closest && event.target.closest(".window-control")) return;
        var rect = siteWindow.getBoundingClientRect();
        draggingWindow = true;
        dragOffsetX = event.clientX - rect.left;
        dragOffsetY = event.clientY - rect.top;
        siteWindow.classList.add("is-positioned");
        siteWindow.style.left = rect.left + "px";
        siteWindow.style.top = rect.top + "px";
        document.documentElement.setAttribute("data-window-positioned", "true");
        document.documentElement.style.setProperty("--boot-window-left", rect.left + "px");
        document.documentElement.style.setProperty("--boot-window-top", rect.top + "px");
        windowBar.classList.add("is-dragging");
        windowBar.setPointerCapture(event.pointerId);
      });

      windowBar.addEventListener("pointermove", function (event) {
        if (!draggingWindow) return;
        var rect = siteWindow.getBoundingClientRect();
        var nextLeft = Math.min(Math.max(8, event.clientX - dragOffsetX), Math.max(8, window.innerWidth - rect.width - 8));
        var nextTop = Math.min(Math.max(8, event.clientY - dragOffsetY), Math.max(8, window.innerHeight - rect.height - 8));
        siteWindow.style.left = nextLeft + "px";
        siteWindow.style.top = nextTop + "px";
        document.documentElement.style.setProperty("--boot-window-left", nextLeft + "px");
        document.documentElement.style.setProperty("--boot-window-top", nextTop + "px");
      });

      function stopWindowDrag(event) {
        if (!draggingWindow) return;
        draggingWindow = false;
        windowBar.classList.remove("is-dragging");
        if (windowBar.hasPointerCapture(event.pointerId)) windowBar.releasePointerCapture(event.pointerId);
        var rect = siteWindow.getBoundingClientRect();
        windowState.left = Math.round(rect.left);
        windowState.top = Math.round(rect.top);
        saveWindowState();
      }

      windowBar.addEventListener("pointerup", stopWindowDrag);
      windowBar.addEventListener("pointercancel", stopWindowDrag);
    }

    window.addEventListener("resize", function () {
      if (windowMode === "default") applySavedPosition();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && windowMode === "maximized") {
        setWindowMode("default");
      }
    });

    var canvas = document.getElementById("gol");
    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canvas || reducedMotion) {
      return;
    }

    var context = canvas.getContext("2d", { alpha: false });
    var dpi = window.devicePixelRatio || 1;
    var cellSize = 10;
    var columns = 0;
    var rows = 0;
    var grid = null;
    var nextGrid = null;
    var previousColumn = null;
    var nextColumn = null;
    var previousRow = null;
    var nextRow = null;
    var renderTheme = null;
    var saveKey = "golStateV3";

    function index(x, y) {
      return y * columns + x;
    }

    function themeValues() {
      var styles = getComputedStyle(document.documentElement);
      return {
        alpha: parseFloat(styles.getPropertyValue("--gol-alpha")) || 0.34,
        rgb: (styles.getPropertyValue("--gol-cell") || "82, 75, 62").trim(),
        background: (styles.getPropertyValue("--canvas-bg") || "#b8ad98").trim()
      };
    }

    function serialize(source) {
      var output = new Array(source.length);
      for (var i = 0; i < source.length; i += 1) output[i] = source[i] ? "1" : "0";
      return output.join("");
    }

    function deserialize(value) {
      var output = new Uint8Array(value.length);
      for (var i = 0; i < value.length; i += 1) output[i] = value.charCodeAt(i) === 49 ? 1 : 0;
      return output;
    }

    function saveState() {
      if (!grid) return;
      try {
        localStorage.setItem(saveKey, JSON.stringify({
          columns: columns,
          rows: rows,
          data: serialize(grid)
        }));
      } catch (error) {}
    }

    function loadState() {
      try {
        var raw = localStorage.getItem(saveKey);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    }

    function resizeCanvas() {
      dpi = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpi);
      canvas.height = Math.floor(window.innerHeight * dpi);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      columns = Math.max(1, Math.floor(window.innerWidth / cellSize));
      rows = Math.max(1, Math.floor(window.innerHeight / cellSize));
      previousColumn = new Int32Array(columns);
      nextColumn = new Int32Array(columns);
      previousRow = new Int32Array(rows);
      nextRow = new Int32Array(rows);
      for (var x = 0; x < columns; x += 1) {
        previousColumn[x] = (x + columns - 1) % columns;
        nextColumn[x] = (x + 1) % columns;
      }
      for (var y = 0; y < rows; y += 1) {
        previousRow[y] = (y + rows - 1) % rows;
        nextRow[y] = (y + 1) % rows;
      }
    }

    function mapGrid(source, oldColumns, oldRows, newColumns, newRows) {
      var next = new Uint8Array(newColumns * newRows);
      if (!source || !oldColumns || !oldRows) return next;

      for (var y = 0; y < newRows; y += 1) {
        for (var x = 0; x < newColumns; x += 1) {
          next[y * newColumns + x] = source[(y % oldRows) * oldColumns + (x % oldColumns)];
        }
      }
      return next;
    }

    function seedRandom() {
      grid.fill(0);
      for (var i = 0; i < grid.length; i += 1) {
        if (Math.random() < 0.22) grid[i] = 1;
      }
    }

    function setup() {
      var stored = loadState();
      resizeCanvas();
      grid = new Uint8Array(columns * rows);
      nextGrid = new Uint8Array(columns * rows);
      renderTheme = themeValues();

      if (stored && stored.data && stored.columns > 0 && stored.rows > 0) {
        grid = mapGrid(deserialize(stored.data), stored.columns | 0, stored.rows | 0, columns, rows);
      } else {
        seedRandom();
      }
      saveState();
    }

    function handleResize() {
      var oldGrid = grid;
      var oldColumns = columns;
      var oldRows = rows;
      resizeCanvas();
      grid = mapGrid(oldGrid, oldColumns, oldRows, columns, rows);
      nextGrid = new Uint8Array(grid.length);
      saveState();
      draw();
    }

    function step() {
      for (var y = 0; y < rows; y += 1) {
        var row = y * columns;
        var rowAbove = previousRow[y] * columns;
        var rowBelow = nextRow[y] * columns;
        for (var x = 0; x < columns; x += 1) {
          var left = previousColumn[x];
          var right = nextColumn[x];
          var neighbors =
            grid[rowAbove + left] + grid[rowAbove + x] + grid[rowAbove + right] +
            grid[row + left] + grid[row + right] +
            grid[rowBelow + left] + grid[rowBelow + x] + grid[rowBelow + right];
          var current = row + x;
          nextGrid[current] = grid[current]
            ? (neighbors === 2 || neighbors === 3 ? 1 : 0)
            : (neighbors === 3 ? 1 : 0);
        }
      }
      var oldGrid = grid;
      grid = nextGrid;
      nextGrid = oldGrid;
    }

    function draw() {
      var size = cellSize * dpi;
      var gap = Math.max(1, dpi);

      context.fillStyle = renderTheme.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(" + renderTheme.rgb + "," + renderTheme.alpha + ")";

      for (var y = 0; y < rows; y += 1) {
        for (var x = 0; x < columns; x += 1) {
          if (grid[index(x, y)]) {
            context.fillRect(x * size, y * size, size - gap, size - gap);
          }
        }
      }
    }

    function setCell(x, y) {
      var wrappedX = (x + columns) % columns;
      var wrappedY = (y + rows) % rows;
      grid[index(wrappedX, wrappedY)] = 1;
    }

    function drawLine(x0, y0, x1, y1) {
      var deltaX = Math.abs(x1 - x0);
      var stepX = x0 < x1 ? 1 : -1;
      var deltaY = -Math.abs(y1 - y0);
      var stepY = y0 < y1 ? 1 : -1;
      var error = deltaX + deltaY;

      while (true) {
        setCell(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        var doubledError = 2 * error;
        if (doubledError >= deltaY) {
          error += deltaY;
          x0 += stepX;
        }
        if (doubledError <= deltaX) {
          error += deltaX;
          y0 += stepY;
        }
      }
    }

    var drawing = false;
    var lastX = null;
    var lastY = null;

    canvas.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      lastX = Math.floor(event.clientX / cellSize);
      lastY = Math.floor(event.clientY / cellSize);
      setCell(lastX, lastY);
      draw();
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!drawing) return;
      var nextX = Math.floor(event.clientX / cellSize);
      var nextY = Math.floor(event.clientY / cellSize);
      if (nextX !== lastX || nextY !== lastY) drawLine(lastX, lastY, nextX, nextY);
      lastX = nextX;
      lastY = nextY;
      draw();
    });

    function stopDrawing(event) {
      if (!drawing) return;
      drawing = false;
      lastX = null;
      lastY = null;
      if (event && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      saveState();
    }

    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);

    document.addEventListener("keydown", function (event) {
      var target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key && event.key.toLowerCase() === "k") {
        event.preventDefault();
        grid.fill(0);
        saveState();
        draw();
      }
    });

    var lastFrame = 0;
    var frameInterval = 1000 / 8;
    function loop(timestamp) {
      if (timestamp - lastFrame >= frameInterval) {
        lastFrame = timestamp;
        step();
        draw();
      }
      window.requestAnimationFrame(loop);
    }

    setup();
    draw();
    window.addEventListener("resize", handleResize);
    window.addEventListener("pagehide", saveState);
    window.requestAnimationFrame(loop);
  });
})();
