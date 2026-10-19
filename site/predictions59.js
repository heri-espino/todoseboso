/* 59 REAL final candidate yields: corrected agrospatial ensemble, never legacy median.
 * Input is an exact published GeoC CSV, independent of unavailable old JS runtime.
 * No observed yield for these 59 parcels; the table never suggests otherwise. */
"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const make = (tag, className="", content) => {
    const e = document.createElement(tag);
    if (className) e.className=className;
    if (content !== undefined) e.textContent=String(content);
    return e;
  };
  const fmt = (number,digits=3) => Number(number).toLocaleString("es-MX",{
    minimumFractionDigits:digits,maximumFractionDigits:digits
  });
  let rows59=[],selectedId="",places=new Map();
  const name = "Modelo de expertos agroespaciales con corrección por parcelas análogas";
  const status = $("#pred59-status"), root=$("#pred59-data");

  function prepare(entries,metadata) {
    if (!Array.isArray(entries) || entries.length!==59 ||
        metadata?.schema_version!==1 ||
        metadata?.final_fit_selected!=="robust26_3_neighbors_supported_0p25")
      throw Error("El archivo no representa las 59 predicciones finales verificadas.");
    const ids=new Set();
    const rows=entries.map(item=>{
      const id=String(item.id||"");
      const estimate=Number(item.estimate);
      if(!/^AGC_\d+$/.test(id)||ids.has(id)||!Number.isFinite(estimate)||
         estimate<=0||estimate>25)
        throw Error("Predicción o ID duplicado, incompleto o inválido.");
      ids.add(id);
      return {id,estimate,state:"Sin estado publicado",municipality:""};
    });
    const numeric=rows.map(x=>x.estimate).sort((a,b)=>a-b);
    const summary=metadata.prediction59_aggregate;
    const mean=numeric.reduce((sum,value)=>sum+value,0)/59;
    const median=numeric[29];
    for(const [field,value] of Object.entries({
      selected_mean:mean,selected_median:median,
      selected_min:numeric[0],selected_max:numeric[58]
    })){
      if(!Number.isFinite(Number(summary?.[field])) ||
         Math.abs(value-summary[field])>1e-8)
        throw Error("Los agregados públicos no coinciden con las 59 predicciones finales: "+field);
    }
    return rows;
  }

  function choose(id,scroll=false) {
    const record=rows59.find(x=>x.id===id);
    if(!record)return;
    selectedId=id;
    document.querySelectorAll("[data-pred59-id]").forEach(button=>{
      const active=button.dataset.pred59Id===id;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",String(active));
    });
    document.querySelectorAll("[data-pred59-row-id]").forEach(tr=>{
      tr.classList.toggle("selected",tr.dataset.pred59RowId===id);
    });
    const pane=$("#pred59-detail");pane.replaceChildren();
    const header=make("div","pred59-detail-head");
    const title=make("div");
    title.append(make("span","pred59-eyebrow","PARCELA DEL RETO · SIN COSECHA OBSERVADA"),
      make("h4","",record.id),
      make("p","",record.state+(record.municipality?" · "+record.municipality:"")));
    const measure=make("div","pred59-yield");
    measure.append(make("strong","",fmt(record.estimate,4)),
      make("span","","t/ha estimadas"));
    header.append(title,measure);
    const intro=make("p","pred59-detail-intro",
      "Estimación final con el ensamble agroespacial ajustado en 138 parcelas y " +
      "corrección acotada basada en 3 parcelas análogas por sus 26 indicadores.");
    const grid=make("div","pred59-parts");
    for(const [key,value] of [
      ["Método","Expertos climáticos, geográficos y geológicos"],
      ["Corrección","3 vecinos en espacio robusto de 26 variables"],
      ["Mezcla","25 % × soporte y concordancia"],
      ["Máximo cambio permitido","±0.5 t/ha"],
      ["Rendimiento real","Todavía desconocido"],
      ["Error de esta parcela","No evaluable sin cosecha real"]
    ]){
      const part=make("div");
      part.append(make("span","",key),make("strong","",value));
      grid.append(part);
    }
    pane.append(header,intro,grid,make("p","pred59-detail-note",
      "El valor mostrado proviene del CSV de predicciones finales publicado en GeoC. " +
      "No se reconstruye a partir del antiguo modelo con mediana. " +
      "El ajuste numérico particular frente a la predicción anterior no está disponible en este CSV."));
    if(scroll)pane.scrollIntoView({block:"nearest",behavior:"smooth"});
  }

  function button(item,label,className){
    const element=make("button",className,label);
    element.type="button";
    element.dataset.pred59Id=item.id;
    element.setAttribute("aria-pressed",String(item.id===selectedId));
    element.addEventListener("click",()=>choose(item.id,true));
    return element;
  }

  function renderSummary(){
    const sorted=[...rows59].sort((a,b)=>a.estimate-b.estimate);
    const mean=rows59.reduce((x,r)=>x+r.estimate,0)/59;
    const cells=[
      ["Parcelas estimadas","59","Cosechas de las 59 aún desconocidas"],
      ["Media",fmt(mean,4)+" t/ha","Media de las predicciones finales"],
      ["Mínimo",fmt(sorted[0].estimate,3)+" t/ha","Estimación, no cosecha medida"],
      ["Máximo",fmt(sorted[58].estimate,3)+" t/ha","Estimación, no cosecha medida"]
    ];
    const mount=$("#pred59-summary");mount.replaceChildren();
    for(const [label,value,note] of cells){
      const div=make("div","pred59-summary-item");
      div.append(make("span","",label),make("strong","",value),
        make("small","",note));
      mount.append(div);
    }
  }

  function renderExamples(){
    const ordered=[...rows59].sort((a,b)=>a.estimate-b.estimate);
    const picks=[
      ["Menor estimación",ordered[0]],
      ["Estimación mediana",ordered[29]],
      ["Mayor estimación",ordered[58]]
    ];
    const mount=$("#pred59-examples");mount.replaceChildren();
    for(const [label,entry] of picks){
      const b=button(entry,undefined,"pred59-example");
      b.append(make("span","pred59-eyebrow",label),
        make("strong","",fmt(entry.estimate,3)+" t/ha"),
        make("span","",entry.id),
        make("small","",entry.state),
        make("span","pred59-example-link","Consultar parcela →"));
      mount.append(b);
    }
  }

  function renderPlot(){
    const mount=$("#pred59-plot");mount.replaceChildren();
    const ys=rows59.map(x=>x.estimate);
    const min=Math.floor(Math.min(...ys)*2)/2;
    const max=Math.ceil(Math.max(...ys)*2)/2;
    const groups=[...new Set(rows59.map(x=>x.state))].sort((a,b)=>a.localeCompare(b,"es"));
    for(const [i,state] of groups.entries()){
      const r=make("div","pred59-plot-row");
      const area=make("div","pred59-track");
      const group=rows59.filter(x=>x.state===state).sort((a,b)=>a.estimate-b.estimate);
      for(const [index,entry] of group.entries()){
        const b=button(entry,"","pred59-dot tone-"+(i%3));
        b.style.left=(2+96*(entry.estimate-min)/(max-min))+"%";
        b.style.top=(14+19*(index%3))+"px";
        b.title=entry.id+" · "+fmt(entry.estimate,3)+" t/ha";
        b.setAttribute("aria-label",b.title);
        area.append(b);
      }
      r.append(make("span","pred59-plot-state",state),area);
      mount.append(r);
    }
    const axis=make("div","pred59-axis");
    axis.append(make("span","pred59-plot-state",""));
    const ticks=make("div","pred59-ticks");
    for(let i=0;i<=4;i++){
      const value=make("span","",fmt(min+(max-min)*i/4,2));
      value.style.left=(2+96*i/4)+"%";
      ticks.append(value);
    }
    axis.append(ticks);mount.append(axis);
    mount.append(make("p","pred59-axis-name",
      "t/ha · Cada punto es una estimación; ninguna de las 59 tiene rendimiento real observado."));
  }

  function renderTable(){
    const term=$("#pred59-search").value.trim().toLocaleLowerCase("es");
    const region=$("#pred59-state").value;
    const sort=$("#pred59-sort").value;
    const chosen=rows59.filter(r=>
      (region==="all"||r.state===region) &&
      (!term||[r.id,r.state,r.municipality].some(s=>
        s.toLocaleLowerCase("es").includes(term)))
    );
    chosen.sort((a,b)=>sort==="id-asc"
      ?a.id.localeCompare(b.id)
      :sort==="value-asc"
      ?a.estimate-b.estimate
      :b.estimate-a.estimate);
    $("#pred59-count").textContent=chosen.length+" de 59 parcelas mostradas";
    const body=$("#pred59-rows");body.replaceChildren();
    if(!chosen.length){
      const tr=make("tr"),td=make("td","","Sin resultados para los filtros actuales.");
      td.colSpan=5;tr.append(td);body.append(tr);return;
    }
    const min=Math.min(...rows59.map(r=>r.estimate));
    const max=Math.max(...rows59.map(r=>r.estimate));
    for(const r of chosen){
      const tr=make("tr");
      tr.dataset.pred59RowId=r.id;
      if(r.id===selectedId)tr.classList.add("selected");
      const loc=make("td");
      loc.append(make("strong","",r.state),
        make("small","",r.municipality||"Localización opcional en el mapa"));
      const value=make("td","pred59-value-cell");
      const track=make("span","pred59-meter"), fill=make("span");
      fill.style.width=(12+88*(r.estimate-min)/(max-min||1))+"%";
      track.append(fill);
      value.append(make("strong","",fmt(r.estimate,3)+" t/ha"),track);
      const action=make("td");action.append(button(r,"Ver detalle","pred59-row-button"));
      tr.append(make("td","",r.id),loc,value,
        make("td","","3 análogos · soporte"),action);
      body.append(tr);
    }
  }
  function renderFilters(){
    const states=[...new Set(rows59.map(r=>r.state))].sort((a,b)=>a.localeCompare(b,"es"));
    const select=$("#pred59-state"),previous=select.value;
    select.replaceChildren();
    const first=make("option","","Todos los estados");
    first.value="all";select.append(first);
    if(states.length>1||states[0]!=="Sin estado publicado"){
      for(const state of states){
        const option=make("option","",state);option.value=state;
        select.append(option);
      }
    }
    select.value=states.includes(previous)?previous:"all";
  }
  function render(entries,meta) {
    rows59=prepare(entries,meta);
    root.hidden=false;
    status.textContent="59 estimaciones finales verificadas contra el CSV de GeoC. "+
      "Modelo agroespacial con 3 parcelas análogas; las cosechas reales son desconocidas.";
    $("#pred59-search").value="";
    $("#pred59-sort").value="value-desc";
    const median=[...rows59].sort((a,b)=>a.estimate-b.estimate)[29];
    selectedId=median.id;
    renderFilters();renderSummary();renderExamples();renderPlot();
    renderTable();choose(selectedId);
    window.dispatchEvent(new CustomEvent("geoc:final59-ready",{detail:{n:59}}));
  }
  function setGeography(info) {
    if(!rows59.length||!info||typeof info!=="object")return;
    places=new Map(Object.entries(info));
    for(const row of rows59){
      const location=places.get(row.id);
      if(location&&["Hidalgo","Puebla","Tlaxcala"].includes(location.state)){
        row.state=location.state;
        row.municipality=String(location.municipality||"");
      }
    }
    renderFilters();renderExamples();renderPlot();renderTable();
    if(selectedId)choose(selectedId);
  }
  function unavailable(message) {
    rows59=[];root.hidden=true;
    status.textContent="No se pudo verificar el archivo final de 59 predicciones: "+
      message+". No se muestran pronósticos no comprobados.";
  }
  function exportCsv(){
    if(rows59.length!==59)return;
    const payload="ID_POLIGONO,RENDIMIENTO_T_HA\r\n"+
      rows59.map(r=>r.id+","+r.estimate.toString()).join("\r\n")+"\r\n";
    const url=URL.createObjectURL(new Blob([payload],{type:"text/csv;charset=utf-8"}));
    const anchor=make("a");anchor.href=url;
    anchor.download="submission59_final.csv";
    document.body.append(anchor);anchor.click();anchor.remove();
    URL.revokeObjectURL(url);
  }
  for(const id of ["pred59-search","pred59-state","pred59-sort"]){
    $("#"+id).addEventListener(id==="pred59-search"?"input":"change",renderTable);
  }
  $("#pred59-export").addEventListener("click",exportCsv);
  window.GeoCebadaPredictions=Object.freeze({prepare,render,unavailable,setGeography});
})();
