'use client';
import {createContext,useContext,useEffect,useState, type ReactNode} from 'react';
import { toast } from 'sonner';
import {Toaster} from '@/components/ui/sonner';
import type {Product} from '@/lib/store/catalog';
import type {CartLine,StoreData,StoreSettings,StoreUser} from '@/lib/store/types';
type StoreContextType=StoreData & {cart:CartLine[];wishlist:string[];cartOpen:boolean;setCartOpen:(v:boolean)=>void;add:(p:Product,variant:string,qty?:number)=>void;quantity:(id:string,variant:string,q:number)=>void;toggleWish:(id:string)=>void;setProducts:(p:Product[])=>void;setSettings:(s:StoreSettings)=>void;user:StoreUser|null;refreshUser:()=>Promise<void>;clearCart:()=>void;};
const StoreContext=createContext<StoreContextType|null>(null);
export function useStore(){const s=useContext(StoreContext);if(!s)throw new Error('Store provider missing');return s;}
export async function api(path:string,body?:unknown,method?:string):Promise<any>{const r=await fetch('/api/store/'+path,{method:method??(body?'POST':'GET'),headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});let data:any;try{data=await r.json()}catch{throw new Error('The store is temporarily unavailable. Please try again.')}if(!r.ok)throw new Error(data.error??'Unable to complete that request.');return data;}
export function StoreProvider({children,initial}:{children:ReactNode;initial:StoreData}){
 const [products,setProducts]=useState(initial.products),[settings,setSettings]=useState(initial.settings),[cart,setCart]=useState<CartLine[]>([]),[wishlist,setWishlist]=useState<string[]>([]),[cartOpen,setCartOpen]=useState(false),[ready,setReady]=useState(false),[user,setUser]=useState<StoreUser|null>(null);
 async function refreshUser(){if(!initial.configured)return;try{const d=await api('me');setUser(d.user)}catch{setUser(null)}}
 useEffect(()=>{try{const c=JSON.parse(localStorage.getItem('turkvanta-cart')??'[]');if(Array.isArray(c))setCart(c.filter(x=>typeof x.productId==='string'&&typeof x.variant==='string'&&Number.isInteger(x.quantity)&&x.quantity>0));const w=JSON.parse(localStorage.getItem('turkvanta-wishlist')??'[]');if(Array.isArray(w))setWishlist(w.filter(x=>typeof x==='string'));}catch{}setReady(true);refreshUser();},[]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem('turkvanta-cart',JSON.stringify(cart));localStorage.setItem('turkvanta-wishlist',JSON.stringify(wishlist));}catch{/* Keep the current bag and saved items usable when browser storage is unavailable. */}},[cart,wishlist,ready]);
 useEffect(()=>{if(!user)return;api('saved').then(d=>{if(d.cart?.length)setCart(old=>{const merged=[...old];d.cart.forEach((x:CartLine)=>{const i=merged.findIndex(y=>y.productId===x.productId&&y.variant===x.variant);if(i<0)merged.push(x);else merged[i]={...merged[i],quantity:Math.max(merged[i].quantity,x.quantity)}});return merged});if(d.wishlist)setWishlist(old=>[...new Set([...old,...d.wishlist])]);}).catch(()=>{});},[user?.id]);
 useEffect(()=>{if(!user||!ready)return;const t=setTimeout(()=>{api('saved',{cart,wishlist}).catch(()=>toast.error('Your saved items could not sync. Your cart remains on this device.'))},700);return()=>clearTimeout(t)},[cart,wishlist,user?.id]);
 function add(p:Product,variant:string,qty=1){if(!p.colors.includes(variant)||p.stock<1)return;setCart(old=>{const exists=old.find(x=>x.productId===p.id&&x.variant===variant);if(exists)return old.map(x=>x===exists?{...x,quantity:Math.min(p.stock,x.quantity+qty)}:x);return [...old,{productId:p.id,variant,quantity:Math.min(p.stock,qty)}]});toast.success(`${p.name} added to your bag`);setCartOpen(true);}
 function quantity(id:string,variant:string,q:number){setCart(old=>q<=0?old.filter(x=>x.productId!==id||x.variant!==variant):old.map(x=>x.productId===id&&x.variant===variant?{...x,quantity:Math.max(1,Math.min(q,products.find(p=>p.id===id)?.stock??q))}:x))}
 function toggleWish(id:string){setWishlist(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])}
 return <StoreContext.Provider value={{products,settings,configured:initial.configured,live:initial.live,cart,wishlist,cartOpen,setCartOpen,add,quantity,toggleWish,setProducts,setSettings,user,refreshUser,clearCart:()=>setCart([])}}>{children}<Toaster theme="light" position="bottom-center" richColors/></StoreContext.Provider>
}
