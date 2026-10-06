/**
 * Engine Test Suite for Universal LL(1) Predictive Parser Generator.
 * Executes all 7 required tests + additional edge cases dynamically.
 */

import { LL1Engine, EPSILON, END_MARKER } from '../engine/ll1-engine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function setEquals(setA, setB) {
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

console.log('====================================================');
console.log('STARTING LL(1) COMPILER ENGINE VERIFICATION SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Simple Epsilon Grammar
// S -> a A
// A -> b A | ε
// ----------------------------------------------------
console.log('TEST 1: S -> a A, A -> b A | ε');
{
  const grammarText = `
    S -> a A
    A -> b A | ε
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.success, 'Analysis succeeds without syntax errors');
  assert(result.isLL1, 'Grammar is recognized as LL(1)');
  assert(result.conflictsCount === 0, 'Zero conflicts detected');
  assert(result.nullable.includes('A') && !result.nullable.includes('S'), 'A is nullable, S is not nullable');

  const firstS = result.firstSets.get('S');
  const firstA = result.firstSets.get('A');
  assert(setEquals(firstS, new Set(['a'])), `FIRST(S) is {a}, got {${Array.from(firstS).join(',')}}`);
  assert(setEquals(firstA, new Set(['b', EPSILON])), `FIRST(A) is {b, ε}, got {${Array.from(firstA).join(',')}}`);

  const followS = result.followSets.get('S');
  const followA = result.followSets.get('A');
  assert(setEquals(followS, new Set([END_MARKER])), `FOLLOW(S) is {$}, got {${Array.from(followS).join(',')}}`);
  assert(setEquals(followA, new Set([END_MARKER])), `FOLLOW(A) is {$}, got {${Array.from(followA).join(',')}}`);

  // Parse string "a b b"
  const parseRes = LL1Engine.parseString(result.parsingTable, 'a b b');
  assert(parseRes.success, 'Predictive parsing succeeds on "a b b"');
  assert(parseRes.trace.length > 0, `Generated dynamic trace of ${parseRes.trace.length} steps`);
}
console.log('');

// ----------------------------------------------------
// TEST 2: Classic Arithmetic Expressions
// E -> T E'
// E' -> + T E' | ε
// T -> F T'
// T' -> * F T' | ε
// F -> ( E ) | id
// ----------------------------------------------------
console.log('TEST 2: Arithmetic Expression Grammar');
{
  const grammarText = `
    E -> T E'
    E' -> + T E' | ε
    T -> F T'
    T' -> * F T' | ε
    F -> ( E ) | id
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.success, 'Arithmetic grammar parsed cleanly');
  assert(result.isLL1, 'Grammar is verified LL(1)');
  assert(result.conflictsCount === 0, 'No conflicts in arithmetic expression table');

  const firstE = result.firstSets.get('E');
  const firstT = result.firstSets.get('T');
  const firstF = result.firstSets.get('F');
  const expectedFirstETF = new Set(['(', 'id']);

  assert(setEquals(firstE, expectedFirstETF), `FIRST(E) is {(, id}, got {${Array.from(firstE).join(',')}}`);
  assert(setEquals(firstT, expectedFirstETF), `FIRST(T) is {(, id}, got {${Array.from(firstT).join(',')}}`);
  assert(setEquals(firstF, expectedFirstETF), `FIRST(F) is {(, id}, got {${Array.from(firstF).join(',')}}`);

  const followE = result.followSets.get('E');
  const followEprime = result.followSets.get("E'");
  const followT = result.followSets.get('T');
  const followTprime = result.followSets.get("T'");
  const followF = result.followSets.get('F');

  assert(setEquals(followE, new Set([END_MARKER, ')'])), `FOLLOW(E) is {$, )}`);
  assert(setEquals(followEprime, new Set([END_MARKER, ')'])), `FOLLOW(E') is {$, )}`);
  assert(setEquals(followT, new Set(['+', END_MARKER, ')'])), `FOLLOW(T) is {+, $, )}`);
  assert(setEquals(followTprime, new Set(['+', END_MARKER, ')'])), `FOLLOW(T') is {+, $, )}`);
  assert(setEquals(followF, new Set(['*', '+', END_MARKER, ')'])), `FOLLOW(F) is {*, +, $, )}`);

  // Test predictive parse of "id + id * id"
  const parseRes = LL1Engine.parseString(result.parsingTable, 'id + id * id');
  assert(parseRes.success, 'Successfully parsed "id + id * id"');
  assert(parseRes.trace[parseRes.trace.length - 1].action === 'ACCEPT', 'Last trace action is ACCEPT');

  // Test parentheses "( id + id ) * id"
  const parseParen = LL1Engine.parseString(result.parsingTable, '( id + id ) * id');
  assert(parseParen.success, 'Successfully parsed "( id + id ) * id"');

  // Test invalid string "id + *"
  const parseFail = LL1Engine.parseString(result.parsingTable, 'id + *');
  assert(!parseFail.success, 'Correctly rejected invalid syntax "id + *"');
  assert(parseFail.error !== null, `Informative error generated: ${parseFail.error.split('\n')[0]}`);
}
console.log('');

// ----------------------------------------------------
// TEST 3: Conflict Detection (Common Prefix / Non-LL(1))
// S -> a A | a B
// A -> b
// B -> c
// ----------------------------------------------------
console.log('TEST 3: Conflict Detection S -> a A | a B');
{
  const grammarText = `
    S -> a A | a B
    A -> b
    B -> c
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(!result.isLL1, 'Grammar correctly identified as NOT LL(1)');
  assert(result.conflictsCount > 0, `Detected ${result.conflictsCount} conflict(s)`);
  const conflict = result.conflicts[0];
  assert(conflict.nonTerminal === 'S' && conflict.terminal === 'a', `Conflict located at M[S, a]`);
  assert(result.leftFactoring.needsFactoring, 'Left factoring warning triggered');
}
console.log('');

// ----------------------------------------------------
// TEST 4: Epsilon Propagation
// S -> A B
// A -> a | ε
// B -> b | ε
// ----------------------------------------------------
console.log('TEST 4: Epsilon Propagation S -> A B, A -> a | ε, B -> b | ε');
{
  const grammarText = `
    S -> A B
    A -> a | ε
    B -> b | ε
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.nullable.includes('S'), 'S is correctly calculated as nullable');
  assert(result.nullable.includes('A'), 'A is calculated as nullable');
  assert(result.nullable.includes('B'), 'B is calculated as nullable');

  const firstS = result.firstSets.get('S');
  assert(setEquals(firstS, new Set(['a', 'b', EPSILON])), `FIRST(S) correctly contains {a, b, ε}, got {${Array.from(firstS).join(',')}}`);
}
console.log('');

// ----------------------------------------------------
// TEST 5: Indirect FIRST Chain
// S -> A
// A -> B
// B -> c
// ----------------------------------------------------
console.log('TEST 5: Indirect FIRST S -> A, A -> B, B -> c');
{
  const grammarText = `
    S -> A
    A -> B
    B -> c
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  const firstS = result.firstSets.get('S');
  assert(setEquals(firstS, new Set(['c'])), `Indirect FIRST(S) successfully computed as {c}`);
}
console.log('');

// ----------------------------------------------------
// TEST 6: Nullable Behavior with S -> a S b | ε
// ----------------------------------------------------
console.log('TEST 6: Nullable behavior S -> a S b | ε');
{
  const grammarText = `
    S -> a S b | ε
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.nullable.includes('S'), 'S is nullable');
  const firstS = result.firstSets.get('S');
  assert(setEquals(firstS, new Set(['a', EPSILON])), `FIRST(S) is {a, ε}`);

  const followS = result.followSets.get('S');
  assert(setEquals(followS, new Set(['b', END_MARKER])), `FOLLOW(S) is {b, $}`);
}
console.log('');

// ----------------------------------------------------
// TEST 7: Direct Left Recursion Detection
// E -> E + T | T
// ----------------------------------------------------
console.log('TEST 7: Left Recursion Detection E -> E + T | T');
{
  const grammarText = `
    E -> E + T | T
    T -> id
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.leftRecursion.hasLeftRecursion, 'Direct left recursion successfully detected');
  assert(result.leftRecursion.direct.some(d => d.nonTerminal === 'E'), 'Left recursion pinpointed on non-terminal E');

  // Test elimination transformation
  const transformed = LL1Engine.eliminateLeftRecursion(result.grammar);
  assert(transformed.modified, 'Left recursion elimination successfully generated transformed grammar');
  console.log(`    Transformed text:\n    ${transformed.transformedGrammarText.split('\n').join('\n    ')}`);
}
console.log('');

// ----------------------------------------------------
// TEST 8: Multi-character Terminals
// stmt -> while ( cond ) stmt | id = num ;
// cond -> id == num
// ----------------------------------------------------
console.log('TEST 8: Multi-character Terminals Detection & Tokenization');
{
  const grammarText = `
    stmt -> while ( cond ) stmt | id = num ;
    cond -> id == num
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.grammar.terminals.has('while'), 'Terminal "while" identified as atomic multi-char terminal');
  assert(result.grammar.terminals.has('id'), 'Terminal "id" identified as atomic multi-char terminal');
  assert(result.grammar.terminals.has('num'), 'Terminal "num" identified as atomic multi-char terminal');
  assert(result.grammar.terminals.has('=='), 'Terminal "==" identified as atomic multi-char terminal');
}
console.log('');

// ----------------------------------------------------
// TEST 9: Cascade of multiple nullable symbols
// S -> A B C
// A -> ε
// B -> ε
// C -> c
// ----------------------------------------------------
console.log('TEST 9: Multiple nullable symbols cascading S -> A B C');
{
  const grammarText = `
    S -> A B C
    A -> ε
    B -> ε
    C -> c
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  const firstS = result.firstSets.get('S');
  assert(setEquals(firstS, new Set(['c'])), `FIRST(S) should be {c} through nullable A and B, got {${Array.from(firstS).join(',')}}`);
  assert(!result.nullable.includes('S'), 'S is NOT nullable because C is not nullable');
}
console.log('');

// ----------------------------------------------------
// TEST 10: Grammar C (Prompt): S -> ( S ) S | ε
// ----------------------------------------------------
console.log('TEST 10: Grammar C: S -> ( S ) S | ε');
{
  const grammarText = `
    S -> ( S ) S | ε
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.success, 'Grammar C parsed cleanly');
  assert(result.nullable.includes('S'), 'S is nullable');
  const firstS = result.firstSets.get('S');
  assert(setEquals(firstS, new Set(['(', EPSILON])), `FIRST(S) is {(, ε}, got {${Array.from(firstS).join(',')}}`);
  const followS = result.followSets.get('S');
  assert(setEquals(followS, new Set([')', END_MARKER])), `FOLLOW(S) is {), $}, got {${Array.from(followS).join(',')}}`);
  assert(result.isLL1, 'Grammar C is LL(1) with 0 conflicts');
  const parseRes = LL1Engine.parseString(result.parsingTable, '( ) ( )');
  assert(parseRes.success, 'Grammar C successfully parsed balanced parentheses "( ) ( )"');
}
console.log('');

// ----------------------------------------------------
// TEST 11: Grammar D (Prompt): S -> a S b | ε
// ----------------------------------------------------
console.log('TEST 11: Grammar D: S -> a S b | ε');
{
  const grammarText = `
    S -> a S b | ε
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.success, 'Grammar D parsed cleanly');
  assert(result.isLL1, 'Grammar D is LL(1)');
  const parseRes = LL1Engine.parseString(result.parsingTable, 'a a b b');
  assert(parseRes.success, 'Grammar D successfully parsed "a a b b"');
}
console.log('');

// ----------------------------------------------------
// TEST 12: Grammar E (Prompt): E -> T, T -> int | float | id
// ----------------------------------------------------
console.log('TEST 12: Grammar E: E -> T, T -> int | float | id');
{
  const grammarText = `
    E -> T
    T -> int | float | id
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.success, 'Grammar E parsed cleanly');
  assert(result.isLL1, 'Grammar E is LL(1)');
  assert(result.grammar.terminals.has('int') && result.grammar.terminals.has('float') && result.grammar.terminals.has('id'), 'Multi-char types int, float, id are terminals');
  const parseRes = LL1Engine.parseString(result.parsingTable, 'float');
  assert(parseRes.success, 'Grammar E parsed "float"');
}
console.log('');

// ----------------------------------------------------
// TEST 13: Grammar F (Prompt): S -> A B, A -> a A | ε, B -> b B | c
// ----------------------------------------------------
console.log('TEST 13: Grammar F: S -> A B, A -> a A | ε, B -> b B | c');
{
  const grammarText = `
    S -> A B
    A -> a A | ε
    B -> b B | c
  `;
  const result = LL1Engine.analyzeGrammar(grammarText);

  assert(result.success, 'Grammar F parsed cleanly');
  assert(result.isLL1, 'Grammar F is LL(1)');
  const firstS = result.firstSets.get('S');
  assert(setEquals(firstS, new Set(['a', 'b', 'c'])), `FIRST(S) is {a, b, c}, got {${Array.from(firstS).join(',')}}`);
  const parseRes = LL1Engine.parseString(result.parsingTable, 'a a b c');
  assert(parseRes.success, 'Grammar F parsed "a a b c"');
}
console.log('');

console.log('====================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
