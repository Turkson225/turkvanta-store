import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTransaction,sameToken} from '../supabase/functions/commerce/payment-rules.mjs';
const valid={reference:'TV-A',domain:'test',amount:25000,currency:'GHS',status:'success',id:123};
test('Only successful provider transactions proceed to database payment checks',()=>{assert.equal(validateTransaction('TV-A','test',valid),'paid');assert.equal(validateTransaction('TV-A','test',{...valid,status:'pending'}),'pending');assert.equal(validateTransaction('TV-A','test',{...valid,status:true}),'pending')});
test('Mismatched reference, currency, and environment are rejected',()=>{for(const change of [{reference:'TV-B'},{currency:'USD'},{domain:'live'}])assert.throws(()=>validateTransaction('TV-A','test',{...valid,...change}));});
test('Null, negative, zero, fractional, and unsafe amounts are rejected',()=>{for(const amount of [null,0,-1,12.5,Number.MAX_SAFE_INTEGER+1,'25000'])assert.throws(()=>validateTransaction('TV-A','test',{...valid,amount}));});
test('Failure and abandonment cannot appear as successful payment',()=>{assert.equal(validateTransaction('TV-A','test',{...valid,status:'failed'}),'failed');assert.equal(validateTransaction('TV-A','test',{...valid,status:'abandoned'}),'cancelled');assert.throws(()=>validateTransaction('TV-A','test',{...valid,id:null}));});
test('Order access and webhook comparisons reject different tokens',()=>{assert.equal(sameToken('a'.repeat(64),'a'.repeat(64)),true);assert.equal(sameToken('a'.repeat(64),'a'.repeat(63)+'b'),false);assert.equal(sameToken('a','aa'),false);});
