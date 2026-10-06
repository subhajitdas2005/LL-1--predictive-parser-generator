/**
 * Main Application Controller for Universal LL(1) Predictive Parser Generator.
 * Connects UI elements to LL1Engine, GSAP animations, and ParseTreeVisualizer.
 */

import { LL1Engine, EPSILON, END_MARKER } from '../engine/ll1-engine.js';
import { EXAMPLE_GRAMMARS } from '../examples/grammars.js';
import { ParseTreeVisualizer } from './parse-tree-visualizer.js';
import {
  initAnimations,
  animateMetrics,
  animateTabSwitch,
  animateSetCards,
  animateTableCell,
  animateAccordion
} from './animations.js';

// Application State
const state = {
  currentAnalysis: null,
  currentParseResult: null,
  currentStepIndex: 0,
  isPlaying: false,
  playInterval: null,
  playSpeed: 1000,
  activeTab: 'grammar',
  theme: localStorage.getItem('ll1_theme') || 'dark',
  treeVisualizer: null
};

// DOM Element Cache
const dom = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  initTheme();
  initAnimations();
  initExamplesDropdown();
  bindEvents();

  // Initialize Parse Tree Visualizer
  if (dom.treeContainer) {
    state.treeVisualizer = new ParseTreeVisualizer(dom.treeContainer);
  }

  // Load initial default example (Arithmetic Expression grammar)
  loadExample('arithmetic');
});

function cacheDOMElements() {
  dom.themeToggleBtn = document.getElementById('theme-toggle-btn');
  dom.examplesSelect = document.getElementById('examples-select');
  dom.grammarInput = document.getElementById('grammar-input');
  dom.btnGenerate = document.getElementById('btn-generate');
  dom.btnClear = document.getElementById('btn-clear');
  dom.btnFormat = document.getElementById('btn-format');
  dom.quickSymbols = document.querySelectorAll('.sym-chip');

  // Dashboard / Status Bar
  dom.statusPill = document.getElementById('status-pill');
  dom.statusPillText = document.getElementById('status-pill-text');
  dom.statusDesc = document.getElementById('status-desc');
  dom.metricStartSymbol = document.getElementById('metric-start-symbol');
  dom.metricNonTerminals = document.getElementById('metric-non-terminals');
  dom.metricTerminals = document.getElementById('metric-terminals');
  dom.metricProductions = document.getElementById('metric-productions');
  dom.metricNullable = document.getElementById('metric-nullable');
  dom.metricConflicts = document.getElementById('metric-conflicts');
  dom.metricRecursion = document.getElementById('metric-recursion');
  dom.metricsStrip = document.getElementById('metrics-strip');

  // Diagnostics / Banners
  dom.diagnosticsArea = document.getElementById('diagnostics-area');

  // Grammar Tab Discovered Symbols
  dom.startSymbolSelect = document.getElementById('start-symbol-select');
  dom.nonTerminalsList = document.getElementById('non-terminals-list');
  dom.terminalsList = document.getElementById('terminals-list');
  dom.nullableList = document.getElementById('nullable-list');
  dom.productionsList = document.getElementById('productions-list');

  // Tabs
  dom.navTabs = document.querySelectorAll('.nav-tab');
  dom.tabPanes = document.querySelectorAll('.tab-pane');

  // FIRST & FOLLOW
  dom.firstSetsContainer = document.getElementById('first-sets-container');
  dom.followSetsContainer = document.getElementById('follow-sets-container');

  // Parsing Table
  dom.tableContainer = document.getElementById('ll1-table-container');
  dom.conflictsArea = document.getElementById('conflicts-area');
  dom.conflictsList = document.getElementById('conflicts-list');
  dom.btnExportTableCsv = document.getElementById('btn-export-table-csv');
  dom.btnExportTableMd = document.getElementById('btn-export-table-md');

  // Predictive Parser
  dom.parseInputString = document.getElementById('parse-input-string');
  dom.btnParse = document.getElementById('btn-parse');
  dom.sampleInputButtons = document.getElementById('sample-input-buttons');
  dom.stepperPanel = document.getElementById('stepper-panel');
  dom.btnStepBack = document.getElementById('btn-step-back');
  dom.btnPlayPause = document.getElementById('btn-play-pause');
  dom.btnStepForward = document.getElementById('btn-step-forward');
  dom.btnStepReset = document.getElementById('btn-step-reset');
  dom.stepSpeedSelect = document.getElementById('step-speed-select');
  dom.currentStepBadge = document.getElementById('current-step-badge');
  dom.stepActionDesc = document.getElementById('step-action-desc');

  // Live Visualizer
  dom.visualStack = document.getElementById('visual-stack');
  dom.visualTape = document.getElementById('visual-tape');
  dom.traceTableBody = document.getElementById('trace-table-body');
  dom.parseResultAlert = document.getElementById('parse-result-alert');
  dom.btnExportTraceMd = document.getElementById('btn-export-trace-md');

  // Tree Controls
  dom.treeContainer = document.getElementById('parse-tree-container');
  dom.btnTreeZoomIn = document.getElementById('btn-tree-zoom-in');
  dom.btnTreeZoomOut = document.getElementById('btn-tree-zoom-out');
  dom.btnTreeReset = document.getElementById('btn-tree-reset');
}

function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  if (!dom.themeToggleBtn) return;
  if (state.theme === 'light') {
    dom.themeToggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
    dom.themeToggleBtn.title = 'Switch to Dark Mode';
  } else {
    dom.themeToggleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
    dom.themeToggleBtn.title = 'Switch to Light Mode';
  }
}

function initExamplesDropdown() {
  if (!dom.examplesSelect) return;
  dom.examplesSelect.innerHTML = '<option value="">-- Choose Grammar Example --</option>';

  const categories = {};
  for (const ex of EXAMPLE_GRAMMARS) {
    if (!categories[ex.category]) {
      categories[ex.category] = [];
    }
    categories[ex.category].push(ex);
  }

  for (const [catName, list] of Object.entries(categories)) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = catName;
    for (const ex of list) {
      const opt = document.createElement('option');
      opt.value = ex.id;
      opt.textContent = ex.name;
      optgroup.appendChild(opt);
    }
    dom.examplesSelect.appendChild(optgroup);
  }
}

function bindEvents() {
  // Theme Toggle
  dom.themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ll1_theme', state.theme);
    initTheme();
  });

  // Example Selector
  dom.examplesSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      loadExample(e.target.value);
    }
  });

  // Generate Parser Button
  dom.btnGenerate.addEventListener('click', () => {
    analyzeActiveGrammar();
  });

  // Clear Editor
  dom.btnClear.addEventListener('click', () => {
    dom.grammarInput.value = '';
    dom.grammarInput.focus();
  });

  // Format Grammar
  dom.btnFormat.addEventListener('click', () => {
    formatGrammarInput();
  });

  // Quick symbol chip inserts
  dom.quickSymbols.forEach(chip => {
    chip.addEventListener('click', () => {
      const sym = chip.getAttribute('data-insert');
      insertTextAtCursor(dom.grammarInput, ` ${sym} `);
    });
  });

  // Start Symbol Selector Change
  dom.startSymbolSelect.addEventListener('change', (e) => {
    const chosen = e.target.value;
    if (chosen) {
      analyzeActiveGrammar(chosen);
    }
  });

  // Tab Navigation
  dom.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTabId = tab.getAttribute('data-tab');
      switchTab(targetTabId);
    });
  });

  // Predictive Parser Parse Button
  dom.btnParse.addEventListener('click', () => {
    executePredictiveParsing();
  });

  dom.parseInputString.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executePredictiveParsing();
    }
  });

  // Stepper Controls
  dom.btnPlayPause.addEventListener('click', togglePlayback);
  dom.btnStepForward.addEventListener('click', stepForward);
  dom.btnStepBack.addEventListener('click', stepBackward);
  dom.btnStepReset.addEventListener('click', resetStepPlayback);
  dom.stepSpeedSelect.addEventListener('change', (e) => {
    state.playSpeed = parseInt(e.target.value, 10);
    if (state.isPlaying) {
      pausePlayback();
      startPlayback();
    }
  });

  // Tree Visualizer Zoom/Reset
  dom.btnTreeZoomIn.addEventListener('click', () => state.treeVisualizer?.zoomIn());
  dom.btnTreeZoomOut.addEventListener('click', () => state.treeVisualizer?.zoomOut());
  dom.btnTreeReset.addEventListener('click', () => state.treeVisualizer?.resetView());

  // Export Buttons
  dom.btnExportTableCsv.addEventListener('click', exportTableCSV);
  dom.btnExportTableMd.addEventListener('click', exportTableMarkdown);
  dom.btnExportTraceMd.addEventListener('click', exportTraceMarkdown);
}

function insertTextAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  textarea.value = val.substring(0, start) + text + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
}

function formatGrammarInput() {
  const text = dom.grammarInput.value;
  if (!text.trim()) return;

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const formatted = lines.map(line => {
    return line
      .replace(/\s*(->|→|::=|:)\s*/, ' -> ')
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/\s+/g, ' ');
  });

  dom.grammarInput.value = formatted.join('\n');
}

function loadExample(exampleId) {
  const example = EXAMPLE_GRAMMARS.find(ex => ex.id === exampleId);
  if (!example) return;

  dom.grammarInput.value = example.grammar;
  dom.examplesSelect.value = example.id;

  // Set default sample input
  dom.parseInputString.value = example.defaultInput;

  // Render sample input quick button
  renderSampleButtons([example.defaultInput]);

  analyzeActiveGrammar();
}

function renderSampleButtons(samples) {
  dom.sampleInputButtons.innerHTML = '';
  for (const s of samples) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-sm';
    btn.textContent = `Try: "${s}"`;
    btn.addEventListener('click', () => {
      dom.parseInputString.value = s;
      executePredictiveParsing();
    });
    dom.sampleInputButtons.appendChild(btn);
  }
}

/**
 * Main Analysis Orchestration.
 * Calls LL1Engine.analyzeGrammar dynamically for any user grammar.
 */
function analyzeActiveGrammar(customStartSymbol = null) {
  const grammarText = dom.grammarInput.value;

  // Stop any active stepper playback
  pausePlayback();

  const analysis = LL1Engine.analyzeGrammar(grammarText, customStartSymbol);
  state.currentAnalysis = analysis;

  if (!analysis.success) {
    renderAnalysisErrors(analysis.errors);
    return;
  }

  // Render all views
  renderStatusBar(analysis);
  renderDiagnostics(analysis);
  renderGrammarInfo(analysis);
  renderFirstSets(analysis);
  renderFollowSets(analysis);
  renderParsingTable(analysis);

  // Animate metrics
  animateMetrics(dom.metricsStrip.children);

  // If grammar is LL(1) and user had input, auto-parse
  if (analysis.isLL1 && dom.parseInputString.value.trim()) {
    executePredictiveParsing();
  } else {
    state.currentParseResult = null;
    renderTrace(null);
    state.treeVisualizer?.render(null);
  }
}

function renderAnalysisErrors(errors) {
  dom.statusPill.className = 'status-pill status-not-ll1';
  dom.statusPillText.textContent = '✗ Grammar Error';
  dom.statusDesc.textContent = errors.join('; ');

  dom.diagnosticsArea.innerHTML = `
    <div class="alert-box alert-danger">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      <div class="alert-content">
        <div class="alert-title">Grammar Syntax Error</div>
        <div>${errors.map(e => `<div>• ${e}</div>`).join('')}</div>
      </div>
    </div>
  `;
}

function renderStatusBar(analysis) {
  if (analysis.isLL1) {
    dom.statusPill.className = 'status-pill status-ll1';
    dom.statusPillText.textContent = '✓ Grammar is LL(1)';
    dom.statusDesc.textContent = 'Unambiguous & deterministic. Predictive table contains zero conflicts.';
  } else {
    dom.statusPill.className = 'status-pill status-not-ll1';
    dom.statusPillText.textContent = `✗ Grammar is NOT LL(1) (${analysis.conflictsCount} Conflict${analysis.conflictsCount > 1 ? 's' : ''})`;
    dom.statusDesc.textContent = 'Predictive parsing table contains multiple productions in one or more cells.';
  }

  dom.metricStartSymbol.textContent = analysis.grammar.startSymbol;
  dom.metricNonTerminals.textContent = analysis.grammar.nonTerminals.size;
  dom.metricTerminals.textContent = analysis.grammar.terminals.size;
  dom.metricProductions.textContent = analysis.grammar.productions.length;
  dom.metricNullable.textContent = analysis.nullable.length > 0 ? analysis.nullable.join(', ') : 'None';
  dom.metricConflicts.textContent = analysis.conflictsCount;

  // Highlight warnings
  const conflictBadge = dom.metricConflicts.closest('.metric-badge');
  if (analysis.conflictsCount > 0) {
    conflictBadge.classList.add('has-conflict');
  } else {
    conflictBadge.classList.remove('has-conflict');
  }

  const recursionBadge = dom.metricRecursion.closest('.metric-badge');
  if (analysis.leftRecursion.hasLeftRecursion) {
    dom.metricRecursion.textContent = 'Detected';
    recursionBadge.classList.add('has-warning');
  } else {
    dom.metricRecursion.textContent = 'None';
    recursionBadge.classList.remove('has-warning');
  }
}

function renderDiagnostics(analysis) {
  dom.diagnosticsArea.innerHTML = '';

  // 1. Left Recursion Warning & One-Click Elimination
  if (analysis.leftRecursion.hasLeftRecursion) {
    const directNt = analysis.leftRecursion.direct.map(d => d.nonTerminal).join(', ');
    const banner = document.createElement('div');
    banner.className = 'alert-box alert-warning';
    banner.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <div class="alert-content">
        <div class="alert-title">⚠ Left Recursion Detected on Non-Terminal: ${directNt}</div>
        <div>Standard top-down LL(1) predictive parsers cannot handle left-recursive grammars directly as they lead to infinite derivation loops.</div>
        <div style="margin-top: 0.5rem;">
          <button type="button" class="btn btn-warning btn-sm" id="btn-eliminate-lr">
            ⚡ Eliminate Left Recursion Automatically
          </button>
        </div>
      </div>
    `;
    dom.diagnosticsArea.appendChild(banner);

    banner.querySelector('#btn-eliminate-lr').addEventListener('click', () => {
      const transformed = LL1Engine.eliminateLeftRecursion(analysis.grammar);
      if (transformed.modified) {
        dom.grammarInput.value = transformed.transformedGrammarText;
        analyzeActiveGrammar();
      }
    });
  }

  // 2. Left Factoring Warning & One-Click Factoring
  if (analysis.leftFactoring.needsFactoring) {
    const banner = document.createElement('div');
    banner.className = 'alert-box alert-warning';
    const ntList = analysis.leftFactoring.candidates.map(c => `${c.nonTerminal} (prefix: "${c.prefix}")`).join(', ');
    banner.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <div class="alert-content">
        <div class="alert-title">⚠ Grammar Requires Left Factoring: ${ntList}</div>
        <div>Multiple production alternatives share common leading symbols, causing FIRST/FIRST table conflicts.</div>
        <div style="margin-top: 0.5rem;">
          <button type="button" class="btn btn-warning btn-sm" id="btn-left-factor">
            ⚡ Apply Left Factoring Automatically
          </button>
        </div>
      </div>
    `;
    dom.diagnosticsArea.appendChild(banner);

    banner.querySelector('#btn-left-factor').addEventListener('click', () => {
      const transformed = LL1Engine.leftFactor(analysis.grammar);
      if (transformed.modified) {
        dom.grammarInput.value = transformed.transformedGrammarText;
        analyzeActiveGrammar();
      }
    });
  }

  // 3. General Semantic Warnings (unreachable / non-terminating symbols)
  if (analysis.warnings && analysis.warnings.length > 0) {
    const banner = document.createElement('div');
    banner.className = 'alert-box alert-info';
    banner.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <div class="alert-content">
        <div class="alert-title">Grammar Analysis Warnings</div>
        <div>${analysis.warnings.map(w => `<div>• ${w}</div>`).join('')}</div>
      </div>
    `;
    dom.diagnosticsArea.appendChild(banner);
  }
}

function renderGrammarInfo(analysis) {
  // Populate Start Symbol Select Dropdown
  dom.startSymbolSelect.innerHTML = '';
  for (const nt of analysis.grammar.nonTerminals) {
    const opt = document.createElement('option');
    opt.value = nt;
    opt.textContent = nt + (nt === analysis.grammar.startSymbol ? ' (Default Start Symbol)' : '');
    if (nt === analysis.grammar.startSymbol) {
      opt.selected = true;
    }
    dom.startSymbolSelect.appendChild(opt);
  }

  // Non-Terminals List
  dom.nonTerminalsList.innerHTML = '';
  for (const nt of analysis.grammar.nonTerminals) {
    const badge = document.createElement('span');
    badge.className = `badge badge-nt ${nt === analysis.grammar.startSymbol ? 'badge-start' : ''}`;
    badge.textContent = nt + (nt === analysis.grammar.startSymbol ? ' (Start)' : '');
    dom.nonTerminalsList.appendChild(badge);
  }

  // Terminals List
  dom.terminalsList.innerHTML = '';
  for (const term of Array.from(analysis.grammar.terminals).sort()) {
    const badge = document.createElement('span');
    badge.className = 'badge badge-term';
    badge.textContent = term;
    dom.terminalsList.appendChild(badge);
  }

  // Nullable Symbols List
  dom.nullableList.innerHTML = '';
  if (analysis.nullable.length === 0) {
    dom.nullableList.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">None (No symbol derives ε)</span>';
  } else {
    for (const nullNt of analysis.nullable) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-eps';
      badge.textContent = nullNt;
      dom.nullableList.appendChild(badge);
    }
  }

  // Productions Breakdown
  dom.productionsList.innerHTML = '';
  for (const p of analysis.grammar.productions) {
    const item = document.createElement('div');
    item.className = 'derivation-item';
    item.innerHTML = `<strong>(${p.id})</strong> <span>${p.lhs} → ${p.rhs.join(' ')}</span>`;
    dom.productionsList.appendChild(item);
  }
}

function renderFirstSets(analysis) {
  dom.firstSetsContainer.innerHTML = '';

  for (const item of analysis.formattedFirst) {
    const card = document.createElement('div');
    card.className = 'set-card';

    const symbolsHtml = item.symbols.map(s => {
      const cls = s === EPSILON ? 'badge-eps' : 'badge-term';
      return `<span class="badge ${cls}">${s}</span>`;
    }).join(' ');

    const derivationsHtml = item.derivations.map(d => `
      <div class="derivation-item">
        <span class="badge ${d.symbol === EPSILON ? 'badge-eps' : 'badge-term'}">${d.symbol}</span>
        <span>${d.reason}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="set-header">
        <span class="set-nt-badge">FIRST(${item.nonTerminal})</span>
        <button type="button" class="accordion-toggle" data-toggle="derivation">
          <span>Show Derivation (${item.derivations.length})</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      <div class="set-symbols">${symbolsHtml || '<span style="color:var(--text-muted)">Empty</span>'}</div>
      <div class="derivations-list">${derivationsHtml || '<div>No derivations recorded</div>'}</div>
    `;

    // Accordion click
    const toggleBtn = card.querySelector('[data-toggle="derivation"]');
    const derivList = card.querySelector('.derivations-list');
    toggleBtn.addEventListener('click', () => {
      const isExpanded = derivList.classList.toggle('expanded');
      toggleBtn.classList.toggle('expanded', isExpanded);
      toggleBtn.querySelector('span').textContent = isExpanded ? 'Hide Derivation' : `Show Derivation (${item.derivations.length})`;
      animateAccordion(derivList, isExpanded);
    });

    dom.firstSetsContainer.appendChild(card);
  }

  animateSetCards(dom.firstSetsContainer.children);
}

function renderFollowSets(analysis) {
  dom.followSetsContainer.innerHTML = '';

  for (const item of analysis.formattedFollow) {
    const card = document.createElement('div');
    card.className = 'set-card';

    const symbolsHtml = item.symbols.map(s => {
      const cls = s === END_MARKER ? 'badge-start' : 'badge-term';
      return `<span class="badge ${cls}">${s}</span>`;
    }).join(' ');

    const derivationsHtml = item.derivations.map(d => `
      <div class="derivation-item">
        <span class="badge ${d.symbol === END_MARKER ? 'badge-start' : 'badge-term'}">${d.symbol}</span>
        <span>${d.reason}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="set-header">
        <span class="set-nt-badge">FOLLOW(${item.nonTerminal})</span>
        <button type="button" class="accordion-toggle" data-toggle="derivation">
          <span>Show Derivation (${item.derivations.length})</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      <div class="set-symbols">${symbolsHtml || '<span style="color:var(--text-muted)">Empty</span>'}</div>
      <div class="derivations-list">${derivationsHtml || '<div>No derivations recorded</div>'}</div>
    `;

    const toggleBtn = card.querySelector('[data-toggle="derivation"]');
    const derivList = card.querySelector('.derivations-list');
    toggleBtn.addEventListener('click', () => {
      const isExpanded = derivList.classList.toggle('expanded');
      toggleBtn.classList.toggle('expanded', isExpanded);
      toggleBtn.querySelector('span').textContent = isExpanded ? 'Hide Derivation' : `Show Derivation (${item.derivations.length})`;
      animateAccordion(derivList, isExpanded);
    });

    dom.followSetsContainer.appendChild(card);
  }

  animateSetCards(dom.followSetsContainer.children);
}

function renderParsingTable(analysis) {
  const table = analysis.parsingTable;
  dom.tableContainer.innerHTML = '';

  // Render Conflicts Summary if any
  if (table.conflicts.length > 0) {
    dom.conflictsArea.style.display = 'flex';
    dom.conflictsList.innerHTML = '';
    for (const c of table.conflicts) {
      const card = document.createElement('div');
      card.className = 'conflict-item-card';
      card.innerHTML = `
        <div class="conflict-loc">M[${c.nonTerminal}, ${c.terminal}] — ${c.type} CONFLICT</div>
        <div class="conflict-prods">
          ${c.productions.map(p => `<span>${p.toString()}</span>`).join(' <span style="color:var(--danger);font-weight:700">vs</span> ')}
        </div>
      `;
      dom.conflictsList.appendChild(card);
    }
  } else {
    dom.conflictsArea.style.display = 'none';
  }

  // Construct HTML Table
  const tableEl = document.createElement('table');
  tableEl.className = 'll1-table';

  // Header row: Non-Terminals \ Terminals
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const cornerTh = document.createElement('th');
  cornerTh.innerHTML = 'Non-Terminal';
  headerRow.appendChild(cornerTh);

  for (const col of table.columns) {
    const th = document.createElement('th');
    th.className = col === END_MARKER ? 'col-header-end' : 'col-header';
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  tableEl.appendChild(thead);

  // Table Body
  const tbody = document.createElement('tbody');
  for (const row of table.rows) {
    const tr = document.createElement('tr');

    // Row Header
    const rowTh = document.createElement('td');
    rowTh.className = 'row-header';
    rowTh.textContent = row;
    tr.appendChild(rowTh);

    for (const col of table.columns) {
      const td = document.createElement('td');
      td.className = 'table-cell';
      td.setAttribute('data-row', row);
      td.setAttribute('data-col', col);

      const entries = table.getEntry(row, col);

      if (entries.length === 0) {
        td.innerHTML = '<span style="color: var(--text-dim);">—</span>';
      } else if (entries.length === 1) {
        const prod = entries[0];
        td.innerHTML = `<div class="table-cell-content"><span>${prod.toString()}</span></div>`;
      } else {
        // CONFLICT!
        td.classList.add('cell-conflict');
        td.innerHTML = `
          <div class="table-cell-content">
            <span class="conflict-pill">CONFLICT (${entries.length})</span>
            ${entries.map(p => `<span>${p.toString()}</span>`).join('')}
          </div>
        `;
      }

      // Tooltip / Cell Click inspection
      td.addEventListener('click', () => {
        showCellDetailModal(row, col, table);
      });

      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  tableEl.appendChild(tbody);
  dom.tableContainer.appendChild(tableEl);
}

function showCellDetailModal(row, col, table) {
  const entries = table.getEntry(row, col);
  const reasons = table.getReasons(row, col);

  let detailsHtml = `<h3>Cell M[${row}, ${col}]</h3>`;
  if (entries.length === 0) {
    detailsHtml += `<p style="color:var(--text-muted); margin-top:0.5rem;">This table cell is empty. If lookahead symbol '${col}' is encountered while '${row}' is at the top of the stack, a syntax error is signaled.</p>`;
  } else {
    detailsHtml += `<div style="margin-top:0.75rem; display:flex; flex-direction:column; gap:0.6rem;">`;
    for (const item of reasons) {
      detailsHtml += `
        <div style="background:var(--bg-app); padding:0.6rem 0.8rem; border-radius:6px; border:1px solid var(--border-default);">
          <div style="font-family:var(--font-mono); font-weight:700; color:var(--primary);">${item.production.toString()}</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.25rem;">Rule Justification: ${item.reason}</div>
        </div>
      `;
    }
    detailsHtml += `</div>`;
  }

  // Create subtle bottom drawer or alert
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.bottom = '1.5rem';
  modal.style.right = '1.5rem';
  modal.style.zIndex = '999';
  modal.style.background = 'var(--bg-surface-elevated)';
  modal.style.border = '1px solid var(--border-focus)';
  modal.style.borderRadius = '12px';
  modal.style.padding = '1.25rem';
  modal.style.boxShadow = 'var(--shadow-lg)';
  modal.style.maxWidth = '420px';
  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
      <span style="font-weight:700; font-size:1rem; color:var(--text-main);">Cell Inspector</span>
      <button type="button" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.2rem;" id="close-modal">&times;</button>
    </div>
    ${detailsHtml}
  `;

  document.body.appendChild(modal);
  modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());

  // Auto-dismiss after 6 seconds
  setTimeout(() => {
    if (modal.parentNode) modal.remove();
  }, 6000);
}

/**
 * Execute Predictive Parsing against user input string.
 */
function executePredictiveParsing() {
  if (!state.currentAnalysis || !state.currentAnalysis.parsingTable) {
    alert('Please enter and analyze a grammar first.');
    return;
  }

  const table = state.currentAnalysis.parsingTable;
  const inputStr = dom.parseInputString.value;

  pausePlayback();

  const parseResult = LL1Engine.parseString(table, inputStr);
  state.currentParseResult = parseResult;
  state.currentStepIndex = 0;

  renderTrace(parseResult);

  // Render Parse Tree if available
  if (parseResult.tree && state.treeVisualizer) {
    state.treeVisualizer.render(parseResult.tree);
  }

  // Render Result Alert Banner
  if (parseResult.success) {
    dom.parseResultAlert.className = 'alert-box alert-info';
    dom.parseResultAlert.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <div class="alert-content">
        <div class="alert-title" style="color:var(--success)">✓ Input String Accepted!</div>
        <div>String matches grammar language. Successfully reduced via ${parseResult.trace.length} derivation steps.</div>
      </div>
    `;
  } else {
    dom.parseResultAlert.className = 'alert-box alert-danger';
    dom.parseResultAlert.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      <div class="alert-content">
        <div class="alert-title" style="color:var(--danger)">✗ Input String Rejected</div>
        <pre style="white-space:pre-wrap;font-family:inherit;font-size:0.85rem;margin-top:0.35rem;">${parseResult.error || 'Parsing error'}</pre>
      </div>
    `;
  }

  // Set initial step
  if (parseResult.trace.length > 0) {
    applyStep(0);
  }
}

function renderTrace(parseResult) {
  dom.traceTableBody.innerHTML = '';

  if (!parseResult || parseResult.trace.length === 0) {
    dom.traceTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">
          No parsing trace available. Enter an input string and click "Parse Input String".
        </td>
      </tr>
    `;
    return;
  }

  for (let i = 0; i < parseResult.trace.length; i++) {
    const item = parseResult.trace[i];
    const tr = document.createElement('tr');
    tr.id = `trace-step-${i}`;
    tr.className = `status-${item.status}`;

    tr.innerHTML = `
      <td style="font-weight:700;">${item.step}</td>
      <td style="font-family:var(--font-mono);">${item.stack}</td>
      <td style="font-family:var(--font-mono);">${item.input}</td>
      <td style="font-family:var(--font-mono);">${item.action}</td>
      <td>
        <span class="badge ${item.status === 'accept' ? 'badge-term' : (item.status === 'error' ? 'badge-eps' : 'badge-nt')}">
          ${item.status.toUpperCase()}
        </span>
      </td>
    `;

    tr.addEventListener('click', () => {
      pausePlayback();
      applyStep(i);
    });

    dom.traceTableBody.appendChild(tr);
  }
}

/**
 * Applies a specific trace step to the visualizer.
 */
function applyStep(index) {
  if (!state.currentParseResult || !state.currentParseResult.trace) return;

  const trace = state.currentParseResult.trace;
  if (index < 0 || index >= trace.length) return;

  state.currentStepIndex = index;
  const item = trace[index];

  // Update controls display
  dom.currentStepBadge.textContent = `Step ${item.step} of ${trace.length}`;
  dom.stepActionDesc.textContent = item.action;

  // Highlight row in trace table
  const allRows = dom.traceTableBody.querySelectorAll('tr');
  allRows.forEach(r => r.classList.remove('active-step'));
  const activeRow = document.getElementById(`trace-step-${index}`);
  if (activeRow) {
    activeRow.classList.add('active-step');
    activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // Update Visual Stack
  renderVisualStack(item.stack);

  // Update Visual Tape
  renderVisualTape(item.input);

  // Highlight Table Cell in LL(1) Table
  highlightTableCell(item.activeCell);
}

function renderVisualStack(stackStr) {
  dom.visualStack.innerHTML = '';
  const symbols = stackStr.split(/\s+/).filter(Boolean);

  // In predictive parser, top of stack is the LAST element in our space-delimited string
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const isTop = (i === symbols.length - 1);
    const card = document.createElement('div');
    card.className = `stack-card ${isTop ? 'top' : ''}`;
    card.textContent = sym;
    dom.visualStack.appendChild(card);
  }
}

function renderVisualTape(inputStr) {
  dom.visualTape.innerHTML = '';
  const tokens = inputStr.split(/\s+/).filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const isActive = (i === 0); // Current lookahead is first symbol of remaining input
    const card = document.createElement('div');
    card.className = `tape-card ${isActive ? 'active' : ''}`;
    card.textContent = tok;
    dom.visualTape.appendChild(card);
  }
}

function highlightTableCell(activeCell) {
  // Clear previous highlights
  const allCells = dom.tableContainer.querySelectorAll('.table-cell');
  allCells.forEach(c => c.classList.remove('cell-active'));

  if (!activeCell) return;

  const cell = dom.tableContainer.querySelector(
    `.table-cell[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`
  );

  if (cell) {
    cell.classList.add('cell-active');
    animateTableCell(cell);
  }
}

// Stepper Playback Controls
function togglePlayback() {
  if (state.isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  if (!state.currentParseResult || !state.currentParseResult.trace.length) return;

  state.isPlaying = true;
  dom.btnPlayPause.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
    Pause
  `;

  state.playInterval = setInterval(() => {
    if (state.currentStepIndex < state.currentParseResult.trace.length - 1) {
      applyStep(state.currentStepIndex + 1);
    } else {
      pausePlayback();
    }
  }, state.playSpeed);
}

function pausePlayback() {
  state.isPlaying = false;
  clearInterval(state.playInterval);
  if (dom.btnPlayPause) {
    dom.btnPlayPause.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      Play
    `;
  }
}

function stepForward() {
  pausePlayback();
  if (state.currentParseResult && state.currentStepIndex < state.currentParseResult.trace.length - 1) {
    applyStep(state.currentStepIndex + 1);
  }
}

function stepBackward() {
  pausePlayback();
  if (state.currentStepIndex > 0) {
    applyStep(state.currentStepIndex - 1);
  }
}

function resetStepPlayback() {
  pausePlayback();
  applyStep(0);
}

function switchTab(targetTabId) {
  if (state.activeTab === targetTabId) return;

  const prevTabBtn = document.querySelector(`.nav-tab[data-tab="${state.activeTab}"]`);
  const nextTabBtn = document.querySelector(`.nav-tab[data-tab="${targetTabId}"]`);

  const prevPane = document.getElementById(`tab-pane-${state.activeTab}`);
  const nextPane = document.getElementById(`tab-pane-${targetTabId}`);

  if (prevTabBtn) prevTabBtn.classList.remove('active');
  if (nextTabBtn) nextTabBtn.classList.add('active');

  animateTabSwitch(prevPane, nextPane);
  state.activeTab = targetTabId;

  // If switched to tree tab, re-render view
  if (targetTabId === 'tree' && state.currentParseResult?.tree) {
    setTimeout(() => {
      state.treeVisualizer?.render(state.currentParseResult.tree);
    }, 100);
  }
}

// Export utilities
function exportTableCSV() {
  if (!state.currentAnalysis) return;
  const table = state.currentAnalysis.parsingTable;

  const headers = ['Non-Terminal', ...table.columns];
  const rows = [headers.join(',')];

  for (const r of table.rows) {
    const rowValues = [r];
    for (const c of table.columns) {
      const entries = table.getEntry(r, c);
      const val = entries.map(p => p.toString()).join(' | ');
      rowValues.push(`"${val}"`);
    }
    rows.push(rowValues.join(','));
  }

  downloadFile('ll1-parsing-table.csv', 'text/csv', rows.join('\n'));
}

function exportTableMarkdown() {
  if (!state.currentAnalysis) return;
  const table = state.currentAnalysis.parsingTable;

  const headers = ['Non-Terminal', ...table.columns];
  const separator = headers.map(() => '---');
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${separator.join(' | ')} |`
  ];

  for (const r of table.rows) {
    const rowValues = [r];
    for (const c of table.columns) {
      const entries = table.getEntry(r, c);
      const val = entries.map(p => p.toString()).join(' \\| ') || '—';
      rowValues.push(val);
    }
    lines.push(`| ${rowValues.join(' | ')} |`);
  }

  downloadFile('ll1-parsing-table.md', 'text/markdown', lines.join('\n'));
}

function exportTraceMarkdown() {
  if (!state.currentParseResult || !state.currentParseResult.trace) return;
  const trace = state.currentParseResult.trace;

  const lines = [
    '# LL(1) Predictive Parsing Trace',
    '',
    `| Step | Stack | Remaining Input | Action | Status |`,
    `| --- | --- | --- | --- | --- |`
  ];

  for (const item of trace) {
    lines.push(`| ${item.step} | \`${item.stack}\` | \`${item.input}\` | ${item.action} | ${item.status.toUpperCase()} |`);
  }

  downloadFile('parsing-trace.md', 'text/markdown', lines.join('\n'));
}

function downloadFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
