/**
 * LL(1) Parsing Table Constructor & Conflict Detector.
 * Dynamically constructs table cells M[NonTerminal, Terminal] and pinpoints conflicts.
 */

import { EPSILON, END_MARKER } from './grammar-parser.js';
import { firstOfSequence } from './first-follow.js';

export class Conflict {
  constructor(nonTerminal, terminal, productions, type) {
    this.nonTerminal = nonTerminal; // Row
    this.terminal = terminal;       // Column
    this.productions = productions; // Array of conflicting Production objects
    this.type = type;               // 'FIRST/FIRST' or 'FIRST/FOLLOW'
  }

  toString() {
    const prods = this.productions.map(p => p.toString()).join(' vs ');
    return `Conflict at M[${this.nonTerminal}, ${this.terminal}]: ${prods} (${this.type})`;
  }
}

export class ParsingTable {
  constructor(grammar, firstSets, followSets, nullable) {
    this.grammar = grammar;
    this.firstSets = firstSets;
    this.followSets = followSets;
    this.nullable = nullable;

    // Rows: Non-terminals
    this.rows = [
      grammar.startSymbol,
      ...Array.from(grammar.nonTerminals).filter(nt => nt !== grammar.startSymbol)
    ];

    // Columns: Terminals + End marker ($)
    const sortedTerminals = Array.from(grammar.terminals).sort();
    this.columns = [...sortedTerminals, END_MARKER];

    // Table matrix: Map<string (NT), Map<string (Terminal), Array<Production>>>
    this.table = new Map();
    for (const r of this.rows) {
      const colMap = new Map();
      for (const c of this.columns) {
        colMap.set(c, []);
      }
      this.table.set(r, colMap);
    }

    this.conflicts = [];
    this.isLL1 = true;
    this.cellReasons = new Map(); // key: `${nt}#${term}` -> [reason string]

    this.build();
  }

  build() {
    for (const prod of this.grammar.productions) {
      const A = prod.lhs;
      const alpha = prod.rhs;
      const firstAlpha = firstOfSequence(alpha, this.grammar, this.firstSets, this.nullable);

      // 1. For each terminal a in FIRST(alpha) - {ε}, add A -> alpha to M[A, a]
      for (const a of firstAlpha) {
        if (a !== EPSILON && this.table.get(A)?.has(a)) {
          this.addEntry(A, a, prod, `FIRST(${alpha.join(' ')}) contains '${a}'`, 'FIRST/FIRST');
        }
      }

      // 2. If ε in FIRST(alpha), for each b in FOLLOW(A), add A -> alpha to M[A, b]
      if (firstAlpha.has(EPSILON)) {
        const followA = this.followSets.get(A) || new Set();
        for (const b of followA) {
          if (this.table.get(A)?.has(b)) {
            const reason = alpha.length === 1 && alpha[0] === EPSILON
              ? `${prod.toString()} is ε-production and '${b}' ∈ FOLLOW(${A})`
              : `RHS '${alpha.join(' ')}' derives ε and '${b}' ∈ FOLLOW(${A})`;
            this.addEntry(A, b, prod, reason, 'FIRST/FOLLOW');
          }
        }
      }
    }

    // Determine LL(1) status
    this.isLL1 = this.conflicts.length === 0;
  }

  addEntry(row, col, production, reason, conflictType) {
    const cellEntries = this.table.get(row).get(col);

    // Check if identical production already added
    const alreadyExists = cellEntries.some(p => p.id === production.id);
    if (!alreadyExists) {
      cellEntries.push(production);

      const cellKey = `${row}#${col}`;
      if (!this.cellReasons.has(cellKey)) {
        this.cellReasons.set(cellKey, []);
      }
      this.cellReasons.get(cellKey).push({ production, reason });

      // If cell now has > 1 production, a conflict has occurred!
      if (cellEntries.length === 2) {
        // Record conflict
        const conflict = new Conflict(row, col, cellEntries, conflictType);
        this.conflicts.push(conflict);
      } else if (cellEntries.length > 2) {
        // Update existing conflict with additional production
        const existing = this.conflicts.find(c => c.nonTerminal === row && c.terminal === col);
        if (existing) {
          existing.productions = [...cellEntries];
        }
      }
    }
  }

  getEntry(row, col) {
    return this.table.get(row)?.get(col) || [];
  }

  hasConflict(row, col) {
    return this.getEntry(row, col).length > 1;
  }

  getReasons(row, col) {
    return this.cellReasons.get(`${row}#${col}`) || [];
  }
}

/**
 * Builds the LL(1) parsing table from grammar and computed sets.
 */
export function buildParsingTable(grammar, firstSets, followSets, nullable) {
  return new ParsingTable(grammar, firstSets, followSets, nullable);
}
