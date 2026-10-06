/**
 * LL(1) Predictive Parsing Engine & Parse Tree Generator.
 * Executes table-driven parsing step-by-step with rich diagnostic messages
 * and builds a concrete syntax tree (CST).
 */

import { EPSILON, END_MARKER } from './grammar-parser.js';

export class ParseTreeNode {
  constructor(id, symbol, isTerminal = false, isEpsilon = false) {
    this.id = id;
    this.symbol = symbol;
    this.isTerminal = isTerminal;
    this.isEpsilon = isEpsilon;
    this.children = [];
  }
}

/**
 * Tokenizes user input string into terminals discovered from the grammar.
 *
 * @param {string} inputStr
 * @param {Set<string>} terminals
 * @returns {{ tokens: Array<string>, error: string|null }}
 */
export function tokenizeInput(inputStr, terminals) {
  const trimmed = inputStr.trim();
  if (!trimmed) {
    return { tokens: [END_MARKER], error: null };
  }

  // Sort terminals by length descending for greedy longest-match
  const sortedTerminals = Array.from(terminals).sort((a, b) => b.length - a.length);

  const tokens = [];
  let i = 0;

  while (i < trimmed.length) {
    // Skip whitespace
    if (/\s/.test(trimmed[i])) {
      i++;
      continue;
    }

    let matched = null;
    for (const term of sortedTerminals) {
      if (trimmed.startsWith(term, i)) {
        // If terminal is alphanumeric, check word boundary
        const isTermAlpha = /^[a-zA-Z0-9_]+$/.test(term);
        const nextChar = trimmed[i + term.length];
        const isNextAlpha = nextChar && /^[a-zA-Z0-9_]+$/.test(nextChar);
        if (!isTermAlpha || !isNextAlpha) {
          matched = term;
          break;
        }
      }
    }

    if (matched !== null) {
      tokens.push(matched);
      i += matched.length;
    } else {
      // Unrecognized character or token
      const snippet = trimmed.substring(i, Math.min(i + 15, trimmed.length));
      return {
        tokens: [],
        error: `Lexical Error at position ${i + 1}: Unrecognized symbol '${snippet}'. Expected one of grammar terminals: { ${Array.from(terminals).join(', ')} }`
      };
    }
  }

  tokens.push(END_MARKER);
  return { tokens, error: null };
}

/**
 * Executes standard LL(1) predictive parsing.
 *
 * @param {ParsingTable} parsingTable
 * @param {string} inputStr
 * @param {number} maxSteps - Safeguard against infinite loops
 * @returns {Object} Parse result with trace and syntax tree
 */
export function parseInput(parsingTable, inputStr, maxSteps = 1000) {
  const grammar = parsingTable.grammar;

  if (!parsingTable.isLL1) {
    return {
      success: false,
      error: `Cannot perform deterministic LL(1) parsing: The grammar contains ${parsingTable.conflicts.length} conflict(s).`,
      trace: [],
      tree: null
    };
  }

  const { tokens, error: tokenError } = tokenizeInput(inputStr, grammar.terminals);
  if (tokenError) {
    return {
      success: false,
      error: tokenError,
      trace: [],
      tree: null,
      tokens: []
    };
  }

  let nodeIdCounter = 1;
  const rootNode = new ParseTreeNode(nodeIdCounter++, grammar.startSymbol, false);

  // Stack stores items: { symbol: string, node: ParseTreeNode }
  const stack = [
    { symbol: END_MARKER, node: null },
    { symbol: grammar.startSymbol, node: rootNode }
  ];

  let ip = 0; // Input Pointer
  const trace = [];
  let step = 1;
  let parseSuccess = false;
  let parseError = null;

  while (step <= maxSteps) {
    if (stack.length === 0) {
      if (ip === tokens.length - 1 && tokens[ip] === END_MARKER) {
        parseSuccess = true;
      } else {
        parseError = `Stack became empty before processing all input tokens. Remaining: '${tokens.slice(ip).join(' ')}'`;
      }
      break;
    }

    const currentStackItem = stack[stack.length - 1];
    const X = currentStackItem.symbol;
    const a = tokens[ip];

    // Format current stack for display: e.g. "$ E' T"
    const stackDisplay = stack.map(item => item.symbol).join(' ');
    // Format remaining input for display: e.g. "id + id $"
    const inputDisplay = tokens.slice(ip).join(' ');

    // 1. Both stack top and input pointer are at end-marker ($) -> ACCEPT
    if (X === END_MARKER && a === END_MARKER) {
      trace.push({
        step: step++,
        stack: stackDisplay,
        input: inputDisplay,
        action: 'ACCEPT',
        status: 'accept',
        activeCell: null,
        stackTop: X,
        lookahead: a
      });
      parseSuccess = true;
      break;
    }

    // 2. Stack top is terminal or end-marker
    if (grammar.terminals.has(X) || X === END_MARKER) {
      if (X === a) {
        trace.push({
          step: step++,
          stack: stackDisplay,
          input: inputDisplay,
          action: `Match terminal '${a}'`,
          status: 'match',
          matchedSymbol: a,
          activeCell: null,
          stackTop: X,
          lookahead: a
        });
        // Attach matched token to tree node
        if (currentStackItem.node) {
          currentStackItem.node.isTerminal = true;
        }
        stack.pop();
        ip++;
      } else {
        parseError = `Parsing Error at Step ${step}:\nStack top is terminal '${X}', but current input token is '${a}'. Terminal mismatch.`;
        trace.push({
          step: step++,
          stack: stackDisplay,
          input: inputDisplay,
          action: `ERROR: Expected terminal '${X}', encountered '${a}'`,
          status: 'error',
          errorDetail: {
            step: step - 1,
            stackTop: X,
            currentInput: a,
            expected: X,
            message: `Terminal mismatch: Stack expected '${X}', but input provided '${a}'`
          },
          activeCell: null,
          stackTop: X,
          lookahead: a
        });
        break;
      }
      continue;
    }

    // 3. Stack top is a Non-Terminal
    if (grammar.nonTerminals.has(X)) {
      const cellEntries = parsingTable.getEntry(X, a);

      if (cellEntries.length === 0) {
        // Collect all terminals where M[X, t] has an entry
        const validTokens = parsingTable.columns.filter(col => parsingTable.getEntry(X, col).length > 0);
        parseError = `Parsing Error at Step ${step}:\nNo parsing table entry exists for M[${X}, ${a}].\nStack top: ${X}\nCurrent input: ${a}\nValid lookahead tokens for '${X}': { ${validTokens.join(', ') || 'none'} }`;

        trace.push({
          step: step++,
          stack: stackDisplay,
          input: inputDisplay,
          action: `ERROR: No table entry M[${X}, ${a}]`,
          status: 'error',
          errorDetail: {
            step: step - 1,
            stackTop: X,
            currentInput: a,
            expectedTokens: validTokens,
            message: `No parsing table entry for M[${X}, ${a}]`
          },
          activeCell: { row: X, col: a },
          stackTop: X,
          lookahead: a
        });
        break;
      }

      if (cellEntries.length > 1) {
        parseError = `LL(1) Conflict Error at M[${X}, ${a}]: Multiple productions exist: ${cellEntries.map(p => p.toString()).join(' | ')}`;
        trace.push({
          step: step++,
          stack: stackDisplay,
          input: inputDisplay,
          action: `ERROR: Conflict at M[${X}, ${a}]`,
          status: 'error',
          activeCell: { row: X, col: a },
          stackTop: X,
          lookahead: a
        });
        break;
      }

      // Exactly one production exists
      const prod = cellEntries[0];
      trace.push({
        step: step++,
        stack: stackDisplay,
        input: inputDisplay,
        action: `Apply ${prod.toString()}`,
        status: 'apply',
        production: prod.toString(),
        activeCell: { row: X, col: a },
        stackTop: X,
        lookahead: a
      });

      const parentItem = stack.pop();
      const parentNode = parentItem.node;

      if (prod.isEpsilon()) {
        // Add epsilon child node to syntax tree
        if (parentNode) {
          const epsNode = new ParseTreeNode(nodeIdCounter++, EPSILON, false, true);
          parentNode.children.push(epsNode);
        }
      } else {
        // Create tree nodes for each RHS symbol
        const childNodes = prod.rhs.map(sym => {
          const isTerm = grammar.terminals.has(sym);
          return new ParseTreeNode(nodeIdCounter++, sym, isTerm, false);
        });

        if (parentNode) {
          parentNode.children.push(...childNodes);
        }

        // Push onto stack in REVERSE order so first RHS symbol is at top of stack
        for (let j = prod.rhs.length - 1; j >= 0; j--) {
          stack.push({
            symbol: prod.rhs[j],
            node: childNodes[j]
          });
        }
      }
      continue;
    }

    // Unrecognized stack symbol
    parseError = `Internal Error: Unknown symbol '${X}' on parse stack.`;
    break;
  }

  if (step > maxSteps && !parseSuccess) {
    parseError = `Parsing terminated: Maximum step limit (${maxSteps}) exceeded. Possible loop in derivation.`;
  }

  return {
    success: parseSuccess,
    error: parseError,
    trace,
    tree: rootNode,
    tokens
  };
}
