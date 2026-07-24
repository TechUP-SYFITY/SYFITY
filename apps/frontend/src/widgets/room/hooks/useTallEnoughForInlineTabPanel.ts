'use client';

// 헤더/상태바/호스트연결안내/플레이어처럼 모바일 탭(재생목록·멤버·채팅)을 오버레이로
// 띄울지 페이지 흐름 안에 그대로 보여줄지와 무관하게 항상 렌더링되는 chrome 영역의
// 실제 하단 Y좌표를 측정해서, 탭 콘텐츠가 답답하지 않게 보일 만큼 남는 공간이
// 있는지 계산한다.
//
// 뷰포트 전체 높이 기준(예: min-height: 900px) 대신 이 방식을 쓰는 이유: 그 값은
// "헤더+상태바+플레이어+예약된 하단 여백을 빼고도 목록이 여유 있게 보이는 뷰포트
// 높이"를 역산한 매직 넘버라, 위 UI 중 하나라도 크기가 바뀌면 같이 재계산해야 한다.
// 여기서는 chrome 영역의 실측 높이를 직접 빼므로 그럴 필요가 없다.
//
// chromeRef가 가리키는 요소는 탭이 오버레이인지 인라인인지와 무관하게 항상 동일하게
// 렌더링되어야 한다(예: 플레이어 슬롯) — 탭 콘텐츠 자신을 측정 기준으로 쓰면, 탭이
// 인라인일 때만 그 요소가 존재해서 판단이 판단 자신의 렌더링 결과에 영향을 받는
// 자기참조가 생긴다.
import { useEffect, useState, type RefObject } from 'react';

// 모바일 하단에 fixed로 항상 떠 있는 MiniPlayer(h-16=64px) + 탭 바(h-12=48px)가
// 차지하는 고정 공간. 둘 다 fixed라 flex 레이아웃 자체에는 공간을 남기지 않으므로
// 별도로 빼줘야 한다.
export const RESERVED_FOOTER_HEIGHT = 112;
// 탭 패널(재생목록·멤버·채팅) 오버레이가 화면 하단에 도킹되는 목표 높이.
export const TAB_PANEL_HEIGHT = 280;
// 모바일 브라우저는 스크롤 방향에 따라 주소창이 접혔다 펴지면서 window.innerHeight가
// 수시로 수십~100px 단위로 바뀐다. 단일 임계값 근처에서는 이 흔들림만으로도 인라인↔
// 오버레이가 계속 왔다갔다(덜컹거림)할 수 있어, 진입/이탈 임계값을 다르게 두는
// 진짜 히스테리시스(dead zone)를 쓴다: 한 번 인라인이 되면 공간이 꽤 줄어들어야
// 다시 오버레이로 돌아가고, 그 반대도 마찬가지다.
const TAB_PANEL_HEIGHT_BUFFER = 24;

export type InlineTabPanelSpace = {
  availableSpace: number;
  isTallEnough: boolean;
};

export function useTallEnoughForInlineTabPanel(
  chromeRef: RefObject<HTMLElement | null>,
): InlineTabPanelSpace {
  const [space, setSpace] = useState<InlineTabPanelSpace>({
    availableSpace: 0,
    isTallEnough: false,
  });

  useEffect(() => {
    const element = chromeRef.current;

    if (!element) {
      return undefined;
    }

    const measure = () => {
      const chromeBottom = element.getBoundingClientRect().bottom;
      const availableSpace = window.innerHeight - chromeBottom - RESERVED_FOOTER_HEIGHT;

      setSpace((previous) => {
        const threshold = previous.isTallEnough
          ? TAB_PANEL_HEIGHT - TAB_PANEL_HEIGHT_BUFFER
          : TAB_PANEL_HEIGHT + TAB_PANEL_HEIGHT_BUFFER;
        return {
          availableSpace: Math.max(0, availableSpace),
          isTallEnough: availableSpace >= threshold,
        };
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    window.addEventListener('resize', measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [chromeRef]);

  return space;
}
