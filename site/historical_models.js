/* Source-backed historical model archive; safe static fallback if JS/data unavailable. */
"use strict";
(() => {
 const root=document.getElementById("modelos-historicos"); if(!root)return;
 const protocolButtons=[...root.querySelectorAll("[data-hm-protocol]")];
 const metricButtons=[...root.querySelectorAll("[data-hm-metric]")];
 const tbody=root.querySelector("#hm-rows"),name=root.querySelector("#hm-protocol-title");
 const detail=root.querySelector("#hm-description"),takeaway=root.querySelector("#hm-takeaway");
 const status=root.querySelector("#hm-status"),search=root.querySelector("#hm-search");
 const count=root.querySelector("#hm-count"),range=root.querySelector("#hm-range");
 const allowedKeys=new Set(["rmse","mae","r2","bias"]);
 const metrics={
   rmse:{label:"RMSE (t/ha)",better:"menor"},
   mae:{label:"MAE (t/ha)",better:"menor"},
   r2:{label:"R² predictivo",better:"mayor"},
   bias:{label:"|Sesgo| (t/ha)",better:"más próximo a cero"}
 };
 let data=null,protocol="fresh_97_41",metric="rmse";
 const make=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
 const score=(row)=>metric==="bias"?row.bias===null?null:Math.abs(row.bias):row[metric];
 const fmt=(value)=>value===null||value===undefined?"No publicado":Number(value).toLocaleString("es-MX",{minimumFractionDigits:4,maximumFractionDigits:4});
 const sourceOk=(href)=>typeof href==="string"&&href.startsWith("https://github.com/heri-espino/todoseboso/blob/main/");
 function draw(){
   if(!data)return;
   const selected=data.protocols.find(p=>p.id===protocol);if(!selected)return;
   protocolButtons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.hmProtocol===protocol)));
   metricButtons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.hmMetric===metric)));
   name.textContent=selected.title;
   detail.textContent=selected.explain;
   takeaway.textContent=selected.takeaway;
   const query=search.value.trim().toLocaleLowerCase("es-MX");
   const group=data.rows.filter(r=>r.protocol===protocol);
   const filtered=group.filter(r=>(r.name+" "+r.id+" "+r.description).toLocaleLowerCase("es-MX").includes(query));
   const ranked=[...filtered].sort((a,b)=>{
      const av=score(a),bv=score(b);
      if(av===null&&bv===null)return a.name.localeCompare(b.name,"es");
      if(av===null)return 1;if(bv===null)return -1;
      return (metric==="r2"?bv-av:av-bv)||a.name.localeCompare(b.name,"es");
   });
   const observed=group.map(score).filter(v=>v!==null&&Number.isFinite(v));
   const min=observed.length?Math.min(...observed):null;
   const max=observed.length?Math.max(...observed):null;
   const distinct=max!==min;
   const best=observed.length?(metric==="r2"?max:min):null;
   const fragment=document.createDocumentFragment();
   for(const row of ranked){
     const tr=make("tr");const val=score(row);
     if(val!==null&&best!==null&&Math.abs(val-best)<1e-10)tr.className="hm-best";
     const model=make("td","hm-name",row.name);
     const more=make("details","hm-model-extra");
     more.append(make("summary","", "Arquitectura"));
     more.append(make("p","",row.description));model.append(more);tr.append(model);
     for(const key of ["rmse","mae","r2","bias"])tr.append(make("td","hm-number",fmt(row[key])));
     const plot=make("td","hm-bars");
     if(val===null){plot.append(make("span","", "Sin dato"))}
     else{
        // Explicit truncated range: 20% minimum + 80% spread. Not a zero-based bar chart.
        const width=distinct?20+80*(val-min)/(max-min):100;
        const track=make("div","hm-bar-track");
        const fill=make("span","hm-bar-fill");
        fill.style.setProperty("--hm-width",width.toFixed(2)+"%");
        track.setAttribute("role","img");track.setAttribute("aria-label",metrics[metric].label+": "+fmt(val));
        track.append(fill);plot.append(track);
        if(tr.className==="hm-best")plot.append(make("span","hm-best-label","Menor error o mayor R² entre los publicados"));
     }
     tr.append(plot);
     const src=make("td","hm-source");
     if(sourceOk(row.source)){const a=make("a","", "Ver datos");a.href=row.source;a.target="_blank";a.rel="noopener noreferrer";src.append(a)}
     else src.textContent="No disponible";
     tr.append(src);
     fragment.append(tr);
   }
   if(!ranked.length){const row=make("tr"),td=make("td","", "Ningún modelo coincide con la búsqueda.");td.colSpan=7;row.append(td);fragment.append(row)}
   tbody.replaceChildren(fragment);
   const missing=group.filter(r=>r[metric]===null).length;
   count.textContent=filtered.length+" de "+group.length+" modelos · "+(data.rows.length)+" resultados históricos en total"+(missing?" · "+missing+" sin "+metrics[metric].label:"");
   range.textContent=distinct?"Barras con escala visual recortada entre "+fmt(min)+" y "+fmt(max)+" (no parten de cero); longitud relativa sólo dentro de este protocolo.":"Barras cualitativas, sin escala comparativa adicional.";
   status.textContent="Datos históricos cargados y ordenados por "+metrics[metric].label+".";
 }
 for(const b of protocolButtons)b.addEventListener("click",()=>{protocol=b.dataset.hmProtocol;draw()});
 for(const b of metricButtons)b.addEventListener("click",()=>{if(!allowedKeys.has(b.dataset.hmMetric))return;metric=b.dataset.hmMetric;draw()});
 search.addEventListener("input",draw);
 fetch("./data/historical_models.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{
   if(d.schema_version!==1||!Array.isArray(d.rows)||!Array.isArray(d.protocols)||d.rows.length<50)throw Error("Inventario incompleto");
   for(const x of d.rows)if(!d.protocols.some(p=>p.id===x.protocol)||!["rmse","mae","r2","bias"].every(k=>x[k]===null||Number.isFinite(x[k])))throw Error("Datos inválidos");
   data=d;draw();
 }).catch(()=>{
   status.textContent="No se pudo cargar el catálogo completo. La tabla verificada de 97/41 permanece visible; consulte las fuentes enlazadas.";
   protocolButtons.forEach(b=>{if(b.dataset.hmProtocol!=="fresh_97_41")b.disabled=true});
   metricButtons.forEach(b=>{if(b.dataset.hmMetric!=="rmse")b.disabled=true});
   search.disabled=true;
 });
})();
