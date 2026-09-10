'use client';

import Link from 'next/link';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,ShieldCheck,LoaderCircle,LogOut} from 'lucide-react';
import {toast} from 'sonner';
import {api,useStore} from './provider';

export function TwoStepVerification({onVerified,onBusyChange}:{onVerified?:()=>void;onBusyChange?:(busy:boolean)=>void}) {
 const s=useStore();
 const [enrollment,setEnrollment]=useState<{id:string;secret?:string}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const verifiedFactor=s.user?.factors?.find(f=>f.status==='verified'&&f.factor_type==='totp');
 const factorId=enrollment?.id??verifiedFactor?.id;
 function changeBusy(value:boolean){setBusy(value);onBusyChange?.(value)}
 async function enroll(){
  if(busy)return;changeBusy(true);setError('');
  try{const d=await api('auth/mfa-enroll',{});setEnrollment({id:d.id,secret:d.totp?.secret})}
  catch(e){setError((e as Error).message)}finally{changeBusy(false)}
 }
 async function verify(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!factorId||busy)return;
  const code=String(new FormData(e.currentTarget).get('code')??'');
  changeBusy(true);setError('');
  try{
   await api('auth/mfa-verify',{factor_id:factorId,code});
   const current=await s.refreshUser();
   if(current?.aal!=='aal2')throw new Error('Please check your session again to continue.');
   setEnrollment(null);toast.success('Two-step verification complete.');onVerified?.();
  }catch(e){setError((e as Error).message)}finally{changeBusy(false)}
 }
 return <div className="owner-verification">
  {s.user?.aal==='aal2'?<p className="notice">Two-step verification is active for this session.</p>:<>
   <p>Enter the six-digit code from your authenticator app to unlock store management. This is separate from an email verification code.</p>
   {!factorId?<><p className="small muted">First time? Add Jedi’s Store to a time-based authenticator app using the setup key.</p><button type="button" className="button secondary" disabled={busy} onClick={enroll}>{busy?'Preparing…':'Set up authenticator'}</button></>:<form className="form-grid settings-form" onSubmit={verify}>
    {enrollment?.secret&&<div className="span-2"><p>Add this setup key as a time-based account in your authenticator, then enter its code below.</p><div className="security-code">{enrollment.secret}</div><p className="small muted">Keep this setup key private.</p></div>}
    <label className="span-2">Authenticator code<input name="code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="one-time-code" placeholder="6-digit code" disabled={busy}/></label>
    <button className="button" disabled={busy}>{busy?'Verifying…':'Verify and continue'}<ArrowRight size={18}/></button>
   </form>}
  </>}
  {error&&<p className="notice" role="alert">{error}</p>}
 </div>;
}

export function OwnerAccess(){
 const s=useStore();
 const [checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[mfaBusy,setMfaBusy]=useState(false),[error,setError]=useState('');
 // A protected-page visit explicitly renews the session in an API request,
 // where cookies can be written; a Server Component cannot refresh them.
 useEffect(()=>{let active=true;s.refreshUser().finally(()=>{if(active)setChecked(true)});return()=>{active=false}},[s.refreshUser]);
 async function login(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{await api('auth/login',Object.fromEntries(new FormData(e.currentTarget)));await s.refreshUser()}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function switchAccount(){
  if(busy||mfaBusy||s.userLoading)return;setBusy(true);setError('');
  try{await api('auth/logout',{});await s.refreshUser()}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div className="wrap inner-page owner-access"><section className="customer-panel owner-access-panel">
  <span className="owner-access-icon" aria-hidden="true"><ShieldCheck size={30}/></span>
  <span className="eyebrow">JEDI’S STORE / OWNER WORKSPACE</span><h1>Store management</h1>
  {!checked||s.userLoading?<p className="owner-access-loading" role="status"><LoaderCircle size={21} className="spin"/>Checking your owner session…</p>
   :!s.configured?<p className="notice">Store management is not connected yet. Please check the store configuration.</p>
   :s.userError?<div className="stack"><p className="notice" role="alert">{s.userError}</p><button className="button secondary" onClick={()=>s.refreshUser()}>Check access again</button></div>
   :!s.user?<><p>Sign in with the account that owns this store. We’ll guide you through any verification needed here.</p><form className="form-grid" onSubmit={login}><label className="span-2">Owner email address<input name="email" type="email" required autoComplete="username"/></label><label className="span-2">Password<input name="password" type="password" required autoComplete="current-password"/></label><button className="button" disabled={busy}>{busy?'Signing in…':'Sign in to management'}<ArrowRight size={18}/></button></form><Link href="/account" className="text-link">Account help or password recovery</Link></>
   :s.user.admin!==true?<><p>You’re signed in as <strong>{s.user.email}</strong>. This account does not have store management access.</p><p className="small muted">Use the account already registered as the store owner.</p><button className="button secondary" disabled={busy||mfaBusy||s.userLoading} onClick={switchAccount}><LogOut size={17}/>Use another account</button><Link href="/account" className="text-link">Back to my account</Link></>
   :<><p className="owner-session-email">Signed in as <strong>{s.user.email}</strong></p>{s.user.aal==='aal2'?<><p>Your session has been checked. Continue to open the protected workspace.</p><a className="button" href="/admin">Open store management <ArrowRight size={18}/></a></>:<><h2>Verify it’s you</h2><TwoStepVerification key={s.user.id} onBusyChange={setMfaBusy} onVerified={()=>window.location.assign('/admin')}/></>}<button className="text-link" disabled={busy||mfaBusy||s.userLoading} onClick={switchAccount}>Use another account</button></>}
  {error&&<p className="notice" role="alert">{error}</p>}
 </section></div>;
}
