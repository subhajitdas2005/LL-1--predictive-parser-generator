/**
 * FIRST, FOLLOW, and Nullable Computation Engine for LL(1) Parsers.
 * 100% Dynamic, Fixed-Point Iterative Algorithms with complete derivation tracking.
 */

import { EPSILON, END_MARKER } from './grammar-parser.js';

/**
 * Calculates which non-terminals in the grammar are nullable (can derive ε).
 *
 * @param {Grammar} grammar
 * @returns {{ nullable: Set<string>, derivationSteps: Array<Object> }}
 */
export function calculateNullable(grammar) {
  const nullable = new Set();
  const derivationSteps = [];

  // Step 1: Base case - direct epsilon productions (A -> ε)
  for (const p of grammar.productions) {
    if (p.isEpsilon()) {
      if (!nullable.has(p.lhs)) {
        nullable.add(p.lhs);
        derivationSteps.push({
          nonTerminal: p.lhs,
          reason: `Direct epsilon production: ${p.toString()}`,
          production: p
        });
      }
    }
  }

  // Step 2: Inductive fixed-point - if A -> X1 X2 ... Xk and all Xi are nullable
  let changed = true;
  let iteration = 1;
  while (changed) {
    changed = false;
    iteration++;
    for (const p of grammar.productions) {
      if (nullable.has(p.lhs) || p.isEpsilon()) continue;

      // Check if every symbol on the RHS is in nullable
      const allNullable = p.rhs.every(sym => grammar.nonTerminals.has(sym) && nullable.has(sym));
      if (allNullable && p.rhs.length > 0) {
        nullable.add(p.lhs);
        changed = true;
        derivationSteps.push({
          nonTerminal: p.lhs,
          reason: `All symbols in RHS (${p.rhs.join(', ')}) are nullable in: ${p.toString()}`,
          production: p,
          iteration
        });
      }
    }
  }

  return { nullable, derivationSteps };
}

/**
 * Calculates FIRST sets for all non-terminals in the grammar.
 *
 * @param {Grammar} grammar
 * @param {Set<string>} nullable
 * @returns {{
 *   firstSets: Map<string, Set<string>>,
 *   firstDerivations: Map<string, Array<Object>>
 * }}
 */
export function calculateFirst(grammar, nullable = new Set()) {
  const firstSets = new Map();
  const firstDerivations = new Map();

  for (const nt of grammar.nonTerminals) {
    firstSets.set(nt, new Set());
    firstDerivations.set(nt, []);
  }

  const addFirstSymbol = (nt, symbol, reason, prod) => {
    const set = firstSets.get(nt);
    if (!set.has(symbol)) {
      set.add(symbol);
      firstDerivations.get(nt).push({ symbol, reason, production: prod });
      return true;
    }
    return false;
  };

  // Fixed-point iteration
  let changed = true;
  let pass = 0;
  while (changed) {
    changed = false;
    pass++;

    for (const p of grammar.productions) {
      const A = p.lhs;

      // If A -> ε
      if (p.isEpsilon()) {
        if (addFirstSymbol(A, EPSILON, `Direct ε production: ${p.toString()}`, p)) {
          changed = true;
        }
        continue;
      }

      // If A -> X1 X2 ... Xk
      let allNullableSoFar = true;

      for (let i = 0; i < p.rhs.length; i++) {
        const X = p.rhs[i];

        if (X === EPSILON) {
          continue;
        }

        // If X is a terminal: FIRST(X) = { X }
        if (grammar.terminals.has(X)) {
          if (addFirstSymbol(A, X, `Leading terminal '${X}' in ${p.toString()}${i > 0 ? ` (preceding symbols nullable)` : ''}`, p)) {
            changed = true;
          }
          allNullableSoFar = false;
          break; // Stop at first non-nullable terminal
        }

        // If X is a non-terminal
        if (grammar.nonTerminals.has(X)) {
          const firstX = firstSets.get(X);
          for (const s of firstX) {
            if (s !== EPSILON) {
              if (addFirstSymbol(A, s, `Inherited from FIRST(${X}) via ${p.toString()}`, p)) {
                changed = true;
              }
            }
          }

          // If X does not derive ε, sequence cannot proceed further
          if (!firstX.has(EPSILON) && !nullable.has(X)) {
            allNullableSoFar = false;
            break;
          }
        } else {
          // Unrecognized symbol treated as terminal
          if (addFirstSymbol(A, X, `Terminal '${X}' in ${p.toString()}`, p)) {
            changed = true;
          }
          allNullableSoFar = false;
          break;
        }
      }

      // If all symbols in RHS can derive ε, then ε ∈ FIRST(A)
      if (allNullableSoFar) {
        if (addFirstSymbol(A, EPSILON, `All RHS symbols in ${p.toString()} derive ε`, p)) {
          changed = true;
        }
      }
    }
  }

  return { firstSets, firstDerivations };
}

/**
 * Computes FIRST of an arbitrary sequence of symbols: FIRST(Y1 Y2 ... Yk)
 *
 * @param {Array<string>} sequence - Array of grammar symbols
 * @param {Grammar} grammar
 * @param {Map<string, Set<string>>} firstSets
 * @param {Set<string>} nullable
 * @returns {Set<string>}
 */
export function firstOfSequence(sequence, grammar, firstSets, nullable = new Set()) {
  const result = new Set();

  if (!sequence || sequence.length === 0 || (sequence.length === 1 && sequence[0] === EPSILON)) {
    result.add(EPSILON);
    return result;
  }

  let allNullableSoFar = true;

  for (let i = 0; i < sequence.length; i++) {
    const sym = sequence[i];

    if (sym === EPSILON) {
      continue;
    }

    // Terminal: FIRST(sym) = { sym }
    if (grammar.terminals.has(sym) || !grammar.nonTerminals.has(sym)) {
      result.add(sym);
      allNullableSoFar = false;
      break;
    }

    // Non-terminal: add FIRST(sym) - { ε }
    const firstSym = firstSets.get(sym) || new Set();
    for (const s of firstSym) {
      if (s !== EPSILON) {
        result.add(s);
      }
    }

    // If sym is not nullable, stop
    if (!firstSym.has(EPSILON) && !nullable.has(sym)) {
      allNullableSoFar = false;
      break;
    }
  }

  if (allNullableSoFar) {
    result.add(EPSILON);
  }

  return result;
}

/**
 * Calculates FOLLOW sets for all non-terminals in the grammar.
 *
 * @param {Grammar} grammar
 * @param {Map<string, Set<string>>} firstSets
 * @param {Set<string>} nullable
 * @returns {{
 *   followSets: Map<string, Set<string>>,
 *   followDerivations: Map<string, Array<Object>>
 * }}
 */
export function calculateFollow(grammar, firstSets, nullable = new Set()) {
  const followSets = new Map();
  const followDerivations = new Map();

  for (const nt of grammar.nonTerminals) {
    followSets.set(nt, new Set());
    followDerivations.set(nt, []);
  }

  const addFollowSymbol = (nt, symbol, reason, prod) => {
    const set = followSets.get(nt);
    if (!set.has(symbol)) {
      set.add(symbol);
      followDerivations.get(nt).push({ symbol, reason, production: prod });
      return true;
    }
    return false;
  };

  // Rule 1: Put $ into FOLLOW(startSymbol)
  if (grammar.startSymbol && followSets.has(grammar.startSymbol)) {
    addFollowSymbol(
      grammar.startSymbol,
      END_MARKER,
      `Rule 1: Start symbol '${grammar.startSymbol}' receives end-marker '${END_MARKER}'`,
      null
    );
  }

  // Fixed-point iteration
  let changed = true;
  let pass = 0;
  while (changed) {
    changed = false;
    pass++;

    for (const p of grammar.productions) {
      const A = p.lhs;
      const rhs = p.rhs;

      for (let i = 0; i < rhs.length; i++) {
        const B = rhs[i];

        // Terminals do not have FOLLOW sets
        if (!grammar.nonTerminals.has(B)) {
          continue;
        }

        const beta = rhs.slice(i + 1);
        const firstBeta = firstOfSequence(beta, grammar, firstSets, nullable);

        // Rule 2: For A -> α B β, add FIRST(β) - {ε} to FOLLOW(B)
        for (const sym of firstBeta) {
          if (sym !== EPSILON) {
            if (addFollowSymbol(
              B,
              sym,
              `Rule 2: Symbol '${sym}' is in FIRST(${beta.length > 0 ? beta.join(' ') : 'ε'}) after '${B}' in ${p.toString()}`,
              p
            )) {
              changed = true;
            }
          }
        }

        // Rule 3 & 4: If β is empty OR ε ∈ FIRST(β), add FOLLOW(A) to FOLLOW(B)
        if (beta.length === 0 || firstBeta.has(EPSILON)) {
          const followA = followSets.get(A);
          for (const sym of followA) {
            const ruleName = beta.length === 0 ? 'Rule 4' : 'Rule 3';
            const condition = beta.length === 0
              ? `'${B}' is the trailing symbol`
              : `RHS suffix '${beta.join(' ')}' derives ε`;
            if (addFollowSymbol(
              B,
              sym,
              `${ruleName}: ${condition} in ${p.toString()}, inheriting '${sym}' from FOLLOW(${A})`,
              p
            )) {
              changed = true;
            }
          }
        }
      }
    }
  }

  return { followSets, followDerivations };
}
