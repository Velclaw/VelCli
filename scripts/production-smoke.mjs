const url=process.env.VELCLI_PRODUCTION_URL||"https://velcli.dev";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let lastError="no response";
let passed=false;
for(let attempt=1;attempt<=12;attempt++){
 try{
  const response=await fetch(new URL("/health",url),{signal:AbortSignal.timeout(10000),headers:{accept:"application/json"}});
  const body=await response.text();
  let data;
  try{data=JSON.parse(body)}catch{throw new Error(`Health endpoint returned non-JSON HTTP ${response.status}: ${body.slice(0,200)}`)}
  console.log(JSON.stringify({attempt,status:response.status,service:data.service,ok:data.ok,authConfigured:data.authConfigured,database:data.database,workspaceStorage:data.workspaceStorage}));
  if(!response.ok||data.ok!==true||data.service!=="velcli")throw new Error(`Production health failed: HTTP ${response.status}`);
  if(data.authConfigured!==true)throw new Error("VELCLI_ADMIN_PASSWORD is not configured in production.");
  if(data.database?.configured!==true||data.database?.connected!==true||data.database?.workspaceFilePersistence!==true)throw new Error("Production PostgreSQL is not configured and connected; persistent workspace storage is not verified.");
  passed=true;break;
 }catch(error){lastError=error instanceof Error?error.message:String(error);console.error(`Attempt ${attempt}/12: ${lastError}`);if(attempt<12)await sleep(10000)}
}
if(!passed)throw new Error(`Production smoke test failed: ${lastError}`);
console.log("Production smoke test passed.");
