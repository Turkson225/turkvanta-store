import {AdminView} from '@/components/store/admin';
import {redirect} from 'next/navigation';
import {requireAdmin,StoreError} from '@/lib/store/server';
export const dynamic='force-dynamic';
export const metadata={title:'Owner workspace | Jedi’s Store',robots:{index:false,follow:false}};
export default async function Page(){
  try{
    // Cookie refresh belongs to account API requests, not server rendering.
    await requireAdmin(false);
  }catch(error){
    if(error instanceof StoreError&&(error.status===401||error.status===403))redirect('/account');
    throw error;
  }
  return <AdminView/>;
}
