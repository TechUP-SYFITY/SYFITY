# 00. Project Plan

## 1. 기본 정보 (Project Cover)

### 프로젝트명 & 부제

- Syfity (싸이피티)
- 함께 듣는 실시간 음악 동기화 플랫폼

### 팀명

- (팀명 입력)

### 팀원

- 김민교 (팀장)
- 엄한나
- 이주영
- 이중호

---

## 2. 프로젝트 개요 (Executive Summary)

### 목표

- 여러 사용자가 하나의 Room에서 같은 음악을 실시간으로 함께 듣고, 공동 플레이리스트를 관리하며, 채팅으로 소통할 수 있는 웹 기반 소셜 리스닝 플랫폼을 구현한다.
- YouTube IFrame Player API 기반 재생과 서버 절대 시간 기준 동기화를 통해, 광고·버퍼링 등 사용자별 재생 환경 차이에도 자연스럽게 "함께 듣고 있다"는 경험을 제공한다.

### 성과

- Google 로그인, Room 생성/입장/재입장, YouTube 검색 및 링크 기반 곡 추가, 공동 플레이리스트, 실시간 재생 동기화, 채팅, 참여자 상태 표시까지 포함한 MVP를 완성한다.
- 서버 기준 currentTime 역산 및 10초 주기 자동 보정을 통해 참여자 간 재생 위치 오차를 2초 이내로 유지하는 동기화 시스템을 구현한다.
- 설계 문서(시스템 아키텍처, DB, API, Socket 이벤트, FE/BE 아키텍처)를 기반으로 한 협업 개발 프로세스를 팀 전체가 경험하고 적용한다.

---

## 3. 수행 계획 (Execution Plan)

### 주요 단계

- 기획 및 설계: 서비스 정의(PRD), 기술 타당성/시장 조사, 시스템 아키텍처·DB·API·Socket 이벤트·FE/BE 아키텍처 설계 문서화
- 환경 구축: 모노레포 세팅, BE/FE 초기 구조 생성, ESLint/Prettier/Husky/CI 환경 구성, GitHub 협업 규칙 정비
- 핵심 기능 구현: Google 로그인, Room 생성/입장/재입장, YouTube 검색 및 링크 기반 곡 추가, 공동 플레이리스트, 실시간 재생 동기화, 채팅, 참여자 상태(Presence)
- 통합 및 테스트: FE-BE 연동, Socket 이벤트 통합 테스트, 동기화 오차·재연결·Host 퇴장 등 주요 시나리오 검증
- 배포 및 마무리: Vercel/Render/Supabase 배포, 운영 환경 점검, 발표 자료 준비

### 역할 분담

- 김민교(팀장): 백엔드 전체 설계 및 구현(인증, Room, Playlist, Socket 이벤트), 인프라 및 배포, 전체 설계 문서 작성
- 엄한나: UI/UX 디자인(Figma), 인증 관련 프론트엔드 구현(로그인, Home, Room 입장 흐름)
- 이주영: 채팅, 참여자 상태(Presence), 음악 검색 기능 프론트엔드 구현
- 이중호: 재생 플레이어(Player), 플레이리스트(Playlist), Room 화면 프론트엔드 구현

### 사용 기술 및 도구

**기술 스택**

- Frontend: Next.js 16 (App Router), TypeScript, Zustand, TanStack Query, Tailwind CSS, shadcn/ui, Socket.IO Client
- Backend: Express.js, Socket.IO, Prisma, PostgreSQL (Supabase), node-cache
- 공통: pnpm Workspace 모노레포, ESLint, Prettier, Vitest, Playwright

**사용 도구**

- 협업: Discord, ZEP, Notion
- 버전 관리: Git, GitHub
- 디자인: Figma
- 배포: Vercel(Frontend), Render(Backend), Supabase(Database)

### 성과물

- Syfity 웹 서비스 (실시간 음악 동기화 플랫폼 MVP)
- 시스템 아키텍처, DB 설계, API 명세, Socket 이벤트 명세, 프론트엔드/백엔드 아키텍처 등 설계 문서 일체
- 팀 협업 규칙 문서 (Git/코드 컨벤션, 스크럼 운영 문서)
- 프로젝트 발표 자료

### 참고 문헌 및 자료

- 프로젝트 설계 문서: `docs/` 디렉토리 참고
- Code Convention (Git/코드 컨벤션): `docs/97-code-convention.md`
- YouTube Data API v3 공식 문서: https://developers.google.com/youtube/v3
- YouTube IFrame Player API 공식 문서: https://developers.google.com/youtube/iframe_api_reference
- Socket.IO 공식 문서: https://socket.io/docs/v4/
- Prisma 공식 문서: https://www.prisma.io/docs
- Next.js 공식 문서: https://nextjs.org/docs
