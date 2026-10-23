
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

export class NameValueUtil {
	/**
	 * @template N
	 * @param {number} value
	 * @param {NVMap<N>} nvMap
	 * @returns {N}
	 */
	static toName(value, nvMap) {
		const item = nvMap.find(i => i.value === value)
		if (item === undefined) { throw new Error(`unknown nv value ${value}`) }
		return item.name
	}

	/**
	 * @template N
	 * @param {N} name
	 * @param {NVMap<N>} nvMap
	 * @returns {number}
	 */
	static toValue(name, nvMap) {
		const item = nvMap.find(i => i.name === name)
		if (item === undefined) { throw new Error(`unknown nv name: ${name}`) }
		return item.value
	}
}
