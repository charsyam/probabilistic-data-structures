import {Lab, hash} from './algorithms.js';
const catalog = [
  ['bloomfilter','Bloom Filter','01','비트 배열로 빠르게 확인하는 집합 멤버십','MEMBERSHIP'],
  ['counting-bloomfilter','Counting Bloom Filter','02','카운터로 삽입과 삭제를 추적하는 멤버십','MEMBERSHIP'],
  ['cuckoo-filter','Cuckoo Filter','03','두 후보 버킷 사이를 이동하는 작은 fingerprint','MEMBERSHIP'],
  ['count-min-sketch','Count-Min Sketch','04','여러 해시 행으로 추정하는 데이터 빈도','FREQUENCY'],
  ['hyperloglog','HyperLogLog','05','해시의 선행 0으로 추정하는 고유 데이터 수','CARDINALITY'],
  ['minhash','MinHash','06','최소 해시 서명으로 비교하는 집합 유사도','SIMILARITY'],
  ['lsh','Locality-Sensitive Hashing','07','서명을 밴드로 나누어 찾는 유사 집합 후보','SIMILARITY']
];
const type=document.body.dataset.type;
const home = !type;
const prefix=home?'./':'../';
const $=id=>document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.body.innerHTML = `<aside><a class="brand" href="${prefix}"><span class="brand-icon">◈</span> PROBABILISTIC<span class="brand-sub">INTERACTIVE LAB</span></a><div class="nav-label">STRUCTURES / 07</div><nav>${catalog.map(([id,name,num])=>`<a class="${id===type?'active':''}" href="${prefix}${id}/"><span>${num}</span>${name}<b>↗</b></a>`).join('')}</nav><div class="aside-bottom"><span class="live-dot"></span> Local simulation<br><small>모든 계산은 브라우저에서 실행됩니다.</small></div></aside><main>${home ? renderHome() : renderLab()}</main>`;
function renderHome() {
  return `<header><span>PROBABILISTIC DATA STRUCTURES</span><span>실험하며 이해하는 알고리즘</span></header><section class="hero"><div class="eyebrow">SMALL MEMORY. BIG POSSIBILITIES.</div><h1>확률을 눈으로 보고,<br><em>자료구조를 이해하세요.</em></h1><p>데이터가 해시를 거쳐 버퍼에 쌓이는 과정부터 거짓 양성과 추정 오차까지.<br>직접 입력하고, 탐색하며, 일곱 가지 자료구조의 동작을 확인하세요.</p><div class="hero-stats"><span><b>07</b> 자료구조</span><span><b>32-bit</b> 실제 해시</span><span><b>100%</b> 브라우저 실행</span></div></section><div class="section-title"><h2>실험할 자료구조 선택</h2><span>SELECT YOUR EXPERIMENT ↓</span></div><div class="cards">${catalog.map(([id,name,num,desc,tag])=>`<a class="structure-card" href="./${id}/"><div class="card-top"><span>${num} / ${tag}</span><b>↗</b></div><div class="mini-grid">${Array.from({length:24},(_,i)=>`<i class="${hash(id,i)%3===0?'filled':''}"></i>`).join('')}</div><h2>${name}</h2><p>${desc}</p><div class="card-link">실험 시작하기 <span>→</span></div></a>`).join('')}</div>`;
}
function renderLab() {
  const entry=catalog.find(c=>c[0]===type);
  return `<header><a href="../">자료구조 실험실</a><span>${entry[4]} / EXPERIMENT ${entry[2]}</span></header><section class="lab-heading"><div class="eyebrow">EXPERIMENT ${entry[2]} / 07</div><h1>${entry[1]}</h1><p>${entry[3]}</p></section><section class="panel config"><div class="section-title"><h2><span class="number">01</span> 실험 설정</h2><span>PARAMETERS</span></div><form id="config-form"><div id="fields"></div><button type="submit" class="primary">버퍼 생성 / 초기화 <span>↗</span></button></form><p class="hint" id="config-hint"></p></section><div id="experiment" hidden><div class="stats" id="stats"></div><section class="panel input-panel"><div class="section-title"><h2><span class="number">02</span> 데이터 삽입 / 삭제</h2><button class="text-button" id="sample">예제 데이터 넣기 ↗</button></div><form id="data-form"><label class="data-label" for="value" id="value-label">데이터</label><div class="input-row"><input id="value" required maxlength="2000" placeholder="예: apple" autocomplete="off"><label id="amount-wrap" hidden>빈도 <input id="amount" type="number" min="1" max="1000000" value="1"></label><button class="primary" type="submit">삽입 +</button><button type="button" id="delete" hidden>삭제 −</button></div></form><p class="hint" id="input-hint"></p></section><section class="panel search-panel"><div class="section-title"><h2><span class="number">03</span> <span id="search-title">데이터 검색</span></h2><span>QUERY</span></div><form id="search-form"><label for="search-value" id="search-label">검색할 데이터</label><div class="input-row"><input id="search-value" required maxlength="2000" placeholder="검색할 값을 입력하세요" autocomplete="off"><button type="submit" class="primary" id="query">검색 ⌕</button></div></form><p class="hint" id="search-hint"></p><div id="search-result" aria-live="polite" aria-atomic="true"><p class="search-empty">검색 결과가 여기에 표시됩니다.</p></div></section><div class="workspace"><section class="panel buffer-panel"><div class="section-title"><h2><span class="number">04</span> <span id="buffer-title">버퍼 상태</span></h2><span id="buffer-meta"></span></div><div class="legend"><span><i></i> 비어 있음</span><span><i class="filled"></i> 데이터 있음</span><span><i class="highlight"></i> 삽입 / 삭제 매핑</span><span><i class="query-hit"></i> 검색 일치</span><span><i class="missing"></i> 검색 위치의 값이 0</span></div><div id="buffer"></div><div id="bands"></div><div class="explanation" id="explanation"></div></section><section class="panel result-panel"><div class="section-title"><h2><span class="number">05</span> 해시 매핑 / 계산 과정</h2><span class="live-dot"></span></div><div id="result" aria-live="polite"><div class="empty-state">⌁<p>데이터를 입력하면<br>해시 매핑과 결과가 여기에 표시됩니다.</p></div></div></section></div><section class="panel"><div class="section-title"><h2><span class="number">06</span> 삽입 데이터</h2><span id="item-count"></span></div><div id="items"></div></section><section class="panel"><div class="section-title"><h2>연산 기록</h2><button class="text-button" id="clear-history">기록 지우기</button></div><div id="history"></div></section></div><footer>Deterministic seeded hashing · 실제 버퍼 연산 · 학습용 시뮬레이터</footer>`;
}
if (!home) {
  let lab, last, history=[];
  const isSet=type==='minhash'||type==='lsh';
  const inputField=(id,label,value,min,max,extra='')=>`<label>${label}<input id="${id}" type="number" value="${value}" min="${min}" max="${max}" required ${extra}></label>`;
  $('fields').innerHTML = type==='hyperloglog' ? inputField('precision','정밀도 p (레지스터 2ᵖ개)',6,4,10) : type==='lsh' ? inputField('bands-input','밴드 수 b',4,1,32)+inputField('rows','밴드당 행 수 r',4,1,16) : isSet ? inputField('k','해시 수 / 서명 길이',16,1,128) : inputField('size',type==='cuckoo-filter'?'버킷 수 (2의 거듭제곱)':type==='count-min-sketch'?'행당 버퍼 크기 / width':'버퍼 크기 (칸)',32, type==='cuckoo-filter'?2:1,1024)+(type==='cuckoo-filter'?inputField('slots','버킷당 슬롯',2,1,8)+inputField('bits','Fingerprint 비트 수',8,2,16):inputField('k',type==='count-min-sketch'?'해시 수 / depth':'해시 수',3,1,16));
  const notes = {
    bloomfilter:'각 해시가 가리키는 비트를 1로 설정합니다. 모든 비트가 1이면 존재 가능, 하나라도 0이면 확실히 없음입니다. 삭제는 지원하지 않습니다.',
    'counting-bloomfilter':'매핑된 카운터를 증가시킵니다. 삭제 시 1씩 감소합니다. 안전한 삭제를 위해 실제 삽입 기록이 있는 데이터만 삭제합니다.',
    'cuckoo-filter':'fingerprint를 두 후보 버킷 중 하나에 저장합니다. 빈 슬롯이 없으면 기존 fingerprint를 다른 버킷으로 옮깁니다. 버킷 수는 XOR 매핑을 위해 2의 거듭제곱이어야 합니다.',
    'count-min-sketch':'해시마다 별도 행의 카운터를 증가시킵니다. 검색은 매핑된 카운터의 최솟값을 반환하며, 충돌로 실제 빈도보다 크게 추정될 수 있습니다.',
    hyperloglog:'상위 p비트로 레지스터를 선택하고, 나머지 비트의 선행 0 개수 + 1의 최댓값을 저장합니다. 고유 개수를 추정하는 구조로 개별 데이터의 존재 여부는 검색할 수 없습니다.',
    minhash:'공백이나 쉼표로 구분한 원소를 집합으로 처리합니다. 각 해시 함수의 최솟값으로 서명을 만들고, 서명이 일치하는 비율로 Jaccard 유사도를 추정합니다.',
    lsh:'MinHash 서명을 b개 밴드, 밴드당 r개 행으로 나눕니다. 하나 이상의 밴드가 동일한 집합을 후보로 선택합니다. 후보에서 누락되거나 낮은 유사도의 후보가 포함될 수 있습니다.'
  };
  $('config-hint').textContent=type==='lsh'?'총 해시 수 = b × r (최대 128). 집합 간 유사도 s일 때 후보가 될 확률은 1 − (1 − sʳ)ᵇ입니다.':type==='hyperloglog'?'버퍼 = 2ᵖ 레지스터. 이론적 상대 표준 오차 ≈ 1.04 / √m. 32-bit 해시와 작은 범위 보정을 사용합니다.':'파라미터를 바꿔 초기화하면 현재 데이터와 버퍼가 초기화됩니다.';
  $('input-hint').textContent=isSet?'공백 또는 쉼표로 구분한 집합을 입력하세요. 예: apple banana cherry. 중복 원소는 한 번만 처리됩니다.':'같은 데이터는 항상 같은 해시 결과를 갖습니다. 예제 버튼으로 여러 데이터를 삽입할 수 있습니다.';
  $('explanation').textContent=notes[type];
  $('search-title').textContent=isSet?'집합 유사도 검색':type==='hyperloglog'?'고유 개수 측정':'데이터 검색';
  $('search-label').textContent=isSet?'비교할 집합 원소':'검색할 데이터';
  $('search-value').placeholder=isSet?'예: apple banana cherry':'예: apple';
  $('search-hint').textContent=isSet?'저장한 집합과 유사도를 비교합니다. 검색은 집합을 추가하지 않습니다.':type==='hyperloglog'?'전체 레지스터로 고유 개수를 추정합니다. 별도 검색값은 필요하지 않으며, 데이터 삽입 시 측정값이 자동 갱신됩니다.':'검색은 버퍼를 변경하지 않습니다. 자료구조의 판정과 실제 삽입 기록을 함께 표시합니다.';
  $('query').textContent=isSet?'유사도 검색 ⌕':type==='hyperloglog'?'고유 개수 측정 ↗':'검색 ⌕';
  if(type==='hyperloglog'){ $('search-value').remove(); $('search-label').remove(); }
  $('value-label').textContent=isSet?'집합 원소':'데이터';
  $('value').placeholder=isSet?'예: apple banana cherry':'예: apple';
  $('delete').hidden=!['counting-bloomfilter','cuckoo-filter'].includes(type);
  $('amount-wrap').hidden=type!=='count-min-sketch';
  $('buffer-title').textContent=isSet?'MinHash 서명':type==='hyperloglog'?'레지스터 상태':'버퍼 상태';
  $('config-form').addEventListener('submit',e=>{
    e.preventDefault();
    const val=id=>Number($(id)?.value || 0);
    const p={size:val('size')||32,k:val('k')||16,slots:val('slots'),bits:val('bits'),precision:val('precision'),bands:val('bands-input'),rows:val('rows')};
    if(type==='cuckoo-filter'&&(p.size&(p.size-1))) {alert('버킷 수는 2, 4, 8, 16, 32 등 2의 거듭제곱으로 입력하세요.');return;}
    if(type==='lsh'){p.k=p.bands*p.rows;if(p.k>128){alert('밴드 수 × 행 수는 128 이하여야 합니다.');return;}}
    lab=new Lab(type,p);last=null;history=[];$('experiment').hidden=false;render();
    if(type==='hyperloglog')renderSearch({});else $('search-result').innerHTML='<p class="search-empty">검색할 값을 입력하고 검색 버튼을 누르세요.</p>';
    $('result').innerHTML='<div class="empty-state">⌁<p>버퍼가 준비되었습니다.<br>첫 데이터를 입력해 보세요.</p></div>';
  });
  function execute(action,value=action==='estimate'?'전체 레지스터':$(action==='query'?'search-value':'value').value.trim()) {
    if(!value){const input=$(action==='query'?'search-value':'value');input.setCustomValidity('공백이 아닌 값을 입력하세요.');input.reportValidity();input.setCustomValidity('');return;}
    const amount=Number($('amount').value);
    if(type==='count-min-sketch'&&action==='insert'&&!$('amount').reportValidity())return;
    last=lab.run(action,value,amount); history.unshift(last);history=history.slice(0,40);render();renderResult();
    if(action==='query'||type==='hyperloglog') renderSearch(last);
    else $('search-result').innerHTML='<p class="search-empty">버퍼가 변경되었습니다. 검색하면 최신 결과를 확인할 수 있습니다.</p>';
  }
  $('data-form').addEventListener('submit',e=>{e.preventDefault();execute('insert');});
  $('search-form').addEventListener('submit',e=>{e.preventDefault();execute(type==='hyperloglog'?'estimate':'query');});$('delete').onclick=()=>execute('delete');
  $('sample').onclick=()=>{for(const v of isSet?['apple banana cherry','apple banana grape','melon peach grape']:['apple','banana','cherry','orange','grape','melon'])execute('insert',v);};
  $('clear-history').onclick=()=>{history=[];render();};
  function render() {
    const cells=isSet?lab.signature:lab.cells, filled=isSet?lab.docs.length?cells.length:0:cells.filter(v=>v>0).length;
    const stats=type==='hyperloglog'?[['고유 개수 추정',lab.estimate().toFixed(2)],['실제 고유 개수',lab.items.size],['레지스터 수',cells.length],['표준 오차',`${(104/Math.sqrt(cells.length)).toFixed(2)}%`]]:isSet?[['저장 집합',lab.docs.length],['서명 길이',lab.p.k],['밴드 수',type==='lsh'?lab.p.bands:'—'],['원소 처리','집합']]:[['삽입 횟수',[...lab.items.values()].reduce((a,b)=>a+b,0)],['고유 데이터',lab.items.size],['채워진 칸',`${filled} / ${cells.length}`],['점유율',`${(filled/cells.length*100).toFixed(1)}%`]];
    $('stats').innerHTML=stats.map(([label,value])=>`<div><span>${label}</span><b>${value}</b></div>`).join('');
    const touched=new Set(last?.touched||[]);
    const missingCell=(v,i)=>last?.action==='query'&&touched.has(i)&&v===0&&['bloomfilter','counting-bloomfilter','cuckoo-filter','count-min-sketch'].includes(type);
    const queryHit=(v,i)=>last?.action==='query'&&touched.has(i)&&(type==='cuckoo-filter'?v===lab.cuckoo(last.value).fp:isSet?lab.docs.some(doc=>doc.sig[i]===v):v>0);
    const cellHTML=(v,i)=>`<div class="cell ${(!isSet&&v>0)||(isSet&&lab.docs.length)?'filled':''} ${touched.has(i)?'highlight':''} ${missingCell(v,i)?'missing':''} ${queryHit(v,i)?'query-hit':''}" title="${isSet?'h'+(i+1):'index '+i}: ${v}"><small>${isSet?'h'+(i+1):i}</small><strong>${isSet?(v===0xffffffff&&!last?'—':v.toString(16).padStart(8,'0')):v}</strong>${missingCell(v,i)?'<span class="zero-marker" aria-label="검색한 위치의 값이 0입니다">✕</span>':''}</div>`;
    if(type==='count-min-sketch'||type==='cuckoo-filter') {
      const width=type==='count-min-sketch'?lab.p.size:lab.p.slots;
      $('buffer').innerHTML=Array.from({length:cells.length/width},(_,row)=>`<div class="buffer-row"><span>${type==='count-min-sketch'?'h'+(row+1):'B'+row}</span><div class="grid">${cells.slice(row*width,(row+1)*width).map((v,j)=>cellHTML(v,row*width+j)).join('')}</div></div>`).join('');
    } else $('buffer').innerHTML=`<div class="grid ${isSet?'signature-grid':''}">${cells.map(cellHTML).join('')}</div>`;
    $('buffer-meta').textContent=`${cells.length} ${isSet?'HASHES':'CELLS'}`;
    $('bands').innerHTML=type==='lsh'&&lab.docs.length?`<h3>밴드 버킷 · 저장 집합</h3><div class="band-list">${lab.docs.map(doc=>`<div><b>${doc.name}</b>${Array.from({length:lab.p.bands},(_,b)=>`<span title="${doc.sig.slice(b*lab.p.rows,(b+1)*lab.p.rows).join(', ')}">B${b+1} → ${hash(doc.sig.slice(b*lab.p.rows,(b+1)*lab.p.rows).join(':'),b)}</span>`).join('')}</div>`).join('')}</div>`:'';
    $('items').innerHTML=lab.items.size?[...lab.items].map(([v,n])=>`<button ${type==='hyperloglog'?'disabled':''} class="chip" data-value="${escape(v)}">${escape(v)} <span>×${n}</span></button>`).join(''):'<p class="muted">아직 삽입한 데이터가 없습니다.</p>';
    $('items').querySelectorAll('button').forEach(el=>el.onclick=()=>{$('search-value').value=el.dataset.value;execute('query');$('search-result').scrollIntoView({behavior:'smooth',block:'nearest'});});
    $('item-count').textContent=`${lab.items.size} ITEMS`;
    $('history').innerHTML=history.length?history.map(r=>`<div class="history-row"><span class="badge">${{insert:'INSERT',query:'QUERY',delete:'DELETE',estimate:'ESTIMATE'}[r.action]}</span><b>${escape(r.value)}</b><span>${escape(r.message)}</span></div>`).join(''):'<p class="muted">연산 기록이 없습니다.</p>';
  }
  function renderSearch(result) {
    let title, tone='positive', explanation, metrics='', detail='';
    if(['bloomfilter','counting-bloomfilter','cuckoo-filter'].includes(type)) {
      const found=type==='cuckoo-filter'?(()=>{const {fp,a,b}=lab.cuckoo(result.value);return [a,b].some(b=>lab.cells.slice(b*lab.p.slots,(b+1)*lab.p.slots).includes(fp));})():result.touched.every(i=>lab.cells[i]>0);
      const actual=lab.items.has(result.value);
      title=found?'존재 가능':'존재하지 않음';tone=found&&!actual?'warning':found?'positive':'negative';
      explanation=found?(actual?'실제 삽입 기록에도 있는 데이터입니다.':'거짓 양성: 버퍼에는 매핑이 일치하지만 실제 삽입 기록에는 없습니다.'):'매핑된 위치가 일치하지 않아 확실히 없는 데이터입니다.';
      metrics=`<div><span>자료구조 판정</span><b>${found?'양성 · 존재 가능':'음성 · 확실히 없음'}</b></div><div><span>실제 삽입 기록</span><b>${actual?'있음':'없음'}</b></div><div><span>검증 결과</span><b>${found&&!actual?'거짓 양성':found?'참 양성':'참 음성'}</b></div>`;
      detail=type==='cuckoo-filter'?(()=>{const {fp,a,b}=lab.cuckoo(result.value);return `<div class="query-checks">${[...new Set([a,b])].map(b=>{const values=lab.cells.slice(b*lab.p.slots,(b+1)*lab.p.slots);const match=values.includes(fp);return `<span class="check ${match?'matched':'missed'}">버킷 ${b} · [${values.join(', ')}] ${match?'✓':'✕'} fingerprint ${fp}</span>`;}).join('')}</div>`;})():`<div class="query-checks">${result.mappings.map(m=>`<span class="check ${lab.cells[m.cell]>0?'matched':'missed'}">${m.name} → 칸 ${m.index} · 값 ${lab.cells[m.cell]} ${lab.cells[m.cell]>0?'✓':'✕'}</span>`).join('')}</div>`;
    } else if(type==='count-min-sketch') {
      const counts=result.touched.map(i=>lab.cells[i]),estimate=Math.min(...counts),actual=lab.items.get(result.value)||0;
      title=`추정 빈도 ${estimate}회`;tone=estimate===actual?'positive':'warning';explanation=`각 해시 행에서 읽은 카운터의 최솟값: min(${counts.join(', ')}) = ${estimate}`;
      metrics=`<div><span>추정 빈도</span><b>${estimate}회</b></div><div><span>실제 빈도</span><b>${actual}회</b></div><div><span>과대 추정 오차</span><b>+${estimate-actual}회</b></div>`;
    } else if(type==='hyperloglog') {
      const estimate=lab.estimate(),actual=lab.items.size,error=estimate-actual;
      title=`고유 개수 추정 ${estimate.toFixed(2)}개`;explanation='전체 데이터의 중복을 제외한 고유 개수입니다. 같은 데이터를 여러 번 삽입해도 고유 개수는 증가하지 않습니다.';
      metrics=`<div><span>실제 고유 개수</span><b>${actual}개</b></div><div><span>추정 오차</span><b>${error>=0?'+':''}${error.toFixed(2)}개</b></div><div><span>상대 오차</span><b>${actual?(Math.abs(error)/actual*100).toFixed(2)+'%':'— (데이터 없음)'}</b></div>`;
    } else {
      const comparisons=[...result.comparisons].sort((a,b)=>Number(b.candidate)-Number(a.candidate)||b.estimate-a.estimate);
      const candidates=comparisons.filter(c=>c.candidate);
      title=type==='lsh'?`유사 집합 후보 ${candidates.length}개`:comparisons.length?`최고 추정 유사도 ${(comparisons[0].estimate*100).toFixed(1)}%`:'비교할 저장 집합이 없습니다';
      explanation=type==='lsh'?'한 개 이상의 밴드가 완전히 일치한 집합이 후보입니다. 아래 표에서 후보 여부와 실제 유사도를 확인하세요.':'동일한 최소 해시의 비율을 추정 유사도로 표시합니다. 실제 유사도는 집합의 교집합 / 합집합입니다.';
      if(!comparisons.length)explanation='삽입 영역에서 집합을 먼저 저장한 뒤 검색하세요.';
      detail=comparisons.length?`<div class="query-table-wrap"><table class="query-table"><thead><tr><th>저장 집합</th>${type==='lsh'?'<th>후보 / 일치 밴드</th>':''}<th>추정 유사도</th><th>실제 유사도</th></tr></thead><tbody>${comparisons.map(c=>`<tr><td><b>${escape(c.name)}</b><small>${escape(c.value)}</small></td>${type==='lsh'?`<td><b class="${c.candidate?'candidate':'muted'}">${c.candidate?'후보 ✓':'제외'}</b><small>${c.matchingBands.length?'밴드 '+c.matchingBands.map(b=>b+1).join(', '):'일치 없음'}</small></td>`:''}<td><strong>${(c.estimate*100).toFixed(1)}%</strong></td><td><strong>${(c.actual*100).toFixed(1)}%</strong></td></tr>`).join('')}</tbody></table></div>`:'';
    }
    $('search-result').innerHTML=`<div class="query-answer ${tone}"><div class="query-caption">${type==='hyperloglog'?'측정 대상 <b>전체 삽입 데이터</b>':`검색값 <b>${escape(result.value)}</b>`}</div><h3>${title}</h3><p>${explanation}</p>${metrics?`<div class="query-metrics">${metrics}</div>`:''}${detail}</div>`;
  }
  function renderResult() {
    $('result').innerHTML=`<div class="result-message ${last.success?'':'error'}"><span>${{insert:'INSERT',query:'QUERY',delete:'DELETE',estimate:'ESTIMATE'}[last.action]} / ${escape(last.value)}</span><h3>${escape(last.message)}</h3></div>${last.action==='estimate'?'<h4>전체 레지스터 기반 측정</h4>':'<h4>HASH MAPPING</h4>'}<div class="mapping-list">${last.mappings.map(m=>`<div><span>${escape(m.name)}</span><code>${m.raw}</code><b>→ ${m.index}</b></div>`).join('')}</div><details open><summary>계산 과정 (${last.steps.length})</summary><div class="steps">${last.steps.map(s=>`<p>${escape(s)}</p>`).join('')}</div></details>`;
  }
}
