import type { Product } from './catalog';
export type CartLine = { productId:string; variant:string; quantity:number };
export type StoreSettings = { announcement:string; heroTitle:string; heroSubtitle:string; email:string; phone:string; shippingFee:number; pickup:boolean };
export type StoreOrder = {id:string;reference:string;created_at:string;payment_status:string;fulfillment_status:string;total:number;currency:string;email:string;items?:{name:string;quantity:number;unit_price:number}[];tracking?:string};
export type StoreUser = {id:string;email:string;name?:string;admin?:boolean;aal?:string;factors?:{id:string;status:string;factor_type:string}[]};
export type StoreData = {products:Product[];configured:boolean;live:boolean;settings:StoreSettings};
export const defaultSettings:StoreSettings={announcement:'A fresh perspective on the everyday.',heroTitle:'Good things.\nGreat everyday.',heroSubtitle:'Discover thoughtful finds for your home, your style, and everything in between.',email:'turkinnovation@gmail.com',phone:'055 459 8191',shippingFee:3500,pickup:true};
