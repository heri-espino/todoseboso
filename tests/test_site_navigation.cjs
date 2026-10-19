/* Zero-dependency integrity check. Run from repository root: node tests/test_site_navigation.cjs */
"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const html = fs.readFileSync("site/index.html", "utf8");
const js = fs.readFileSync("site/navigation.js", "utf8");
const css = fs.readFileSync("site/navigation.css", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "Duplicate HTML IDs");
const nav = html.match(/<nav id="nav-links"[\s\S]*?<\/nav>/);
const guide = html.match(/<section class="reading-guide"[\s\S]*?<\/section>/);
assert.ok(nav && guide, "Navigation and chapter overview must exist");
assert.equal((nav[0].match(/class="nav-group"/g) || []).length, 4);
assert.equal((guide[0].match(/class="chapter-card"/g) || []).length, 4);
for (const block of [nav[0], guide[0]]) {
  for (const [, fragment] of block.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(fragment), `Missing target: #${fragment}`);
  }
}
assert.match(html, /src="\.\/navigation\.js"/);
assert.match(html, /href="\.\/navigation\.css"/);
assert.match(js, /aria-current/);
assert.match(css, /prefers-reduced-motion/);
console.log("Chapter navigation and anchor targets: PASS");
