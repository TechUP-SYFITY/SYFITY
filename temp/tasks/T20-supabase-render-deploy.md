# T20: Supabase 클라우드 + Render 배포

## 개요

- **기능**: 운영 DB(Supabase 클라우드)와 백엔드 서버(Render)를 실제로 띄워 프로덕션 환경을 확정한다. FE(T21)가 붙을 수 있는 실제 API 서버 URL이 이 Task 완료 시점에 확정된다.
- **규모**: 중 (코드 변경은 적지만, 계정/콘솔 설정 + 검증 단계가 많음)
- **브랜치 유형**: chore
- **의존 Task**: 없음

이 Task는 순수 코드 구현보다 인프라 설정(Supabase 콘솔, Render 콘솔, GCP 콘솔) 비중이 크다. 코드 변경은 `render.yaml`, 헬스체크 관련 설정, 배포 스크립트 버그 수정, 운영 환경에서만 발생하는 쿠키 정책 수정으로 제한된다.

### 왜 필요한가

- `docs/02-system-architecture.md`가 정의한 운영 환경(`Supabase 클라우드`, `Render`)을 실제로 구축한다.
- T21(Vercel FE 배포)이 이 Task에 의존한다 — Render 프로덕션 URL이 확정되어야 FE가 `NEXT_PUBLIC_API_URL`을 설정할 수 있다.
- 이 Task를 계기로 로컬 개발 환경에는 존재하지 않던 문제(크로스 도메인 쿠키, 잘못된 start 스크립트 등)가 드러난다. 아래 "설계 중 발견한 이슈"에서 상세히 다룬다.

---

## 설계 중 발견한 이슈 (반드시 확인)

기존 코드/문서를 분석하는 과정에서 이 Task 없이는 드러나지 않았을 문제 3가지를 발견했다. 셋 다 실제 운영 배포를 막거나(①②) 예산/신뢰성에 영향(③)을 주므로 이번 Task 범위에 포함한다.

### 이슈 A — `package.json`의 `start` 스크립트가 실제 빌드 산출물 경로와 다르다 (배포 즉시 실패)

`apps/backend/tsconfig.json`은 `include: ["src/**/*", "prisma.config.ts"]`이고 별도 `rootDir`가 없다. TypeScript는 루트 디렉터리를 `src/`와 `prisma.config.ts`를 모두 포함하는 공통 상위 경로(`.`)로 추론하므로, 컴파일 결과가 `dist/src/server.js`, `dist/prisma.config.js`로 생성된다. 실제로 로컬 `dist/`를 확인한 결과 `dist/server.js`는 존재하지 않고 `dist/src/server.js`만 존재함을 확인했다.

```json
// 현재 (apps/backend/package.json) — 잘못됨
"start": "node dist/server.js"
```

Render가 `pnpm --filter backend start`(또는 `pnpm start`)를 실행하면 `Cannot find module 'dist/server.js'`로 즉시 크래시한다. **이 Task에서 반드시 수정**해야 배포가 성립한다.

```json
// 수정 후
"start": "node dist/src/server.js"
```

### 이슈 B — 프로덕션 쿠키 `sameSite: 'strict'`는 Vercel(FE)·Render(BE) 간 크로스 도메인 요청에서 동작하지 않는다

`docs/05-api-spec.md` 2.2절과 `apps/backend/src/controllers/auth.controller.ts`의 `getCookieOptions()`는 프로덕션에서 `sameSite: 'strict'`를 사용하도록 문서화·구현·테스트(`auth.controller.test.ts`)까지 완료된 **의도된 설계**다.

문제는 T21에서 FE가 `{project}.vercel.app`, BE가 `{service}.onrender.com`에 배포되면 두 도메인은 SameSite 기준의 "site"(등록 가능 도메인, registrable domain)가 서로 다른 **cross-site** 관계라는 점이다. `sameSite: 'strict'`(및 `'lax'`)로 발급된 쿠키는 cross-site `fetch(..., { credentials: 'include' })` 요청에 브라우저가 첨부하지 않는다. 즉 **커스텀 도메인을 FE/BE가 같은 상위 도메인으로 묶기 전까지는, 현재 쿠키 정책 그대로 배포하면 프로덕션에서 로그인이 전혀 동작하지 않는다.**

`docs/02-system-architecture.md`는 향후 커스텀 도메인 적용 시 `FE: https://{domain}`, `BE: https://api.{domain}`으로 서브도메인을 묶는 계획을 이미 명시하고 있다. 이번 Task에서 도메인을 실제로 구매해 `api.{domain}`을 Render에 연결하기로 했으므로(아래 "3-1. 커스텀 도메인 연결" 참조) 프로덕션 FE·BE는 같은 등록 도메인의 서브도메인, 즉 **same-site** 관계가 된다.

다만 이것만으로 `sameSite: 'strict'`를 유지할 수는 없다. T21이 자동화하는 **Vercel Preview 배포**는 PR마다 `<branch>-<hash>.vercel.app` 형태의 임의 도메인을 발급하며, `apps/backend/src/utils/cors.ts`의 `isAllowedOrigin()`이 이미 `*.vercel.app` 전체를 허용하도록 되어 있는 것도 Preview가 같은 프로덕션 BE(`api.{domain}`)를 호출한다는 전제다. Preview 도메인은 `api.{domain}`과 항상 cross-site이므로, `strict`/`lax`로는 Preview 환경에서 로그인이 계속 깨진다. 따라서 프로덕션·Preview를 동시에 만족하는 값은 `sameSite: 'none'` 뿐이다 (`None`은 same-site 요청도 그대로 전송하므로 커스텀 도메인 프로덕션 케이스도 문제없이 커버한다).

**`None`으로 인한 CSRF 리스크 검토**: `None`은 cross-site 쿠키 첨부를 허용해 이론적으로 CSRF 방어를 약화시키지만, 이 코드베이스는 이미 두 겹의 BE 측 방어가 있다 — ① `cors.ts`의 명시적 origin 화이트리스트(`credentials: true`이지만 와일드카드 아님), ② `app.ts`가 `express.json()`만 사용하고 `express.urlencoded()`를 두지 않아 JSON 바디가 필요한 상태변경 API는 `Content-Type` 프리플라이트를 반드시 거치고 화이트리스트에 없는 origin에서 막힌다. 바디가 필요 없는 `POST /auth/logout`, `POST /auth/refresh`만 단순 cross-site form으로 트리거 가능하지만, 피해가 "본인 세션 강제 로그아웃/토큰 회전" 수준으로 낮아 T20 완료를 막을 사유는 아니다. 이 잔여 리스크는 FE 구현 품질과 무관하게 항상 존재하는 것이므로, 향후 바디 없는 상태변경 엔드포인트를 추가하거나 CORS 화이트리스트를 느슨하게 바꿀 때 재검토가 필요하다는 점만 완료 조건에 각주로 남긴다.

**제안하는 수정**:

```ts
// apps/backend/src/controllers/auth.controller.ts
private getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  };
}
```

`secure: true`가 프로덕션에서 이미 참이므로 `sameSite: 'none'`과 조합해도 브라우저 정책(Secure 속성 필수)을 만족한다. 이 변경에 맞춰 다음도 함께 수정한다.

- `docs/05-api-spec.md` 2.2절 "쿠키 설정" 코드 블록 — `sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'`를 `'none'`으로 갱신, 문서 버전 v1.4로 상향, 상태를 "프로덕션 쿠키 SameSite=None 정책 반영"으로 갱신
- `apps/backend/src/controllers/auth.controller.test.ts` — `NODE_ENV=production`을 스텁하는 테스트 3곳만 `sameSite: 'strict'` → `'none'`으로 수정 (126번째 줄 "production 환경에서는 secure strict 쿠키를 설정한다", 241·246번째 줄 "refresh 성공 시 production 쿠키 옵션을 적용한다"). 84, 89, 219, 224번째 줄은 로컬(dev) 환경 케이스로 이미 `sameSite: 'lax'`를 기대하고 있어 **변경 대상이 아님** — 실수로 함께 바꾸지 않도록 주의

이 항목은 auth 도메인(T03/T04, 완료 표시됨)의 코드를 수정하는 것이라 범위가 다소 벗어난다고 판단될 수 있어 **검토 요청 목록의 최우선 항목**으로 올린다. 다만 이 수정 없이는 T20의 완료 조건인 "프로덕션에서 실제 로그인 동작"을 만족할 수 없으므로 기본안으로 포함했다.

### 이슈 C — Supabase Direct Connection은 Render에서 연결이 안 될 가능성이 높다 (IPv6 전용)

Supabase 클라우드는 연결 문자열을 3가지로 제공한다.

| 종류 | 포트 | 네트워크 | Prepared statement | 용도 |
| --- | --- | --- | --- | --- |
| Direct connection | 5432 (`db.{project-ref}.supabase.co`) | **IPv6 전용** (IPv4 애드온 별도 구매 시에만 IPv4) | 지원 | 상시 실행 서버, IPv4 애드온 있을 때 |
| Session pooler | 5432 (`aws-0-{region}.pooler.supabase.com`) | IPv4 호환 | 지원 (세션 단위 연결이라 Direct와 동일하게 동작) | **상시 실행 서버, IPv4 전용 환경** |
| Transaction pooler | 6543 (같은 pooler 호스트) | IPv4 호환 | 미지원(비활성 필요) | 서버리스/짧은 커넥션 다수 |

`apps/backend/src/lib/prisma.ts`는 `@prisma/adapter-pg`(`pg.Pool`)를 사용하며 확장 프로토콜(Parse/Bind/Execute) 기반으로 동작하므로 Transaction 풀러(6543)와는 궁합이 좋지 않다(prepared statement 관련 오류 위험). Render의 아웃바운드 네트워크가 IPv4 전제인 경우 Direct connection(IPv6 전용)은 연결 자체가 실패할 수 있다.

**결론(기본안)**: `DATABASE_URL`(런타임 + `prisma migrate deploy` 양쪽)에 **Session Pooler** 연결 문자열을 사용한다. Direct connection 문자열은 로컬 `psql` 접속 등 관리 목적으로만 별도 보관하고 앱에는 사용하지 않는다.

이 항목은 실제 Supabase 프로젝트를 만들어 두 연결 방식을 직접 테스트해봐야 확정할 수 있는 가정이므로, 검토 요청 목록에 포함해 사용자 확인을 받는다.

---

## 구현 대상 파일

| 파일 경로 | 작업 | 설명 |
| --- | --- | --- |
| `render.yaml` | create | Render Blueprint. 서비스 정의, 빌드/시작 커맨드, 헬스체크 경로, 환경변수 키 목록(`sync: false`로 값은 대시보드에서 입력) |
| `.github/workflows/keep-alive.yml` | create | Render 무료 플랜 슬립 방지용 스케줄 핑 워크플로우 |
| `apps/backend/package.json` | modify | `start` 스크립트를 `node dist/src/server.js`로 수정 (이슈 A) |
| `package.json` (루트) | modify | `"packageManager": "pnpm@11.9.0"` 필드 추가 — `devEngines.packageManager`는 corepack이 참조하지 않으므로, Render 빌드의 `corepack enable`이 정확한 pnpm 버전을 고정하도록 함. T19 CI(`pnpm/action-setup@v4 version: 11`)와도 일관성 유지 |
| `apps/backend/src/controllers/auth.controller.ts` | modify | 프로덕션 쿠키 `sameSite: 'none'`으로 변경 (이슈 B) |
| `apps/backend/src/controllers/auth.controller.test.ts` | modify | 위 변경에 맞춰 프로덕션 분기 테스트 기대값 수정 |
| `docs/05-api-spec.md` | modify | 2.2절 쿠키 설정 `sameSite` 값 갱신, 문서 버전 v1.4로 상향 |
| `apps/backend/.env.example` | modify | Session Pooler 안내 주석 보강 (Direct/Pooled 구분 설명) |
| `docs/08-backend-architecture.md` | modify | "10. 환경변수 목록" 절 아래에 운영(Render) 환경변수 값 안내 섹션 추가, 버전 v1.4로 상향 |
| `docs/02-system-architecture.md` | modify | "BE 호스팅 이전 고려 사항" 절에 EC2 t4g.micro/t3.micro 비용 비교 각주 추가 (컴퓨트 월 $7.59/$8.54, EBS·트래픽 포함 총액 $10~12선, Seoul 리전 기준). 버전 상향은 다른 절 변경이 없으므로 불필요, 각주만 추가 |

DB 스키마 변경은 없으므로 `prisma/schema.prisma`, 마이그레이션 파일 추가는 없다. 기존 `20260630065016_init` 마이그레이션을 원격 DB에 적용하는 것이 이 Task의 DB 작업 전부다.

---

## 인프라 설정 상세 (비즈니스 로직 대체 섹션)

이 Task는 Service 레이어 로직이 없으므로, 표준 템플릿의 "비즈니스 로직 설계" 대신 **인프라 설정 절차**를 아래에 기술한다.

### 1. Supabase 클라우드 프로젝트 생성

1. Supabase 대시보드에서 새 프로젝트 생성 (조직: 팀 조직 선택, 이름: 예 `syfity-prod`)
2. 리전 선택 — 한국 사용자 기준 지연시간을 고려해 서울(`ap-northeast-2`) 또는 싱가포르 중 Render와 가장 가까운 리전 선택 (Render는 서울 리전을 제공하지 않으므로 완전히 동일한 리전 매칭은 불가능. 아래 Render 리전 선택과 함께 최종 결정)
3. DB 비밀번호 설정 (비밀번호 관리자에 저장, `.env`/커밋 금지)
4. Connection String 3종(Direct / Session Pooler / Transaction Pooler) 확보 — Project Settings → Database → Connection string
5. 이슈 C에 따라 **Session Pooler** 문자열을 운영 `DATABASE_URL`로 채택

### 2. 원격 마이그레이션 실행

로컬에서 1회 실행하여 원격 스키마를 초기화한다 (CI/CD에도 동일 커맨드가 들어가지만, 최초 1회는 로컬에서 실행해 결과를 직접 확인하는 것을 권장한다).

```bash
cd apps/backend
DATABASE_URL="<Session Pooler 연결 문자열>" npx prisma migrate deploy
```

**검증**: Supabase 대시보드 Table Editor에서 `users`, `rooms`, `room_members`, `recent_rooms`, `playlist_items`, `playback_states`, `chat_messages`, `_prisma_migrations` 테이블이 생성되었는지 확인한다.

### 3. Render 서비스 생성 (`render.yaml` Blueprint)

`render.yaml`을 레포 루트에 커밋하고, Render 대시보드에서 "New +" → "Blueprint"로 이 레포를 연결한다. pnpm workspace 모노레포이므로 **Root Directory는 레포 루트로 유지**하고(비워둠), 빌드/시작 커맨드에서 `pnpm --filter backend`로 범위를 지정한다. `apps/backend`를 Root Directory로 지정하면 `pnpm-workspace.yaml`을 찾지 못해 `workspace:*` 의존성(`@syfity/shared`) 설치가 실패한다.

```yaml
# render.yaml
services:
  - type: web
    name: syfity-backend
    env: node
    region: singapore # Supabase 리전과 최대한 가깝게, 최종 확정 시 조정
    plan: free
    buildCommand: >-
      corepack enable &&
      pnpm install --frozen-lockfile &&
      pnpm --filter backend exec prisma generate &&
      pnpm --filter backend exec prisma migrate deploy &&
      pnpm --filter backend build
    startCommand: pnpm --filter backend start
    healthCheckPath: /api/v1/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_VERSION
        value: '22'
      - key: CLIENT_URL
        sync: false
      - key: ALLOWED_ORIGINS
        sync: false
      - key: JWT_ACCESS_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
      - key: DATABASE_URL
        sync: false
      - key: YOUTUBE_API_KEY
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: GOOGLE_CALLBACK_URL
        sync: false
```

**빌드 커맨드 설계 근거**:

- `corepack enable` — Render 기본 이미지에 pnpm이 없을 수 있으므로 `package.json`의 `devEngines.packageManager`(pnpm 11.9.0)를 인식시킨다.
- `prisma generate` 없이 `pnpm --filter backend build`(→ `tsoa spec-and-routes && tsc -p tsconfig.build.json`)를 실행하면 `@prisma/client` 타입이 없어 `tsc`가 실패한다(T19 CI 설계에서도 동일하게 명시).
- `prisma migrate deploy`를 빌드 단계에 포함해 배포마다 최신 스키마가 자동 적용되도록 한다. Render 무료 플랜은 별도 Pre-Deploy Command 기능이 제한적일 수 있어, 빌드 커맨드에 포함하는 방식을 기본안으로 한다.
- `PORT` 환경변수는 명시하지 않는다. Render가 web 서비스에 자동으로 `PORT`를 주입하며, `apps/backend/src/config.ts`가 이미 `process.env.PORT ?? '4000'`로 이를 읽는다. 여기서 값을 고정하면 Render가 주입하는 값과 충돌할 수 있다.

**헬스체크 경로**: `docs/05-api-spec.md` 3절에 따라 REST API는 `/api/v1` 하위에 위치하므로, 이미 구현된 `HealthController`(`@Route('health')`, tsoa `basePath: /api/v1`)의 실제 경로는 `/api/v1/health`다. Render 대시보드/`render.yaml`의 헬스체크 경로도 `/api/v1/health`로 설정해야 한다(`/health`만 입력하면 404).

### 3-1. 커스텀 도메인 구매 및 `api.{domain}` → Render 연결

`docs/02-system-architecture.md`의 "커스텀 도메인 적용 시 (추후)" 계획을 이번 Task에서 앞당겨 실행한다. 도메인은 아직 미확정이므로 아래 절차는 `{domain}`을 실제 값으로 치환해 진행하는 수동 작업이다.

1. 레지스트라(가비아, Namecheap, Cloudflare Registrar 등)에서 도메인 구매 (사용자가 직접 진행 — 결제 수단 필요)
2. DNS 존을 레지스트라 기본 DNS 또는 Cloudflare 등으로 구성
3. Render 대시보드 → 서비스 → Settings → Custom Domains에서 `api.{domain}` 추가 → Render가 안내하는 CNAME 레코드를 DNS에 등록
4. DNS 전파 확인 후 Render가 자동으로 Let's Encrypt 인증서를 발급하는지 확인 (`https://api.{domain}` 접속 시 인증서 유효)
5. 루트 도메인(`{domain}`, `www.{domain}`)은 T21에서 Vercel 프로젝트 생성 후 연결한다 — T20에서는 DNS 존만 준비해두고 실제 레코드 등록은 T21로 넘긴다

이 단계 완료 후 `api.{domain}`이 `{render-service}.onrender.com`을 대체하는 정식 프로덕션 BE 주소가 된다. 아래 4, 5번 항목의 값은 모두 `api.{domain}` 기준으로 확정한다.

### 4. Render 환경변수 값 설정 (대시보드에서 직접 입력, `sync: false` 대상)

| 키 | 값 출처 | 비고 |
| --- | --- | --- |
| `CLIENT_URL` | T21에서 확정되는 FE 프로덕션 URL (`https://{domain}`) | T20 시점에는 임시로 로컬 FE 값 또는 placeholder, T21 완료 후 갱신 |
| `ALLOWED_ORIGINS` | `https://{domain}` (커스텀 도메인 FE) | `cors.ts`의 정규식(`*.vercel.app`)이 Preview 도메인은 이미 허용하므로, 여기는 프로덕션 커스텀 도메인만 명시하면 된다 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 새로 생성 (openssl 등으로 랜덤 문자열 생성, 로컬 `.env`와 다른 값 사용) | 절대 로컬 값 재사용 금지 |
| `DATABASE_URL` | Supabase Session Pooler 연결 문자열 | 이슈 C 참조 |
| `YOUTUBE_API_KEY` | 기존 발급된 키 재사용 또는 운영용 별도 키 발급 | 쿼터 분리를 원하면 별도 키 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | GCP OAuth 클라이언트 정보 | 아래 5번 항목과 동일 클라이언트 사용 |
| `GOOGLE_CALLBACK_URL` | `https://api.{domain}/api/v1/auth/google/callback` | 3-1에서 커스텀 도메인 연결 완료 후 값 확정 |

### 5. GCP OAuth 리다이렉트 URI 등록 (필수 — 이전 세션에서 이관된 작업)

3-1에서 `api.{domain}`이 Render에 연결되면 다음을 수행한다. `{render-service}.onrender.com` 기본 도메인은 GCP에 등록하지 않고 커스텀 도메인으로 바로 진행한다.

1. GCP Console → API 및 서비스 → 사용자 인증 정보 → 기존 OAuth 2.0 클라이언트 ID 선택
2. "승인된 리디렉션 URI"에 `https://api.{domain}/api/v1/auth/google/callback` 추가 (기존 로컬 URI `http://localhost:4000/api/v1/auth/google/callback`는 유지)
3. Render 환경변수에 다음 프로덕션 값 반영 (4번 표와 중복이지만 별도 체크리스트로 명시)
   - `GOOGLE_CLIENT_ID` — 기존 클라이언트 ID
   - `GOOGLE_CLIENT_SECRET` — 기존 클라이언트 시크릿
   - `GOOGLE_CALLBACK_URL` — 위 프로덕션 콜백 URL (`https://api.{domain}/api/v1/auth/google/callback`)

이 항목은 완료 조건(Acceptance Criteria)에 명시적으로 포함한다.

### 6. 슬립 방지 전략

Render 무료 플랜은 15분간 요청이 없으면 인스턴스가 슬립 상태로 전환되고, 이후 첫 요청이 콜드 스타트(수십 초)를 유발한다. 또한 무료 플랜은 계정당 월 750 인스턴스-시간 한도를 공유한다(서비스 1개를 상시 구동 시 약 730시간으로 한도 내).

**기본안**: `.github/workflows/keep-alive.yml`에 GitHub Actions 스케줄 워크플로우를 추가해 10분 간격으로 `GET /api/v1/health`를 호출한다.

```yaml
name: Render Keep-Alive

on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch: {}

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping health endpoint
        run: curl -fsS "${{ vars.RENDER_HEALTH_URL }}"
```

- `RENDER_HEALTH_URL`(예: `https://api.{domain}/api/v1/health`)은 리포지토리 Variables(Settings → Secrets and variables → Actions → Variables)에 등록한다. 값 자체는 비밀이 아니므로 Secret이 아닌 Variable로 등록한다.
- GitHub Actions 무료 분(private 레포 기준 월 2,000분) 소모는 미미하다(10분마다 수 초짜리 curl 실행 ≈ 월 십수 분).
- **참고**: 상시 핑으로 Render 서비스를 계속 깨워두면 계정 전체 750 인스턴스-시간 한도 중 약 730시간을 소모한다(서비스 1개만 상시 구동 시 한도 내). 이 소모량은 핑을 GitHub Actions로 보내든 UptimeRobot 등 외부 서비스로 보내든 동일하다 — Render의 인스턴스-시간은 "서비스가 깨어있는 시간" 기준이라 핑 주체와 무관하기 때문이다. 따라서 핑 수단 선택은 750시간 한도 문제와는 무관하며, 단순히 "레포 안에서 버전관리할지(GitHub Actions) vs 외부 서비스 계정에 의존할지(UptimeRobot)"의 문제다. 레포 내 버전관리 이점을 살려 **GitHub Actions 기본안을 그대로 채택**한다.

---

## API / Socket 변경사항

- `GET /api/v1/health`는 이미 구현되어 있으며 `docs/05-api-spec.md`의 스펙과 일치한다(경로, 응답 형식 변경 없음). Render 헬스체크 대상 경로로 그대로 사용한다.
- 프로덕션 쿠키 `sameSite` 값 변경 (`'strict'` → `'none'`, 로컬 `'lax'`는 유지) — `docs/05-api-spec.md` 2.2절 갱신 필요, 문서 버전 v1.4로 상향, 상태를 "프로덕션 쿠키 SameSite=None 정책 반영"으로 갱신. CSRF 잔여 리스크(이슈 B 참조)는 각주로만 남기고 별도 하드닝 작업은 이번 Task 범위 밖. 나머지 API 스펙은 변경 없음 — `docs/05-api-spec.md` 참조.
- Socket 이벤트 변경 없음 — `docs/06-socket-event-spec.md` 참조.

## DB 변경사항

- 스키마 변경 없음. 기존 마이그레이션(`20260630065016_init`)을 `prisma migrate deploy`로 Supabase 클라우드에 적용하는 것이 전부다.
- 마이그레이션 파일 신규 작성 불필요.

## 공유 타입 변경사항

없음. `packages/shared/` 변경 사항 없음.

---

## 테스트 케이스 (검증 시나리오)

인프라 Task이므로 단위 테스트 대신 배포 검증 시나리오로 기술한다. 단, 코드 변경분(이슈 A, B)은 기존 vitest 스위트로 검증한다.

| 케이스 | 조건 | 기대 결과 |
| --- | --- | --- |
| `start` 스크립트 수정 검증 | `pnpm --filter backend build && pnpm --filter backend start` 로컬 실행 | `dist/src/server.js`가 정상 기동, `Cannot find module` 오류 없음 |
| 프로덕션 쿠키 단위 테스트 | `auth.controller.test.ts`에서 `config.nodeEnv = 'production'`으로 스텁 | `res.cookie` 호출 시 `sameSite: 'none'`, `secure: true` |
| 로컬(dev) 쿠키 단위 테스트 | `config.nodeEnv = 'development'` | `sameSite: 'lax'`, `secure: false` (기존 동작 유지) |
| 원격 마이그레이션 | Supabase Session Pooler URL로 `prisma migrate deploy` 실행 | 종료 코드 0, `_prisma_migrations` 테이블에 `20260630065016_init` 기록 |
| Render 빌드 | Render 대시보드에서 첫 배포 트리거 | 빌드 로그에 `prisma generate` → `prisma migrate deploy` → `tsoa spec-and-routes` → `tsc` 순서로 성공 로그 출력 |
| pnpm 버전 고정 검증 | Render 빌드 로그에서 `corepack enable` 직후 pnpm 버전 확인 | `pnpm/pnpm@11.9.0`로 고정되어 실행됨 (루트 `package.json`의 `packageManager` 필드 반영 확인) |
| Render 헬스체크 | 배포 완료 후 | Render 대시보드 상태가 "Live", `GET https://api.{domain}/api/v1/health` → `200 { success: true, data: { status: 'ok' } }` |
| 커스텀 도메인 TLS | `api.{domain}` DNS 전파 완료 후 | 브라우저에서 `https://api.{domain}` 접속 시 유효한 인증서(Let's Encrypt), 인증서 경고 없음 |
| CORS 검증 | 브라우저 콘솔에서 프로덕션 FE(또는 임시 정적 페이지, `https://{domain}` 기준)에서 `fetch(apiUrl, { credentials: 'include' })` | CORS 오류 없이 응답 수신 |
| Google 로그인 E2E (프로덕션) | `https://{domain}` FE에서 `GET https://api.{domain}/api/v1/auth/google` 접근 → Google 로그인 → 콜백 | `access_token`/`refresh_token` 쿠키가 브라우저에 정상 저장되고, 이어지는 `GET /api/v1/me` 요청이 인증됨 (same-site 쿠키 전송 확인) |
| Google 로그인 E2E (Preview) | Vercel Preview URL(`<branch>-<hash>.vercel.app`)에서 동일 플로우 실행 | cross-site 환경에서도 쿠키가 정상 첨부되어 로그인이 성공함 (`sameSite: 'none'` 검증) |
| 슬립 방지 워크플로우 | GitHub Actions "Render Keep-Alive" 워크플로우 수동 실행(`workflow_dispatch`) | curl 성공(exit code 0), Render 서비스 로그에 요청 기록 |
| 슬립 방지 부재 시 비교(선택) | 워크플로우 비활성화 후 15분 이상 미접속 상태 관찰 | 이후 첫 요청이 콜드 스타트로 지연됨을 확인 (문제 재현으로 대비책 필요성 검증) |
| 잘못된 Root Directory 회귀 방지 | Render Root Directory를 `apps/backend`로 잘못 설정해본 경우(참고용) | `pnpm install`이 `@syfity/shared` workspace 의존성을 찾지 못해 실패 → 반드시 레포 루트를 Root Directory로 사용해야 함을 재확인 |

## 완료 조건 (Acceptance Criteria)

- [ ] Supabase 클라우드 프로젝트가 생성되고, Session Pooler 연결 문자열을 확보했다
- [ ] `prisma migrate deploy`로 Supabase 클라우드 DB에 전체 테이블이 생성되었다 (`_prisma_migrations` 포함)
- [ ] `apps/backend/package.json`의 `start` 스크립트가 `node dist/src/server.js`로 수정되어 로컬에서 빌드 산출물이 정상 기동된다
- [ ] 루트 `package.json`에 `"packageManager": "pnpm@11.9.0"`이 추가되어 Render 빌드의 `corepack enable`이 의도한 pnpm 버전을 사용한다
- [ ] 프로덕션 쿠키 `sameSite` 정책이 `'none'`으로 수정되고, `docs/05-api-spec.md`와 관련 테스트가 함께 갱신되었다 (문서 버전 v1.4). CSRF 잔여 리스크(바디 없는 `logout`/`refresh` 엔드포인트)는 각주로 문서화되어 있다
- [ ] `render.yaml`이 커밋되어 Render Blueprint로 서비스가 생성되었다 (Root Directory: 레포 루트)
- [ ] 빌드 커맨드가 `prisma generate → prisma migrate deploy → tsoa spec-and-routes → tsc` 순서로 성공한다
- [ ] Render 헬스체크 경로가 `/api/v1/health`로 설정되고, 배포 후 서비스 상태가 "Live"다
- [ ] 도메인이 구매되고, `api.{domain}`이 Render 커스텀 도메인으로 연결되어 유효한 TLS 인증서로 접속된다
- [ ] Render 환경변수에 `DATABASE_URL` 포함 전체 목록(위 표)이 설정되었다 (`GOOGLE_CALLBACK_URL`은 `api.{domain}` 기준)
- [ ] GCP OAuth 클라이언트의 승인된 리디렉션 URI에 프로덕션 콜백 URL(`https://api.{domain}/api/v1/auth/google/callback`)이 추가되었다
- [ ] Render 환경변수에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`(프로덕션 값)이 설정되었다
- [ ] 프로덕션에서 Google 로그인 E2E가 성공한다 (쿠키가 크로스 도메인/Preview 요청에도 정상 첨부됨)
- [ ] 슬립 방지 워크플로우(`.github/workflows/keep-alive.yml` 또는 대안)가 등록되어 주기적으로 실행된다
- [ ] `docs/08-backend-architecture.md`에 운영 환경변수 안내가 추가되고 문서 버전이 v1.4로 상향되었다
- [ ] `docs/02-system-architecture.md`의 "BE 호스팅 이전 고려 사항"에 EC2 t4g.micro/t3.micro 비용 비교 각주가 추가되었다

## 구현 순서 (Codex Plan 참고용)

1. Supabase 클라우드 프로젝트 생성 + Connection String(Direct/Session Pooler/Transaction Pooler) 확보 (수동 작업, 커밋 없음)
2. 로컬에서 Session Pooler URL로 `prisma migrate deploy` 실행해 원격 스키마 검증 (수동 작업, 커밋 없음)
3. 코드 수정 — 이슈 A, B 반영 (커밋)
   - `apps/backend/package.json` `start` 스크립트 수정
   - 루트 `package.json`에 `"packageManager": "pnpm@11.9.0"` 추가
   - `apps/backend/src/controllers/auth.controller.ts` `sameSite` 로직 수정
   - `apps/backend/src/controllers/auth.controller.test.ts` 기대값 수정
   - `pnpm --filter backend test`, `pnpm --filter backend build && pnpm --filter backend start`로 로컬 검증
4. 문서 갱신 (커밋)
   - `docs/05-api-spec.md` 쿠키 설정 갱신 + 버전 v1.4
   - `docs/08-backend-architecture.md` 운영 환경변수 섹션 추가 + 버전 v1.4
   - `docs/02-system-architecture.md` "BE 호스팅 이전 고려 사항"에 EC2 비용 비교 각주 추가
   - `apps/backend/.env.example` Direct/Pooled 안내 주석 보강
5. `render.yaml` 작성 + 커밋
6. `.github/workflows/keep-alive.yml` 작성 + `RENDER_HEALTH_URL` Variable 등록 안내 커밋 (URL은 8번 이후 실제 값으로 채움)
7. Render 대시보드에서 Blueprint로 서비스 생성, 환경변수 값 입력 (수동 작업)
8. 배포 확인 — 빌드 로그, 헬스체크, `{render-service}.onrender.com` 기본 URL로 1차 동작 확인 (수동 작업)
9. 도메인 구매 + DNS 설정 + Render Custom Domain으로 `api.{domain}` 연결, TLS 인증서 발급 확인 (수동 작업)
10. GCP Console에 `https://api.{domain}` 기준 프로덕션 리다이렉트 URI 등록 (수동 작업)
11. Render 환경변수 갱신 (수동 작업): `GOOGLE_CALLBACK_URL`은 `https://api.{domain}` 기준, `ALLOWED_ORIGINS`는 FE 커스텀 도메인 `https://{domain}` 기준으로 확정 입력. `CLIENT_URL`은 FE가 아직 Vercel 기본 도메인에 있으므로 임시값 유지 — T21에서 커스텀 도메인 연결 완료 후 `https://{domain}`으로 재갱신
12. `.github/workflows/keep-alive.yml`의 `RENDER_HEALTH_URL`을 `api.{domain}` 기준 URL로 등록 (수동 작업)
13. 최종 E2E 검증 — Google 로그인, `/api/v1/me` 호출, CORS, Preview 도메인에서 쿠키 첨부, 슬립 방지 워크플로우 수동 트리거 확인

---

## IMPLEMENTATION_NOTES

- 로컬 start 검증 중 `@syfity/shared`가 `src/index.ts`를 런타임 main으로 노출해 `node dist/src/server.js`에서 shared 내부 import를 해석하지 못하는 문제가 확인되었다. 배포 시작 AC를 만족하기 위해 `packages/shared`에 `tsconfig.json`과 `build` 스크립트를 추가하고, backend `prebuild`/`prestart`/`pretest`에서 shared 빌드를 먼저 실행하도록 보강했다.
- 로컬 start 검증 중 `tsoa`가 생성한 `src/generated/swagger.json`이 `tsc` 산출물에 복사되지 않아 `dist/src/app.js`의 Swagger import가 실패하는 문제가 확인되었다. backend `postbuild`에서 `swagger.json`을 `dist/src/generated/`로 복사하도록 보강했다.
