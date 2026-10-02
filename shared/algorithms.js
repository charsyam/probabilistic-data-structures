// Seeded 32-bit hash: identical input and seed always produce identical results.
export function hash(value, seed = 0) {
  let h = (2166136261 ^ Math.imul(seed + 1, 0x9e3779b1)) >>> 0;
  for (const byte of new TextEncoder().encode(String(value))) {
    h = Math.imul(h ^ byte, 16777619) >>> 0;
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
export const tokens = value => [...new Set(value.split(/[\s,]+/).filter(Boolean))];
export function signature(set, k) {
  return Array.from({ length: k }, (_, seed) => set.length ? Math.min(...set.map(v => hash(v, seed))) : 0xffffffff);
}
export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b), union = new Set([...A, ...B]);
  return union.size ? [...A].filter(v => B.has(v)).length / union.size : 1;
}
export class Lab {
  constructor(type, params) {
    this.type = type; this.p = params; this.items = new Map(); this.docs = [];
    this.cells = Array(params.size).fill(0);
    if (type === 'count-min-sketch') this.cells = Array(params.size * params.k).fill(0);
    if (type === 'cuckoo-filter') this.cells = Array(params.size * params.slots).fill(0);
    if (type === 'hyperloglog') this.cells = Array(2 ** params.precision).fill(0);
    this.signature = Array(params.k).fill(0xffffffff);
  }
  mappings(value) {
    return Array.from({length:this.p.k}, (_, seed) => {
      const raw = hash(value, seed), index = raw % this.p.size;
      return {name:`h${seed + 1}`, raw, index, cell:this.type === 'count-min-sketch' ? seed * this.p.size + index : index};
    });
  }
  cuckoo(value) {
    const fp = (hash(value, 71) % (2 ** this.p.bits - 1)) + 1;
    const a = hash(value) % this.p.size;
    const delta = hash(String(fp), 97) % this.p.size;
    const b = (a ^ delta) >>> 0;
    return {fp, a, b}; // bucket count is a power of two, so XOR remains in range.
  }
  run(action, value, amount = 1) {
    const type = this.type, p = this.p;
    const result = {action, value, mappings:[], touched:[], steps:[], message:'', success:true};
    if (type === 'hyperloglog' && action === 'estimate') {
      const m = this.cells.length;
      const zeros = this.cells.filter(r => r === 0).length;
      const sum = this.cells.reduce((total, r) => total + 2 ** -r, 0);
      result.message = `고유 개수 추정 ${this.estimate().toFixed(2)} · 실제 ${this.items.size}`;
      result.steps = [`전체 레지스터 수 m = ${m}`, `빈 레지스터 수 V = ${zeros}`, `Σ 2^(-M[i]) = ${sum.toFixed(6)}`, `범위 보정 후 고유 개수 추정 = ${this.estimate().toFixed(2)}`, `이론적 상대 표준 오차 ≈ ${(104 / Math.sqrt(m)).toFixed(2)}%`];
      return result;
    }
    const remember = () => this.items.set(value, (this.items.get(value) || 0) + amount);
    if (type === 'bloomfilter' || type === 'counting-bloomfilter' || type === 'count-min-sketch') {
      result.mappings = this.mappings(value); result.touched = result.mappings.map(m => m.cell);
      const before = result.touched.map(i => this.cells[i]);
      if (action === 'insert') {
        for (const i of result.touched) this.cells[i] = type === 'bloomfilter' ? 1 : this.cells[i] + amount;
        remember();
        result.message = `“${value}” 삽입 완료`;
      } else if (action === 'delete') {
        if (type !== 'counting-bloomfilter' || !this.items.has(value)) {
          result.success = false; result.message = '실제로 삽입한 데이터만 삭제할 수 있습니다.';
        } else {
          for (const i of result.touched) this.cells[i]--;
          const n = this.items.get(value) - 1;
          if (n) this.items.set(value, n); else this.items.delete(value);
          result.message = `“${value}” 1회 삭제 완료`;
        }
      } else if (type === 'count-min-sketch') {
        const estimate = Math.min(...before), actual = this.items.get(value) || 0;
        result.message = `추정 빈도 ${estimate} · 실제 빈도 ${actual} · 오차 +${estimate - actual}`;
      } else {
        const found = before.every(n => n > 0), actual = this.items.has(value);
        result.message = found ? (actual ? '존재 가능 → 실제 삽입된 데이터입니다.' : '존재 가능 → 거짓 양성(False positive)!') : '없음 → 확실히 존재하지 않습니다.';
      }
      result.mappings.forEach((m, i) => result.steps.push(`${m.name}: ${m.raw} % ${p.size} = ${m.index} · ${before[i]} → ${this.cells[m.cell]}`));
    } else if (type === 'cuckoo-filter') {
      const {fp, a, b} = this.cuckoo(value);
      const indices = [...new Set([a,b])].flatMap(bucket => Array.from({length:p.slots}, (_, i) => bucket * p.slots + i));
      result.touched = indices; result.mappings = [{name:'fingerprint', raw:hash(value,71), index:fp}, {name:'bucket A',raw:hash(value),index:a},{name:'bucket B = A XOR h(fp)',raw:hash(String(fp),97),index:b}];
      result.steps.push(`fingerprint = ${fp}; 후보 버킷 ${a}, ${b}`);
      if (action === 'insert') {
        const snapshot = [...this.cells]; let empty = indices.find(i => this.cells[i] === 0);
        if (empty !== undefined) this.cells[empty] = fp;
        else {
          let bucket = a, carried = fp, placed = false;
          for (let kick = 0; kick < 128; kick++) {
            const cell = bucket * p.slots + (hash(value, kick + 200) % p.slots);
            const displaced = this.cells[cell]; this.cells[cell] = carried;
            result.touched.push(cell);
            result.steps.push(`이동 ${kick + 1}: 버킷 ${bucket} 슬롯 ${cell % p.slots}, ${displaced} → ${carried}`);
            carried = displaced; bucket = (bucket ^ (hash(String(carried),97) % p.size)) >>> 0;
            empty = Array.from({length:p.slots},(_,i)=>bucket*p.slots+i).find(i=>this.cells[i]===0);
            if (empty !== undefined) { this.cells[empty] = carried; result.touched.push(empty); placed = true; break; }
          }
          if (!placed) { this.cells = snapshot; result.success = false; }
        }
        if (result.success) remember();
        result.message = result.success ? `fingerprint ${fp} 삽입 완료` : '재배치 한도 도달: 삽입 실패. 버퍼를 원래 상태로 복원했습니다.';
      } else if (action === 'delete') {
        const i = indices.find(i=>this.cells[i]===fp);
        if (!this.items.has(value) || i === undefined) {result.success=false;result.message='삽입 기록이 없는 데이터는 삭제할 수 없습니다.';}
        else {this.cells[i]=0;const n=this.items.get(value)-1;if(n)this.items.set(value,n);else this.items.delete(value);result.message='fingerprint 1개 삭제 완료';}
      } else {
        const found = indices.some(i=>this.cells[i]===fp);
        result.message = found ? (this.items.has(value) ? '존재 가능 → 실제 삽입된 데이터입니다.' : '존재 가능 → fingerprint 충돌에 의한 거짓 양성!') : '없음 → 확실히 존재하지 않습니다.';
      }
    } else if (type === 'hyperloglog') {
      const raw = hash(value), index = raw >>> (32 - p.precision);
      const suffix = (raw << p.precision) >>> 0;
      const rank = Math.min(Math.clz32(suffix) + 1, 33 - p.precision);
      const before = this.cells[index];
      result.touched = [index]; result.mappings = [{name:'32-bit hash',raw,index}];
      if (action === 'insert') {this.cells[index]=Math.max(before,rank);remember();}
      result.steps = [`hash (binary): ${raw.toString(2).padStart(32,'0')}`, `상위 ${p.precision}비트 → 레지스터 ${index}`, `나머지 비트의 선행 0 개수 + 1 = ${rank}`, `M[${index}] = max(${before}, ${rank}) → ${this.cells[index]}`];
      result.message = `고유 개수 추정 ${this.estimate().toFixed(2)} · 실제 ${this.items.size}`;
    } else {
      const set = tokens(value), sig = signature(set,p.k);
      result.mappings = sig.map((raw,i)=>({name:`min h${i+1}`,raw,index:i})); result.touched = sig.map((_,i)=>i);
      result.steps = sig.map((min,i)=>`h${i+1}: ${set.map(t=>`${t} → ${hash(t,i)}`).join(', ')} · 최솟값 ${min}`);
      if (action === 'insert') {
        this.docs.push({name:`집합 ${this.docs.length+1}`,value,set,sig});
        this.signature = sig; remember(); result.message = `${set.length}개 원소의 집합 저장 완료`;
      } else {
        result.comparisons = this.docs.map(doc=>{
          const equal = sig.filter((v,i)=>v===doc.sig[i]).length;
          const matchingBands = [];
          if(type==='lsh') for(let band=0;band<p.bands;band++) {
            const start=band*p.rows;
            if(sig.slice(start,start+p.rows).every((v,i)=>v===doc.sig[start+i])) matchingBands.push(band);
          }
          return {name:doc.name,value:doc.value,estimate:equal/p.k,actual:jaccard(set,doc.set),matchingBands,candidate:matchingBands.length>0};
        });
        this.signature = sig;
        result.message = type==='lsh' ? `${result.comparisons.filter(c=>c.candidate).length}개 후보 발견 · 전체 ${this.docs.length}개 집합` : `${this.docs.length}개 저장 집합과 유사도 비교`;
      }
      if(type==='lsh') result.steps.push(...Array.from({length:p.bands},(_,b)=>`band ${b+1}: [${sig.slice(b*p.rows,(b+1)*p.rows).join(', ')}] → bucket ${hash(sig.slice(b*p.rows,(b+1)*p.rows).join(':'),b)}`));
    }
    return result;
  }
  estimate() {
    const m=this.cells.length, alpha=m===16?0.673:m===32?0.697:m===64?0.709:0.7213/(1+1.079/m);
    let e=alpha*m*m/this.cells.reduce((sum,r)=>sum+2**-r,0);
    const zeros=this.cells.filter(r=>r===0).length;
    if(e<=2.5*m && zeros) e=m*Math.log(m/zeros);
    else if(e>2**32/30) e=-(2**32)*Math.log(1-e/2**32);
    return e;
  }
}
