# Probabilistic Lab

실제 해시 계산과 버퍼 연산을 시각화하는 확률적 자료구조 웹 실험실입니다. 별도 빌드나 패키지 설치 없이 정적 HTTP 서버에서 실행합니다.

## 실행

```sh
npm start
```

Python 3가 필요합니다. 또는 `python3 -m http.server 8080`을 실행하세요. 브라우저에서 http://localhost:8080 에 접속합니다. JavaScript 모듈을 사용하므로 HTML 파일을 직접 여는 대신 HTTP 서버를 사용하세요.

| 자료구조 | 경로 | 설정 |
| --- | --- | --- |
| Bloom Filter | `/bloomfilter/` | 버퍼 크기, 해시 수 |
| Counting Bloom Filter | `/counting-bloomfilter/` | 버퍼 크기, 해시 수 |
| Cuckoo Filter | `/cuckoo-filter/` | 버킷 수, 슬롯 수, fingerprint 비트 수 |
| Count-Min Sketch | `/count-min-sketch/` | 행 너비, 해시 행 수 |
| HyperLogLog | `/hyperloglog/` | 정밀도 p, 레지스터 수 2ᵖ |
| MinHash | `/minhash/` | 해시 수 / 서명 길이 |
| LSH | `/lsh/` | 밴드 수, 밴드당 행 수 |
| Reservoir Sampling | `/reservoir-sampling/` | 표본 크기 k |
| Quantile Sketch (GK) | `/quantile-sketch/` | 허용 순위 오차 ε |

각 페이지에서 설정 후 **버퍼 생성 / 초기화**를 누릅니다. 데이터 삽입 / 삭제 영역에서 데이터를 넣은 뒤, 별도의 검색창에서 검색하세요. 검색창 바로 아래에 판정과 실제 삽입 기록, 추정값과 실제값을 크게 표시합니다. MinHash와 LSH는 집합별 비교 표를 제공합니다. 매핑된 칸, 해시 결과, 계산 과정, 연산 기록도 표시됩니다. 삽입 / 삭제로 버퍼가 변경되면 이전 검색 결과를 비워 오래된 판정이 표시되지 않도록 합니다. 삽입 데이터 버튼을 클릭하면 해당 데이터를 검색합니다. 설정을 초기화하거나 페이지를 새로고침하면 데이터가 초기화됩니다.

- Counting Bloom Filter와 Cuckoo Filter는 삭제를 지원합니다. 안전한 삭제를 위해 삽입 기록이 있는 데이터만 삭제합니다.
- Count-Min Sketch는 삽입 빈도를 지정하고 검색 시 실제 빈도와 추정 빈도를 비교합니다.
- HyperLogLog는 고유 개수를 추정합니다. 검색 입력 없이 전체 데이터의 고유 개수를 측정합니다. 삽입 시 추정값·실제값·오차가 자동 갱신되며, 측정 버튼으로 전체 레지스터 계산 과정을 확인합니다. 삽입 해시 매핑은 계산 과정에서 확인할 수 있습니다.
- MinHash와 LSH는 공백/쉼표로 구분한 원소의 집합을 입력합니다. 검색 시 저장 집합과 추정/실제 Jaccard 유사도를 비교합니다. LSH에는 일치 밴드와 후보 여부가 추가됩니다.
- Cuckoo Filter는 XOR 매핑을 위해 버킷 수를 2의 거듭제곱으로 제한합니다. 최대 128회 재배치 후 실패하면 삽입 전 상태를 복원합니다.
- Reservoir Sampling은 Algorithm R을 사용합니다. 첫 k개 이후에는 n번째 원소를 k/n 확률로 채택해 슬롯을 교체합니다. 중복도 별개의 스트림 원소이며, 표본 확인은 새 추첨을 하지 않습니다. Math.random을 사용하므로 실행마다 표본이 달라집니다.
- Quantile Sketch는 결정적인 Greenwald–Khanna(GK) 요약을 사용합니다. 숫자를 입력하고 q ∈ [0, 1]을 조회하면 추정값, 실제값, 순위 오차를 비교합니다. ε는 값의 상대 오차가 아닌 순위 오차 비율입니다. 실제값은 max(1, ceil(q × n)) 순위이며 q=0/1은 최솟값/최댓값입니다.
- 스트림 페이지의 전체 삽입 기록은 학습용 비교 자료이며 알고리즘 본체의 메모리에 포함되지 않습니다.
- 해시는 UTF-8 기반의 결정적 seeded 32-bit 해시입니다. 암호학적 해시가 아닙니다. MinHash에는 독립 해시의 실용적 근사를 사용하며 이론적인 완전한 min-wise independence를 보장하지 않습니다.
- 학습을 위해 정확한 삽입 기록도 별도로 유지합니다. 표시되는 버퍼 크기는 자료구조 본체의 칸 수이며, 정확한 기록과 JavaScript 객체의 메모리는 포함하지 않습니다. 애니메이션은 최종 버퍼의 매핑 칸 강조이며, Cuckoo 이동 중간 상태는 계산 과정에 표시됩니다.
- 데이터는 브라우저 메모리에만 보관합니다. 외부 요청은 선택적인 Google Fonts 로딩뿐이며 실패 시 시스템 글꼴을 사용합니다.

## 검증

```sh
npm test
```

Node.js 18 이상을 사용합니다. 거짓 양성, 삭제, 충돌, Cuckoo 재배치/실패 복원, HLL 중복 처리와 추정 오차, MinHash 및 LSH 결과, Reservoir 표본 교체와 균등 포함 확률, GK의 중복·역순·음수 데이터와 순위 오차를 검증합니다.
