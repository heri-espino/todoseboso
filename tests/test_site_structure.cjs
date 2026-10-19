/* Protect contiguous scientific sections from accidental div/section mismatches. */
"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
const html=fs.readFileSync("site/index.html","utf8");
const stack=[];
for(const m of html.matchAll(/<\/?(div|section|main)\b[^>]*>/gi)){
  const tag=m[1].toLowerCase();
  if(!m[0].startsWith("</")) stack.push({tag,pos:m.index});
  else{
    const open=stack.pop();
    assert.equal(open?.tag,tag,"Unmatched "+m[0]+" at offset "+m.index);
  }
}
assert.equal(stack.length,0,"Unclosed scientific section or container");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,"Duplicate target IDs");
for(const match of html.matchAll(/href="#([^"]+)"/g)){
  assert.ok(ids.includes(match[1]),"Unresolved index link #"+match[1]);
}
assert.ok(html.indexOf('id="datos-reales"')<html.indexOf('id="arquitectura"'));
assert.ok(html.indexOf('id="preguntas"')<html.indexOf('id="mapa-interactivo"'));
console.log("PASS: scientific document nesting, anchor targets and reading order");
