import {spawn} from "node:child_process";
import {mkdtemp,rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root=process.cwd();
const temp=await mkdtemp(path.join(os.tmpdir(),"velcli-smoke-"));
const port=Number(process.env.VELCLI_TEST_PORT||18787);
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,[path.join(root,"dist/apps/api/src/index.js")],{
 cwd:root,
 env:{...process.env,PORT:String(port),VELCLI_ADMIN_PASSWORD:"smoke-test-password",VELCLI_DATA_DIR:path.join(temp,"data"),VELCLI_WORKSPACES_DIR:path.join(temp,"workspaces"),DATABASE_URL:""},
 stdio:["ignore","pipe","pipe"]
});
let logs="";
child.stdout.on("data",x=>logs+=x.toString());
child.stderr.on("data",x=>logs+=x.toString());
const assert=(ok,message)=>{if(!ok)throw new Error(message)};
async function request(route){return fetch(base+route,{signal:AbortSignal.timeout(2500)})}
try{
 let ready=false,lastError;
 for(let i=0;i<40;i++){
  if(child.exitCode!==null)throw new Error("Server exited early. "+logs);
  try{const r=await request("/health");if(r.ok){ready=true;break}}catch(e){lastError=e}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert(ready,"Server did not become healthy. "+String(lastError||""));
 const home=await request("/");
 const html=await home.text();
 assert(home.status===200,"Root route must return HTTP 200.");
 assert((home.headers.get("content-type")||"").includes("text/html"),"Root route must serve HTML, not JSON.");
 assert(html.toLowerCase().includes("<!doctype html")&&html.includes("VELCLI"),"Production UI HTML is missing or incomplete.");
 const health=await (await request("/health")).json();
 assert(health.ok===true&&health.service==="velcli","Health endpoint payload is invalid.");
 assert(health.authConfigured===true,"Admin password configuration is not detected.");
 const auth=await (await request("/api/auth/status")).json();
 assert(auth.configured===true&&auth.authenticated===false,"Unauthenticated auth status is invalid.");
 const models=await (await request("/api/models")).json();
 assert(Array.isArray(models.providers),"Model status endpoint must return a providers array.");
 const login=await fetch(base+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:"smoke-test-password"}),signal:AbortSignal.timeout(2500)});
 assert(login.status===200,"Valid admin password should be accepted.");
 assert((login.headers.get("set-cookie")||"").includes("HttpOnly"),"Session cookie must be HttpOnly.");
 console.log("VelCli production smoke tests passed: root HTML, health, auth status, model status, login.");
}catch(error){
 console.error("VelCli production smoke tests failed:",error instanceof Error?error.stack:String(error));
 process.exitCode=1;
}finally{
 child.kill("SIGTERM");
 await new Promise(resolve=>setTimeout(resolve,150));
 await rm(temp,{recursive:true,force:true});
}
