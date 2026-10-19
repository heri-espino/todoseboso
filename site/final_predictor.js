/* Real user-data predictor. A configured Python service and SHA-verified
 * 138-mean joblib are required; do NOT estimate yields in the browser. */
"use strict";
(() => {
  const $=id=>document.getElementById(id);
  let origin="",ready=false,featureNames=[],modelInfo=null;
  const modelKey="agrospatial_analog_v1";
  const say=(message,error=false)=>{
    $("fm-api-status").textContent=message;
    $("fm-api-status").dataset.error=String(error);
  };
  const urlBase=raw=>{
    const text=String(raw||"").trim().replace(/\/+$/,"");
    if(!text)return "";
    const u=new URL(text);
    if(u.username||u.password||u.search||u.hash||u.pathname!=="/")
      throw Error("Utiliza solamente la dirección HTTPS del servicio, sin ruta ni credenciales.");
    if(u.protocol!=="https:"&&
       !(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))
      throw Error("El servicio público debe usar HTTPS.");
    return u.origin;
  };
  async function request(path,options={}){
    const res=await fetch(origin+path,{
      cache:"no-store",...options
    });
    const body=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(typeof body.detail==="string"
      ?body.detail:"El servicio no respondió.");
    return body;
  }
  function field(name,help){
    const node=document.createElement("label");
    node.className="fm-input";
    const title=document.createElement("span");
    title.textContent=help||name;
    const input=document.createElement("input");
    input.type="number";input.step="any";input.name=name;
    input.autocomplete="off";
    input.placeholder=name==="base_centroid_lat"?"Ej. 19.5":
      name==="base_centroid_lon"?"Ej. -98.2":"Opcional";
    if(name==="base_centroid_lat"){
      input.min="-90";input.max="90";input.required=true;
    }
    if(name==="base_centroid_lon"){
      input.min="-180";input.max="180";input.required=true;
    }
    if(name.startsWith("geology_physiography::geo250_share__")){
      input.min="0";input.max="1";
    }
    const details=document.createElement("small");
    details.textContent=name;
    node.append(title,input,details);
    return node;
  }
  async function loadFields(){
    const res=await fetch("./data/model.json",{cache:"no-store"});
    if(!res.ok)throw Error("No se pudo cargar el catálogo de 26 variables.");
    const catalog=await res.json();
    const items=catalog.features.flatMap(group=>group.features);
    const target=$("fm-predict-fields");target.replaceChildren();
    for(const item of items)target.append(field(item.code,item.name));
    featureNames=items.map(x=>x.code);
    if(featureNames.length!==26||new Set(featureNames).size!==26)
      throw Error("El catálogo debe contener exactamente las 26 variables.");
    $("fm-predict-count").textContent="26 indicadores disponibles; " +
      "latitud y longitud obligatorias. El resto puede quedar faltante.";
  }
  function readForm(){
    const features={};
    for(const field of $("fm-predict-fields").querySelectorAll("input")){
      const raw=field.value.trim();
      if(!raw&&field.required)throw Error("Introduce latitud y longitud.");
      const value=raw===""?null:Number(raw);
      if(value!==null&&(!Number.isFinite(value)||
         (field.min!==""&&value<Number(field.min))||
         (field.max!==""&&value>Number(field.max))))
        throw Error("Valor fuera de rango en "+field.name);
      features[field.name]=value;
    }
    if(Object.keys(features).length!==26)throw Error("Faltan campos del modelo.");
    return features;
  }
  function setAvailability(enabled){
    ready=enabled;
    $("fm-predict-button").disabled=!enabled;
    $("fm-batch-button").disabled=!enabled;
  }
  async function connect(raw){
    setAvailability(false);
    try{
      origin=urlBase(raw);
      if(!origin){
        say("La inferencia de parcelas nuevas requiere desplegar el servicio Python " +
          "con el modelo reentrenado con media. Todavía no hay un servicio conectado.");
        return;
      }
      say("Verificando modelo real y coincidencia de las 59 predicciones...");
      const info=await request("/api/health");
      if(info.ready!==true||info.model!==modelKey||
         info.reproduced_59_individually!==true||
         info.training_labels!==138||
         !Array.isArray(info.feature_names)||
         info.feature_names.length!==26||
         featureNames.some(n=>!info.feature_names.includes(n)))
        throw Error("El servicio no verificó el modelo final y sus 59 estimaciones.");
      modelInfo=info;
      if(!info.new_parcels_supported){
        say("El modelo fue verificado, pero la geometría para parcelas nuevas no está validada.");
        return;
      }
      setAvailability(true);
      say("Servicio conectado. Ejecuta las 26 variables con el modelo real " +
        "agroespacial + 3 parcelas análogas.");
    }catch(error){modelInfo=null;say("No está disponible: "+error.message,true);}
  }
  async function send(path,data){
    return request(path,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify(data)});
  }
  function csvSplit(raw){
    const lines=String(raw).replace(/^\uFEFF/,"").trim().split(/\r?\n/);
    if(lines.length<2||lines.length>51)
      throw Error("El CSV debe tener cabecera y entre 1 y 50 parcelas.");
    const cols=lines.shift().split(",").map(s=>s.trim());
    if(new Set(cols).size!==cols.length||!cols.includes("base_centroid_lat")||
       !cols.includes("base_centroid_lon")||
       cols.some(c=>!featureNames.includes(c)))
      throw Error("Las columnas deben usar los códigos del catálogo; latitud y longitud son obligatorias.");
    const records=lines.map(line=>{
      const values=line.split(",");
      if(values.length!==cols.length)throw Error("Número de columnas inconsistente.");
      const features={};
      for(const name of featureNames)features[name]=null;
      for(const [i,c]of cols.entries()){
        const rawValue=values[i].trim();
        if(rawValue!==""){
          const v=Number(rawValue);
          if(!Number.isFinite(v))throw Error("Número inválido en "+c);
          features[c]=v;
        }
      }
      if(features.base_centroid_lat===null||features.base_centroid_lon===null)
        throw Error("Cada fila debe tener latitud y longitud.");
      return {features};
    });
    return records;
  }
  function download(predictions){
    const csv="fila,RENDIMIENTO_T_HA\r\n"+
      predictions.map((p,i)=>(i+1)+","+p.predicted_t_ha).join("\r\n")+"\r\n";
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;
    a.download="predicciones_agroespaciales_nuevas.csv";
    document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  async function runSingle(){
    const target=$("fm-own-result");target.textContent="";
    if(!ready){target.textContent="El motor Python no está disponible.";return;}
    try{
      const payload=readForm();
      $("fm-predict-button").disabled=true;
      target.textContent="Calculando con el modelo real...";
      const answer=await send("/api/predict",{features:payload});
      if(answer.model!==modelKey||answer.is_real_model!==true||
         !Number.isFinite(answer.predicted_t_ha))
        throw Error("El servidor no devolvió un resultado auténtico del modelo final.");
      target.replaceChildren();
      const h=document.createElement("strong");
      h.textContent=answer.predicted_t_ha.toFixed(4)+" t/ha";
      const note=document.createElement("p");
      note.textContent="Referencia agroespacial: "+answer.native_t_ha.toFixed(4)+
        " t/ha; ajuste por análogos: "+answer.analog_delta_t_ha.toFixed(4)+
        " t/ha. Es una predicción; el rendimiento real no está medido.";
      target.append(h,note);
    }catch(e){target.textContent="No se produjo una predicción: "+e.message;}
    finally{$("fm-predict-button").disabled=!ready;}
  }
  async function runBatch(){
    const target=$("fm-batch-result"),file=$("fm-batch-file").files?.[0];
    if(!ready){target.textContent="El motor Python no está disponible.";return;}
    if(!file){target.textContent="Selecciona un CSV.";return;}
    try{
      const cases=csvSplit(await file.text());
      $("fm-batch-button").disabled=true;
      target.textContent="Prediciendo "+cases.length+" parcelas...";
      const result=await send("/api/predict-batch",{parcels:cases});
      if(result.model!==modelKey||result.predictions?.length!==cases.length||
         result.predictions.some(p=>!p.is_real_model||!Number.isFinite(p.predicted_t_ha)))
        throw Error("El servidor devolvió un lote inválido.");
      download(result.predictions);
      target.textContent=cases.length+" predicciones reales calculadas. CSV descargado.";
    }catch(e){target.textContent="No se pudo predecir el lote: "+e.message;}
    finally{$("fm-batch-button").disabled=!ready;}
  }
  $("fm-api-connect").addEventListener("click",()=>connect($("fm-api-url").value));
  $("fm-predict-button").addEventListener("click",runSingle);
  $("fm-batch-button").addEventListener("click",runBatch);
  loadFields().then(async()=>{
    const res=await fetch("./data/inference_config.json",{cache:"no-store"});
    if(!res.ok)throw Error("No existe configuración de inferencia.");
    const cfg=await res.json();
    $("fm-api-url").value=cfg.api_base_url||"";
    await connect(cfg.api_base_url||"");
  }).catch(e=>say("No se pudo preparar la predicción: "+e.message,true));
})();