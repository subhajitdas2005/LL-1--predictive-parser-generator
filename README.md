# ⚡ LL(1) Predictive Parser Generator & Visualizer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tests](https://img.shields.io/badge/Tests-64%20Passing-brightgreen.svg)](./src/tests/engine-tests.js)
[![Compiler Theory](https://img.shields.io/badge/Compiler%20Design-LL(1)%20Parsing-purple.svg)](#features)

An interactive, high-performance **LL(1) Predictive Parser Generator & Visual Compiler Engine** designed to analyze Context-Free Grammars (CFGs), compute fixed-point **FIRST** and **FOLLOW** sets, generate parsing tables, identify grammar conflicts, and simulate step-by-step predictive parsing with interactive parse tree visualization.

Developed by **[Subhajit Das](https://github.com/subhajitdas2005)**.

---

## 🚀 Key Features

### 1. Robust Grammar Engine & AST Parser
- **Flexible Syntax Support**: Parses productions using `->` or `::=` and alternatives separated by `|`.
- **Epsilon Handling**: Supports `ε`, `eps`, `epsilon`, or `e` as the empty string.
- **Symbol Deduction**: Intelligently distinguishes terminals from non-terminals, supporting multi-character tokens (e.g., `id`, `num`, `while`, `==`).

### 2. Algorithmic Set Computations with Derivations
- **Nullable Sets**: Iterative propagation to pinpoint nullable non-terminals.
- **FIRST Sets**: Fixed-point iterative calculation supporting deep epsilon cascades.
- **FOLLOW Sets**: Comprehensive calculation tracking start symbol end-marker (`$`) and cross-production symbol transfers.
- **Step-by-Step Proofs**: Generates mathematical justification and derivation traces for every symbol in FIRST & FOLLOW sets.

### 3. Parsing Table Construction & Conflict Diagnostics
- **M[A, a] Construction**: Predicts transitions according to standard Dragon Book algorithms.
- **Conflict Identification**: Detects FIRST/FIRST and FIRST/FOLLOW non-LL(1) ambiguities.
- **Grammar Transformation Tools**:
  - **Direct Left Recursion Detection & Elimination**: Automatically converts left-recursive rules into right-recursive forms with new non-terminals.
  - **Left Factoring Detection & Transformation**: Automatically factors out common prefixes.

### 4. Interactive Simulation & Visual Parse Tree
- **Step-by-Step Trace**: Real-time stack inspection, input pointer tracking, and action dispatching (Expand, Match, Accept, Error).
- **Execution Controller**: Step forward, step backward, play/pause auto-stepping, and adjustable animation speeds.
- **Dynamic Parse Tree**: Interactive SVG/Canvas hierarchical parse tree visualization reflecting real-time derivation.

### 5. Verified Test Suite
- Comprehensive verification suite with **64 unit tests** covering edge cases (cascading nullability, indirect FIRST, arithmetic grammars, recursion, and error reporting).

---

## 🛠️ Architecture & Project Structure

```
├── index.html                   # Interactive Web Application UI
├── package.json                 # Project configuration & test scripts
├── .gitignore                   # Ignored files and directories
├── src/
│   ├── engine/                  # Core Compiler Design Algorithms
│   │   ├── grammar-parser.js    # CFG tokenization and validation
│   │   ├── first-follow.js      # Fixed-point FIRST, FOLLOW, & Nullable sets
│   │   ├── table-builder.js     # LL(1) parse table construction & conflict detection
│   │   ├── transformations.js   # Left-recursion elimination & left factoring
│   │   ├── predictive-parser.js # Stack-based LL(1) parsing & tokenization
│   │   └── ll1-engine.js        # Unified engine facade
│   ├── ui/                      # Visualizer & DOM Controllers
│   │   ├── app.js               # Event coordination & app state
│   │   ├── parse-tree-visualizer.js # Dynamic hierarchical tree rendering
│   │   └── animations.js        # Smooth UI transition effects
│   ├── styles/                  # Clean modern design system
│   │   ├── tokens.css           # Design tokens, color palette, typography
│   │   ├── components.css       # Tables, stack visualizer, cards
│   │   └── main.css             # Main responsive layout
│   ├── examples/                # Pre-configured Grammars
│   │   └── grammars.js          # Classic arithmetic, if-else, boolean grammars
│   └── tests/                   # Automated Verification
│       └── engine-tests.js      # 64-test validation suite
```

---

## 🧪 Running the Verification Suite

Run the automated test suite directly using Node.js:

```bash
npm test
```

### Verification Output:
```
====================================================
STARTING LL(1) COMPILER ENGINE VERIFICATION SUITE
====================================================

TEST 1: S -> a A, A -> b A | ε              [PASS]
TEST 2: Arithmetic Expression Grammar       [PASS]
TEST 3: Conflict Detection (Non-LL1)        [PASS]
TEST 4: Epsilon Propagation                 [PASS]
TEST 5: Indirect FIRST Calculation          [PASS]
TEST 6: Nullable Behavior                   [PASS]
TEST 7: Left Recursion Detection & Fixing   [PASS]
TEST 8: Multi-character Terminals           [PASS]
TEST 9: Cascading Nullable Symbols          [PASS]
TEST 10: Balanced Parentheses               [PASS]
TEST 11: Complex Palindromic Constraints    [PASS]
TEST 12: Typing / Keywords Grammar          [PASS]
TEST 13: Non-terminal Chaining              [PASS]

====================================================
TEST RESULTS: 64 PASSED, 0 FAILED
====================================================
```

---

## 💻 Running the Visualizer Locally

You can open `index.html` directly in any modern browser:

```bash
# Option 1: Direct browser launch
start index.html

# Option 2: Using any local static server (e.g. VS Code Live Server or npx serve)
npx serve .
```

---

## 📖 Example Grammar Syntax

Enter productions into the generator using clean CFG notation:

```text
E  -> T E'
E' -> + T E' | ε
T  -> F T'
T' -> * F T' | ε
F  -> ( E ) | id
```

To test an input string:
```text
id + id * id
```

---

## 👨‍💻 Author

**Subhajit Das**
- **GitHub**: [@subhajitdas2005](https://github.com/subhajitdas2005)
- **LinkedIn**: [Subhajit Das](https://www.linkedin.com/in/subhajit-das-689953309/)
- **Email**: subhajitdas9866@gmail.com

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
