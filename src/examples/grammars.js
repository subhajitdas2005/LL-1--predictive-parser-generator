/**
 * Curated Example Grammars Library for Demonstration & Testing.
 * NOTE: These are ONLY test cases. The engine parses and generates everything dynamically!
 */

export const EXAMPLE_GRAMMARS = [
  {
    id: 'arithmetic',
    name: '1. Arithmetic Expressions (Classic LL(1))',
    category: 'LL(1) Standard',
    description: 'Standard arithmetic grammar with operator precedence (+, *) and parentheses eliminated of left-recursion.',
    grammar: `E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id`,
    defaultInput: 'id + id * id',
    notes: 'Classic dragon book grammar. Perfectly unambiguous and LL(1).'
  },
  {
    id: 'simple-epsilon',
    name: '2. Simple Epsilon & Nullable (LL(1))',
    category: 'LL(1) Standard',
    description: 'Grammar with epsilon alternative in non-terminal A.',
    grammar: `S -> a A
A -> b A | ε`,
    defaultInput: 'a b b',
    notes: 'A is nullable. Generates strings like a, ab, abb, abbb...'
  },
  {
    id: 'nested-parens',
    name: '3. Nested Balanced Parentheses (LL(1))',
    category: 'LL(1) Standard',
    description: 'Grammar deriving sequences of balanced matched parentheses.',
    grammar: `S -> ( S ) S | ε`,
    defaultInput: '( ( ) ) ( )',
    notes: 'Unambiguous LL(1) parenthesized language.'
  },
  {
    id: 'symmetrical-nullable',
    name: '4. Symmetrical a^n b^n (LL(1))',
    category: 'LL(1) Standard',
    description: 'Matches equal numbers of a and b symbols.',
    grammar: `S -> a S b | ε`,
    defaultInput: 'a a b b',
    notes: 'S is nullable with FOLLOW(S) = {b, $}.'
  },
  {
    id: 'type-specifiers',
    name: '5. Multi-character Types (LL(1))',
    category: 'Multi-character Terminals',
    description: 'Demonstrates multi-character terminals (int, float, id).',
    grammar: `E -> T
T -> int | float | id`,
    defaultInput: 'float',
    notes: 'Demonstrates tokenization of keywords vs single characters.'
  },
  {
    id: 'chain-nullable',
    name: '6. Nullable Cascade Chain (LL(1))',
    category: 'LL(1) Standard',
    description: 'Multiple non-terminals with epsilon propagating through the start symbol.',
    grammar: `S -> A B
A -> a A | ε
B -> b B | c`,
    defaultInput: 'a a b c',
    notes: 'FIRST(S) incorporates FIRST(B) because A is nullable.'
  },
  {
    id: 'common-prefix',
    name: '7. Common Prefix Conflict (Non-LL(1))',
    category: 'Non-LL(1) Conflicts',
    description: 'Two alternatives share the prefix "a", creating a FIRST/FIRST conflict.',
    grammar: `S -> a A | a B
A -> b
B -> c`,
    defaultInput: 'a b',
    notes: 'Requires Left Factoring to become LL(1). Produces conflict at M[S, a].'
  },
  {
    id: 'left-recursion',
    name: '8. Direct Left Recursion (Non-LL(1))',
    category: 'Non-LL(1) Conflicts',
    description: 'Left-recursive grammar E -> E + T, which causes infinite predictive loop.',
    grammar: `E -> E + T | T
T -> id`,
    defaultInput: 'id + id',
    notes: 'Contains direct left recursion on E. Use the auto-transform tool to eliminate it!'
  },
  {
    id: 'statements-control',
    name: '9. Control Flow Statements (Multi-char)',
    category: 'Compiler Constructs',
    description: 'Imperative programming language statement grammar with while/if constructs.',
    grammar: `stmt -> while ( cond ) stmt | id = num ;
cond -> id == num`,
    defaultInput: 'while ( id == num ) id = num ;',
    notes: 'Exercises multi-character tokens like while, ==, num, and punctuation.'
  },
  {
    id: 'dangling-else',
    name: '10. Classic Dangling-Else Ambiguity',
    category: 'Non-LL(1) Conflicts',
    description: 'The famous ambiguous if-then-else construct producing FIRST/FOLLOW conflict.',
    grammar: `stmt -> if expr then stmt rest
rest -> else stmt | ε
expr -> id`,
    defaultInput: 'if id then if id then id else id',
    notes: 'Ambiguous grammar resulting in LL(1) conflict at M[rest, else].'
  }
];
