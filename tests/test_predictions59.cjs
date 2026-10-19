"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const csv=fs.readFileSync(path.join(root,"site/data/submission59_final.csv"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"site/data/final_model.json"),"utf8"));
function records(raw=csv){
  const lines=raw.trim().split(/\r?\n/);
  assert.equal(lines.shift(),"ID_POLIGONO,RENDIMIENTO_T_HA");
  return lines.map(line=>{
    const [id,value]=line.split(",");
    return {id,estimate:Number(value)};
  });
}
function prepare(){
  const context={
    window:{},
    document:{querySelector:()=>({addEventListener(){}})}
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root,"site/predictions59.js"),"utf8"),
    context
  );
  return context.window.GeoCebadaPredictions.prepare;
}
test("Final corrected 59 are the exact GeoC published competition target set",()=>{
  const entries=records();
  assert.equal(entries.length,59);
  assert.equal(new Set(entries.map(x=>x.id)).size,59);
  assert.ok(entries.every(x=>/^AGC_\d+$/.test(x.id)&&Number.isFinite(x.estimate)));
  const values=entries.map(x=>x.estimate).sort((a,b)=>a-b);
  const summary=manifest.prediction59_aggregate;
  assert.ok(Math.abs(summary.selected_mean-values.reduce((a,b)=>a+b,0)/59)<1e-10);
  assert.ok(Math.abs(summary.selected_median-values[29])<1e-10);
  assert.ok(Math.abs(summary.selected_min-values[0])<1e-10);
  assert.ok(Math.abs(summary.selected_max-values[58])<1e-10);
  assert.equal(manifest.final_fit_selected,"robust26_3_neighbors_supported_0p25");
  assert.ok(manifest.historical_candidate_selection_posthoc);
  assert.equal(manifest.loocv.length,7);
});
test("New gallery renders only final corrected values, not old browser predictions",()=>{
  const gallery=prepare();
  const entries=records();
  const read=gallery(entries,manifest);
  assert.equal(read.length,59);
  assert.ok(read.every(x=>Number.isFinite(x.estimate)&&x.id));
  const script=fs.readFileSync(path.join(root,"site/browser_inference.js"),"utf8");
  assert.ok(script.includes('submission59_final.csv'));
  assert.ok(!script.includes('reference26_runtime.json'));
  assert.ok(!script.includes('Reference26Browser.parity'));
  assert.ok(!fs.readFileSync(path.join(root,"site/predictions59.js"),"utf8")
    .includes('Reference26Browser.run'));
  assert.ok(fs.readFileSync(path.join(root,"site/index.html"),"utf8")
    .includes('id="predicciones-59"'));
});
test("Tampered or incomplete final 59 fail closed",()=>{
  const gallery=prepare();
  const original=records();
  assert.throws(()=>gallery(original.slice(0,58),manifest),/59 predicciones/);
  assert.throws(()=>gallery([original[0],...original.slice(0,58)],manifest),/duplicado/);
  const changed=original.map(x=>({...x}));
  changed[0].estimate+=0.1;
  assert.throws(()=>gallery(changed,manifest),/agregados públicos/);
  assert.throws(()=>gallery(original,{...manifest,final_fit_selected:"legacy_median"}),/59 predicciones/);
});
