/**
 * Ordered subtopic curriculum for each skill — index in this array IS the
 * user's "level" for that skill (0 = most basic). Progress is tracked by
 * how far along this list a user has advanced.
 */
export const SKILL_CURRICULUM: Record<string, string[]> = {
  DSA: [
    'Arrays',
    'Strings',
    'Linked List',
    'Stacks',
    'Queues',
    'Recursion',
    'Trees',
    'Binary Search Trees',
    'Heaps',
    'Graphs',
    'Dynamic Programming',
    'Greedy Algorithms',
    'Backtracking',
  ],
  React: [
    'JSX & Components',
    'Props & State',
    'Event Handling',
    'useEffect & Lifecycle',
    'Hooks (useState/useRef/useMemo)',
    'Context API',
    'Custom Hooks',
    'Performance Optimization',
    'Server Components',
    'State Management Patterns',
  ],
  DBMS: [
    'Basics of DBMS & RDBMS',
    'SQL Fundamentals (SELECT, WHERE, JOIN)',
    'Keys & Constraints',
    'Normalization (1NF-3NF)',
    'Transactions & ACID',
    'Indexing',
    'Query Optimization',
    'Concurrency Control',
  ],
  Java: [
    'Syntax & Basics',
    'OOPs in Java',
    'Collections Framework',
    'Exception Handling',
    'Generics',
    'Multithreading',
    'Streams & Lambdas',
    'JVM Internals',
  ],
  OOPs: [
    'Classes & Objects',
    'Encapsulation',
    'Inheritance',
    'Polymorphism',
    'Abstraction',
    'SOLID Principles',
    'Design Patterns',
  ],
  Aptitude: [
    'Number System',
    'Percentages',
    'Profit & Loss',
    'Time & Work',
    'Time, Speed & Distance',
    'Permutations & Combinations',
    'Probability',
    'Logical Reasoning',
  ],
  Communication: [
    'Self-Introduction',
    'Clarity & Structure',
    'Filler Word Reduction',
    'Storytelling (STAR Method)',
    'Handling Follow-up Questions',
    'Confidence & Tone',
    'Group Discussion Etiquette',
  ],
}

export function getCurriculum(skill: string): string[] {
  return SKILL_CURRICULUM[skill] ?? ['Fundamentals', 'Core Concepts', 'Applied Problems', 'Advanced Topics']
}
