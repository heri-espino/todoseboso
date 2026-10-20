/* Source-backed final model charts; all supplied numbers from GeoC 138-fold log.
   Fixed five candidates were chosen post hoc; do not equate their ranking with
   independently validated performance or errors of the 59 unknown yields. */
"use strict";
(() => {
  const $=id=>document.getElementById(id);
  const fmt=(v,n=3)=>Number(v).toLocaleString("es-MX",{minimumFractionDigits:n,maximumFractionDigits:n});
  const el=(tag,cls,value)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined)node.textContent=String(value);
    return node;
  };
  let data=null,chosenMetric="rmse";
  const metrics={
    rmse:{label:"RMSE",unit:"t/ha",better:"Menor error",digits:6},
    mae:{label:"MAE",unit:"t/ha",better:"Menor error",digits:6},
    r2:{label:"R² predictivo",unit:"",better:"Mayor es mejor",digits:6},
    bias:{label:"Sesgo firmado",unit:"t/ha",better:"Más cercano a cero",digits:6},
    mse:{label:"MSE",unit:"(t/ha)²",better:"Menor error",digits:6},
    l1:{label:"Norma L1",unit:"t/ha",better:"Menor error",digits:4},
    l2:{label:"Norma L2",unit:"t/ha",better:"Menor error",digits:4}
  };
  function value(row,key){
    if(key==="mse")return row.rmse**2;
    if(key==="l1")return 138*row.mae;
    if(key==="l2")return Math.sqrt(138)*row.rmse;
    return row[key];
  }
  function renderMetrics(){
    if(!data)return;
    const cfg=metrics[chosenMetric];
    const rows=[...data.loocv].sort((a,b)=>
      chosenMetric==="r2" ? b.r2-a.r2
      :chosenMetric==="bias" ? Math.abs(a.bias)-Math.abs(b.bias)
      :value(a,chosenMetric)-value(b,chosenMetric));
    const numbers=rows.map(row=>value(row,chosenMetric));
    const high=Math.max(...numbers);
    const low=Math.min(...numbers);
    const mount=$("final-model-bars");
    mount.replaceChildren();
    for(const row of rows){
      const number=value(row,chosenMetric);
      const item=el("div","fm-bar");
      if(row.id==="nested")item.classList.add("fm-policy");
      if(row.id===data.final_fit_selected||row.id==="robust3_025_support")
        item.classList.add("fm-selected");
      const caption=el("div","fm-bar-caption");
      caption.append(el("strong","",row.name),
        el("span","",fmt(number,cfg.digits)+(cfg.unit?" "+cfg.unit:"")));
      const track=el("div","fm-bar-track");
      const fill=el("span","fm-bar-fill");
      const width=low===high?92:18+80*(number-low)/(high-low);
      fill.style.width=width+"%";
      track.append(fill);
      const tag=el("small","",row.kind==="conditional_nested"
        ?"Selección interna en cada fold"
        :row.kind==="base"?"Modelo nativo sin corrección"
        :"Corrección fija, examinada retrospectivamente");
      item.append(caption,track,tag);
      mount.append(item);
    }
    $("final-model-chart-note").textContent=
      cfg.label+" · "+cfg.better+" · n=138 parcelas realmente excluidas (137 train por fold). "+
      (["mse","l1","l2"].includes(chosenMetric)
        ?"Valor derivado de RMSE/MAE publicados con seis decimales; cifras aproximadas. "
        :"Cifras reportadas por la ejecución completa en GeoC. ")+
      "Las variantes fijas fueron elegidas tras revisar los mismos datos.";
    document.querySelectorAll("[data-fm-metric]").forEach(button=>{
      const active=button.dataset.fmMetric===chosenMetric;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",String(active));
    });
  }
  function renderSelection(){
    if(!data)return;
    const pairs=[
      ["Vecinos robustos (3; 25 %)",data.selection_4fold_counts.robust26_3_neighbors_supported_0p25],
      ["PCA8 (3; 25 %)",data.selection_4fold_counts.pca8_3_neighbors_supported_0p25],
      ["Sin corrección",data.selection_4fold_counts.no_correction]
    ];
    const mount=$("final-model-selections");mount.replaceChildren();
    for(const [name,value] of pairs){
      const p=el("div","fm-share");
      const title=el("div","fm-share-heading");
      title.append(el("strong","",name),el("span","",value+" / 138"));
      const bar=el("div","fm-share-track"),fill=el("span");
      fill.style.width=(100*value/138)+"%";
      bar.append(fill);p.append(title,bar);
      mount.append(p);
    }
  }
  function renderHistogram(entries){
    const mount=$("final-model-histogram");mount.replaceChildren();
    if(!Array.isArray(entries)||entries.length!==59)return;
    const vals=entries.map(v=>v.estimate);
    const lo=2.5,hi=5,step=.25;
    const bins=Array.from({length:10},()=>0);
    vals.forEach(v=>{
      const i=Math.max(0,Math.min(9,Math.floor((v-lo)/step)));
      bins[i]++;
    });
    const max=Math.max(...bins);
    for(const [i,n] of bins.entries()){
      const item=el("div","fm-hist-bin");
      const track=el("div","fm-hist-track");
      const bar=el("span","fm-hist-fill");
      bar.style.height=(4+96*n/(max||1))+"%";
      bar.title=n+" parcelas estimadas entre "+fmt(lo+i*step,2)+" y "+fmt(lo+(i+1)*step,2)+" t/ha";
      track.append(bar);
      item.append(el("strong","",n),track,
        el("small","",fmt(lo+i*step,2)));
      mount.append(item);
    }
    $("final-model-hist-status").textContent=
      "59 estimaciones, intervalos de 0.25 t/ha. Eje horizontal: límite inferior; eje vertical: número de parcelas. No representa errores de las 59.";
  }
  const initEvents=()=>{
    document.querySelectorAll("[data-fm-metric]").forEach(button=>
      button.addEventListener("click",()=>{
        chosenMetric=button.dataset.fmMetric;
        renderMetrics();
      })
    );
    window.addEventListener("geoc:final59-ready",async()=>{
      try{
        const raw=await fetch("./data/submission59_final.csv",{cache:"no-store"});
        if(!raw.ok)throw Error("No hay CSV final");
        const lines=(await raw.text()).trim().split(/\r?\n/).slice(1);
        renderHistogram(lines.map(s=>({estimate:Number(s.split(",")[1])})));
      }catch(e){$("final-model-hist-status").textContent="Histograma no disponible: "+e.message;}
    });
  };
  function render(manifest){
    if(!manifest||manifest.schema_version!==1||manifest.loocv?.length!==7)
      throw Error("Faltan las siete métricas documentadas.");
    data=manifest;
    renderMetrics();renderSelection();
    $("final-model-state").textContent="138 LOOCV reales · 59 estimaciones finales · selección interna completada";
  }
  function unavailable(message){
    $("final-model-state").textContent="No se pudo verificar la información: "+message;
  }
  initEvents();
  window.GeoCebadaFinalModel=Object.freeze({render,unavailable});
})();