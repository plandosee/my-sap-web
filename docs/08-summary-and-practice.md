# 08. 정리 & 실무 적용

## 목표

- 지금까지 만든 구조를 **한 장으로** 정리한다.
- AI 없이 **처음부터 다시 만드는 순서**, **새 화면을 추가하는 순서**를 정리한다.
- 실제 **SAP – 백엔드 API – React** 프로젝트에 적용할 때 **바뀌는 부분과 고칠 위치**를 정리한다.
- 운영 배포 시 필요한 설정을 정리한다.

---

## 1. 최종 구조

```
src/
├─ api/                    ── 서버와 통신하는 계층 (화면을 모름)
│  ├─ client.ts            ★ axios 공통 통로: form 변환, 토큰 첨부, 응답 판정, 에러 통일 (03장)
│  ├─ ApiError.ts          모든 실패를 하나의 에러로 (03장)
│  ├─ tokenStorage.ts      토큰·사용자ID 저장 위치 (03·05장)
│  ├─ queryClient.ts       React Query 공통 옵션 (04장)
│  ├─ authApi.ts           로그인/로그아웃 (05장)
│  ├─ codeApi.ts           공통코드 (07장)
│  ├─ nonProcsApi.ts       비공정 (06장)
│  └─ oprtrApi.ts          작업자 (07장)
├─ hooks/                  ── React Query 훅 (서버 데이터 ↔ 화면 연결)
│  ├─ useAuth.ts           useLogin / useLogout
│  ├─ useCommonCode.ts     공통코드 + getCodeName
│  ├─ useNonProcs.ts       useQuery 목록 / useMutation 저장·삭제
│  └─ useOprtr.ts          useInfiniteQuery 더보기
├─ store/                  ── Redux (화면끼리 공유하는 클라이언트 상태)
│  ├─ index.ts, hooks.ts
│  └─ authSlice.ts         로그인 여부, 사용자 ID
├─ components/             ── 여러 화면에서 재사용
│  ├─ Layout.tsx           상단 메뉴 + Outlet
│  ├─ ProtectedRoute.tsx   로그인 검사
│  ├─ Modal.tsx            공통 팝업
│  └─ CodeSelect.tsx       공통코드 콤보박스
├─ pages/                  ── 화면 (입력·표시만)
│  ├─ login/LoginPage.tsx
│  ├─ nonProcs/NonProcsPage.tsx, NonProcsFormModal.tsx
│  ├─ oprtr/OprtrPage.tsx, OprtrFormModal.tsx
│  └─ NotFoundPage.tsx
├─ types/                  ── 데이터 모양 (백엔드 응답 기준)
│  ├─ api.ts, auth.ts, code.ts, nonProcs.ts, oprtr.ts
├─ router.tsx              주소 → 페이지
├─ setupAuth.ts            인증 만료 → 로그아웃·이동 연결
├─ main.tsx                Provider 조립 + setupAuth()
└─ index.css               공통 스타일
```

### 계층과 의존 방향

```
pages  ──▶  hooks  ──▶  api  ──▶  (백엔드)
  │           │          │
  └───────────┴──────────┴──▶ types

※ 화살표 반대 방향으로는 import하지 않는다.
   api는 pages/router/store를 모른다 → 그래서 setupAuth.ts로 "연결만" 했다(05장).
```

| 계층 | 질문 | 바뀌는 이유 |
|---|---|---|
| `types` | 데이터가 **어떻게 생겼나?** | 백엔드 응답 컬럼이 바뀔 때 |
| `api` | **어디로, 어떤 형식으로** 보내나? | URL, 파라미터 이름, 백엔드 특이점이 바뀔 때 |
| `hooks` | **언제** 조회하고, 변경 후 **무엇을 새로고침**하나? | 캐시·재조회 정책이 바뀔 때 |
| `pages` | **어떻게 보여주고** 무엇을 입력받나? | 화면 디자인·입력 항목이 바뀔 때 |

> 💡 이렇게 나누면 "백엔드가 바뀌었다" → `api`만, "화면 디자인이 바뀌었다" → `pages`만 고치면 된다.

---

## 2. 요청 한 번의 전체 경로 (작업자 [더보기] 클릭)

```
① OprtrPage            fetchNextPage()
② useOprtr             getNextPageParam → pageParam = 10
                       queryFn({ pageParam: 10 })
③ oprtrApi             retrieveList(search, 10)
                       { oprtrNm, perPage: 10, lastIdx: '{"rnum":10}' }
④ client.post          toFormParams() → "oprtrNm=&perPage=10&lastIdx=%7B..."
⑤ 요청 인터셉터          Authorization: Bearer {accessToken}
⑥ 브라우저              POST http://localhost:5173/api/admin/oprtr/retrieveList.do
⑦ vite 프록시           /api 제거 → http://localhost:8080/admin/oprtr/retrieveList.do
⑧ 백엔드               CustomUrlFilter(토큰 검사) → OprtrController → oprtr.xml
⑨ 응답 인터셉터          새 토큰 헤더? → 저장 / 빈 본문? → NOT_LOGIN / result:false? → ApiError
⑩ useInfiniteQuery     data.pages 에 2페이지 추가
⑪ useOprtr             rows = pages.flatMap(...)  (20건)
⑫ OprtrPage            표 다시 그림, "20 / 총 N건"
```

문제가 생기면 **F12 Network 탭**에서 ⑥(요청 URL·헤더·Payload)과 ⑨(Response)를 먼저 본다. 대부분 여기서 원인이 보인다.

---

## 3. 처음부터 다시 만드는 순서 (AI 없이)

| 순서 | 할 일 | 참고 |
|---|---|---|
| 1 | Node 설치, `npm create vite@latest`, 라이브러리 설치, 폴더 생성 | 00장 |
| 2 | **백엔드 분석**: URL, 파라미터, 응답 형식, 인증 방식, 특이점을 표로 정리 | 01장 |
| 3 | `vite.config.ts` 프록시(`rewrite`), `.env` 모드별 파일, `vite-env.d.ts` | 02장 |
| 4 | `types/api.ts` → `ApiError.ts` → `tokenStorage.ts` → `client.ts` | 03장 |
| 5 | 확인용 임시 페이지로 인터셉터 동작 확인 | 03장 |
| 6 | `store/` → `queryClient.ts` → 페이지 껍데기 → `Layout` → `router.tsx` → `main.tsx` | 04장 |
| 7 | `authApi` → `useAuth` → `ProtectedRoute` → `setupAuth` → `LoginPage` → 로그아웃 버튼 | 05장 |
| 8 | 첫 CRUD 화면 (아래 "새 화면 체크리스트") | 06장 |
| 9 | 공통코드 콤보, 더보기 등 공통 부품 추가 | 07장 |

> 💡 각 단계가 끝날 때마다 **타입체크(`npx tsc -b`) + 화면 확인** 후 다음으로 넘어간다. 한 번에 다 만들고 돌리면 어디서 틀렸는지 찾기 어렵다.

---

## 4. 새 화면 추가 체크리스트

예: "품목 관리(`/admin/item`)" 화면을 추가한다면

- [ ] **백엔드 확인** (Controller + SQL XML)
  - [ ] URL 4개 (retrieveList / insert / update / delete)
  - [ ] 필수값·길이 검증 (`ValidationModel`) — **`throw`가 있는지까지** 확인 (주의사항 #7)
  - [ ] select 컬럼 → 응답 필드 이름 (snake → camel)
  - [ ] 페이징 방식 (전체 / `lastIdx`)
  - [ ] `useYn` 등 Y/N 처리 방식 (주의사항 #1, #8)
  - [ ] 삭제가 물리 삭제인지 논리 삭제인지
- [ ] `types/item.ts` — `Item`(행), `ItemSearch`(검색), `ItemForm`(폼)
- [ ] `api/itemApi.ts` — URL, `toSaveParams()`, 특이점 흡수
- [ ] `hooks/useItem.ts` — `itemKeys`, 목록(`useQuery`/`useInfiniteQuery`), 저장·삭제(`useMutation` + `invalidateQueries`)
- [ ] `pages/item/ItemFormModal.tsx` — `toForm()`, `validate()`(백엔드 규칙과 동일), `save.mutate`
- [ ] `pages/item/ItemPage.tsx` — 검색 상태 2개, 표 3가지 상태, 삭제 확인
- [ ] 공통코드가 필요하면 `CODE_GROUP`에 그룹 추가 → `<CodeSelect>`
- [ ] `router.tsx` 보호 라우트 `children`에 추가
- [ ] `Layout.tsx` 메뉴에 `<NavLink>` 추가
- [ ] 확인: 조회 / 검색 / 등록 / 수정(정렬 유지) / 삭제 / 빈 값 검증 / Network Payload

---

## 5. 실무(SAP – 백엔드 API – React) 적용 시 바뀌는 부분

실무 구조:

```
[React] ──HTTP──▶ [백엔드 API (Spring 등)] ──RFC/BAPI(JCo) 또는 OData──▶ [SAP]
```

React는 보통 **SAP에 직접 붙지 않고 백엔드 API를 거친다**. 그래서 이 튜토리얼 구조가 그대로 쓰이고, **백엔드 API의 규칙에 맞춰 아래 위치만** 바꾸면 된다.

### 5-1. 백엔드 API 규칙이 다를 때 고칠 위치

| 다른 점 | 예시 | 고칠 파일 |
|---|---|---|
| 요청 형식이 JSON | `@RequestBody` | `client.ts`의 `post()`: `toFormParams()` 대신 객체 그대로 전송 |
| 성공/실패 판정 기준 | `{ success: true }`, `{ status: "S" }`, HTTP 4xx/5xx로 실패 | `client.ts` 응답 인터셉터 + `types/api.ts` |
| 목록 응답 모양 | `{ items: [], total: 0 }`, OData `{ d: { results: [] } }` | `types/api.ts`의 `ListResponse` |
| 인증 방식 | 쿠키 세션, SSO(SAML/OAuth), API Key | `client.ts` 요청 인터셉터, `tokenStorage.ts`, `useAuth.ts` |
| 토큰 갱신 방식 | `/refresh` API를 따로 호출 | `client.ts` 401 처리부 (재발급 후 원래 요청 재시도) |
| 페이징 | `page`/`size`, `$top`/`$skip`(OData) | 각 `xxxApi.ts` + `useInfiniteQuery`의 `getNextPageParam` |
| 메소드 | GET 조회, PUT 수정, DELETE 삭제 (REST) | `client.ts`에 `get()`, `put()`, `del()` 추가 |

> 💡 03장에서 "모든 호출은 `post()`를 통해서"라고 정한 덕분에, 위 변경은 대부분 **`client.ts` 한 파일**에서 끝난다.

### 5-2. SAP 데이터를 다룰 때 자주 만나는 것

| 항목 | SAP 쪽 특징 | 프론트에서 할 일 |
|---|---|---|
| **에러 메시지** | BAPI 결과 `RETURN` 테이블 (`TYPE`: `S` 성공 / `W` 경고 / `E` 에러, `MESSAGE`) | 백엔드가 어떻게 변환해서 주는지 확인 → 인터셉터에서 `E`면 `ApiError`. **여러 건**일 수 있으니 목록으로 표시 |
| **날짜** | `YYYYMMDD` 문자열(`20260102`), `00000000`(빈 날짜), OData V2 `/Date(1767312000000)/` | `types`/`api`에서 `yyyy-MM-dd`로 변환하는 공통 함수 (`utils/date.ts`) |
| **숫자** | `Edm.Decimal`은 **문자열**로 옴(`"1234.500"`), 음수 부호가 뒤에 붙는 경우(`"10-"`) | 표시용 포맷 함수, 계산 전 `Number()` 변환 |
| **앞자리 0** | 자재번호 `000000000000012345`, 거래처 `0000100001` | 표시할 때 0 제거, **보낼 때는 다시 채움** (백엔드가 하는지 확인) |
| **코드값** | 플랜트(`WERKS`), 저장위치(`LGORT`) 등 코드 + 텍스트 | 07장 `CodeSelect` 방식으로 공통 콤보박스 |
| **단위·통화** | 수량은 단위(`MEINS`), 금액은 통화(`WAERS`)와 항상 같이 | 표에 같이 표시, 통화별 소수점 자릿수 확인 |
| **응답 속도** | RFC 호출은 수 초~수십 초 걸릴 수 있음 | `client.ts`의 `timeout` 늘리기, 버튼 `isPending` 처리 필수 |
| **대용량** | 수천~수만 건 | 07장 "더보기"(서버 페이징) 필수, 전체 조회 금지 |
| **OData 직접 호출 시** | 변경 요청에 `X-CSRF-Token` 필요 (GET으로 `Fetch` 받아서 POST에 첨부) | 요청 인터셉터에서 토큰 받아 첨부 |
| **언어** | 텍스트가 로그온 언어(`SPRAS`/`sap-language`)에 따라 다름 | 요청 파라미터/헤더에 언어 지정 여부 확인 |

### 5-3. 프로젝트 시작 전 백엔드 담당자에게 물어볼 것

1. API 명세서(Swagger 등)가 있는가? 없으면 소스를 볼 수 있는가?
2. 요청은 form인가 JSON인가? 조회는 GET인가 POST인가?
3. 성공/실패를 어떻게 구분하는가? (HTTP 상태 / `result` / SAP `TYPE`)
4. 인증 방식은? 토큰 만료·갱신은 어떻게 하는가?
5. 목록 페이징 방식은? 최대 몇 건까지 한 번에 주는가?
6. 날짜·숫자·코드값(앞자리 0)은 SAP 형식 그대로인가, 변환해서 주는가?
7. 개발/스테이징/운영 서버 주소는? (→ `.env` 파일)

---

## 6. 운영 배포

### 6-1. 빌드

```bash
npm run build            # .env.production → dist/ 폴더 생성
npm run build:staging    # .env.staging
```

`dist/` 폴더의 파일(HTML, JS, CSS)을 웹서버에 올린다.

### 6-2. 웹서버(nginx) 설정 예시

빌드 결과물에는 **vite 프록시가 없다**. 운영에서는 웹서버가 같은 일을 해야 한다.

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;   # dist/ 내용을 여기에

    # ① /api 요청 → 백엔드로 전달 (끝의 / 가 "/api"를 제거하는 역할 = vite의 rewrite)
    location /api/ {
        proxy_pass http://백엔드주소:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # ② SPA 새로고침 대응: 없는 경로는 index.html 로
    #    (이게 없으면 /oprtr 에서 새로고침하면 404)
    location / {
        try_files $uri /index.html;
    }
}
```

| 개발 (vite) | 운영 (nginx) |
|---|---|
| `server.proxy['/api']` + `rewrite` | `location /api/` + `proxy_pass .../;` (끝 슬래시) |
| 자동 처리 | `try_files $uri /index.html;` 직접 설정 |

### 6-3. 운영 전 점검

- [ ] refresh 쿠키: HTTPS라면 백엔드 `setSecure(true)` 필요 (`JwtUtil.createCookie`)
- [ ] `.env.production`에 비밀값이 없는지 (빌드 파일에 그대로 들어감)
- [ ] 브라우저 콘솔에 에러/경고가 없는지
- [ ] 새로고침, 뒤로가기, 직접 URL 입력(`/oprtr`)이 모두 동작하는지

---

## 7. 더 해볼 만한 것 (연습 과제)

| 과제 | 배우는 것 |
|---|---|
| 비공정 화면도 "더보기"로 바꾸기 | `useInfiniteQuery` 복습 (07장) |
| `alert()` 대신 화면 우측 상단 알림(토스트) 만들기 | Redux 슬라이스 추가, 공통 컴포넌트 |
| 작업자 화면에 "사용여부 일괄 변경" 체크박스 | 여러 행 선택 상태 관리 |
| 표 머리글 클릭 정렬 | 화면 상태 + `useMemo` |
| `utils/date.ts`, `utils/number.ts` 만들기 | SAP 날짜·숫자 변환 대비 (5-2) |
| 메뉴를 서버에서 받아서 그리기 | 권한별 메뉴 (실무에서 거의 필수) |
| React Query Devtools 설치 | 캐시 상태를 눈으로 확인 (`@tanstack/react-query-devtools`) |
