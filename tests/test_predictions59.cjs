"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"site/data/submission59_final.csv"),"utf8");
const meta=JSON.parse(fs.readFileSync(path.join(root,"site/data/final_model.json"),"utf8"));
const lines=source.trim().split(/\r?\n/);
const entries=lines.slice(1).map(line=>{
  const fields=line.split(",");
  assert.equal(fields.length,2);
  return {id:fields[0],estimate:Number(fields[1])};
});
const script=fs.readFileSync(path.join(root,"site/predictions59.js"),"utf8");
function gallery(){
  const elements={};
  const context={
    window:{},
    document:{querySelector:selector=>elements[selector]??={
      addEventListener(){},value:"",hidden:true
    }}
  };
  vm.runInNewContext(script,context);
  return context.window.GeoCebadaPredictions;
}
test("published final 59 comes byte-for-byte from the approved GeoC Git blob",()=>{
  const signature=crypto.createHash("sha1")
    .update("blob "+Buffer.byteLength(source)+"\0").update(source).digest("hex");
  assert.equal(signature,meta.sources.source_git_blob_sha);
  assert.equal(lines[0],"ID_POLIGONO,RENDIMIENTO_T_HA");
  assert.equal(entries.length,59);
  assert.equal(new Set(entries.map(e=>e.id)).size,59);
  assert.ok(entries.every(x=>/^AGC_\d+$/.test(x.id)&&Number.isFinite(x.estimate)));
});
test("aggregate checks validate 59 mean/median/min/max",()=>{
  const values=entries.map(x=>x.estimate).sort((a,b)=>a-b);
  const mean=values.reduce((a,b)=>a+b,0)/59;
  const summary=meta.prediction59_aggregate;
  assert.ok(Math.abs(mean-summary.selected_mean)<1e-9);
  assert.ok(Math.abs(values[29]-summary.selected_median)<1e-9);
  assert.ok(Math.abs(values[0]-summary.selected_min)<1e-9);
  assert.ok(Math.abs(values[58]-summary.selected_max)<1e-9);
  const output=gallery().prepare(entries,meta);
  assert.equal(output.length,59);
  assert.equal(output.every(x=>x.state&&x.id&&Number.isFinite(x.estimate)),true);
});
test("gallery rejects incomplete or altered final candidate predictions",()=>{
  const g=gallery();
  assert.throws(()=>g.prepare(entries.slice(0,58),meta),/59/);
  assert.throws(()=>g.prepare(
    [entries[0],...entries.slice(0,58)],meta),/duplicado/);
  const changed=entries.map(x=>({...x}));
  changed[0].estimate+=0.15;
  assert.throws(()=>g.prepare(changed,meta),/agregados/);
  assert.throws(()=>g.prepare(entries,{...meta,final_fit_selected:"old_median"}),
    /59 predicciones/);
});
test("site has interactive, exportable final gallery, state filtering and map",()=>{
  const html=fs.readFileSync(path.join(root,"site/index.html"),"utf8");
  for(const fragment of [
    'id="predicciones-59"','id="pred59-examples"','id="pred59-plot"',
    'id="pred59-search"','id="pred59-state"','id="pred59-sort"',
    'id="pred59-detail"','id="pred59-export"',
    'id="modelo-final-analisis"','id="final-model-bars"','id="predecir-parcela"'
  ])assert.ok(html.includes(fragment),fragment);
  for(const fragment of [
    'submission59_final.csv','pred59-search','pred59-state','pred59-sort',
    'pred59-export','pred59-examples','pred59-plot','pred59-detail',
    'setGeography','exportCsv'
  ])assert.ok(script.includes(fragment)||html.includes(fragment),fragment);
  assert.match(fs.readFileSync(path.join(root,"site/native_map.js"),"utf8"),
    /finalPredictions/);
});
