/**
 *
 **/
export class Util {
  static range(from, to) { return [...Array(to - from + 1).keys()].map(i => i + from); }
}
