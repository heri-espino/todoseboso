"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const file=p=>fs.readFileSync(path.join(root,p),"utf8");
const json=p=>JSON.parse(file(p));
const home=file("site/index.html");
const separate=file("site/modelo-corregido.html");
const motion=file("site/scroll_motion.css");
const fin=json("site/data/final_model.json");
const stat=json("site/data/reference26_selected_statistical_audit.json");
const native=json("site/data/reference26_residuals.json");
const nested=json("site/data/reference26_analog_extended_metrics.json");
const weather=json("site/data/real_charts.json");

test("One unified document preserves unique anchors and resolves every internal navigation link",()=>{
  const ids=[...home.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,"duplicate HTML id");
  for(const [,target] of home.matchAll(/href="#([^"]+)"/g))
    assert.ok(ids.includes(target),"unresolved internal anchor "+target);
  for(const anchor of ["ensamble","modelo-final-analisis","reference26-analog-cv","predicciones-59",
                      "control-calidad","preparacion","datos-reales","estadisticas-finales","mapa-interactivo"])
    assert.ok(ids.includes(anchor),"missing chapter "+anchor);
  assert.match(home,/href="\.\/modelo-corregido\.html"/);
  assert.match(home,/modelo-corregido\.html#auditoria-modelo-final/);
  assert.match(separate,/id="auditoria-modelo-final"/);
  assert.match(separate,/id="reference26-analog-cv"/);
  assert.match(separate,/src="\.\/reference26_selected_audit\.js"/);
});

test("The real 59-target CSV is exactly the verified GeoC submission (and never target evaluation)",()=>{
  const rows=file("site/data/submission59_final.csv").trim().split(/\r?\n/);
  assert.equal(rows.shift(),"ID_POLIGONO,RENDIMIENTO_T_HA");
  assert.equal(rows.length,59);
  const arr=rows.map(line=>{const [id,v]=line.split(",");return {id,value:Number(v)};});
  assert.equal(new Set(arr.map(x=>x.id)).size,59);
  assert.ok(arr.every(x=>/^AGC_\d+$/.test(x.id)&&Number.isFinite(x.value)));
  assert.equal(fin.unknown_labels,59);
  assert.equal(fin.train_labels,138);
  assert.equal(fin.historical_candidate_selection_posthoc,true);
  assert.equal(stat.evaluation.hidden_y_evaluated,false);
  const mean=arr.reduce((s,x)=>s+x.value,0)/arr.length;
  const sorted=arr.map(x=>x.value).sort((a,b)=>a-b);
  assert.ok(Math.abs(mean-fin.prediction59_aggregate.selected_mean)<1e-9);
  assert.ok(Math.abs(sorted[29]-fin.prediction59_aggregate.selected_median)<1e-9);
  assert.ok(Math.abs(sorted[0]-fin.prediction59_aggregate.selected_min)<1e-9);
  assert.ok(Math.abs(sorted[58]-fin.prediction59_aggregate.selected_max)<1e-9);
  const raw=file("site/data/submission59_final.csv");
  const sha=crypto.createHash("sha1").update("blob "+Buffer.byteLength(raw)+"\0"+raw).digest("hex");
  assert.equal(sha,fin.sources.source_git_blob_sha);
});

test("Model variants, nested selection and native residuals have distinct scientific interpretations",()=>{
  assert.equal(stat.models.length,3);
  assert.equal(stat.moran.length,12);
  const selected=stat.models.find(x=>x.id==="SelectedFinalRule");
  const policy=stat.models.find(x=>x.id==="NestedSelection");
  const baseline=stat.models.find(x=>x.id==="Reference26_mean");
  assert.equal(selected.rmse,0.462418);
  assert.equal(policy.rmse,0.462892);
  assert.equal(baseline.rmse,0.468138);
  assert.equal(selected.r2,0.702693);
  assert.equal(policy.r2,0.702083);
  assert.equal(native.model,"Reference26_mean");
  assert.equal(native.metrics.rmse_t_ha,0.468138);
  assert.equal(native.diagnostics.normality.shapiro_p,1.401988e-7);
  assert.equal(native.diagnostics.variance.koenker_bp_p,0.400797);
  assert.equal(nested.metrics.rmse_t_ha,0.462892);
  assert.equal(stat.significance.ci_abs_rmse_available,false);
  assert.ok(stat.moran.every(x=>x.p_holm>=0.05));
  assert.match(home,/Los residuos del ensamble nativo rechazan normalidad/);
  assert.match(separate,/exploratori/i);
});

test("Data quality describes only verified availability, fold safety and missing audits",()=>{
  assert.equal(weather.rainfall.months.length,7);
  assert.equal(weather.ndvi.months.length,7);
  assert.ok(weather.rainfall.months.every(x=>x.n===197));
  assert.ok(weather.ndvi.months.every(x=>x.n===197));
  assert.match(home,/id="control-calidad"/);
  assert.match(home,/media del conjunto de entrenamiento/);
  assert.match(home,/tasas de faltantes/);
  assert.match(home,/cinco recetas con esas mismas 138 etiquetas/);
  assert.match(home,/Los residuos del ensamble nativo/);
});

test("All local entrypoints and interactive controls have assets and reduced-motion protection",()=>{
  for(const [,local] of home.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)){
    if(local.startsWith("./")&&!local.startsWith("./#"))
      assert.ok(fs.existsSync(path.join(root,"site",local.slice(2))),"missing static asset "+local);
  }
  for(const entry of ["site/final_model.js","site/final_predictor.js","site/reference26_selected_audit.js"])
    assert.ok(fs.existsSync(path.join(root,entry)));
  assert.match(motion,/hover:hover/);
  assert.match(motion,/focus-visible/);
  assert.match(motion,/:active/);
  assert.match(motion,/prefers-reduced-motion:reduce/);
  assert.match(motion,/\.quality-checks details/);
  assert.match(motion,/\.geoc-native-map,\.geo-native-mapcolumn,#geo-leaflet-map/);
  assert.match(separate,/reference26_selected_audit\.css/);
});
