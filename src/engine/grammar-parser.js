/**
 * Grammar Parser & Tokenizer for Universal LL(1) Predictive Parser Generator.
 * Handles arbitrary CFGs, whitespace-aware tokenization, multi-character terminals,
 * primed non-terminals (E', T''), and standard epsilon aliases.
 */

export const EPSILON = 'ε';
export const END_MARKER = '$';

// Recognizable epsilon representations
export const EPSILON_VARIANTS = new Set(['ε', 'epsilon', 'eps', '^', '#']);

// Common multi-character keywords in programming language grammars
export const DEFAULT_KEYWORDS = [
  'id', 'num', 'number', 'int', 'float', 'double', 'char', 'string', 'bool',
  'if', 'then', 'else', 'while', 'for', 'do', 'return', 'print',
  'true', 'false', 'null', 'void', 'def', 'fn', 'let', 'var', 'const'
];

// Multi-character comparison/logical operators
export const MULTI_CHAR_OPERATORS = [
  '==', '!=', '<=', '>=', '&&', '||', '++', '--', ':=', '<<', '>>'
];

/**
 * Represents a parsed production rule: A -> RHS
 */
export class Production {
  constructor(id, lhs, rhs, originalText = '') {
    this.id = id;                     // Numeric unique index
    this.lhs = lhs;                   // Non-terminal string (e.g. 'E', 'E\'')
    this.rhs = Array.isArray(rhs) ? rhs : [rhs]; // Array of symbol strings (e.g. ['T', 'E\''])
    this.originalText = originalText; // Pretty printed string for display
  }

  isEpsilon() {
    return this.rhs.length === 1 && this.rhs[0] === EPSILON;
  }

  toString() {
    return `${this.lhs} → ${this.rhs.join(' ')}`;
  }
}

/**
 * Represents the parsed and validated grammar structure.
 */
export class Grammar {
  constructor() {
    this.startSymbol = null;
    this.nonTerminals = new Set();
    this.terminals = new Set();
    this.productions = [];            // List of Production objects
    this.productionsByLhs = new Map(); // lhs -> [Production]
    this.warnings = [];
    this.errors = [];
    this.originalInput = '';
  }

  getProductionsFor(nonTerminal) {
    return this.productionsByLhs.get(nonTerminal) || [];
  }
}

/**
 * Parse raw CFG text into a validated Grammar instance.
 *
 * @param {string} input - CFG grammar string
 * @param {string|null} customStartSymbol - Optional user-selected start symbol
 * @param {Object} options - Custom parsing options
 * @returns {Grammar}
 */
export function parseGrammar(input, customStartSymbol = null, options = {}) {
  const grammar = new Grammar();
  grammar.originalInput = input;

  if (!input || !input.trim()) {
    grammar.errors.push('Empty grammar provided. Please enter at least one production rule.');
    return grammar;
  }

  const rawLines = input.split(/\r?\n/);
  const parsedRules = []; // Temp storage: { lhsRaw, rhsRawList, lineNum }

  // Step 1: First pass - identify all Non-Terminals from LHS of all lines
  const discoveredLHS = new Set();
  const lhsOrder = [];

  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    const rawLine = rawLines[lineIndex];
    const lineNum = lineIndex + 1;
    const trimmed = rawLine.trim();

    // Ignore empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    // Match arrow: ->, →, ::=, or single :
    const arrowMatch = trimmed.match(/\s*(->|→|::=|:)\s*/);
    if (!arrowMatch) {
      grammar.errors.push(`Line ${lineNum}: Missing production arrow (-> or →). Got: "${trimmed}"`);
      continue;
    }

    const arrow = arrowMatch[0];
    const arrowIdx = trimmed.indexOf(arrow);
    const lhsPart = trimmed.substring(0, arrowIdx).trim();
    const rhsPart = trimmed.substring(arrowIdx + arrow.length).trim();

    if (!lhsPart) {
      grammar.errors.push(`Line ${lineNum}: Missing Left-Hand-Side (LHS) non-terminal.`);
      continue;
    }

    // Check if LHS contains whitespace (CFGs require single non-terminal on LHS)
    const lhsTokens = lhsPart.split(/\s+/);
    if (lhsTokens.length > 1) {
      grammar.errors.push(`Line ${lineNum}: Invalid LHS "${lhsPart}". Context-Free Grammars require exactly one non-terminal on the LHS.`);
      continue;
    }

    const lhs = lhsTokens[0];
    if (!discoveredLHS.has(lhs)) {
      discoveredLHS.add(lhs);
      lhsOrder.push(lhs);
    }

    // Split alternatives by '|'
    const rhsAlternatives = splitAlternatives(rhsPart);
    parsedRules.push({ lhs, rhsAlternatives, lineNum });
  }

  if (grammar.errors.length > 0) {
    return grammar;
  }

  if (discoveredLHS.size === 0) {
    grammar.errors.push('No valid productions found in grammar.');
    return grammar;
  }

  // Set of non-terminals is all LHS symbols
  grammar.nonTerminals = new Set(discoveredLHS);

  // Determine start symbol: user specified or first discovered LHS
  if (customStartSymbol && grammar.nonTerminals.has(customStartSymbol)) {
    grammar.startSymbol = customStartSymbol;
  } else {
    grammar.startSymbol = lhsOrder[0];
  }

  // Step 2: Second pass - Tokenize RHS of each production
  let prodId = 1;
  const seenProductions = new Set();

  for (const { lhs, rhsAlternatives, lineNum } of parsedRules) {
    for (const altText of rhsAlternatives) {
      const rhsTokens = tokenizeRhs(altText, grammar.nonTerminals, options);

      // Check for duplicate production
      const prodSignature = `${lhs} -> ${rhsTokens.join(' ')}`;
      if (seenProductions.has(prodSignature)) {
        grammar.warnings.push(`Line ${lineNum}: Duplicate production "${prodSignature}" ignored.`);
        continue;
      }
      seenProductions.add(prodSignature);

      const production = new Production(prodId++, lhs, rhsTokens, prodSignature);
      grammar.productions.push(production);

      if (!grammar.productionsByLhs.has(lhs)) {
        grammar.productionsByLhs.set(lhs, []);
      }
      grammar.productionsByLhs.get(lhs).push(production);

      // Collect terminals: any RHS symbol that is NOT in nonTerminals and NOT epsilon
      for (const sym of rhsTokens) {
        if (sym !== EPSILON && !grammar.nonTerminals.has(sym)) {
          grammar.terminals.add(sym);
        }
      }
    }
  }

  // Step 3: Semantic Validation
  validateGrammarSemantics(grammar);

  return grammar;
}

/**
 * Splits RHS string by '|', taking care not to split inside quotes if used.
 */
function splitAlternatives(rhsStr) {
  if (!rhsStr || !rhsStr.trim()) {
    // Empty RHS means epsilon production
    return ['ε'];
  }

  const alts = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < rhsStr.length; i++) {
    const ch = rhsStr[i];

    // Single quote could be prime notation (E') or literal string ('+')
    // If preceded by an alphanumeric or another prime (e.g. E' or E''), it's prime notation!
    const isPrime = (i > 0 && /[a-zA-Z0-9_']/.test(rhsStr[i - 1]));

    if (ch === "'" && !inDoubleQuote && !isPrime) {
      inSingleQuote = !inSingleQuote;
      current += ch;
    } else if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
    } else if (ch === '|' && !inSingleQuote && !inDoubleQuote) {
      alts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim().length > 0 || rhsStr.trim().endsWith('|')) {
    alts.push(current.trim());
  }

  return alts.map(alt => (alt.length === 0 ? EPSILON : alt));
}

/**
 * Tokenize a single RHS alternative into symbols.
 * Handles both space-delimited and contiguous syntax with known symbols.
 */
export function tokenizeRhs(altText, nonTerminals, options = {}) {
  const trimmed = altText.trim();

  // Check direct epsilon
  if (!trimmed || isEpsilonAlias(trimmed, nonTerminals)) {
    return [EPSILON];
  }

  // If tokens are separated by spaces, handle each chunk
  const chunks = trimmed.split(/\s+/);
  const resultTokens = [];

  for (const chunk of chunks) {
    if (isEpsilonAlias(chunk, nonTerminals)) {
      resultTokens.push(EPSILON);
      continue;
    }

    // If chunk directly matches a known non-terminal or keyword, keep it atomic
    if (nonTerminals.has(chunk)) {
      resultTokens.push(chunk);
      continue;
    }

    // Otherwise, perform sub-tokenization on this chunk
    const subTokens = tokenizeChunk(chunk, nonTerminals);
    resultTokens.push(...subTokens);
  }

  return resultTokens.length > 0 ? resultTokens : [EPSILON];
}

/**
 * Check if a token string represents epsilon.
 * Note: 'E' is only treated as epsilon if 'E' is NOT a defined non-terminal!
 */
export function isEpsilonAlias(token, nonTerminals = new Set()) {
  const lower = token.toLowerCase();
  if (token === 'ε' || token === '\u03B5' || token === '\u03F5') return true;
  if (lower === 'epsilon' || lower === 'eps') return true;
  if (token === '^' || token === '#') return true;
  if (token === 'E' && !nonTerminals.has('E')) return true;
  return false;
}

/**
 * Tokenize an unspaced or partially spaced chunk into individual grammar symbols.
 * Uses greedy longest-match against known non-terminals, multi-char keywords,
 * operators, and single character terminals.
 */
function tokenizeChunk(chunk, nonTerminals) {
  // Sort non-terminals by length descending so e.g. E' matches before E
  const sortedNonTerminals = Array.from(nonTerminals).sort((a, b) => b.length - a.length);

  // All known candidate multi-char tokens
  const candidateKeywords = [...DEFAULT_KEYWORDS, ...MULTI_CHAR_OPERATORS];

  const tokens = [];
  let i = 0;

  while (i < chunk.length) {
    // 1. Try matching non-terminals at current position
    let matchedNT = null;
    for (const nt of sortedNonTerminals) {
      if (chunk.startsWith(nt, i)) {
        matchedNT = nt;
        break;
      }
    }
    if (matchedNT) {
      tokens.push(matchedNT);
      i += matchedNT.length;
      continue;
    }

    // 2. Try matching multi-char operators
    let matchedOp = null;
    for (const op of MULTI_CHAR_OPERATORS) {
      if (chunk.startsWith(op, i)) {
        matchedOp = op;
        break;
      }
    }
    if (matchedOp) {
      tokens.push(matchedOp);
      i += matchedOp.length;
      continue;
    }

    // 3. Try matching known keywords (like 'id', 'num', 'while', etc.)
    let matchedKw = null;
    for (const kw of candidateKeywords) {
      if (chunk.startsWith(kw, i)) {
        // Ensure keyword boundary: next char shouldn't be alphanumeric if kw is alphanumeric
        const nextChar = chunk[i + kw.length];
        const isKwAlpha = /^[a-zA-Z0-9_]+$/.test(kw);
        const isNextAlpha = nextChar && /^[a-zA-Z0-9_]+$/.test(nextChar);
        if (!isKwAlpha || !isNextAlpha) {
          matchedKw = kw;
          break;
        }
      }
    }
    if (matchedKw) {
      tokens.push(matchedKw);
      i += matchedKw.length;
      continue;
    }

    // 4. Quoted literal string terminal (e.g. '+' or "id")
    if (chunk[i] === "'" || chunk[i] === '"') {
      const quote = chunk[i];
      let endQuote = chunk.indexOf(quote, i + 1);
      if (endQuote !== -1) {
        const literal = chunk.substring(i + 1, endQuote);
        tokens.push(literal);
        i = endQuote + 1;
        continue;
      }
    }

    // 5. Check identifier pattern [a-zA-Z_][a-zA-Z0-9_]*
    // If not matching any known non-terminal or keyword, take it as an identifier or single character
    const remaining = chunk.substring(i);
    const identMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (identMatch) {
      const ident = identMatch[0];
      tokens.push(ident);
      i += ident.length;
      continue;
    }

    // 6. Fallback: single character (e.g. '+', '*', '(', ')', etc.)
    tokens.push(chunk[i]);
    i += 1;
  }

  return tokens;
}

/**
 * Validates semantic integrity of the grammar.
 */
function validateGrammarSemantics(grammar) {
  // Check for undefined symbols on RHS that look like non-terminals but have no productions
  const unreachable = new Set(grammar.nonTerminals);
  unreachable.delete(grammar.startSymbol);

  // Check reachability from start symbol
  const reachable = new Set([grammar.startSymbol]);
  const queue = [grammar.startSymbol];

  while (queue.length > 0) {
    const current = queue.shift();
    const prods = grammar.getProductionsFor(current);
    for (const p of prods) {
      for (const sym of p.rhs) {
        if (grammar.nonTerminals.has(sym) && !reachable.has(sym)) {
          reachable.add(sym);
          queue.push(sym);
        }
      }
    }
  }

  for (const nt of grammar.nonTerminals) {
    if (!reachable.has(nt)) {
      grammar.warnings.push(`Non-terminal "${nt}" is unreachable from start symbol "${grammar.startSymbol}".`);
    }
  }

  // Check for non-terminating non-terminals (cannot derive any terminal string)
  const terminating = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of grammar.productions) {
      if (terminating.has(p.lhs)) continue;
      // If all symbols in RHS are terminals or already terminating
      const canTerminate = p.rhs.every(sym => sym === EPSILON || grammar.terminals.has(sym) || terminating.has(sym));
      if (canTerminate) {
        terminating.add(p.lhs);
        changed = true;
      }
    }
  }

  for (const nt of grammar.nonTerminals) {
    if (!terminating.has(nt)) {
      grammar.warnings.push(`Non-terminal "${nt}" cannot derive any string of terminals (non-terminating).`);
    }
  }
}
