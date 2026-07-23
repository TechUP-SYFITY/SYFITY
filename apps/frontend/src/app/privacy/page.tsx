import { Footer, Header } from '@/shared/components/layout';

const sections = [
  [
    '1. 개인정보의 처리 목적',
    'Google 계정을 통한 회원 가입·관리, Room 생성·참여·재생목록·채팅 제공, 프로필 이미지 관리, 부정 이용 방지와 서비스 안정 운영을 위해 개인정보를 처리합니다.',
  ],
  [
    '2. 처리하는 개인정보 항목',
    'Google 계정에서 이메일·닉네임·프로필 사진의 최초값을 받고, 서비스 이용 중 Syfity 사용자 식별자, 설정한 닉네임·프로필 사진, Room 생성·참여·최근 참여 기록, 개인·Room 재생목록 이름과 영상 정보, 채팅 메시지를 처리합니다.',
  ],
  [
    '3. 처리 및 보유 기간',
    '회원 정보는 탈퇴 시까지 보유합니다. 탈퇴가 성공하면 이메일·닉네임·프로필 사진은 식별할 수 없는 형태로 전환하고, 개인 재생목록과 프로필 이미지 파일은 삭제합니다. 공유 Room·참여 기록·채팅·Room 재생목록은 익명화된 계정과의 연결만 남길 수 있습니다. YouTube Data API로 취득한 제목·채널명·썸네일·길이 등 메타데이터는 25일마다 최신 정보로 갱신하거나 재생 불가 상태로 전환합니다.',
  ],
  [
    '4. Google·YouTube 서비스 이용',
    '서비스는 이용자의 이메일·닉네임·프로필 사진·Room 참여 기록·채팅 메시지를 Google 또는 YouTube에 제공하지 않습니다. Google OAuth 로그인에서는 Google이 이메일·닉네임·프로필 사진의 최초값을 Syfity에 전달합니다. YouTube 검색 시 Syfity는 검색어와 영상 ID를 YouTube Data API에 전송하며, 이용자의 브라우저는 YouTube 플레이어·썸네일을 불러오는 과정에서 영상 ID, IP 주소, 브라우저 정보, referrer, 쿠키 또는 유사 기술에 관한 정보를 Google/YouTube에 전송할 수 있습니다. 이 정보의 처리와 보유 기간은 Google 정책에 따릅니다.',
  ],
  [
    '5. 처리 위탁 및 서비스 인프라',
    '서비스는 아래 사업자의 인프라를 이용해 개인정보를 처리합니다. Supabase는 서비스 데이터베이스와 프로필 이미지 Storage를, Render는 백엔드 API를, Vercel은 프런트엔드 호스팅과 서버 렌더링을 제공합니다. 각 서비스의 처리 범위는 회원·Room·재생목록·채팅·프로필 이미지 등 해당 기능을 제공하는 데 필요한 정보입니다.',
  ],
  [
    '6. 국외 이전',
    '서비스 데이터베이스와 프로필 이미지 Storage(Supabase), 백엔드 API(Render), 프런트엔드 서버 렌더링(Vercel)은 싱가포르 리전에서 운영됩니다. 이에 따라 회원·Room·재생목록·채팅·프로필 이미지 정보와 서비스 요청에 포함된 인증 정보가 싱가포르로 전송되어 처리될 수 있습니다. YouTube 검색·재생 기능을 이용하면 4항의 정보가 Google/YouTube의 처리 환경으로 전송될 수 있습니다. 각 제공자의 처리 기간과 세부 정책은 해당 제공자의 개인정보처리방침에 따릅니다.',
  ],
  [
    '7. 정보주체의 권리와 행사',
    '이용자는 자신의 개인정보에 대해 열람·정정·삭제·처리정지를 요청할 수 있습니다. 계정 설정에서 닉네임·프로필 사진을 직접 수정하고 회원 탈퇴를 요청할 수 있으며, 그 밖의 요청은 개인정보 보호책임자에게 문의할 수 있습니다. Google 연결 권한은 Google 계정 보안 설정에서 철회할 수 있습니다. 만 14세 미만은 서비스 이용이 제한됩니다.',
  ],
  [
    '8. 개인정보의 파기',
    '목적 달성 또는 보유기간 경과 시 지체 없이 파기합니다. 회원 탈퇴가 성공하면 이메일·닉네임·프로필 사진은 식별 불가능한 형태로 전환되고 개인 재생목록과 프로필 이미지 파일은 삭제됩니다. 탈퇴 처리 중 오류가 발생하면 삭제가 완료되지 않으며, 이용자는 다시 요청하거나 개인정보 보호책임자에게 문의할 수 있습니다. 공유 Room·채팅 기록은 익명화 형태로 유지될 수 있습니다.',
  ],
  [
    '9. 안전성 확보조치',
    '접근 권한 최소화, OAuth 기반 인증, 자체 refresh token의 해시 보관, HTTPS 전송 구간 암호화를 적용합니다.',
  ],
  [
    '10. 쿠키 등 자동 수집 장치',
    'Syfity는 로그인 상태를 유지하기 위해 HttpOnly access token·refresh token 쿠키를 사용합니다. 이 쿠키를 거부하거나 삭제하면 로그인 상태를 유지할 수 없습니다. 임베드된 YouTube 플레이어도 쿠키 또는 유사 기술을 설치할 수 있으며, 브라우저 설정으로 거부할 경우 YouTube 영상 재생 등 일부 기능 이용에 제약이 있을 수 있습니다.',
  ],
  ['11. 개인정보 보호책임자', '개인정보 관련 문의는 contact@syfity.site로 해주세요.'],
  [
    '12. 방침의 변경',
    '법령·정책 또는 보안기술의 변경에 따라 방침을 수정하는 경우 변경된 내용을 서비스 화면에 게시하고, 별도 고지가 필요한 경우 관련 법령에 따릅니다.',
  ],
];

export default function PrivacyPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/4 size-125 rounded-full bg-primary/5 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 size-105 rounded-full bg-accent/5 blur-[120px]"
      />
      <Header variant="app" logoHref="/" />
      <main className="relative mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="text-3xl font-bold">개인정보처리방침</h1>
        <div className="mt-10 space-y-8">
          {sections.map(([title, content]) => (
            <section key={title}>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{content}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm leading-7 text-muted-foreground">
          <a className="text-primary underline" href="https://www.google.com/policies/privacy">
            Google 개인정보처리방침
          </a>
          과{' '}
          <a
            className="text-primary underline"
            href="https://security.google.com/settings/security/permissions"
          >
            Google 계정 보안 설정
          </a>
          을 참고하세요.
        </p>
      </main>
      <Footer />
    </div>
  );
}
