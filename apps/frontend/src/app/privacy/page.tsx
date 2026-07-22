const sections = [
  [
    '1. 개인정보의 처리 목적',
    '회원 가입·관리, Room 생성·참여·재생목록·채팅 제공, 부정 이용 방지와 서비스 안정 운영을 위해 개인정보를 처리합니다.',
  ],
  [
    '2. 처리하는 개인정보 항목',
    'Google 계정에서 이메일·닉네임·프로필 사진을 받고, 서비스 이용 중 설정한 닉네임·프로필 사진·Room 참여 기록·재생목록 영상 정보·채팅 메시지를 처리합니다. 로그인 유지 목적으로 Google OAuth Refresh Token을 자동 수집합니다.',
  ],
  [
    '3. 처리 및 보유 기간',
    '회원 정보는 탈퇴 시까지 보유하고 탈퇴 시 식별할 수 없는 형태로 처리합니다. YouTube Data API로 취득한 제목·채널명·썸네일·길이 등 메타데이터는 최소 30일마다 갱신하거나 재생 불가 상태로 전환합니다.',
  ],
  [
    '4. 제3자 제공',
    '동의 없이 제공하지 않는 것을 원칙으로 하나 Google LLC(YouTube 포함)에 로그인 인증, 영상 재생·검색 결과 제공 및 Google 자체 서비스 개선·보안 목적으로 이메일, 닉네임, 프로필 사진, 서비스 이용 중 주고받는 정보를 제공합니다. 보유·이용 기간은 Google 자체 정책에 따릅니다.',
  ],
  [
    '5. 처리 위탁',
    '현재 별도 개인정보 처리 위탁은 없으며, Google/YouTube 제공은 위탁이 아닌 제3자 제공입니다.',
  ],
  [
    '6. 국외 이전',
    '이전 항목은 Google 로그인으로 받는 이메일·닉네임·프로필 사진과 YouTube 임베드·검색 이용 시 주고받는 정보입니다. 미국 소재 Google LLC(또는 YouTube, LLC)에 로그인 시 및 이용 중 실시간 네트워크 전송되며, 로그인 인증·영상 재생·검색 결과 제공 및 Google 자체 서비스 개선·보안에 이용됩니다. Google 계정 로그인이 필수이므로 이전 거부 시 서비스를 이용할 수 없습니다.',
  ],
  [
    '7. 정보주체의 권리와 행사',
    '이용자는 열람·정정·삭제·처리정지를 요청할 수 있습니다. 계정 설정의 계정 삭제 기능으로 직접 요청할 수 있으며 요청일로부터 7일 이내 처리합니다. Google 연결 권한은 Google 계정 보안 설정에서 철회할 수 있습니다. 만 14세 미만은 서비스 이용이 제한됩니다.',
  ],
  [
    '8. 개인정보의 파기',
    '목적 달성 또는 보유기간 경과 시 지체 없이 파기합니다. 탈퇴 시 이메일·닉네임·프로필 사진은 즉시 식별 불가능한 형태로 전환되고 개인 재생목록은 삭제됩니다. 공유 Room·채팅 기록은 익명화 형태로 유지될 수 있습니다.',
  ],
  [
    '9. 안전성 확보조치',
    '접근 권한 최소화와 접근 기록 관리, OAuth 인증 사용, HTTPS 전송 구간 암호화를 적용합니다.',
  ],
  [
    '10. 쿠키 등 자동 수집 장치',
    '임베드된 YouTube 플레이어는 쿠키 또는 유사 기술을 설치할 수 있습니다. 브라우저 설정으로 거부할 수 있으나 YouTube 영상 재생 등 일부 기능 이용에 제약이 있을 수 있습니다.',
  ],
  ['11. 개인정보 보호책임자', '개인정보 관련 문의는 contact@syfity.site로 해주세요.'],
  ['12. 방침의 변경', '법령·정책·보안기술 변경 시 시행 7일 전부터 서비스 내 공지로 알립니다.'],
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold">개인정보처리방침</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        정식 출시 전 변호사 검토가 필요한 초안입니다.
      </p>
      <div className="mt-10 space-y-8">
        {sections.map(([title, content]) => (
          <section key={title}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{content}</p>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm leading-7 text-muted-foreground">
        <a className="text-primary underline" href="http://www.google.com/policies/privacy">
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
  );
}
