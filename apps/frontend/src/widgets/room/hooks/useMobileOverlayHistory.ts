'use client';

import { useEffect, useRef } from 'react';

/**
 * 모바일 chat/members 오버레이가 열려있을 때 브라우저 히스토리에 더미 항목을 쌓아서,
 * 네이티브 뒤로가기를 누르면 페이지 이탈 대신 오버레이만 닫히게 한다.
 * 탭 클릭 등 다른 방식으로 닫힐 때는 쌓아둔 더미 항목을 직접 back()으로 정리해서
 * 히스토리가 밀리지 않게 한다(안 하면 이후 진짜 뒤로가기가 한 번 더 필요해짐).
 */
export function useMobileOverlayHistory(isOpen: boolean, onDismiss: () => void): void {
  const hasPushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    window.history.pushState({ overlay: true }, '');
    hasPushedRef.current = true;

    const handlePopState = () => {
      hasPushedRef.current = false;
      onDismiss();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDismiss는 항상 같은 동작(탭을 playlist로 되돌림)만 하므로 isOpen 변화에만 반응하면 된다
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !hasPushedRef.current) {
      return;
    }

    hasPushedRef.current = false;
    window.history.back();
  }, [isOpen]);
}
