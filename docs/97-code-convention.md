# 97. Code Convention

## 1. 문서 정보

| 항목      | 내용                                    |
| --------- | --------------------------------------- |
| 문서명    | Syfity Code Convention                  |
| 버전      | v1.0                                    |
| 상태      | 초안                                    |
| 작성 목적 | Syfity 프로젝트 Git 및 코드 컨벤션 정의 |
| 적용 범위 | FE (Next.js), BE (Express.js) 공통 적용 |

---

## 2. 브랜치 전략

### 브랜치 구조

| 브랜치           | 역할                      |
| ---------------- | ------------------------- |
| `main`           | 배포                      |
| `dev`            | 메인 개발 브랜치          |
| `feat/<기능명>`  | 기능 추가                 |
| `fix/<버그명>`   | 버그 수정                 |
| `chore/<작업명>` | 설정, 패키지 등 기타 작업 |

### 네이밍 규칙

- 영어 소문자, 단어 구분은 하이픈(`-`) 사용
- 예: `feat/user-login`, `fix/scroll-bug`, `chore/eslint-setup`

### 병합 방향

```
feat/fix/chore → dev → main
```

- `feat/fix/chore`는 항상 `dev`에서 분기
- `dev → main`은 배포 시점에 머지

### 브랜치 생명주기

- `feat/fix/chore`는 `dev` 머지 후 삭제

### 기타

- 하나의 브랜치에 하나의 기능/작업

---

## 3. 커밋 컨벤션

### 형식

```
<type>: <subject>
```

### type 종류

| type       | 설명                                                     |
| ---------- | -------------------------------------------------------- |
| `feat`     | 기능 추가                                                |
| `fix`      | 버그 수정                                                |
| `style`    | 코드 포맷팅, 세미콜론 등 스타일 수정 (기능 변경 없음)    |
| `refactor` | 구조 변경 (기능 변경 없음)                               |
| `chore`    | 위 type에 해당하지 않는 모든 작업 (설정, 패키지 설치 등) |
| `docs`     | 문서 수정                                                |
| `test`     | 테스트 수정                                              |

### subject 규칙

- 한영 자유
- 현재형, 단답형
- 50자 이하

### 기타

- 커밋은 헤더만 작성
- 단일 커밋에는 단일 목적만 (예: 기능 구현과 테스트 구현은 별도 커밋)

---

## 4. PR 규칙

### PR 단위

- 브랜치 단위로 PR 생성
- 하나의 PR에 하나의 기능/작업

### 리뷰 규칙

- PR 생성 후 리뷰 요청
- 최소 2명 Approve 필요
- 작성자 self-approve 불가
- Change Request 시 수정 후 재요청
- Change Request가 남아있는 경우 머지 불가

### 머지 규칙

- Approve 완료 후 작성자가 머지
- 작성자는 즉시 머지 불가
- 당장 머지가 필요한 경우 누구나 머지 가능

---

## 5. 코드 컨벤션

### 5.1 네이밍 규칙

#### 변수 / 함수

- camelCase
- 함수는 동사로 시작 (예: `getUser`, `handleClick`)
- boolean 변수는 `is`, `has`, `can` 등으로 시작 (예: `isLoading`, `hasError`)
- 이벤트 핸들러는 `handle` prefix (예: `handleClick`, `handleSubmit`)
- 이벤트 핸들러 prop은 `on` prefix (예: `onClick`, `onSubmit`)
- 약어 사용 지양 (예: `btn` → `button`, `usr` → `user`)

#### 컴포넌트

- PascalCase
- 파일명과 컴포넌트명 일치

#### 상수

- UPPER_SNAKE_CASE
- enum 사용 지양, `as const` 사용

#### 타입 / 인터페이스

- PascalCase
- 제네릭 타입 파라미터: 단일 대문자 (예: `T`, `K`, `V`)

#### 커스텀 훅

- `use` prefix (예: `useAuth`, `useSocket`)

#### 파일 / 폴더

| 대상                | 규칙                      | 예시                                                   |
| ------------------- | ------------------------- | ------------------------------------------------------ |
| 라우트 폴더         | kebab-case                | `user-profile/`                                        |
| 컴포넌트 파일       | PascalCase                | `UserCard.tsx`                                         |
| API 레이어 파일     | camelCase + 레이어 suffix | `roomRouter.ts`, `roomController.ts`, `roomService.ts` |
| 그 외 파일          | camelCase                 | `useAuth.ts`, `apiClient.ts`                           |
| Next.js 컨벤션 파일 | Next.js 기본              | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`   |

---

### 5.2 type vs interface 사용 기준

#### type 사용

- 유니온, 인터섹션, 튜플 등 복잡한 타입
- 유틸리티 타입 조합 (예: `Partial<T>`, `Pick<T, K>`)
- 함수 타입

#### interface 사용

- 컴포넌트 props
- 클래스 구현 (`implements`)
- 외부 라이브러리 타입 확장 (선언 병합)

---

### 5.3 컴포넌트 규칙

#### 기본 규칙

- 함수형 컴포넌트만 사용
- 컴포넌트당 하나의 파일

#### props

- props 타입은 interface로 정의
- props 구조 분해 할당 사용

#### export

- named export 통일
- Next.js 컨벤션 파일(`page.tsx`, `layout.tsx` 등)은 default export 예외

#### Server / Client Component

- 기본적으로 Server Component
- 클라이언트 상태, 이벤트 핸들러, 브라우저 API 사용 시 `'use client'` 명시

#### 커스텀 훅

- 로직이 복잡하거나 재사용이 필요한 경우 커스텀 훅으로 분리

---

### 5.4 주석 규칙

- 코드만으로 이해하기 어려운 경우에만 작성
- 한국어로 작성
- `TODO`, `FIXME` 태그 사용
