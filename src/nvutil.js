
/**
 * @template N
 * @typedef {Object} NVPair
 * @property {N} name
 * @property {number} value
 */

/**
 * @template N
 * @typedef {Array<NVPair<N>>} NVMap
 */

/**
 *
 */
export class NameValueUtil {
	/**
	 * @template N
	 * @param {number} value
	 * @param {NVMap<N>} nvmap
	 * @returns {N}
	 */
	static toName(value, nvmap) {
		const item = nvmap.find(i => i.value === value)
		if (item === undefined) { throw new Error('unknown nv value ' + value) }
		return item.name
	}

	/**
	 * @template N
	 * @param {N} name
	 * @param {NVMap<N>} nvmap
	 * @returns {number}
	 */
	static toValue(name, nvmap) {
		const item = nvmap.find(i => i.name === name)
		if (item === undefined) { throw new Error('unknown nv name: ' + name) }
		return item.value
	}
}
