
export class Util {
  /**
   * @param {number} start
   * @param {number} end
   */
  static range(start, end) {
    return [...Array.from({ length: end - start + 1 }, (_,i) => i + start) ]
  }
}
