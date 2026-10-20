"use strict";
/* Reference26 dashboard: authentic public aggregates and fail-closed DOM tests. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const SITE=path.join(__dirname,"..","site");
const JS=fs.readFileSync(path.join(SITE,"reference26_residuals.js"),"utf8");
const actual=JSON.parse(fs.readFileSync(
  path.join(SITE,"data/reference26_residuals.json"),"utf8"));
const panelNames=["magnitud","influencia","supuestos","espacial","semivariograma","bootstrap","alcance"];
const ids=[
 ...panelNames.map(name=>"r26-"+name),
 ...panelNames.map(name=>"r26-tab-"+name),
 "reference26-residuals","r26-residual-status","r26-summary-cards",
 "r26-error-scale","r26-maximum-error","r26-influence-lead",
 "r26-influence-bar","r26-deletion-body","r26-tests-body",
 "r26-moran-chart","r26-geary-chart","r26-moran-k","r26-spatial-target","r26-moran-body","r26-moran-reading",
 "r26-variogram-chart","r26-variogram-body","r26-variogram-status",
 "r26-bootstrap-chart","r26-block-body","r26-bootstrap-note",
 "r26-unavailable"
];
class Element {
  constructor(tag="div") {
    this.tagName=tag;this.children=[];this.attributes={};
    this.textContent="";this.value="";this.title="";this.style={};
    this.events={};this.className="";this.hidden=false;this.tabIndex=0;
    this.focused=false;
  }
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  setAttribute(key,val){this.attributes[key]=val;}
  addEventListener(key,callback){this.events[key]=callback;}
  dispatch(key,event){this.events[key]?.(event);}
  focus(){this.focused=true;}
  getAttribute(key){return this.attributes[key];}
}
function mount(fetchImpl,initialHash="") {
  const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
  nodes["r26-moran-k"].value="8";
  nodes["r26-spatial-target"].value="signed_residual";
  const document={getElementById:id=>nodes[id]||null,
                  createElement:tag=>new Element(tag)};
  const winEvents={};
  const window={
    location:{hash:initialHash},
    history:{replaceState(_a,_b,hash){window.location.hash=hash;}},
    addEventListener(name,callback){winEvents[name]=callback;},
    dispatch(name){winEvents[name]?.();}
  };
  const context={document,window,fetch:fetchImpl,console};
  vm.runInNewContext(JS,context,{filename:"reference26_residuals.js"});
  nodes.__window=window;
  return nodes;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test("published figures equal the supplied verified VM transcription",()=>{
 assert.equal(actual.model,"Reference26_mean");
 assert.equal(actual.n_labeled,138);
 assert.equal(actual.n_unknown,59);
 assert.equal(actual.metrics.rmse_t_ha,.468138);
 assert.equal(actual.metrics.mae_t_ha,.333786);
 assert.equal(actual.metrics.r2_cv,.695292);
 assert.equal(actual.metrics.max_absolute_error_t_ha,2.139958);
 assert.equal(actual.influence.share_sse_largest,.151420);
 assert.equal(actual.influence.share_sse_largest_two,.281996);
 assert.equal(actual.influence.rmse_without_largest_t_ha,.432812);
 assert.equal(actual.influence.rmse_without_largest_two_t_ha,.399583);
 assert.equal(actual.diagnostics.normality.shapiro_p,1.401988e-7);
 assert.equal(actual.diagnostics.variance.koenker_bp_p,.400797);
 assert.equal(actual.diagnostics.variance.brown_forsythe_p,.929793);
 assert.deepEqual(actual.spatial.signed_residual_moran.map(x=>x.k),[4,8,12,24]);
 // The source CSV preserves more precision than the six-decimal VM transcript.
 const signedI=actual.spatial.signed_residual_moran.map(x=>x.I);
 [-.055864,-.076861,-.062976,-.041802].forEach((reference,i)=>{
   assert.ok(Math.abs(signedI[i]-reference)<.0000005,
     "Source Moran I differs from verified rounded value for k="+[4,8,12,24][i]);
 });
 assert.deepEqual(actual.spatial.absolute_error_moran.map(x=>x.k),[4,8,12,24]);
 assert.deepEqual(actual.spatial.squared_error_moran.map(x=>x.k),[4,8,12,24]);
 assert.equal(actual.spatial.geary_c.length,12);
 assert.equal(actual.spatial.semivariogram.length,6);
 assert.equal(actual.spatial.semivariogram.reduce((n,r)=>n+r.pairs,0),138*137/2);
 assert.equal(actual.spatial.expanded_from_private_geoc_aggregate_report,true);
 const computed=actual.spatial_bootstrap.groups.filter(x=>x.status==="computed");
 assert.equal(computed.length,2);
 assert.deepEqual(computed.map(x=>x.n_groups),[9,9]);
 assert.deepEqual(computed.map(x=>x.rmse_t_ha.low),[.323249,.339719]);
 assert.deepEqual(computed.map(x=>x.rmse_t_ha.high),[.522608,.551087]);
 assert.equal(actual.spatial_bootstrap.groups.filter(x=>x.status==="skipped").length,5);
});

test("renders Reference26 alone and accessible numerical charts",async()=>{
 const nodes=mount(async()=>({ok:true,json:async()=>actual}));
 await tick();
 assert.equal(nodes["r26-summary-cards"].children.length,4);
 assert.equal(nodes["r26-tests-body"].children.length,7);
 assert.equal(nodes["r26-deletion-body"].children.length,3);
 assert.equal(nodes["r26-error-scale"].children.length,2);
 assert.equal(nodes["r26-influence-bar"].children.length,3);
 assert.equal(nodes["r26-moran-chart"].children.length,5);
 assert.equal(nodes["r26-geary-chart"].children.length,5);
 assert.equal(nodes["r26-variogram-chart"].children.length,3);
 assert.equal(nodes["r26-variogram-chart"].children[1].children.length,7);
 assert.equal(nodes["r26-bootstrap-chart"].children.length,3);
 assert.equal(nodes["r26-block-body"].children.length,7);
 assert.match(nodes["r26-moran-reading"].textContent,/-0,076861|−0,076861|-0.076861/);
 assert.match(nodes["r26-residual-status"].textContent,/138 exclusiones/);
 nodes["r26-moran-k"].value="4";
 nodes["r26-moran-k"].dispatch("change");
 assert.match(nodes["r26-moran-reading"].textContent,/k = 4/);
 assert.equal(nodes["r26-moran-body"].children.length,8);
 nodes["r26-spatial-target"].value="absolute_error";
 nodes["r26-spatial-target"].dispatch("change");
 assert.match(nodes["r26-moran-reading"].textContent,/errores absolutos/);
 assert.equal(nodes["r26-moran-body"].children.length,8);
 assert.equal(nodes["r26-moran-chart"].children.length,5);
 assert.equal(nodes["r26-geary-chart"].children.length,5);
 assert.match(nodes["r26-moran-body"].children[4].children[1].textContent,/0[,.]866219/);
 assert.match(nodes["r26-moran-body"].children[6].children[1].textContent,/1/);
 nodes["r26-spatial-target"].value="squared_error";
 nodes["r26-spatial-target"].dispatch("change");
 assert.match(nodes["r26-moran-reading"].textContent,/errores cuadrados/);
 assert.equal(nodes["r26-moran-body"].children.length,8);
 assert.equal(nodes["r26-variogram-body"].children.length,6);
 assert.match(nodes["r26-variogram-status"].textContent,/Seis intervalos reales/);
 assert.match(nodes["r26-bootstrap-note"].textContent,/dos de los siete/);
});

test("single-panel tabs expose only the chosen statistics and update shareable hashes",async()=>{
 const nodes=mount(async()=>({ok:true,json:async()=>actual}));
 await tick();
 for(const name of panelNames){
   const active=name==="magnitud";
   assert.equal(nodes["r26-"+name].hidden,!active);
   assert.equal(nodes["r26-tab-"+name].getAttribute("aria-selected"),String(active));
   assert.equal(nodes["r26-tab-"+name].tabIndex,active?0:-1);
 }
 nodes["r26-tab-espacial"].dispatch("click");
 assert.equal(nodes["r26-magnitud"].hidden,true);
 assert.equal(nodes["r26-espacial"].hidden,false);
 assert.equal(nodes.__window.location.hash,"#r26-espacial");
 assert.equal(nodes["r26-geary-chart"].children.length,5);
 let prevented=false;
 nodes["r26-tab-espacial"].dispatch("keydown",{
   key:"ArrowRight",preventDefault(){prevented=true;}
 });
 assert.equal(prevented,true);
 assert.equal(nodes["r26-semivariograma"].hidden,false);
 assert.equal(nodes["r26-espacial"].hidden,true);
 assert.equal(nodes["r26-tab-semivariograma"].focused,true);
 nodes["r26-tab-semivariograma"].dispatch("keydown",{
   key:"Home",preventDefault(){}
 });
 assert.equal(nodes["r26-magnitud"].hidden,false);
 nodes["r26-tab-magnitud"].dispatch("keydown",{
   key:"End",preventDefault(){}
 });
 assert.equal(nodes["r26-alcance"].hidden,false);
 nodes.__window.location.hash="#r26-bootstrap";
 nodes.__window.dispatch("hashchange");
 assert.equal(nodes["r26-bootstrap"].hidden,false);
 assert.equal(nodes["r26-alcance"].hidden,true);
 // External section navigation must not unexpectedly change the chosen tab.
 nodes.__window.location.hash="#pruebas";
 nodes.__window.dispatch("hashchange");
 assert.equal(nodes["r26-bootstrap"].hidden,false);
});
test("deep-linked residual tabs open before the aggregate data loads",async()=>{
 const nodes=mount(async()=>({ok:false}),"#r26-supuestos");
 await tick();
 assert.equal(nodes["r26-supuestos"].hidden,false);
 assert.equal(nodes["r26-magnitud"].hidden,true);
 assert.match(nodes["r26-residual-status"].textContent,/no disponibles/i);
 nodes["r26-tab-influencia"].dispatch("click");
 assert.equal(nodes["r26-influencia"].hidden,false);
});
test("refuses wrong model, bad partitions and fake/improper provenance",async()=>{
 const copies=[
  {...actual,model:"Compact14"},
  {...actual,n_labeled:137},
  {...actual,protocol:{...actual.protocol,imputation:"median_training_only"}},
  {...actual,influence:{...actual.influence,refitted:true}},
  {...actual,spatial_bootstrap:{...actual.spatial_bootstrap,replicates:0}},
  {...actual,spatial_bootstrap:{...actual.spatial_bootstrap,
    groups:actual.spatial_bootstrap.groups.map(g=>g.id==="municipality"?
      {...g,n_groups:5}:g)}}
 ];
 for(const bad of copies){
   const nodes=mount(async()=>({ok:true,json:async()=>bad}));
   await tick();
   assert.equal(nodes["r26-summary-cards"].children.length,0);
   assert.match(nodes["r26-residual-status"].textContent,/no disponibles/i);
 }
 const fail=mount(async()=>({ok:false}));
 await tick();
 assert.equal(fail["r26-summary-cards"].children.length,0);
});

test("site ships no external ensemble UI or fabricated private histogram",()=>{
 const html=fs.readFileSync(path.join(SITE,"index.html"),"utf8");
 assert.match(html,/id="estadisticas-finales"/);
 assert.match(html,/id="r26-bootstrap-chart"/);
 assert.match(html,/id="r26-spatial-target"/);
 assert.match(html,/id="r26-geary-chart"/);
 assert.match(html,/id="r26-variogram-chart"/);
 assert.match(html,/id="r26-variogram-body"/);
 assert.match(html,/id="r26-semivariograma"/);
 assert.match(html,/id="r26-supuestos"/);
 assert.match(html,/id="r26-alcance"/);
 const tabs=[...html.matchAll(/role="tab" id="r26-tab-([^"]+)" aria-controls="r26-([^"]+)"/g)];
 assert.equal(tabs.length,7);
 assert.deepEqual(tabs.map(m=>m[1]),panelNames);
 assert.deepEqual(tabs.map(m=>m[2]),panelNames);
 const panels=[...html.matchAll(/id="r26-(magnitud|influencia|supuestos|espacial|semivariograma|bootstrap|alcance)" role="tabpanel"/g)];
 assert.equal(panels.length,7);
 assert.match(html,/id="r26-tab-magnitud"[^>]+aria-selected="true"/);
 assert.equal((html.match(/role="tabpanel"[^>]* hidden/g)||[]).length,6);
 assert.match(html,/<a href="#estadisticas-finales">Nuevo: diagnóstico de residuos LOOCV<\/a>/);
 assert.match(html,/<a href="#pruebas">Pruebas anteriores: asociaciones<\/a>/);
 assert.ok(html.indexOf('id="pruebas"') < html.indexOf('id="estadisticas-finales"'));
 assert.ok(html.indexOf('id="estadisticas-finales"') < html.indexOf('id="mapa-interactivo"'));
 assert.match(html,/src="\.\/reference26_residuals\.js"/);
 // The separate end-of-page historical catalog may mention Compact14.
 // Keep the original exclusion only in the current-model and native-residual narrative.
 const mainStory=html.split('<section class="section historic-models" id="modelos-historicos"')[0];
 assert.doesNotMatch(mainStory,/Compact14|Ensamble de dos modelos/);
 assert.doesNotMatch(html,/src="\.\/ensemble_/);
 assert.ok(!fs.existsSync(path.join(SITE,"data","ensemble_models.json")));
 assert.ok(!fs.existsSync(path.join(SITE,"data","ensemble_evaluation.json")));
 assert.ok(!fs.existsSync(path.join(SITE,"data","ensemble_predictions59.json")));
 assert.equal(actual.spatial.geary_c.length,12);
 assert.equal(actual.spatial.absolute_error_moran.length,4);
 assert.equal(actual.spatial.squared_error_moran.length,4);
 assert.equal(actual.spatial.semivariogram.length,6);
 assert.equal(actual.spatial.reason_missing.includes("parcel-level"),true);
 assert.equal(actual.influence.private_ids_published,false);
});
