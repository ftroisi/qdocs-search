/**
 * Quick smoke-test for the search engine.
 * Run: npx tsx scripts/test-search.ts
 */

import { search, tokenise } from "../src/lib/search-engine";

function printResult(label: string, query: string, project?: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Query: "${query}"${project ? `  [project: ${project}]` : ""}`);
  console.log(`Tokens: ${JSON.stringify(tokenise(query))}`);
  console.log("=".repeat(60));

  const results = search(query, { project, limit: 5 });
  if (results.length === 0) {
    console.log("  (no results)");
    return;
  }
  results.forEach((r, i) => {
    console.log(
      `  #${i + 1} [${r.score.toFixed(2)}] ${r.title}\n` +
        `       url: ${r.url}\n` +
        `       terms: ${r.matchedTerms.join(", ")}\n` +
        (r.sections.length
          ? `       sections: ${r.sections
              .slice(0, 2)
              .map((s) => s.title)
              .join(" | ")}\n`
          : "")
    );
  });
}

printResult("general", "neural network classification");
printResult("typo test", "quantun circut");   // fuzzy: quantum circuit
printResult("stemming", "classifying molecules");
printResult("project scoped", "kernel methods", "qiskit-machine-learning");
printResult("cross-project", "ground state energy");
printResult("empty-ish", "the and a");        // all stop words → no tokens
