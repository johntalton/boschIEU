/**
 *
 */
export class Util {
  /**
   * @param {number} start
   * @param {number} end
   */
  // static range(start, end) { return [...Array(end - start + 1).keys()].map(i => i + start) }
  static range(start, end) { return [...Array.from({ length: end - start + 1 }, (_,i) => i + start) ] }
  // static* range(start, end, step = 1) {
  //   for(let i = start; i <= end; i += step) {
  //     yield i
  //   }
  // }
}
