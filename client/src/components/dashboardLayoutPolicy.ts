export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 480;

export function resolveSidebarWidth(pointerX: number, sidebarLeft: number) {
  const width = Math.round(pointerX - sidebarLeft);
  return width >= SIDEBAR_MIN_WIDTH && width <= SIDEBAR_MAX_WIDTH ? width : null;
}
