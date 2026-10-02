import {ReservoirSampling, QuantileSketch} from './stream-algorithms.js';
const escape = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function setupStreamLab(type) {
  const $ = id => document.getElementById(id), reservoir = type === 'reservoir-sampling';
  let model, actual = [], history = [], touched = -1;
  $('fields').innerHTML = reservoir ? '<label>표본 크기 k<input id="capacity" type="number" min="1" max="256" value="8" required></label>' : '<label>허용 순위 오차 ε<input id="epsilon" type="number" min="0.001" max="0.5" step="0.001" value="0.05" required></label>';
  $('config-hint').textContent = reservoir ? '처리한 n개 데이터 각각이 표본에 남을 확률은 min(1, k/n)입니다.' : 'GK 요약은 값의 차이가 아닌 순위 오차를 ε × n 이내로 제한합니다.';
  $('input-hint').textContent = reservoir ? '한 번 삽입할 때마다 스트림 원소 1개입니다. 중복도 독립 원소로 처리합니다.' : '유한한 숫자를 하나씩 입력하세요. 중복과 음수도 처리합니다.';
  $('value').placeholder = reservoir ? '예: apple' : '예: -12.5';
  if (!reservoir) { $('value').type = 'number'; $('value').step = 'any'; }
  $('search-title').textContent = reservoir ? '현재 표본 확인' : '분위수 추정';
  $('search-hint').textContent = reservoir ? '표본은 전체 스트림의 균등 무작위 부분집합입니다. 재확인은 표본을 변경하지 않습니다.' : 'q=0.5는 중앙값, q=0.95는 95백분위수입니다. 실제값은 ceil(q × n) 순위로 비교합니다.';
  $('query').textContent = reservoir ? '표본 확인 ↗' : '분위수 추정 ↗';
  if (reservoir) { $('search-value').remove(); $('search-label').remove(); }
  else { Object.assign($('search-value'), {type:'number', min:'0', max:'1', step:'any', value:'0.5'}); $('search-label').textContent = '분위수 q (0~1)'; }
  $('buffer-title').textContent = reservoir ? 'Reservoir 표본 슬롯' : 'GK 요약 튜플';
  $('explanation').textContent = reservoir ? 'Algorithm R: 첫 k개는 그대로 저장합니다. 이후 n번째 원소마다 j를 [0, n−1]에서 균등하게 뽑고, j < k일 때만 j번 슬롯을 교체합니다.' : '정렬된 (값, g, Δ) 튜플을 저장합니다. g는 최소 순위 증가량, Δ는 순위 불확실성입니다. 인접 튜플을 합칠 때 gᵢ + gᵢ₊₁ + Δᵢ₊₁ ≤ floor(2εn)을 만족해야 합니다.';
  document.querySelector('.legend').hidden = true;
  function render() {
    const size = reservoir ? model.sample.length : model.tuples.length;
    const stats = [['처리 원소',model.count], [reservoir?'표본 원소':'요약 튜플',size], [reservoir?'표본 용량':'허용 순위 오차',reservoir?model.capacity:(model.epsilon*model.count).toFixed(2)], [reservoir?'포함 확률':'ε',reservoir?`${(Math.min(1,model.capacity/(model.count||1))*100).toFixed(1)}%`:model.epsilon]];
    $('stats').innerHTML = stats.map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('');
    const values = reservoir ? Array.from({length:model.capacity},(_,i)=>model.sample[i]) : model.tuples;
    $('buffer').innerHTML = `<div class="grid signature-grid">${values.map((v,i)=>`<div class="cell ${v!==undefined?'filled':''} ${i===touched?'highlight':''}"><small>${reservoir?'슬롯':'튜플'} ${i}</small><strong>${v===undefined?'—':escape(reservoir?v:v.value)}</strong>${!reservoir?`<small>g=${v.g} · Δ=${v.delta}</small>`:''}</div>`).join('')}</div>`;
    $('buffer-meta').textContent = `${size} ${reservoir?'SAMPLES':'TUPLES'}`;
    $('items').innerHTML = actual.length ? actual.map(v=>`<span class="chip stream-item">${escape(v)}</span>`).join('') : '<p class="muted">아직 삽입한 데이터가 없습니다.</p>';
    $('item-count').textContent = `${actual.length} STREAM ITEMS`;
    $('history').innerHTML = history.map(r=>`<div class="history-row"><span class="badge">${r.action}</span><span>${escape(r.message)}</span></div>`).join('');
  }
  function record(action,message,steps=[]) {
    history.unshift({action,message}); history=history.slice(0,40);
    $('result').innerHTML = `<div class="result-message"><span>${action}</span><h3>${escape(message)}</h3></div><details open><summary>계산 과정</summary><div class="steps">${steps.map(s=>`<p>${escape(s)}</p>`).join('')}</div></details>`;
    render();
  }
  function insert(value) {
    const outcome = model.insert(value); actual.push(value);
    touched = reservoir && outcome.accepted ? outcome.index : -1;
    const message = reservoir ? `n=${model.count} · ${outcome.accepted?`슬롯 ${outcome.index} ${outcome.previous===undefined?'채움':'교체'}`:'표본에서 제외'}` : `${value} 삽입 · ${outcome.merged}개 튜플 병합`;
    record('INSERT',message,reservoir ? [`j=${outcome.index}, k=${model.capacity}`, `채택 확률 min(1, k/n) = ${outcome.probability}`, `이전 값: ${outcome.previous ?? '빈 슬롯'}`] : [`n=${model.count}, 새 튜플 Δ=${outcome.delta}`, `병합 기준 floor(2εn)=${Math.floor(2*model.epsilon*model.count)}`, `요약 튜플 수=${model.tuples.length}`]);
    $('search-result').innerHTML = '<p class="search-empty">스트림이 변경되었습니다. 최신 결과를 확인하세요.</p>';
  }
  $('config-form').onsubmit = e => {
    e.preventDefault(); model = reservoir ? new ReservoirSampling(Number($('capacity').value)) : new QuantileSketch(Number($('epsilon').value));
    actual=[]; history=[]; touched=-1; $('experiment').hidden=false; render();
    $('result').innerHTML='<p class="muted">첫 데이터를 입력해 보세요.</p>';
    $('search-result').innerHTML='<p class="search-empty">데이터를 삽입한 뒤 확인하세요.</p>';
  };
  $('data-form').onsubmit = e => { e.preventDefault(); const raw=$('value').value.trim(); if (!raw) return; const value=reservoir?raw:Number(raw); if (!reservoir&&!Number.isFinite(value)) return; insert(value); };
  $('sample').onclick = () => (reservoir?['apple','banana','cherry','orange','grape','melon','peach','pear','kiwi','plum','lemon','mango']:[-10,0,5,5,10,15,20,30,50,100,150,200]).forEach(insert);
  $('clear-history').onclick = () => { history=[]; render(); };
  $('search-form').onsubmit = e => {
    e.preventDefault(); touched=-1;
    let message, detail;
    if (reservoir) { message=`현재 표본 ${model.sample.length}개 / 처리 ${model.count}개`; detail=model.sample.length?model.sample.map(escape).join(' · '):'데이터가 없습니다.'; }
    else {
      const q=Number($('search-value').value), estimate=model.quantile(q), sorted=[...actual].sort((a,b)=>a-b), rank=Math.max(1,Math.ceil(q*model.count));
      message=estimate===null?'데이터가 없습니다.':`q=${q} · 추정값 ${estimate} · 실제값 ${sorted[rank-1]}`;
      const lower=sorted.filter(v=>v<estimate).length+1, upper=sorted.filter(v=>v<=estimate).length;
      const error=estimate===null?0:Math.max(lower-rank,rank-upper,0);
      detail=estimate===null?'숫자를 먼저 삽입하세요.':`목표 순위 ${rank} · 추정값 순위 범위 [${lower}, ${upper}] · 순위 오차 ${error} / 허용 ${(model.epsilon*model.count).toFixed(2)}`;
    }
    record('QUERY',message,[detail]);
    $('search-result').innerHTML=`<div class="query-answer"><h3>${escape(message)}</h3><p>${detail}</p></div>`;
  };
}
