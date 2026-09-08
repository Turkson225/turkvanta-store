export function sameToken(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
export function validateTransaction(reference,domain,data){
 if(!data||data.reference!==reference)throw new Error('Provider transaction reference did not match.');
 if(!Number.isSafeInteger(data.amount)||data.amount<=0)throw new Error('Provider amount is not a valid minor-unit integer.');
 if(data.currency!=='GHS')throw new Error('Payment currency did not match this store.');
 if(data.domain!==domain)throw new Error('Payment environment did not match.');
 if(data.status==='success'&&(data.id===null||data.id===undefined||String(data.id)===''))throw new Error('Provider transaction identity is missing.');
 return data.status==='success'?'paid':data.status==='failed'?'failed':data.status==='abandoned'?'cancelled':'pending';
}
