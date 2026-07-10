import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
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
  if (!hasToken && (pathname === '/home' || pathname.startsWith('/room'))) {
    const url = new URL('/login', request.url);
    url.searchParams.set('returnUrl', pathname + search);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/', '/login', '/home', '/room/:path*'],
};
