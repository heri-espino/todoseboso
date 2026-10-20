"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const json=JSON.parse(read("site/data/historical_models.json"));
const home=read("site/index.html"),css=read("site/historical_models.css"),script=read("site/historical_models.js");
const protocols=["fresh_97_41","random","climate_profile","municipality","spatial"];
const lookup=(p,id)=>json.rows.find(r=>r.protocol===p&&r.id===id);
test("historical archive keeps exact 17 model identifiers, 71 model-protocol observations and five distinct protocols",()=>{
 assert.equal(json.schema_version,1);
 assert.equal(json.rows.length,71);
 assert.equal(new Set(json.rows.map(r=>r.id)).size,17);
 assert.deepEqual(json.protocols.map(p=>p.id),protocols);
 assert.deepEqual(protocols.map(p=>json.rows.filter(r=>r.protocol===p).length),[10,16,15,15,15]);
 assert.equal(new Set(json.rows.map(r=>r.protocol+"/"+r.id)).size,json.rows.length);
 assert.ok(json.rows.every(r=>r.source.startsWith("https://github.com/heri-espino/todoseboso/blob/main/")));
});
test("audited CSV metrics are copied exactly, and missing values are not manufactured",()=>{
 const csv=read("results/comparison_97_41/v1/metrics.csv").trim().split(/\r?\n/);
 const header=csv.shift().split(",");
 for(const line of csv){
   const vals=line.split(",");
   const record=Object.fromEntries(header.map((key,i)=>[key,vals[i]]));
   const row=lookup(record.protocol,record.experiment);
   assert.ok(row,"missing CSV model "+record.experiment);
   for(const metric of ["rmse","mae","r2","bias"])assert.equal(row[metric],Number(record[metric]));
 }
 assert.equal(lookup("fresh_97_41","B1").rmse,0.46218864182120445);
 assert.equal(lookup("fresh_97_41","Reference26").rmse,0.4624789693727327);
 assert.equal(lookup("spatial","Reference26").rmse,0.6333467976739242);
 assert.equal(lookup("spatial","L40").rmse,0.9794);
 assert.equal(lookup("random","TOP20/TOP15").r2,0.654933);
 assert.equal(lookup("municipality","EQUAL3").rmse,0.52766);
 assert.equal(lookup("random","F7-00").mae,null);
 assert.equal(lookup("spatial","F5-01").r2,null);
 for(const row of json.rows){
   for(const key of ["rmse","mae","r2","bias"])
     assert.ok(row[key]===null||Number.isFinite(row[key]),"invalid score "+row.id+" "+key);
   assert.ok(row.rmse>0,"Every row must have a documented RMSE");
 }
});
test("new historical comparison remains after the map, accessible in nav and useful without JavaScript",()=>{
 assert.ok(home.indexOf('id="modelos-historicos"')>home.indexOf('id="mapa-interactivo"'));
 assert.ok(home.indexOf('id="modelos-historicos"')<home.indexOf("</main>"));
 assert.match(home,/href="#modelos-historicos"/);
 assert.match(home,/href="\.\/historical_models\.css"/);
 assert.match(home,/src="\.\/historical_models\.js" defer/);
 assert.match(home,/href="\.\/data\/historical_models\.json"/);
 assert.match(home,/id="hm-rows"/);
 assert.match(home,/No publicado/);
 assert.match(home,/no deben mezclarse/i);
 assert.equal((home.match(/data-hm-protocol=/g)||[]).length,5);
 assert.equal((home.match(/data-hm-metric=/g)||[]).length,4);
 const fallback=home.slice(home.indexOf('<tbody id="hm-rows">'),home.indexOf("</tbody>",home.indexOf('<tbody id="hm-rows">')));
 assert.equal((fallback.match(/<tr(?:\s|>)/g)||[]).length,10,"static 97/41 fallback must work without JS");
 assert.equal(new Set([...home.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])).size,[...home.matchAll(/\bid="([^"]+)"/g)].length,"duplicate HTML IDs");
});
test("progressive enhancements are keyboard-accessible and motion-safe",()=>{
 assert.match(script,/fetch\("\.\/data\/historical_models\.json"/);
 assert.match(script,/replaceChildren/);
 assert.match(script,/textContent/);
 assert.doesNotMatch(script,/innerHTML|eval\s*\(/);
 assert.match(script,/aria-pressed/);
 assert.match(script,/addEventListener\("click"/);
 assert.match(script,/addEventListener\("input"/);
 assert.match(script,/No se pudo cargar el catálogo completo/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/hover:hover/);
 assert.match(css,/tbody tr:hover/);
});
