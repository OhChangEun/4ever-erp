/** key 와 value 를 가지는 선택 항목(드롭다운, 탭). 앱의 CommonType 은 이것을 다시 내보낸다 */
export interface KeyValueItem<T extends string | number = string> {
  key: T;
  value: string;
}
