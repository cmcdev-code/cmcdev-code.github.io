(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var lab = document.querySelector("[data-dtree-lab]");
    if (!lab) return;

    var svg = document.getElementById("dtree-canvas");
    var canvasWrap = svg && svg.parentElement;
    var edgesLayer = document.getElementById("dtree-edges");
    var nodesLayer = document.getElementById("dtree-nodes");
    var branchingInput = document.getElementById("dtree-branching");
    var branchingValue = document.getElementById("dtree-branching-value");
    var depthInput = document.getElementById("dtree-depth");
    var depthValue = document.getElementById("dtree-depth-value");
    var sizePreview = document.getElementById("dtree-size-preview");
    var generateButton = document.getElementById("dtree-generate");
    var vertexCount = document.getElementById("dtree-vertex-count");
    var edgeCount = document.getElementById("dtree-edge-count");
    var depthCount = document.getElementById("dtree-depth-count");
    var selection = document.getElementById("dtree-selection");
    var exampleSelect = document.getElementById("dtree-example");
    var loadExampleButton = document.getElementById("dtree-load-example");
    var editor = document.getElementById("dtree-editor");
    var runButton = document.getElementById("dtree-run");
    var stopButton = document.getElementById("dtree-stop");
    var clearButton = document.getElementById("dtree-clear");
    var status = document.getElementById("dtree-status");
    var output = document.getElementById("dtree-output");
    var clearOutputButton = document.getElementById("dtree-clear-output");
    var zoomOutButton = document.getElementById("dtree-zoom-out");
    var zoomInButton = document.getElementById("dtree-zoom-in");
    var zoomFitButton = document.getElementById("dtree-zoom-fit");
    var zoomValue = document.getElementById("dtree-zoom-value");

    if (!svg || !edgesLayer || !nodesLayer || !editor || !runButton ||
        !zoomOutButton || !zoomInButton || !zoomFitButton || !zoomValue) return;

    var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    var STORAGE_KEY = "dtreeLabCodeV1";
    var MAX_VERTICES = 160;
    var RUN_LIMIT_MS = 15000;
    var MIN_ZOOM = 0.1;
    var MAX_ZOOM = 2;
    var ZOOM_STEP = 0.1;
    var COLORS = {
      R: "#a96f5c",
      G: "#7d8b6a",
      B: "#718391",
      Y: "#b7944f",
      P: "#88758b",
      DEFAULT: "#efe9dc"
    };
    var COLOR_NAMES = {
      R: "red",
      G: "green",
      B: "blue",
      Y: "yellow",
      P: "purple",
      DEFAULT: "uncolored"
    };
    var EXAMPLES = {
      recursion: [
        "reset();",
        "",
        "const palette = [R, B, G, Y, P];",
        "",
        "async function colorSubtree(vertex, level = 0) {",
        "  color(palette[level % palette.length], vertex);",
        "  await sleep(45);",
        "",
        "  for (const child of children(vertex)) {",
        "    await colorSubtree(child, level + 1);",
        "  }",
        "}",
        "",
        "await colorSubtree(ROOT);",
        "log(\"Recursive traversal complete.\");"
      ].join("\n"),
      levels: [
        "reset();",
        "",
        "const palette = [R, G, B, Y, P];",
        "",
        "for (const vertex of bfs()) {",
        "  color(palette[depth(vertex) % palette.length], vertex);",
        "  await sleep(40);",
        "}"
      ].join("\n"),
      greedy: [
        "reset();",
        "",
        "const palette = [R, G, B, Y, P];",
        "",
        "for (const vertex of bfs()) {",
        "  const used = new Set(neighbors(vertex).map(getColor));",
        "  const available = palette.find((candidate) => !used.has(candidate));",
        "  color(available || P, vertex);",
        "  await sleep(45);",
        "}",
        "",
        "log(\"Greedy coloring complete.\");"
      ].join("\n"),
      leaves: [
        "reset();",
        "",
        "for (const vertex of vertices()) {",
        "  color(isLeaf(vertex) ? G : B, vertex);",
        "  await sleep(30);",
        "}",
        "",
        "log(uncolored().length, \"vertices remain uncolored.\");"
      ].join("\n"),
      dfs: [
        "reset();",
        "",
        "const palette = [R, Y, G, B, P];",
        "let index = 0;",
        "",
        "for (const vertex of dfs()) {",
        "  color(palette[index % palette.length], vertex);",
        "  index += 1;",
        "  await sleep(40);",
        "}"
      ].join("\n")
    };

    var graph = null;
    var graphLayout = null;
    var zoomLevel = 1;
    var nodeElements = [];
    var selectedVertex = null;
    var keyboardVertex = 0;
    var activeWorker = null;
    var activeWorkerUrl = null;
    var runTimer = null;

    function createSvgElement(name, attributes) {
      var element = document.createElementNS(SVG_NAMESPACE, name);
      Object.keys(attributes || {}).forEach(function (key) {
        element.setAttribute(key, attributes[key]);
      });
      return element;
    }

    function emptyElement(element) {
      while (element.firstChild) element.removeChild(element.firstChild);
    }

    function treeSize(d, treeDepth) {
      var total = 1;
      var levelSize = 1;
      for (var level = 1; level <= treeDepth; level += 1) {
        levelSize *= d;
        total += levelSize;
      }
      return total;
    }

    function maximumDepth(d) {
      var candidate = 1;
      while (candidate < 10 && treeSize(d, candidate + 1) <= MAX_VERTICES) {
        candidate += 1;
      }
      return candidate;
    }

    function updateBuilderPreview() {
      var d = Number(branchingInput.value);
      var maxDepth = maximumDepth(d);
      depthInput.max = String(maxDepth);
      if (Number(depthInput.value) > maxDepth) depthInput.value = String(maxDepth);

      branchingValue.value = String(d);
      depthValue.value = depthInput.value;
      var count = treeSize(d, Number(depthInput.value));
      sizePreview.textContent = count + (count === 1 ? " vertex" : " vertices");
    }

    function buildGraph(d, treeDepth) {
      var nodes = [{ id: 0, parent: null, depth: 0, children: [] }];
      var edges = [];
      var frontier = [0];

      for (var level = 1; level <= treeDepth; level += 1) {
        var nextFrontier = [];
        frontier.forEach(function (parentId) {
          for (var childIndex = 0; childIndex < d; childIndex += 1) {
            var id = nodes.length;
            nodes.push({ id: id, parent: parentId, depth: level, children: [] });
            nodes[parentId].children.push(id);
            edges.push([parentId, id]);
            nextFrontier.push(id);
          }
        });
        frontier = nextFrontier;
      }

      return { d: d, depth: treeDepth, nodes: nodes, edges: edges };
    }

    function layoutGraph(currentGraph) {
      var positions = new Array(currentGraph.nodes.length);
      var leaves = currentGraph.nodes.filter(function (node) { return node.children.length === 0; });
      var leafSpacing = currentGraph.nodes.length > 90 ? 40 : 44;
      var horizontalMargin = 52;
      var width = Math.max(680, (leaves.length - 1) * leafSpacing + horizontalMargin * 2);
      var height = Math.max(350, currentGraph.depth * 88 + 84);
      var nextLeaf = 0;

      function assignX(vertexId) {
        var node = currentGraph.nodes[vertexId];
        var x;
        if (node.children.length === 0) {
          x = leaves.length === 1 ? width / 2 : horizontalMargin + nextLeaf * leafSpacing;
          nextLeaf += 1;
        } else {
          var childPositions = node.children.map(assignX);
          x = childPositions.reduce(function (sum, value) { return sum + value; }, 0) / childPositions.length;
        }
        var usableHeight = height - 84;
        var y = currentGraph.depth === 0 ? height / 2 : 42 + (node.depth / currentGraph.depth) * usableHeight;
        positions[vertexId] = { x: x, y: y };
        return x;
      }

      assignX(0);
      return { width: width, height: height, positions: positions };
    }

    function setZoom(nextZoom, preserveCenter) {
      if (!graphLayout) return;
      var previousWidth = canvasWrap ? canvasWrap.scrollWidth : graphLayout.width * zoomLevel;
      var previousCenter = canvasWrap
        ? canvasWrap.scrollLeft + canvasWrap.clientWidth / 2
        : previousWidth / 2;
      var centerRatio = previousWidth > 0 ? previousCenter / previousWidth : 0.5;

      zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      zoomLevel = Math.round(zoomLevel * 100) / 100;
      svg.style.setProperty("--dtree-svg-width", graphLayout.width * zoomLevel + "px");
      svg.style.setProperty("--dtree-svg-height", graphLayout.height * zoomLevel + "px");

      var percentage = Math.round(zoomLevel * 100) + "%";
      zoomValue.value = percentage;
      zoomValue.textContent = percentage;
      zoomOutButton.disabled = zoomLevel <= MIN_ZOOM;
      zoomInButton.disabled = zoomLevel >= MAX_ZOOM;

      if (canvasWrap) {
        window.requestAnimationFrame(function () {
          var targetCenter = preserveCenter
            ? centerRatio * canvasWrap.scrollWidth
            : canvasWrap.scrollWidth / 2;
          canvasWrap.scrollLeft = Math.max(0, targetCenter - canvasWrap.clientWidth / 2);
          canvasWrap.scrollTop = 0;
        });
      }
    }

    function fitTree() {
      if (!graphLayout || !canvasWrap) return;
      var availableWidth = Math.max(1, canvasWrap.clientWidth - 20);
      setZoom(Math.min(1, availableWidth / graphLayout.width), false);
    }

    function vertexDescription(vertexId) {
      var node = graph.nodes[vertexId];
      var colorToken = nodeElements[vertexId] ? nodeElements[vertexId].color : "DEFAULT";
      return "vertex " + vertexId + ", depth " + node.depth + ", degree " +
        (node.children.length + (node.parent === null ? 0 : 1)) + ", " + COLOR_NAMES[colorToken];
    }

    function updateVertexAccessibility(vertexId) {
      if (!nodeElements[vertexId]) return;
      nodeElements[vertexId].group.setAttribute("aria-label", vertexDescription(vertexId));
    }

    function renderGraph() {
      var layout = layoutGraph(graph);
      graphLayout = layout;
      zoomLevel = 1;
      emptyElement(edgesLayer);
      emptyElement(nodesLayer);
      nodeElements = new Array(graph.nodes.length);
      selectedVertex = null;
      keyboardVertex = 0;

      svg.setAttribute("viewBox", "0 0 " + layout.width + " " + layout.height);
      svg.classList.toggle("dtree-labels-hidden", graph.nodes.length > 80);

      graph.edges.forEach(function (edge) {
        var parentPosition = layout.positions[edge[0]];
        var childPosition = layout.positions[edge[1]];
        var middleY = (parentPosition.y + childPosition.y) / 2;
        var path = createSvgElement("path", {
          class: "dtree-edge",
          d: "M " + parentPosition.x + " " + parentPosition.y +
            " C " + parentPosition.x + " " + middleY + ", " +
            childPosition.x + " " + middleY + ", " +
            childPosition.x + " " + childPosition.y
        });
        edgesLayer.appendChild(path);
      });

      graph.nodes.forEach(function (node) {
        var position = layout.positions[node.id];
        var group = createSvgElement("g", {
          class: "dtree-node",
          transform: "translate(" + position.x + " " + position.y + ")",
          tabindex: node.id === 0 ? "0" : "-1",
          role: "button",
          "data-vertex": String(node.id)
        });
        var hitTarget = createSvgElement("circle", {
          class: "dtree-node-hit",
          r: "19",
          cx: "0",
          cy: "0",
          fill: "transparent"
        });
        var circle = createSvgElement("circle", {
          class: "dtree-node-disc",
          r: "13",
          cx: "0",
          cy: "0",
          fill: COLORS.DEFAULT
        });
        var label = createSvgElement("text", {
          x: "0",
          y: "0",
          dy: "0.34em",
          "text-anchor": "middle"
        });
        var title = createSvgElement("title");
        label.textContent = String(node.id);
        title.textContent = "vertex " + node.id;
        group.appendChild(hitTarget);
        group.appendChild(circle);
        group.appendChild(label);
        group.appendChild(title);
        nodesLayer.appendChild(group);
        nodeElements[node.id] = {
          group: group,
          circle: circle,
          color: "DEFAULT",
          x: position.x,
          y: position.y
        };
        updateVertexAccessibility(node.id);
      });

      vertexCount.textContent = String(graph.nodes.length);
      edgeCount.textContent = String(graph.edges.length);
      depthCount.textContent = String(graph.depth);
      selection.textContent = "Select a vertex to inspect it.";
      setZoom(1, false);
    }

    function selectVertex(vertexId) {
      if (!graph || !graph.nodes[vertexId]) return;
      if (selectedVertex !== null && nodeElements[selectedVertex]) {
        nodeElements[selectedVertex].group.classList.remove("is-selected");
      }
      selectedVertex = vertexId;
      if (nodeElements[keyboardVertex] && keyboardVertex !== vertexId) {
        nodeElements[keyboardVertex].group.setAttribute("tabindex", "-1");
      }
      keyboardVertex = vertexId;
      nodeElements[vertexId].group.setAttribute("tabindex", "0");
      nodeElements[vertexId].group.classList.add("is-selected");

      var node = graph.nodes[vertexId];
      var parentText = node.parent === null ? "none (root)" : String(node.parent);
      var childText = node.children.length ? node.children.join(", ") : "none (leaf)";
      selection.textContent = "vertex " + vertexId + " · depth " + node.depth + " · parent " +
        parentText + " · children " + childText + " · color " + COLOR_NAMES[nodeElements[vertexId].color];
    }

    function focusVertex(vertexId) {
      selectVertex(vertexId);
      var element = nodeElements[vertexId];
      try {
        element.group.focus({ preventScroll: true });
      } catch (error) {
        element.group.focus();
      }
      if (canvasWrap) {
        canvasWrap.scrollLeft = Math.max(0, element.x * zoomLevel - canvasWrap.clientWidth / 2);
      }
    }

    function horizontalVertex(vertexId, direction) {
      var level = graph.nodes[vertexId].depth;
      var sameLevel = graph.nodes.filter(function (node) { return node.depth === level; });
      var index = sameLevel.findIndex(function (node) { return node.id === vertexId; });
      var nextIndex = (index + direction + sameLevel.length) % sameLevel.length;
      return sameLevel[nextIndex].id;
    }

    function applyColor(colorToken, vertexId) {
      if (!nodeElements[vertexId] || !COLORS[colorToken]) return;
      var element = nodeElements[vertexId];
      element.color = colorToken;
      element.circle.setAttribute("fill", COLORS[colorToken]);
      element.group.setAttribute("data-color", colorToken);
      updateVertexAccessibility(vertexId);
      if (selectedVertex === vertexId) selectVertex(vertexId);
    }

    function resetColors() {
      nodeElements.forEach(function (element, vertexId) {
        if (!element) return;
        element.color = "DEFAULT";
        element.circle.setAttribute("fill", COLORS.DEFAULT);
        element.group.removeAttribute("data-color");
        updateVertexAccessibility(vertexId);
      });
      if (selectedVertex !== null) selectVertex(selectedVertex);
    }

    function setStatus(state, message) {
      status.setAttribute("data-state", state);
      status.lastChild.nodeValue = message;
    }

    function appendOutput(message) {
      var nextLine = String(message);
      var lines = output.textContent ? output.textContent.split("\n") : [];
      lines.push(nextLine);
      if (lines.length > 80) lines = lines.slice(lines.length - 80);
      output.textContent = lines.join("\n");
      output.scrollTop = output.scrollHeight;
    }

    function setRunning(isRunning) {
      runButton.disabled = isRunning;
      stopButton.disabled = !isRunning;
      generateButton.disabled = isRunning;
      loadExampleButton.disabled = isRunning;
    }

    function releaseWorker() {
      if (runTimer !== null) {
        window.clearTimeout(runTimer);
        runTimer = null;
      }
      if (activeWorker) {
        activeWorker.terminate();
        activeWorker = null;
      }
      if (activeWorkerUrl) {
        URL.revokeObjectURL(activeWorkerUrl);
        activeWorkerUrl = null;
      }
      setRunning(false);
    }

    function stopAlgorithm(message) {
      var wasRunning = Boolean(activeWorker);
      releaseWorker();
      if (wasRunning) {
        setStatus("stopped", message || "stopped");
        appendOutput(message || "Stopped.");
      }
    }

    function graphForWorker() {
      return {
        colors: nodeElements.map(function (element) { return element ? element.color : "DEFAULT"; }),
        nodes: graph.nodes.map(function (node) {
          return {
            id: node.id,
            parent: node.parent,
            depth: node.depth,
            children: node.children.slice()
          };
        })
      };
    }

    function algorithmWorkerMain() {
      "use strict";

      var COLOR_TOKENS = ["R", "G", "B", "Y", "P", "DEFAULT"];

      self.onmessage = async function (event) {
        var source = event.data.source;
        var workerGraph = event.data.graph;
        var nodes = workerGraph.nodes;
        var colors = Array.isArray(workerGraph.colors) && workerGraph.colors.length === nodes.length
          ? workerGraph.colors.slice()
          : new Array(nodes.length).fill("DEFAULT");

        function vertexId(value) {
          var id = Number(value);
          if (!Number.isInteger(id) || id < 0 || id >= nodes.length) {
            throw new RangeError("Unknown vertex: " + value);
          }
          return id;
        }

        function color(token, vertex) {
          var id = vertexId(vertex);
          if (COLOR_TOKENS.indexOf(token) === -1) {
            throw new TypeError("Unknown color token: " + token + ". Use R, G, B, Y, or P.");
          }
          colors[id] = token;
          self.postMessage({ type: "color", vertex: id, color: token });
          return id;
        }

        function clear(vertex) {
          return color("DEFAULT", vertex);
        }

        function reset() {
          colors.fill("DEFAULT");
          self.postMessage({ type: "reset" });
        }

        function vertices() {
          return nodes.map(function (node) { return node.id; });
        }

        function parent(vertex) {
          return nodes[vertexId(vertex)].parent;
        }

        function children(vertex) {
          return nodes[vertexId(vertex)].children.slice();
        }

        function neighbors(vertex) {
          var node = nodes[vertexId(vertex)];
          return (node.parent === null ? [] : [node.parent]).concat(node.children);
        }

        function depth(vertex) {
          return nodes[vertexId(vertex)].depth;
        }

        function degree(vertex) {
          return neighbors(vertex).length;
        }

        function isLeaf(vertex) {
          return nodes[vertexId(vertex)].children.length === 0;
        }

        function getColor(vertex) {
          return colors[vertexId(vertex)];
        }

        function uncolored() {
          return vertices().filter(function (vertex) { return colors[vertex] === "DEFAULT"; });
        }

        function bfs(start) {
          var first = start === undefined ? 0 : vertexId(start);
          var order = [];
          var queue = [first];
          var seen = new Set(queue);
          for (var index = 0; index < queue.length; index += 1) {
            var current = queue[index];
            order.push(current);
            neighbors(current).forEach(function (next) {
              if (!seen.has(next)) {
                seen.add(next);
                queue.push(next);
              }
            });
          }
          return order;
        }

        function dfs(start) {
          var first = start === undefined ? 0 : vertexId(start);
          var order = [];
          var stack = [first];
          var seen = new Set();
          while (stack.length) {
            var current = stack.pop();
            if (seen.has(current)) continue;
            seen.add(current);
            order.push(current);
            var adjacent = neighbors(current);
            for (var index = adjacent.length - 1; index >= 0; index -= 1) {
              if (!seen.has(adjacent[index])) stack.push(adjacent[index]);
            }
          }
          return order;
        }

        function sleep(milliseconds) {
          var duration = Math.min(2000, Math.max(0, Number(milliseconds) || 0));
          return new Promise(function (resolve) { setTimeout(resolve, duration); });
        }

        function printable(value) {
          if (typeof value === "string") return value;
          try {
            var serialized = JSON.stringify(value);
            return serialized === undefined ? String(value) : serialized;
          } catch (error) {
            return String(value);
          }
        }

        function log() {
          var message = Array.prototype.map.call(arguments, printable).join(" ");
          self.postMessage({ type: "log", message: message });
        }

        try {
          var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          var algorithm = new AsyncFunction(
            "color", "clear", "reset", "vertices", "neighbors", "children", "parent",
            "depth", "degree", "isLeaf", "getColor", "uncolored", "bfs", "dfs", "sleep", "log",
            "R", "G", "B", "Y", "P", "DEFAULT", "ROOT",
            "\"use strict\";\n" + source + "\n//# sourceURL=dtree-user-algorithm.js"
          );

          await algorithm(
            color, clear, reset, vertices, neighbors, children, parent,
            depth, degree, isLeaf, getColor, uncolored, bfs, dfs, sleep, log,
            "R", "G", "B", "Y", "P", "DEFAULT", 0
          );
          self.postMessage({ type: "done" });
        } catch (error) {
          self.postMessage({
            type: "error",
            message: error && error.message ? error.message : String(error)
          });
        }
      };
    }

    function runAlgorithm() {
      if (!graph) return;
      stopAlgorithm();
      output.textContent = "";
      appendOutput("Running algorithm…");
      setStatus("running", "running");
      setRunning(true);
      saveEditor();

      try {
        var workerSource = "(" + algorithmWorkerMain.toString() + ")();";
        var blob = new Blob([workerSource], { type: "text/javascript" });
        activeWorkerUrl = URL.createObjectURL(blob);
        var worker = new Worker(activeWorkerUrl);
        activeWorker = worker;

        worker.onmessage = function (event) {
          if (activeWorker !== worker) return;
          var message = event.data || {};
          if (message.type === "color") {
            applyColor(message.color, message.vertex);
          } else if (message.type === "reset") {
            resetColors();
          } else if (message.type === "log") {
            appendOutput(message.message);
          } else if (message.type === "done") {
            releaseWorker();
            setStatus("complete", "complete");
            appendOutput("Finished.");
          } else if (message.type === "error") {
            releaseWorker();
            setStatus("error", "error");
            appendOutput("Error: " + message.message);
          }
        };

        worker.onerror = function (event) {
          if (activeWorker !== worker) return;
          var errorMessage = event.message || "The algorithm could not run.";
          releaseWorker();
          setStatus("error", "error");
          appendOutput("Error: " + errorMessage);
        };

        worker.postMessage({ source: editor.value, graph: graphForWorker() });
        runTimer = window.setTimeout(function () {
          if (activeWorker !== worker) return;
          releaseWorker();
          setStatus("error", "time limit reached");
          appendOutput("Stopped after 15 seconds. Check for an infinite loop or shorten the animation.");
        }, RUN_LIMIT_MS);
      } catch (error) {
        releaseWorker();
        setStatus("error", "not supported");
        appendOutput("This browser could not start the algorithm worker: " + error.message);
      }
    }

    function generateGraph() {
      stopAlgorithm();
      graph = buildGraph(Number(branchingInput.value), Number(depthInput.value));
      renderGraph();
      setStatus("ready", "ready");
      output.textContent = "Generated a " + graph.d + "-tree with " + graph.nodes.length + " vertices.";
    }

    function saveEditor() {
      try { localStorage.setItem(STORAGE_KEY, editor.value); } catch (error) {}
    }

    function loadSavedEditor() {
      try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) editor.value = saved;
      } catch (error) {}
    }

    branchingInput.addEventListener("input", updateBuilderPreview);
    depthInput.addEventListener("input", updateBuilderPreview);
    generateButton.addEventListener("click", generateGraph);
    zoomOutButton.addEventListener("click", function () { setZoom(zoomLevel - ZOOM_STEP, true); });
    zoomInButton.addEventListener("click", function () { setZoom(zoomLevel + ZOOM_STEP, true); });
    zoomFitButton.addEventListener("click", fitTree);
    runButton.addEventListener("click", runAlgorithm);
    stopButton.addEventListener("click", function () { stopAlgorithm("Stopped by user."); });
    clearButton.addEventListener("click", function () {
      stopAlgorithm();
      resetColors();
      setStatus("ready", "ready");
      appendOutput("Colors cleared.");
    });
    clearOutputButton.addEventListener("click", function () { output.textContent = ""; });
    loadExampleButton.addEventListener("click", function () {
      editor.value = EXAMPLES[exampleSelect.value];
      saveEditor();
      editor.focus();
      setStatus("ready", "example loaded");
    });
    editor.addEventListener("input", saveEditor);
    editor.addEventListener("keydown", function (event) {
      if (event.key === "Tab") {
        event.preventDefault();
        var start = editor.selectionStart;
        var end = editor.selectionEnd;
        editor.setRangeText("  ", start, end, "end");
        saveEditor();
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        runAlgorithm();
      }
    });
    nodesLayer.addEventListener("click", function (event) {
      var target = event.target.closest && event.target.closest(".dtree-node");
      if (target) selectVertex(Number(target.getAttribute("data-vertex")));
    });
    nodesLayer.addEventListener("keydown", function (event) {
      var target = event.target.closest && event.target.closest(".dtree-node");
      if (!target) return;
      var vertexId = Number(target.getAttribute("data-vertex"));
      var node = graph.nodes[vertexId];
      var nextVertex = null;

      if (event.key === "Enter" || event.key === " ") {
        nextVertex = vertexId;
      } else if (event.key === "ArrowUp" && node.parent !== null) {
        nextVertex = node.parent;
      } else if (event.key === "ArrowDown" && node.children.length) {
        nextVertex = node.children[0];
      } else if (event.key === "ArrowLeft") {
        nextVertex = horizontalVertex(vertexId, -1);
      } else if (event.key === "ArrowRight") {
        nextVertex = horizontalVertex(vertexId, 1);
      } else if (event.key === "Home") {
        nextVertex = 0;
      } else if (event.key === "End") {
        nextVertex = graph.nodes.length - 1;
      }

      if (nextVertex !== null) {
        event.preventDefault();
        focusVertex(nextVertex);
      }
    });
    window.addEventListener("pagehide", function () {
      saveEditor();
      releaseWorker();
    });

    loadSavedEditor();
    updateBuilderPreview();
    generateGraph();
  });
})();
