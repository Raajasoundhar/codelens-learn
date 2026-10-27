export const samples = {
  javascript: {
    title: 'Filter & transform', language: 'JavaScript',
    code: `const products = [
  { name: "Notebook", price: 8, inStock: true },
  { name: "Pen", price: 2, inStock: false },
  { name: "Backpack", price: 35, inStock: true }
];

const affordable = products
  .filter(product => product.inStock && product.price < 20)
  .map(product => product.name);

console.log(affordable);`,
    explanation: {
      summary: 'This snippet finds products that are in stock and cost less than 20, then collects just their names. The result is ["Notebook"].',
      steps: [
        { lines: '1–5', explanation: 'Create an array of three product objects. Each object records a name, a price, and whether the product is available.' },
        { lines: '7–8', explanation: 'Start with products and filter it. A product stays only when inStock is true AND its price is below 20. Only the Notebook passes both checks.' },
        { lines: '9', explanation: 'Map the remaining objects to their name values. This turns the array of product objects into an array of strings.' },
        { lines: '11', explanation: 'Print the resulting array. The expected output is ["Notebook"]. This example is explained, not executed by the app.' }
      ],
      concepts: ['Array: an ordered collection of values.', 'filter: creates a new array containing only items that pass a condition.', 'map: creates a new array by transforming each item.', '&&: both conditions must be true.'],
      cautions: ['The comparison is strictly less than 20, so a product priced at exactly 20 is excluded.', 'This assumes every product has a numeric price and a Boolean inStock value.'],
      quiz: { question: 'If the Pen becomes in stock, what will affordable contain?', answer: '["Notebook", "Pen"]. Both are in stock and cost less than 20; map keeps their names in their original order.' }
    }
  },
  python: {
    title: 'Count with a dictionary', language: 'Python',
    code: `def count_words(sentence):
    counts = {}
    for word in sentence.lower().split():
        counts[word] = counts.get(word, 0) + 1
    return counts

result = count_words("Learn code learn more")
print(result)`,
    explanation: {
      summary: 'This function counts how often each whitespace-separated word appears, ignoring capitalization. For the example, it returns {"learn": 2, "code": 1, "more": 1}.',
      steps: [
        { lines: '1–2', explanation: 'Define a function that takes a sentence and creates an empty dictionary to store the word counts.' },
        { lines: '3', explanation: 'Convert the sentence to lowercase, split it on whitespace, and loop through each resulting word.' },
        { lines: '4', explanation: 'Look up the current count with get. If the word is new, start at zero. Add one and store the new count.' },
        { lines: '5', explanation: 'Return the completed dictionary after the loop has processed every word.' },
        { lines: '7–8', explanation: 'Call the function and print the result. Learn and learn are both counted under the lowercase key learn.' }
      ],
      concepts: ['Dictionary: a collection of key-value pairs; here each word maps to its count.', 'get(key, default): looks up a key and supplies a default when it is missing.', 'Loop: repeats an operation for each item in a sequence.'],
      cautions: ['Punctuation is not removed: "code" and "code!" become different keys.', 'The input must be a string. An empty or whitespace-only string produces an empty dictionary.'],
      quiz: { question: 'What does count_words("Hi hi HI") return?', answer: '{"hi": 3}. lower() makes all three words identical before the counting loop runs.' }
    }
  }
};
