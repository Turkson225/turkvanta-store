import {test,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';

const require=createRequire(import.meta.url);
// Exercise the real server guard and API handlers with a deterministic Auth and
// PostgREST boundary. No live credentials, owner records, or emails are used.
function load(file,overrides){
 const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',compiled)(name=>overrides[name]??require(name),module,module.exports);
 return module.exports;
}
const ownerId='11111111-1111-4111-8111-111111111111';
const customerId='22222222-2222-4222-8222-222222222222';
const factorId='33333333-3333-4333-8333-333333333333';
const token=(id,aal)=>'header.'+Buffer.from(JSON.stringify({sub:id,aal})).toString('base64url')+'.signature';
const owner1=token(ownerId,'aal1'),owner2=token(ownerId,'aal2'),customer2=token(customerId,'aal2');
let values,cookieWrites,refreshes,ownerRpcUnavailable;
const jar={get:name=>values.has(name)?{value:values.get(name)}:undefined,set:(name,value)=>{values.set(name,value);cookieWrites++},delete:name=>values.delete(name)};
const server=load('lib/store/server.ts',{
 'next/headers':{cookies:async()=>jar},
 '@/lib/runtime':{runtimeValues:()=>({SUPABASE_URL:'https://auth.test',SUPABASE_PUBLISHABLE_KEY:'test-public',SUPABASE_SECRET_KEY:'test-server',APP_ORIGIN:'https://store.test'})},
 './catalog':{products:[]},'./types':{defaultSettings:{}},
});
function AdminView(){}function OwnerAccess(){}
const page=load('app/admin/page.tsx',{'@/components/store/admin':{AdminView},'@/components/store/owner-access':{OwnerAccess},'@/lib/store/server':server}).default;
const route=load('app/api/store/[...path]/route.ts',{'next/headers':{cookies:async()=>jar},'@/lib/store/server':server});
const originalFetch=globalThis.fetch;
function userFor(value){
 if(![owner1,owner2,customer2].includes(value))return null;
 return {id:value===customer2?customerId:ownerId,email:value===customer2?'customer@example.test':'owner@example.test',user_metadata:{name:'Test account',admin:true},factors:[{id:factorId,status:'verified',factor_type:'totp'}]};
}
beforeEach(()=>{
 values=new Map();cookieWrites=0;refreshes=0;ownerRpcUnavailable=false;
 globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname,headers=new Headers(options.headers),value=headers.get('authorization')?.replace('Bearer ','');
  const reply=(data,status=200)=>Response.json(data,{status});
  if(path==='/auth/v1/user'){const user=userFor(value);return user?reply(user):reply({message:'Invalid session'},401)}
  if(path==='/auth/v1/token'){
   refreshes++;const body=JSON.parse(options.body);
   return body.refresh_token==='valid-refresh'?reply({access_token:owner2,refresh_token:'renewed-refresh',expires_in:3600,user:userFor(owner2)}):reply({message:'Invalid refresh token'},401);
  }
  if(path==='/rest/v1/owner_roles')return reply(userFor(value)?.id===ownerId?[{user_id:ownerId}]:[]);
  if(path==='/rest/v1/rpc/is_owner')return ownerRpcUnavailable?reply({message:'Access check unavailable'},503):reply(value===owner2);
  if(path==='/rest/v1/rpc/take_rate_limit')return reply(true);
  if(path===`/auth/v1/factors/${factorId}/challenge`)return reply({id:'challenge-id'});
  if(path===`/auth/v1/factors/${factorId}/verify`){const body=JSON.parse(options.body);return body.code==='123456'?reply({access_token:value===customer2?customer2:owner2,refresh_token:'renewed-refresh',expires_in:3600}):reply({message:'Invalid authenticator code'},400)}
  if(path==='/rest/v1/orders')return reply([{id:'protected-order',email:'buyer@example.test'}]);
  throw new Error('Unexpected upstream request: '+path);
 };
});
after(()=>{globalThis.fetch=originalFetch});
function request(path,body){
 const init=body?{method:'POST',headers:{Origin:'https://store.test','Content-Type':'application/json'},body:JSON.stringify(body)}:{};
 return route[body?'POST':'GET'](new Request('https://store.test/api/store/'+path,init),{params:Promise.resolve({path:path.split('/')})});
}

test('signed-out visitors get management sign-in guidance, but no admin data',async()=>{
 assert.equal((await page()).type,OwnerAccess);
 assert.equal((await request('admin/orders')).status,401);
 assert.equal(refreshes,0);
});
test('owner without MFA remains at the access screen and cannot read admin data',async()=>{
 values.set('tv-access',owner1);
 assert.equal((await page()).type,OwnerAccess);
 assert.equal((await request('admin/orders')).status,403);
});
test('MFA alone and user-editable admin metadata do not grant customer access',async()=>{
 values.set('tv-access',customer2);
 assert.equal((await page()).type,OwnerAccess);
 const me=await (await request('me')).json();assert.equal(me.user.admin,false);
 assert.equal((await request('admin/orders')).status,403);
});
test('verified owner passes both the server page and protected API guards',async()=>{
 values.set('tv-access',owner2);
 assert.equal((await page()).type,AdminView);
 const response=await request('admin/orders');assert.equal(response.status,200);
 assert.equal((await response.json()).rows[0].id,'protected-order');
});
test('expired access is renewed by the account API, never in server rendering',async()=>{
 values.set('tv-access','expired');values.set('tv-refresh','valid-refresh');
 assert.equal((await page()).type,OwnerAccess);assert.equal(refreshes,0);assert.equal(cookieWrites,0);
 const response=await request('me');assert.equal(response.status,200);
 assert.equal((await response.json()).user.aal,'aal2');assert.equal(refreshes,1);assert.equal(cookieWrites,2);
 assert.equal((await page()).type,AdminView);
});
test('invalid refresh stays signed out without an admin redirect loop',async()=>{
 values.set('tv-refresh','invalid-refresh');
 assert.equal((await page()).type,OwnerAccess);
 assert.equal((await (await request('me')).json()).user,null);
 assert.equal((await page()).type,OwnerAccess);
});
test('wrong MFA code cannot unlock the workspace; correct code renews the session',async()=>{
 values.set('tv-access',owner1);
 assert.equal((await request('auth/mfa-verify',{factor_id:factorId,code:'999999'})).status,400);
 assert.equal((await page()).type,OwnerAccess);assert.equal(cookieWrites,0);
 assert.equal((await request('auth/mfa-verify',{factor_id:factorId,code:'123456'})).status,200);
 assert.equal((await page()).type,AdminView);assert.equal(cookieWrites,2);
});
test('access-service errors fail closed and are not silently treated as success',async()=>{
 values.set('tv-access',owner2);ownerRpcUnavailable=true;
 await assert.rejects(page(),error=>error instanceof server.StoreError&&error.status===503);
 assert.equal((await request('admin/orders')).status,503);
});
