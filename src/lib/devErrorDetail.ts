/**
 * 개발 모드에서 보일 원인 문구와 stack. V8(Chrome, Node)은 stack 첫 줄이 "Error: message" 라 stack 하나면 된다.
 * Safari, Firefox 의 stack 에는 message 가 없어 앞에 붙인다. 앱 층 경계와 화면 경계가 같이 쓴다.
 */
export const devErrorDetail = (error: Error): string => {
  const stack = error.stack ?? '';
  const firstLine = stack.split('\n')[0] ?? '';
  if (stack && firstLine.includes(error.message)) return stack;
  return [error.message, stack].filter(Boolean).join('\n');
};
