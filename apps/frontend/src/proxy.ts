import { NextResponse, type NextRequest } from 'next/server';

import { isMockingEnabled } from '@/shared/lib/env';

export function proxy(request: NextRequest) {
  // 이 Edge 단계는 실제 access_token 쿠키 존재 여부만으로 판단하므로, mock 로그인처럼
  // 쿠키 없이 진행하는 흐름은 여기서 전부 걸러진다. mock 모드에서는 이 체크를 건너뛴다.
  if (isMockingEnabled()) {
    return;
  }

  const hasToken = request.cookies.has('access_token');
  const { pathname, search, searchParams } = request.nextUrl;

  // refresh까지 실패한 무효 세션은 layout(404)·apiClient(refresh 만료)가 ?reauth=1로 신호를 준다.
  // RSC/클라는 httpOnly 쿠키를 못 지우므로, 지울 수 있는 여기서 지우고 깨끗한 /login을 렌더한다.
  if (hasToken && searchParams.has('reauth')) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  // 토큰이 있으면(만료 여부 무관) 로그인 유저로 보고 진입 페이지 → home.
  // access가 만료됐어도 보호 페이지에서 클라 apiClient가 refresh로 되살린다(자동로그인).
  if (hasToken && (pathname === '/' || pathname === '/login')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // 토큰이 아예 없을 때만 보호 페이지를 막는다(원래 경로를 returnUrl로 보존).
  if (
    !hasToken &&
    (pathname === '/home' ||
      pathname === '/onboarding' ||
      pathname === '/settings' ||
      pathname.startsWith('/room') ||
      pathname.startsWith('/playlists'))
  ) {
    const url = new URL('/login', request.url);
    url.searchParams.set('returnUrl', pathname + search);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/home',
    '/onboarding',
    '/settings',
    '/room/:path*',
    '/playlists/:path*',
  ],
};
