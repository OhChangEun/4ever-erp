import type { Page } from '@playwright/test';

/** 잘린 곳 하나. 스펙의 기대값은 빈 목록이다 */
export interface Clipped {
  /** 잘라내는 요소: 태그와 클래스 앞 80자 */
  el: string;
  axis: 'y' | 'x';
  /** scrollHeight(또는 scrollWidth) */
  scroll: number;
  /** clientHeight(또는 clientWidth) */
  client: number;
  /** 안 보이는 길이(px) */
  hidden: number;
  /** 가장 많이 잘린 안쪽 요소 */
  what: string;
}

/**
 * "내용이 잘렸는데 볼 방법이 없는 곳"을 찾는다(카드 화면 아래가 잘리는 곳).
 *
 * 판정: overflow 가 hidden 이나 clip 인 요소의 scrollHeight 가 clientHeight 보다 4px 넘게 크고,
 * 넘친 안쪽 요소와 그 요소 사이에 스크롤 칸(overflow auto, scroll)이 없다. 가로도 같다.
 * 뺀 것: 글자 말줄임(text-overflow: ellipsis, line-clamp), 입력칸, svg 안(스파크라인, 차트),
 * 크기 1px 이하(sr-only, 접힌 사이드바 글자).
 * fixed 요소(모달, 사이드바, 팝오버)는 화면 밖으로 나가는지도 본다. 문서 스크롤로는 닿지 않는다.
 */
export const findClipped = (page: Page): Promise<Clipped[]> =>
  page.evaluate(() => {
    const TOLERANCE = 4;
    const found: Clipped[] = [];
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}.${String(el.getAttribute('class') ?? '').slice(0, 80)}`;
    const clips = (value: string) => value === 'hidden' || value === 'clip';
    const scrolls = (value: string) => value === 'auto' || value === 'scroll';
    const tiny = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width <= 1 || r.height <= 1;
    };

    // svg 안(스파크라인, 차트)과 개발 서버에만 뜨는 TanStack Query 개발 도구 버튼은 보지 않는다
    const skip = (el: Element) => el.closest('svg, .tsqd-parent-container') !== null;

    // 1) overflow 로 잘라내는 요소
    for (const el of document.querySelectorAll<HTMLElement>('body, body *')) {
      if (!(el instanceof HTMLElement) || skip(el)) continue;
      if (el.matches('input, textarea, select') || tiny(el)) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.textOverflow === 'ellipsis') continue;
      if (style.getPropertyValue('-webkit-line-clamp') !== 'none') continue;

      const rect = el.getBoundingClientRect();
      for (const axis of ['y', 'x'] as const) {
        const vertical = axis === 'y';
        const scroll = vertical ? el.scrollHeight : el.scrollWidth;
        const client = vertical ? el.clientHeight : el.clientWidth;
        if (!clips(vertical ? style.overflowY : style.overflowX)) continue;
        if (scroll <= client + TOLERANCE) continue;

        // 패딩 상자의 끝. 이 선을 넘은 안쪽 요소가 잘린다
        const edge = vertical
          ? rect.top + el.clientTop + el.clientHeight
          : rect.left + el.clientLeft + el.clientWidth;
        let hidden = 0;
        let what = '';
        let anyBeyond = false;
        for (const inner of el.querySelectorAll('*')) {
          const r = inner.getBoundingClientRect();
          const over = (vertical ? r.bottom : r.right) - edge;
          if (over <= TOLERANCE) continue;
          anyBeyond = true;
          const innerStyle = getComputedStyle(inner);
          if (tiny(inner) || innerStyle.visibility === 'hidden') continue;
          if (innerStyle.position === 'fixed') continue;
          // 사이에 스크롤 칸이 있으면 그 칸을 스크롤해 볼 수 있다
          let reachable = false;
          for (let p = inner.parentElement; p && p !== el; p = p.parentElement) {
            const ps = getComputedStyle(p);
            if (scrolls(vertical ? ps.overflowY : ps.overflowX)) {
              reachable = true;
              break;
            }
          }
          if (!reachable && over > hidden) {
            hidden = over;
            what = describe(inner);
          }
        }
        // 넘친 요소가 하나도 없으면 요소에 바로 든 글자가 넘친 것이다
        if (!anyBeyond) {
          hidden = scroll - client;
          what = '(글자)';
        }
        if (hidden > TOLERANCE) {
          found.push({ el: describe(el), axis, scroll, client, hidden: Math.round(hidden), what });
        }
      }
    }

    // 2) fixed 요소(모달, 사이드바, 팝오버)는 문서 스크롤로 닿지 않는다. 화면 밖으로 나간 부분이 있고
    //    그 사이에 스크롤 칸이 없으면 잘린 것이다
    for (const fixed of document.querySelectorAll<HTMLElement>('body *')) {
      if (!(fixed instanceof HTMLElement) || skip(fixed) || tiny(fixed)) continue;
      const fixedStyle = getComputedStyle(fixed);
      if (fixedStyle.position !== 'fixed' || fixedStyle.visibility === 'hidden') continue;
      for (const axis of ['y', 'x'] as const) {
        const vertical = axis === 'y';
        const limit = vertical ? window.innerHeight : window.innerWidth;
        let hidden = 0;
        let what = '';
        for (const inner of [fixed, ...fixed.querySelectorAll('*')]) {
          if (skip(inner) || tiny(inner)) continue;
          const r = inner.getBoundingClientRect();
          const over = Math.max(
            (vertical ? r.bottom : r.right) - limit,
            -(vertical ? r.top : r.left),
          );
          if (over <= TOLERANCE || over <= hidden) continue;
          if (getComputedStyle(inner).visibility === 'hidden') continue;
          let reachable = false;
          for (let p: Element | null = inner; p; p = p === fixed ? null : p.parentElement) {
            // 자기 자신이 스크롤 칸이면 안의 내용은 닿지만 칸 자체가 나간 부분은 못 본다
            if (p === inner) continue;
            const ps = getComputedStyle(p);
            if (scrolls(vertical ? ps.overflowY : ps.overflowX)) {
              reachable = true;
              break;
            }
          }
          if (!reachable) {
            hidden = over;
            what = describe(inner);
          }
        }
        if (hidden > TOLERANCE) {
          found.push({
            el: describe(fixed),
            axis,
            scroll: Math.round(limit + hidden),
            client: limit,
            hidden: Math.round(hidden),
            what: `${what} (화면 밖)`,
          });
        }
      }
    }
    return found;
  });

/**
 * 이중 스크롤: 실제로 스크롤되는 칸 안에 같은 방향으로 스크롤되는 칸이 또 있는 곳.
 * 바깥과 안쪽이 같이 움직이면 휠이 어느 쪽을 굴릴지 알 수 없다. 모달 안은 보지 않는다
 * (모달 본문이 스크롤 칸이고 안의 표가 따로 스크롤하는 것은 이 카드 전부터 있던 구조다).
 */
export const findNestedScroll = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}.${String(el.getAttribute('class') ?? '').slice(0, 80)}`;
    const scrollsOn = (el: Element, axis: 'y' | 'x') => {
      const style = getComputedStyle(el);
      const overflow = axis === 'y' ? style.overflowY : style.overflowX;
      const root = el === document.scrollingElement;
      if (!(overflow === 'auto' || overflow === 'scroll' || (root && overflow === 'visible')))
        return false;
      return axis === 'y'
        ? el.scrollHeight > el.clientHeight + 1
        : el.scrollWidth > el.clientWidth + 1;
    };
    const found: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('svg, .tsqd-parent-container, [role="dialog"]')) continue;
      for (const axis of ['y', 'x'] as const) {
        if (!scrollsOn(el, axis)) continue;
        for (let p = el.parentElement; p; p = p.parentElement) {
          if (scrollsOn(p, axis)) {
            found.push(`${axis}: ${describe(p)} > ${describe(el)}`);
            break;
          }
        }
      }
    }
    return found;
  });
