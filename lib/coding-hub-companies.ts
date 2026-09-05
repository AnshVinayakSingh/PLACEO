/**
 * Preset "quick pick" companies shown as boxes on the Coding Hub page.
 * `folderHint` is our best-known GitHub folder name for this company in the
 * source dataset — used as the first guess before we try case variations.
 * Any company NOT in this list can still be searched by name; the API will
 * try to resolve it the same way.
 */
export type PresetCompany = {
  name: string
  folderHint: string
  color: string
}

/**
 * Basic → advanced ordering for grouping questions by topic on the Coding Hub
 * page. Anything not listed falls to the end. Shared between the server-side
 * fetch/cache logic and the client page (this file has zero server-only
 * imports, so it's safe in both bundles).
 */
export const TOPIC_DIFFICULTY_ORDER = [
  'Array',
  'String',
  'Hash Table',
  'Two Pointers',
  'Sliding Window',
  'Math',
  'Sorting',
  'Bit Manipulation',
  'Stack',
  'Queue',
  'Linked List',
  'Binary Search',
  'Recursion',
  'Divide and Conquer',
  'Greedy',
  'Tree',
  'Binary Tree',
  'Binary Search Tree',
  'Depth-First Search',
  'Breadth-First Search',
  'Heap (Priority Queue)',
  'Trie',
  'Graph',
  'Union Find',
  'Backtracking',
  'Dynamic Programming',
]

export const PRESET_COMPANIES: PresetCompany[] = [
  // Big tech / product-based (global, hire heavily from India too)
  { name: 'Google', folderHint: 'Google', color: 'oklch(0.62 0.2 265)' },
  { name: 'Amazon', folderHint: 'Amazon', color: 'oklch(0.7 0.19 60)' },
  { name: 'Microsoft', folderHint: 'Microsoft', color: 'oklch(0.62 0.2 245)' },
  { name: 'Meta', folderHint: 'Meta', color: 'oklch(0.62 0.2 265)' },
  { name: 'Apple', folderHint: 'Apple', color: 'oklch(0.5 0.01 275)' },
  { name: 'Adobe', folderHint: 'Adobe', color: 'oklch(0.62 0.22 25)' },
  { name: 'Uber', folderHint: 'Uber', color: 'oklch(0.2 0 0)' },
  { name: 'Atlassian', folderHint: 'Atlassian', color: 'oklch(0.62 0.2 265)' },
  { name: 'Netflix', folderHint: 'Netflix', color: 'oklch(0.62 0.22 25)' },
  { name: 'Oracle', folderHint: 'Oracle', color: 'oklch(0.62 0.22 25)' },
  { name: 'Salesforce', folderHint: 'Salesforce', color: 'oklch(0.62 0.2 245)' },
  { name: 'IBM', folderHint: 'IBM', color: 'oklch(0.5 0.15 265)' },
  { name: 'LinkedIn', folderHint: 'LinkedIn', color: 'oklch(0.55 0.18 245)' },
  { name: 'Goldman Sachs', folderHint: 'Goldman Sachs', color: 'oklch(0.7 0.15 235)' },
  { name: 'Walmart', folderHint: 'Walmart', color: 'oklch(0.62 0.2 245)' },
  { name: 'Cisco', folderHint: 'Cisco', color: 'oklch(0.62 0.2 245)' },
  { name: 'Nvidia', folderHint: 'Nvidia', color: 'oklch(0.7 0.19 140)' },
  { name: 'Samsung', folderHint: 'Samsung', color: 'oklch(0.5 0.15 265)' },
  { name: 'PayPal', folderHint: 'PayPal', color: 'oklch(0.55 0.18 245)' },
  { name: 'Visa', folderHint: 'Visa', color: 'oklch(0.55 0.18 245)' },
  { name: 'Intuit', folderHint: 'Intuit', color: 'oklch(0.7 0.19 140)' },
  { name: 'ServiceNow', folderHint: 'ServiceNow', color: 'oklch(0.62 0.2 245)' },

  // India-heavy IT services & consulting
  { name: 'TCS', folderHint: 'tcs', color: 'oklch(0.5 0.15 265)' },
  { name: 'Infosys', folderHint: 'Infosys', color: 'oklch(0.55 0.18 245)' },
  { name: 'Wipro', folderHint: 'Wipro', color: 'oklch(0.62 0.2 245)' },
  { name: 'Accenture', folderHint: 'Accenture', color: 'oklch(0.7 0.15 300)' },
  { name: 'Cognizant', folderHint: 'Cognizant', color: 'oklch(0.62 0.2 245)' },
  { name: 'Capgemini', folderHint: 'Capgemini', color: 'oklch(0.62 0.2 245)' },
  { name: 'HCLTech', folderHint: 'HCL', color: 'oklch(0.62 0.22 25)' },
  { name: 'Tech Mahindra', folderHint: 'Tech Mahindra', color: 'oklch(0.62 0.22 25)' },
  { name: 'Deloitte', folderHint: 'Deloitte', color: 'oklch(0.5 0.15 265)' },
  { name: 'Coforge', folderHint: 'Coforge', color: 'oklch(0.62 0.2 245)' },

  // India product / unicorn companies
  { name: 'Flipkart', folderHint: 'Flipkart', color: 'oklch(0.7 0.19 250)' },
  { name: 'Zomato', folderHint: 'Zomato', color: 'oklch(0.62 0.22 25)' },
  { name: 'Swiggy', folderHint: 'Swiggy', color: 'oklch(0.7 0.19 60)' },
  { name: 'Paytm', folderHint: 'Paytm', color: 'oklch(0.55 0.18 245)' },
  { name: 'PhonePe', folderHint: 'PhonePe', color: 'oklch(0.55 0.18 280)' },
  { name: 'CRED', folderHint: 'CRED', color: 'oklch(0.2 0 0)' },
  { name: 'Myntra', folderHint: 'Myntra', color: 'oklch(0.62 0.22 25)' },
  { name: 'Ola', folderHint: 'Ola', color: 'oklch(0.2 0 0)' },
  { name: 'Airtel', folderHint: 'Airtel', color: 'oklch(0.62 0.22 25)' },
  { name: 'BharatPe', folderHint: 'BharatPe', color: 'oklch(0.55 0.18 245)' },
  { name: 'Cashfree', folderHint: 'Cashfree', color: 'oklch(0.7 0.19 140)' },
  { name: 'CARS24', folderHint: 'CARS24', color: 'oklch(0.7 0.15 80)' },
  { name: 'Acko', folderHint: 'Acko', color: 'oklch(0.62 0.2 265)' },
]
