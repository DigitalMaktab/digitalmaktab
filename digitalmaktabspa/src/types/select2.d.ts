import "select2";

declare global {
  interface JQuery<TElement = HTMLElement> {
    select2: (options?: any) => JQuery<TElement>;
  }
}
