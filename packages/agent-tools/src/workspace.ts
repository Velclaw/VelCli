import {AsyncLocalStorage} from "node:async_hooks";
import path from "node:path";
const storage=new AsyncLocalStorage<string>();
const base=path.resolve(process.env.VELCLI_WORKSPACES_DIR||path.join(process.cwd(),"data","workspaces"));
export function runInWorkspace<T>(id:string,fn:()=>T):T {
 const safeId=id.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
 return storage.run(path.join(base,safeId||"default"),fn);
}
export function workspaceRoot(){return storage.getStore()||path.resolve(process.env.VELCLI_WORKSPACE||process.cwd())}
