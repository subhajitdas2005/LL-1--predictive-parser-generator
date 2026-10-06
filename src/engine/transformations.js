/**
 * Grammar Transformations and Diagnostics:
 * 1. Left Recursion Detection & Elimination
 * 2. Left Factoring Detection & Factoring
 * 3. Ambiguity & Decidability Notes
 */

import { EPSILON, parseGrammar } from './grammar-parser.js';

/**
 * Detects direct and indirect left recursion in the grammar.
 *
 * @param {Grammar} grammar
 * @returns {{
 *   hasLeftRecursion: boolean,
 *   direct: Array<{ nonTerminal: string, productions: Array<Object> }>,
 *   indirect: Array<{ cycle: Array<string>, path: Array<string> }>
 * }}
 */
export function detectLeftRecursion(grammar) {
  const direct = [];
  const indirect = [];

  for (const nt of grammar.nonTerminals) {
    const prods = grammar.getProductionsFor(nt);
    const directProds = prods.filter(p => p.rhs.length > 0 && p.rhs[0] === nt);
    if (directProds.length > 0) {
      direct.push({
        nonTerminal: nt,
        productions: directProds.map(p => p.toString())
      });
    }
  }

  // Detect indirect left recursion via cycle detection in the first-symbol graph
  const adj = new Map();
  for (const nt of grammar.nonTerminals) {
    adj.set(nt, new Set());
    const prods = grammar.getProductionsFor(nt);
    for (const p of prods) {
      if (p.rhs.length > 0 && grammar.nonTerminals.has(p.rhs[0]) && p.rhs[0] !== nt) {
        adj.get(nt).add(p.rhs[0]);
      }
    }
  }

  const visited = new Set();
  const recStack = [];

  function dfs(curr) {
    visited.add(curr);
    recStack.push(curr);

    const neighbors = adj.get(curr) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else {
        const cycleIdx = recStack.indexOf(neighbor);
        if (cycleIdx !== -1) {
          const cycle = recStack.slice(cycleIdx).concat(neighbor);
          const cycleKey = cycle.join(' -> ');
          if (!indirect.some(item => item.path === cycleKey)) {
            indirect.push({ cycle, path: cycleKey });
          }
        }
      }
    }

    recStack.pop();
  }

  for (const nt of grammar.nonTerminals) {
    if (!visited.has(nt)) {
      dfs(nt);
    }
  }

  return {
    hasLeftRecursion: direct.length > 0 || indirect.length > 0,
    direct,
    indirect
  };
}

/**
 * Automatically eliminates direct left recursion:
 * A -> A α1 | A α2 | β1 | β2
 * becomes:
 * A -> β1 A' | β2 A'
 * A' -> α1 A' | α2 A' | ε
 *
 * @param {Grammar} grammar
 * @returns {{ transformedGrammarText: string, modified: boolean, transformations: Array<Object> }}
 */
export function eliminateDirectLeftRecursion(grammar) {
  const transformations = [];
  const newProductionsByLhs = new Map();

  for (const nt of grammar.nonTerminals) {
    const prods = grammar.getProductionsFor(nt);
    const alphaList = []; // Recursive suffixes: A -> A alpha
    const betaList = [];  // Non-recursive alternatives: A -> beta

    for (const p of prods) {
      if (p.rhs.length > 0 && p.rhs[0] === nt) {
        const alpha = p.rhs.slice(1);
        alphaList.push(alpha.length > 0 ? alpha : [EPSILON]);
      } else {
        betaList.push(p.rhs);
      }
    }

    if (alphaList.length > 0) {
      // Find a unique new non-terminal name, e.g. A' or A_prime
      let newNt = `${nt}'`;
      while (grammar.nonTerminals.has(newNt) || newProductionsByLhs.has(newNt)) {
        newNt += "'";
      }

      // If there are no beta productions (e.g. only A -> A a), we can't derive anything without a base
      const effectiveBetas = betaList.length > 0 ? betaList : [[EPSILON]];

      // A -> beta1 A' | beta2 A' ...
      const newAProds = effectiveBetas.map(beta => {
        if (beta.length === 1 && beta[0] === EPSILON) {
          return [newNt];
        }
        return [...beta, newNt];
      });

      // A' -> alpha1 A' | alpha2 A' | ... | ε
      const newPrimeProds = alphaList.map(alpha => {
        if (alpha.length === 1 && alpha[0] === EPSILON) {
          return [newNt];
        }
        return [...alpha, newNt];
      });
      newPrimeProds.push([EPSILON]);

      newProductionsByLhs.set(nt, newAProds);
      newProductionsByLhs.set(newNt, newPrimeProds);

      transformations.push({
        originalNt: nt,
        newNt,
        alphas: alphaList.map(a => a.join(' ')),
        betas: effectiveBetas.map(b => b.join(' '))
      });
    } else {
      newProductionsByLhs.set(nt, prods.map(p => p.rhs));
    }
  }

  // Format into grammar string
  const outputLines = [];
  for (const [lhs, rhsList] of newProductionsByLhs.entries()) {
    const alts = rhsList.map(rhs => rhs.join(' ')).join(' | ');
    outputLines.push(`${lhs} -> ${alts}`);
  }

  return {
    transformedGrammarText: outputLines.join('\n'),
    modified: transformations.length > 0,
    transformations
  };
}

/**
 * Detects common prefixes among alternatives of the same non-terminal (Left Factoring candidates).
 *
 * @param {Grammar} grammar
 * @returns {{
 *   needsFactoring: boolean,
 *   candidates: Array<{ nonTerminal: string, prefix: string, alternatives: Array<string> }>
 * }}
 */
export function detectLeftFactoring(grammar) {
  const candidates = [];

  for (const nt of grammar.nonTerminals) {
    const prods = grammar.getProductionsFor(nt);
    if (prods.length < 2) continue;

    // Check all pairs for common prefixes
    const seenPairs = new Set();
    for (let i = 0; i < prods.length; i++) {
      for (let j = i + 1; j < prods.length; j++) {
        const p1 = prods[i].rhs;
        const p2 = prods[j].rhs;

        let commonLen = 0;
        while (commonLen < p1.length && commonLen < p2.length && p1[commonLen] === p2[commonLen]) {
          commonLen++;
        }

        if (commonLen > 0) {
          const prefix = p1.slice(0, commonLen).join(' ');
          const pairKey = `${nt}#${prefix}`;
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            // Collect all alternatives sharing this prefix
            const matchedProds = prods.filter(p => p.rhs.slice(0, commonLen).join(' ') === prefix);
            candidates.push({
              nonTerminal: nt,
              prefix,
              alternatives: matchedProds.map(p => p.toString())
            });
          }
        }
      }
    }
  }

  return {
    needsFactoring: candidates.length > 0,
    candidates
  };
}

/**
 * Automatically applies left factoring for non-terminals sharing common prefixes:
 * A -> alpha beta1 | alpha beta2 | gamma
 * becomes:
 * A -> alpha A' | gamma
 * A' -> beta1 | beta2
 *
 * @param {Grammar} grammar
 * @returns {{ transformedGrammarText: string, modified: boolean, factored: Array<Object> }}
 */
export function leftFactorGrammar(grammar) {
  const factored = [];
  const lines = [];

  // Group productions by LHS
  const currentProdsMap = new Map();
  for (const nt of grammar.nonTerminals) {
    currentProdsMap.set(nt, grammar.getProductionsFor(nt).map(p => [...p.rhs]));
  }

  let modified = false;

  for (const [nt, rhsList] of currentProdsMap.entries()) {
    if (rhsList.length < 2) {
      lines.push(`${nt} -> ${rhsList.map(r => r.join(' ')).join(' | ')}`);
      continue;
    }

    // Find longest common prefix among pairs
    let bestPrefix = [];
    let bestMatched = [];

    for (let i = 0; i < rhsList.length; i++) {
      for (let j = i + 1; j < rhsList.length; j++) {
        const r1 = rhsList[i];
        const r2 = rhsList[j];
        let k = 0;
        while (k < r1.length && k < r2.length && r1[k] === r2[k]) {
          k++;
        }
        if (k > bestPrefix.length) {
          const prefix = r1.slice(0, k);
          const matched = rhsList.filter(r => r.length >= k && r.slice(0, k).every((s, idx) => s === prefix[idx]));
          if (matched.length > 1) {
            bestPrefix = prefix;
            bestMatched = matched;
          }
        }
      }
    }

    if (bestPrefix.length > 0) {
      modified = true;
      let newNt = `${nt}'`;
      while (grammar.nonTerminals.has(newNt) || currentProdsMap.has(newNt)) {
        newNt += "'";
      }

      // Remainder for new non-terminal
      const primeAlts = bestMatched.map(r => {
        const suffix = r.slice(bestPrefix.length);
        return suffix.length === 0 ? [EPSILON] : suffix;
      });

      // Remaining untouched alternatives
      const untouchedAlts = rhsList.filter(r => !bestMatched.includes(r));

      // A -> prefix A' | untouched
      const newAAlts = [[...bestPrefix, newNt], ...untouchedAlts];

      lines.push(`${nt} -> ${newAAlts.map(r => r.join(' ')).join(' | ')}`);
      lines.push(`${newNt} -> ${primeAlts.map(r => r.join(' ')).join(' | ')}`);

      factored.push({
        nonTerminal: nt,
        newNt,
        prefix: bestPrefix.join(' '),
        primeAlts: primeAlts.map(r => r.join(' '))
      });
    } else {
      lines.push(`${nt} -> ${rhsList.map(r => r.join(' ')).join(' | ')}`);
    }
  }

  return {
    transformedGrammarText: lines.join('\n'),
    modified,
    factored
  };
}
