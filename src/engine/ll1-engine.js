/**
 * LL(1) Parser Engine Facade.
 * Main entry point coordinating parsing, analysis, FIRST/FOLLOW, table generation,
 * conflict diagnostics, and input execution.
 */

import { parseGrammar, EPSILON, END_MARKER } from './grammar-parser.js';
import { calculateNullable, calculateFirst, calculateFollow, firstOfSequence } from './first-follow.js';
import { buildParsingTable } from './table-builder.js';
import { parseInput, tokenizeInput } from './predictive-parser.js';
import {
  detectLeftRecursion,
  eliminateDirectLeftRecursion,
  detectLeftFactoring,
  leftFactorGrammar
} from './transformations.js';

export class LL1Engine {
  /**
   * Dynamically analyzes any valid CFG.
   *
   * @param {string} grammarText - Raw CFG string
   * @param {string|null} customStartSymbol - User override for start symbol
   * @returns {Object} Complete analysis package
   */
  static analyzeGrammar(grammarText, customStartSymbol = null) {
    const grammar = parseGrammar(grammarText, customStartSymbol);

    if (grammar.errors.length > 0) {
      return {
        success: false,
        grammar,
        errors: grammar.errors,
        warnings: grammar.warnings
      };
    }

    // 1. Calculate Nullable Non-Terminals
    const { nullable, derivationSteps: nullableDerivations } = calculateNullable(grammar);

    // 2. Calculate FIRST sets
    const { firstSets, firstDerivations } = calculateFirst(grammar, nullable);

    // 3. Calculate FOLLOW sets
    const { followSets, followDerivations } = calculateFollow(grammar, firstSets, nullable);

    // 4. Construct LL(1) Parsing Table & detect conflicts
    const parsingTable = buildParsingTable(grammar, firstSets, followSets, nullable);

    // 5. Detect Left Recursion & Common Prefixes (Left Factoring)
    const leftRecursion = detectLeftRecursion(grammar);
    const leftFactoring = detectLeftFactoring(grammar);

    // Format sets into easy-to-use array objects for UI rendering
    const formattedFirst = [];
    for (const nt of grammar.nonTerminals) {
      formattedFirst.push({
        nonTerminal: nt,
        symbols: Array.from(firstSets.get(nt) || []).sort(),
        derivations: firstDerivations.get(nt) || []
      });
    }

    const formattedFollow = [];
    for (const nt of grammar.nonTerminals) {
      formattedFollow.push({
        nonTerminal: nt,
        symbols: Array.from(followSets.get(nt) || []).sort(),
        derivations: followDerivations.get(nt) || []
      });
    }

    return {
      success: true,
      grammar,
      nullable: Array.from(nullable),
      nullableDerivations,
      firstSets,
      followSets,
      formattedFirst,
      formattedFollow,
      parsingTable,
      isLL1: parsingTable.isLL1,
      conflicts: parsingTable.conflicts,
      conflictsCount: parsingTable.conflicts.length,
      leftRecursion,
      leftFactoring,
      warnings: grammar.warnings,
      errors: grammar.errors
    };
  }

  /**
   * Helper to compute FIRST of an arbitrary sequence using pre-calculated sets.
   */
  static firstOfSequence(sequence, grammar, firstSets, nullable) {
    return firstOfSequence(sequence, grammar, firstSets, nullable);
  }

  /**
   * Tokenize and parse an input string against the generated table.
   */
  static parseString(parsingTable, inputStr, maxSteps = 1000) {
    return parseInput(parsingTable, inputStr, maxSteps);
  }

  /**
   * Tokenizes user input.
   */
  static tokenize(inputStr, terminals) {
    return tokenizeInput(inputStr, terminals);
  }

  /**
   * Transforms grammar to eliminate left recursion.
   */
  static eliminateLeftRecursion(grammar) {
    return eliminateDirectLeftRecursion(grammar);
  }

  /**
   * Transforms grammar to apply left factoring.
   */
  static leftFactor(grammar) {
    return leftFactorGrammar(grammar);
  }
}

export { EPSILON, END_MARKER };
