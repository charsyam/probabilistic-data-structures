import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Lab,hash,jaccard,signature} from '../shared/algorithms.js';
const params={size:32,k:4,slots:2,bits:8,precision:8,bands:4,rows:4};
test('hash is deterministic, seeded and unsigned',()=>{
  assert.equal(hash('한글'),hash('한글'));
  assert.notEqual(hash('apple',0),hash('apple',1));
  assert.ok(hash('apple')>=0 && hash('apple')<=0xffffffff);
});
test('Bloom filter has no false negatives and reveals a forced false positive',()=>{
  const lab=new Lab('bloomfilter',{...params,size:1});
  lab.run('insert','apple');
  assert.match(lab.run('query','apple').message,/실제 삽입/);
  assert.match(lab.run('query','banana').message,/거짓 양성/);
});
test('Counting Bloom deletes duplicate hash mappings and prevents unsafe deletion',()=>{
  const lab=new Lab('counting-bloomfilter',{...params,size:1});
  lab.run('insert','apple');lab.run('insert','apple');
  assert.equal(lab.cells[0],8);
  lab.run('delete','apple');assert.equal(lab.cells[0],4);
  assert.equal(lab.run('delete','banana').success,false);
  lab.run('delete','apple');assert.equal(lab.cells[0],0);
  assert.match(lab.run('query','apple').message,/확실히/);
});
test('Count-Min Sketch reports row minimum and never underestimates',()=>{
  const lab=new Lab('count-min-sketch',{...params,size:8});
  for(let i=0;i<100;i++)lab.run('insert',`item${i%12}`,i%3+1);
  for(const [value,count] of lab.items){
    const counters=lab.mappings(value).map(m=>lab.cells[m.cell]);
    assert.ok(Math.min(...counters)>=count);
    assert.match(lab.run('query',value).message,new RegExp(`추정 빈도 ${Math.min(...counters)}`));
  }
});
test('Cuckoo filter preserves all accepted entries through relocations and failed inserts',()=>{
  const lab=new Lab('cuckoo-filter',{...params,size:8,bits:12});
  let failed=0,relocated=0;
  for(let i=0;i<60;i++){
    const snapshot=[...lab.cells],r=lab.run('insert',`value${i}`);
    if(!r.success){failed++;assert.deepEqual(lab.cells,snapshot);}
    if(r.steps.length>1)relocated++;
    for(const value of lab.items.keys()){
      const {a,b,fp}=lab.cuckoo(value);
      assert.ok([a,b].some(bucket=>lab.cells.slice(bucket*params.slots,(bucket+1)*params.slots).includes(fp)));
    }
  }
  assert.ok(failed>0);assert.ok(relocated>0);
  const value=lab.items.keys().next().value;
  assert.equal(lab.run('delete',value).success,true);
  assert.equal(lab.run('delete','never-inserted').success,false);
});
test('HyperLogLog handles empty, duplicates and a known cardinality',()=>{
  const lab=new Lab('hyperloglog',params);
  assert.equal(lab.estimate(),0);
  for(let i=0;i<5000;i++)lab.run('insert',`item${i}`);
  const before=[...lab.cells],estimate=lab.estimate();
  for(let i=0;i<5000;i++)lab.run('insert',`item${i}`);
  assert.deepEqual(lab.cells,before);
  assert.ok(Math.abs(estimate-5000)/5000<0.2,`estimate=${estimate}`);
  assert.equal(lab.items.size,5000);
});
test('MinHash signatures ignore order and estimate overlapping sets',()=>{
  assert.deepEqual(signature(['a','b'],16),signature(['b','a'],16));
  assert.equal(jaccard(['a','b'],['b','c']),1/3);
  const lab=new Lab('minhash',{...params,k:128});
  lab.run('insert','a b c');
  const exact=lab.run('query','c b a a').comparisons[0];
  assert.equal(exact.estimate,1);assert.equal(exact.actual,1);
  const overlap=lab.run('query','a b d').comparisons[0];
  assert.equal(overlap.actual,0.5);assert.ok(Math.abs(overlap.estimate-0.5)<0.2);
});
test('LSH returns identical sets with all matching bands and rejects disjoint sets',()=>{
  const lab=new Lab('lsh',{...params,k:16});
  lab.run('insert','a b c');lab.run('insert','x y z');
  const results=lab.run('query','c a b').comparisons;
  assert.equal(results[0].candidate,true);
  assert.deepEqual(results[0].matchingBands,[0,1,2,3]);
  assert.equal(results[1].candidate,false);
});

import {ReservoirSampling, QuantileSketch} from '../shared/stream-algorithms.js';
test('Reservoir fills, replaces, skips and preserves duplicate stream entries',()=>{
  const draws=[0,0.99];
  const r=new ReservoirSampling(2,()=>draws.shift());
  r.insert('a');r.insert('a');
  assert.deepEqual(r.sample,['a','a']);
  assert.equal(r.insert('b').previous,'a');
  assert.equal(r.insert('c').accepted,false);
  assert.deepEqual(r.sample,['b','a']);assert.equal(r.count,4);
});
test('Reservoir sampling includes each stream position at approximately k/n',()=>{
  let state=123456;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};
  const counts=Array(20).fill(0);
  for(let trial=0;trial<10000;trial++){
    const r=new ReservoirSampling(4,random);
    for(let i=0;i<20;i++)r.insert(i);
    for(const i of r.sample)counts[i]++;
  }
  for(const count of counts)assert.ok(Math.abs(count-2000)<160,`inclusions=${count}`);
});
test('GK preserves rank bounds and estimates ordered, reversed, repeated and mixed streams',()=>{
  let state=42;
  const mixed=Array.from({length:2000},()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%1000-500;});
  for(const values of [Array.from({length:2000},(_,i)=>i),Array.from({length:2000},(_,i)=>-i),Array(2000).fill(5),mixed]){
    const s=new QuantileSketch(0.02);
    assert.equal(s.quantile(0.5),null);
    for(const v of values)s.insert(v);
    assert.equal(s.tuples.reduce((n,t)=>n+t.g,0),values.length);
    assert.ok(s.tuples.length<values.length/4);
    const sorted=[...values].sort((a,b)=>a-b);
    assert.equal(s.quantile(0),sorted[0]);assert.equal(s.quantile(1),sorted.at(-1));
    for(let i=1;i<100;i++){
      const q=i/100, value=s.quantile(q),rank=Math.ceil(q*values.length);
      const lower=sorted.filter(v=>v<value).length+1,upper=sorted.filter(v=>v<=value).length;
      assert.ok(Math.max(lower-rank,rank-upper,0)<=s.epsilon*values.length,`q=${q}, rank=${rank}, range=${lower}..${upper}`);
    }
  }
});
test('Stream algorithms reject invalid parameters and non-finite numeric inputs',()=>{
  assert.throws(()=>new ReservoirSampling(0),RangeError);
  assert.throws(()=>new QuantileSketch(0),RangeError);
  const s=new QuantileSketch();
  assert.throws(()=>s.insert(Infinity),TypeError);
  assert.throws(()=>s.quantile(1.1),RangeError);
});
