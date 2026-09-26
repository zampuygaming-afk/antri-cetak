import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
function getEnv(n:string[]):string|undefined{for(const x of n){const v=Deno.env.get(x);if(v)return v;}return undefined;}
function sanitize(v:any){if(v==null)return"";if(Array.isArray(v))return v.join(", ");if(typeof v==='object')return JSON.stringify(v);return String(v);}
function decodeSA(raw:string){raw=raw.trim();const t:string[]=[raw];try{t.push(atob(raw));}catch{}if((raw.startsWith("'")&&raw.endsWith("'"))||(raw.startsWith('"')&&raw.endsWith('"')))t.push(raw.slice(1,-1));for(const c of t){try{return JSON.parse(c);}catch{}}throw new Error("SA invalid");}
async function getToken(sa:any){const h={alg:"RS256",typ:"JWT"};const now=Math.floor(Date.now()/1000);const p={iss:sa.client_email,scope:"https://www.googleapis.com/auth/spreadsheets",aud:"https://oauth2.googleapis.com/token",exp:now+3600,iat:now};const b64=(o:any)=>btoa(JSON.stringify(o)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");const toSign=`${b64(h)}.${b64(p)}`;const key=await crypto.subtle.importKey("pkcs8",Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g,"").replace(/\s/g,"")),c=>c.charCodeAt(0)),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);const sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(toSign));const jwt=`${toSign}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}`;const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`});const d=await r.json();return d.access_token;}

serve(async (req)=>{
  try{
    const SHEET_ID=getEnv(["GOOGLE_SHEET_ID","SHEET_ID"])!;
    const SA_RAW=getEnv(["GOOGLE_SERVICE_ACCOUNT_JSON"])!;
    const sa=decodeSA(SA_RAW);
    const body=await req.json();
    const r=body.record||body.new||body;
    const op=body.operation||"";
    const token=await getToken(sa);

    // === LOGIC HAPUS KALO BATAL / GAGAL / DELETE ===
    if(op==="DELETE"){
      const getRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:A`,{headers:{Authorization:`Bearer ${token}`}});
      const data=await getRes.json();
      const values=data.values||[];
      const rowIndex=values.findIndex((x:any[])=>x[0]==r.id);
      if(rowIndex>=0){
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,{
          method:"POST",
          headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
          body:JSON.stringify({requests:[{deleteDimension:{range:{sheetId:0,dimension:"ROWS",startIndex:rowIndex,endIndex:rowIndex+1}}}]}),
        });
      }
      return new Response(JSON.stringify({success:true,action:"DELETED"}),{headers:{"Content-Type":"application/json"}});
    }

    // === LOGIC INSERT / UPDATE NORMAL (YANG UDAH AMAN) ===
    let ruteSekarang="";
    if(Array.isArray(r.route)){ruteSekarang=r.route[r.route_index??0]||r.route.join(", ");}else{ruteSekarang=r.route||"";}
    const row=[sanitize(r.id),sanitize(r.customer),sanitize(r.material),sanitize(r.size),sanitize(r.qty_label),sanitize(r.created_by),sanitize(r.assigned_operator||"Belum assign"),sanitize(r.status),sanitize(ruteSekarang),sanitize(r.finishing_type),sanitize(r.created_at)];

    const getRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:A`,{headers:{Authorization:`Bearer ${token}`}});
    const sheetData=await getRes.json();
    const values=sheetData.values||[];
    let rowIndex=values.findIndex((x:any[])=>x[0]==r.id);
    let sheetsRes;
    if(rowIndex>=0){
      sheetsRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A${rowIndex+1}:K${rowIndex+1}?valueInputOption=USER_ENTERED`,{method:"PUT",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({values:[row]})});
    }else{
      sheetsRes=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A1:append?valueInputOption=USER_ENTERED`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({values:[row]})});
    }
    const result=await sheetsRes.json();
    if(!sheetsRes.ok)throw new Error(JSON.stringify(result));
    return new Response(JSON.stringify({success:true}),{headers:{"Content-Type":"application/json"}});
  }catch(e:any){return new Response(JSON.stringify({success:false,error:e.message}),{headers:{"Content-Type":"application/json"}});}
});