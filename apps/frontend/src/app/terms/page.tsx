import Link from 'next/link';

const sections = [
  [
    '제1조 (목적)',
    '이 약관은 Syfity(이하 서비스)가 제공하는 실시간 그룹 음악 청취 서비스의 이용과 관련한 권리, 의무 및 책임사항을 정합니다.',
  ],
  [
    '제2조 (정의)',
    '서비스는 이용자가 Room을 만들거나 참여하여 YouTube 기반 재생목록을 함께 청취하도록 제공하는 서비스이며, Room은 이용자가 함께 음악을 청취하기 위해 만드는 가상 공간입니다.',
  ],
  [
    '제3조 (약관의 효력 및 변경)',
    '서비스는 화면 게시 또는 공지로 약관의 효력을 발생시키며, 법령에 어긋나지 않는 범위에서 변경할 수 있습니다. 변경 시 적용일과 사유를 7일 전부터, 불리한 변경은 30일 전부터 공지합니다.',
  ],
  [
    '제4조 (서비스의 제공)',
    '서비스는 Room 생성·참여, YouTube 영상 검색과 재생목록 구성, 실시간 재생 동기화 및 Room 채팅을 제공합니다. 운영·기술상 필요에 따라 내용이 변경될 수 있습니다.',
  ],
  [
    '제5조 (이용계약)',
    '서비스는 Google OAuth 로그인으로만 이용계약을 체결하며, 만 14세 미만은 이용할 수 없습니다. 최초 로그인 뒤 닉네임 설정과 약관·개인정보처리방침 동의를 완료해야 합니다.',
  ],
  [
    '제6조 (제3자 서비스 이용 — YouTube)',
    '서비스는 YouTube API 서비스를 이용합니다. 이용자는 YouTube 서비스 약관의 적용을 받으며, 개인정보 처리 내용은 개인정보처리방침에서 안내합니다. Room에 참여하면 호스트의 재생·일시정지·곡 변경에 따라 이용자 화면에서도 재생이 자동으로 시작될 수 있으며, 이용자는 이 약관 동의로 이에 동의합니다. 영상 재생 가능 여부와 광고 노출은 YouTube 정책 및 영상 소유자 설정에 따릅니다.',
  ],
  [
    '제7조 (연령 확인)',
    '서비스는 만 14세 미만 아동을 대상으로 하지 않습니다. 이용자는 최초 로그인 시 만 14세 이상임을 확인해야 하며, 허위 확인 시 서비스는 필요한 조치를 취할 수 있습니다.',
  ],
  [
    '제8조 (이용자의 의무)',
    '이용자는 타인 계정 도용, 운영 방해, 저작권 등 타인 권리 침해, 관련 법령과 약관에서 금지한 행위를 해서는 안 됩니다.',
  ],
  [
    '제9조 (계약 해지)',
    '이용자는 계정 설정 화면에서 언제든 계정 삭제를 요청할 수 있습니다. 개인정보 처리와 삭제는 개인정보처리방침에 따르며, 약관 위반 시 서비스는 이용을 제한할 수 있습니다.',
  ],
  [
    '제10조 (책임의 제한)',
    '천재지변 등 불가항력으로 서비스를 제공할 수 없는 경우 서비스의 책임은 면제됩니다. 서비스는 이용자 또는 YouTube 등 제3자가 제공한 콘텐츠의 내용에 책임지지 않습니다.',
  ],
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold">이용약관</h1>
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
      <p className="mt-10 text-sm text-muted-foreground">
        YouTube 이용에는{' '}
        <a className="text-primary underline" href="https://www.youtube.com/t/terms">
          YouTube 서비스 약관
        </a>
        이 적용됩니다.{' '}
        <Link className="text-primary underline" href="/privacy">
          개인정보처리방침
        </Link>
      </p>
    </main>
  );
}
