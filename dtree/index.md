---
layout: default
title: d-tree lab
dtree_lab: true
---

<section class="dtree-lab" data-dtree-lab>
  <header class="dtree-intro">
    <p class="dtree-eyebrow">interactive graph workspace</p>
    <h1>d-tree lab</h1>
    <p>Build a rooted d-tree, write a coloring algorithm, and watch it run. Here, <em>d</em> is the number of children of every non-leaf vertex.</p>
  </header>

  <section class="dtree-panel dtree-builder" aria-labelledby="dtree-builder-title">
    <header class="dtree-panel-header">
      <div>
        <p class="dtree-section-number">01</p>
        <h2 id="dtree-builder-title">build a tree</h2>
      </div>
      <p id="dtree-size-preview" class="dtree-panel-note" aria-live="polite">31 vertices</p>
    </header>

    <div class="dtree-builder-body">
      <div class="dtree-control-grid">
        <label class="dtree-field" for="dtree-branching">
          <span>children per vertex <strong>d = <output id="dtree-branching-value" for="dtree-branching">2</output></strong></span>
          <input id="dtree-branching" type="range" min="1" max="5" value="2" step="1">
        </label>

        <label class="dtree-field" for="dtree-depth">
          <span>depth <strong><output id="dtree-depth-value" for="dtree-depth">4</output></strong></span>
          <input id="dtree-depth" type="range" min="1" max="7" value="4" step="1">
        </label>
      </div>

      <button id="dtree-generate" class="dtree-button dtree-button-primary" type="button">generate tree</button>
    </div>
  </section>

  <section class="dtree-panel dtree-visual" aria-labelledby="dtree-visual-title">
    <header class="dtree-panel-header dtree-visual-header">
      <div>
        <p class="dtree-section-number">02</p>
        <h2 id="dtree-visual-title">the tree</h2>
      </div>
      <dl class="dtree-stats" aria-label="Tree statistics">
        <div><dt>vertices</dt><dd id="dtree-vertex-count">31</dd></div>
        <div><dt>edges</dt><dd id="dtree-edge-count">30</dd></div>
        <div><dt>depth</dt><dd id="dtree-depth-count">4</dd></div>
      </dl>
    </header>

    <div class="dtree-legend" aria-label="Available colors">
      <span><i class="dtree-swatch dtree-swatch-r" aria-hidden="true"></i><strong>R</strong> red</span>
      <span><i class="dtree-swatch dtree-swatch-g" aria-hidden="true"></i><strong>G</strong> green</span>
      <span><i class="dtree-swatch dtree-swatch-b" aria-hidden="true"></i><strong>B</strong> blue</span>
      <span><i class="dtree-swatch dtree-swatch-y" aria-hidden="true"></i><strong>Y</strong> yellow</span>
      <span><i class="dtree-swatch dtree-swatch-p" aria-hidden="true"></i><strong>P</strong> purple</span>
    </div>

    <div class="dtree-zoom" aria-label="Tree zoom controls">
      <span>zoom</span>
      <button id="dtree-zoom-out" type="button" aria-label="Zoom out" title="Zoom out">−</button>
      <output id="dtree-zoom-value" aria-live="polite">100%</output>
      <button id="dtree-zoom-in" type="button" aria-label="Zoom in" title="Zoom in">+</button>
      <button id="dtree-zoom-fit" class="dtree-zoom-fit" type="button">fit</button>
    </div>

    <div class="dtree-canvas-wrap" aria-label="Horizontally scrollable d-tree drawing">
      <svg id="dtree-canvas" role="group" aria-labelledby="dtree-svg-title dtree-svg-description" preserveAspectRatio="xMidYMid meet">
        <title id="dtree-svg-title">A rooted d-tree</title>
        <desc id="dtree-svg-description">The vertices can be colored by running code in the algorithm editor.</desc>
        <g id="dtree-edges" aria-hidden="true"></g>
        <g id="dtree-nodes"></g>
      </svg>
    </div>
    <p id="dtree-selection" class="dtree-selection" aria-live="polite">Select a vertex to inspect it.</p>
  </section>

  <section class="dtree-panel dtree-workbench" aria-labelledby="dtree-editor-title">
    <header class="dtree-panel-header">
      <div>
        <p class="dtree-section-number">03</p>
        <h2 id="dtree-editor-title">algorithm editor</h2>
      </div>
      <p class="dtree-panel-note">runs locally in a worker</p>
    </header>

    <div class="dtree-editor-toolbar">
      <label for="dtree-example">example</label>
      <select id="dtree-example">
        <option value="recursion">recursive subtree</option>
        <option value="levels">color by level</option>
        <option value="greedy">greedy coloring</option>
        <option value="leaves">leaves and internal vertices</option>
        <option value="dfs">depth-first rainbow</option>
      </select>
      <button id="dtree-load-example" class="dtree-button" type="button">load example</button>
    </div>

    <div class="dtree-code-layout">
      <div class="dtree-editor-column">
        <label class="dtree-editor-label" for="dtree-editor">JavaScript · define functions, then run them</label>
        <textarea id="dtree-editor" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" data-gramm="false" aria-describedby="dtree-editor-hint">reset();

const palette = [R, B, G, Y, P];

async function colorSubtree(vertex, level = 0) {
  color(palette[level % palette.length], vertex);
  await sleep(45);

  for (const child of children(vertex)) {
    await colorSubtree(child, level + 1);
  }
}

await colorSubtree(ROOT);</textarea>
        <p id="dtree-editor-hint" class="dtree-keyboard-hint">Normal and <code>async</code> functions can call themselves recursively · <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run · <kbd>Tab</kbd> to indent</p>
      </div>

      <aside class="dtree-helper-card" aria-labelledby="dtree-helper-title">
        <h3 id="dtree-helper-title">helper functions</h3>
        <p class="dtree-function-note"><strong>Custom functions and recursion are supported.</strong> Use an <code>async function</code> when it contains <code>await sleep(...)</code>.</p>
        <dl>
          <div><dt><code>color(R, vertex)</code></dt><dd>color one vertex</dd></div>
          <div><dt><code>clear(vertex)</code></dt><dd>clear one vertex</dd></div>
          <div><dt><code>reset()</code></dt><dd>clear all colors</dd></div>
          <div><dt><code>vertices()</code></dt><dd>all vertex IDs</dd></div>
          <div><dt><code>neighbors(v)</code></dt><dd>adjacent vertices</dd></div>
          <div><dt><code>children(v)</code></dt><dd>children of v</dd></div>
          <div><dt><code>parent(v)</code></dt><dd>parent of v</dd></div>
          <div><dt><code>depth(v)</code></dt><dd>level of v</dd></div>
          <div><dt><code>degree(v)</code></dt><dd>degree of v</dd></div>
          <div><dt><code>isLeaf(v)</code></dt><dd>test for a leaf</dd></div>
          <div><dt><code>bfs()</code> / <code>dfs()</code></dt><dd>traversal order</dd></div>
          <div><dt><code>getColor(v)</code></dt><dd>current color token</dd></div>
          <div><dt><code>uncolored()</code></dt><dd>uncolored vertex IDs</dd></div>
          <div><dt><code>sleep(ms)</code></dt><dd>pause the animation</dd></div>
          <div><dt><code>log(value)</code></dt><dd>write to output</dd></div>
        </dl>
        <p>Color tokens: <code>R</code>, <code>G</code>, <code>B</code>, <code>Y</code>, <code>P</code>. The root is <code>ROOT</code> or vertex <code>0</code>.</p>
        <p>Your code runs in a separate worker to keep the page responsive, but it is still JavaScript: only run code you wrote or trust.</p>
      </aside>
    </div>

    <div class="dtree-runbar">
      <button id="dtree-run" class="dtree-button dtree-button-primary" type="button">run algorithm</button>
      <button id="dtree-stop" class="dtree-button" type="button" disabled>stop</button>
      <button id="dtree-clear" class="dtree-button" type="button">clear colors</button>
      <p id="dtree-status" class="dtree-status" data-state="ready" aria-live="polite"><span></span>ready</p>
    </div>

    <div class="dtree-output-wrap">
      <div class="dtree-output-title"><span>output</span><button id="dtree-clear-output" type="button">clear</button></div>
      <pre id="dtree-output" class="dtree-output" aria-live="polite">Ready. Choose an example or write your own algorithm.</pre>
    </div>
  </section>
</section>
