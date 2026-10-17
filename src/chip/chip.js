/** biome-ignore-all lint/performance/noAwaitInLoops: used in detect */
import { bme280 } from './bme280.js'
import { bme680 } from './bme680.js'
import { bme688 } from './bme688.js'
import { bmp38x } from './bmp38x.js'
import { bmp58x } from './bmp58x.js'
import { bmp280 } from './bmp280.js'
import { bmp390 } from './bmp390.js'
import { bmp585 } from './bmp585.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { GenericChip } from './generic.js'  */

/** @typedef {'2xx'|'3xx'|'5xx'|'6xx'} ChipKind */


export const REGISTER_ID_D0 = 0xD0
export const REGISTER_ID_00 = 0x00
export const REGISTER_ID_01 = 0x01

export const REGISTER_REV_01 = 0x01
export const REGISTER_REV_02 = 0x02
export const REGISTER_REV_F0 = 0xF0

/**
 * @typedef {Object} ChipInfo
 * @property {string} name
 * @property {number} idReg
 * @property {number} [idMask]
 * @property {number} id
 * @property {number|undefined} revReg
 * @property {number|undefined} rev
 *
 * @property {typeof GenericChip} chip
 */

/** @type {Array<ChipInfo>} */
export const Ahoy = [
	// BMP 2xx
	{ name: 'bmp280', idReg: REGISTER_ID_D0, id: 0x58,               revReg: undefined,       rev: undefined, chip: bmp280 },
	// BMP 3xx
	{ name: 'bmp38x', idReg: REGISTER_ID_00, id: 0x50, idMask: 0xF0, revReg: undefined,       rev: undefined, chip: bmp38x },
	{ name: 'bmp390', idReg: REGISTER_ID_00, id: 0x60, idMask: 0xF0, revReg: REGISTER_REV_01, rev: 0x01,      chip: bmp390 },
	// BMP 5xx
	{ name: 'bmp58x', idReg: REGISTER_ID_01, id: 0x50,               revReg: REGISTER_REV_02, rev: 0x32,      chip: bmp58x },
	{ name: 'bmp585', idReg: REGISTER_ID_01, id: 0x51,               revReg: REGISTER_REV_02, rev: 0x32,      chip: bmp585 },

	//
	// BME 2xx
	{ name: 'bme280', idReg: REGISTER_ID_D0, id: 0x60,               revReg: undefined,       rev: undefined, chip: bme280 },
	// BME 6xx
	{ name: 'bme680', idReg: REGISTER_ID_D0, id: 0x61,               revReg: undefined,       rev: undefined, chip: bme680 },
	{ name: 'bme688', idReg: REGISTER_ID_D0, id: 0x61,               revReg: REGISTER_REV_F0, rev: 0x01,      chip: bme688 },

]


/**
 * @param {I2CAddressedBus} bus
 * @param {number} reg
 */
export async function readRegister(bus, reg) {
	const aBuffer = await bus.readI2cBlock(reg, 1)
	const u8 = ArrayBuffer.isView(aBuffer) ?
		new Uint8Array(aBuffer.buffer, aBuffer.byteOffset) :
		new Uint8Array(aBuffer)

	return u8[0]
}

/**
 * @param {I2CAddressedBus} bus
 * @param {number} reg
 * @returns {Promise<ChipInfo|undefined>}
 */
export async function _detect(bus, reg) {
	const regValue = await readRegister(bus, reg)
	// console.log('detect', reg, regValue)

	// todo when filter for valid id match, take into account the idMask
	const potentials = Ahoy.filter(c => c.idReg === reg && c.id === regValue)
	// console.log('potentials', potentials)

	// nothing matches, sorry
	if(potentials.length === 0) { return undefined }

	// one match only, skip rev and return
	if(potentials.length === 1 && potentials[0] !== undefined) {

		// todo, if this chip has a rev, it could be an unsupported version
		//  const revValue = await readRegister(bus, potentials[0].revReg)
		//  if(potentials[0].rev !== revValue) { // unsupported maybe ? }
		return potentials[0]
	}

	// multiple potentials, check rev
	const revRegs = new Set(potentials.map(c => c.revReg).filter(c => c !== undefined))

	// no rev difference, unable to pick
	if(revRegs.size === 0) {
		console.warn('multiple chips with no rev difference')
		return undefined
	}

	// single discriminator, thats nice
	if(revRegs.size === 1) {
		const [ revReg ] = revRegs
		if(revReg === undefined) {
			console.warn('undefined rev register error')
			return undefined
		}
		const revValue = await readRegister(bus, revReg)
		// console.log('detect', reg, regValue, revReg, revValue)

		// filter on match or where the rev is undefined and read a zero
		//  this assumes that the chips rev address for older chip is a
		//  reserved address and returns zeros (maybe)
		const potentialRevisions = potentials.filter(c => (c.rev === revValue) || (c.rev === undefined && revValue === 0))

		// no revision matches
		if(potentialRevisions.length === 0) {
			console.warn('multiple chips but no matching rev')
			return undefined
		}

		if(potentialRevisions.length === 1) {
			return potentialRevisions[0]
		}

		// there are multiple chips with multiple matching revisions - what?
		console.warn('multiple chips with multiple matching revisions')
		return undefined
	}

	console.warn('multiple chips with multiple rev regs, not implemented yet')
	return undefined
}

export class Chip {
	/**
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<typeof GenericChip|undefined>}
	 */
	static async detect(bus) {
		const idRegisters = new Set(Ahoy.map(c => c.idReg))
		for(const idReg of idRegisters) {
			const chipInfo = await _detect(bus, idReg)
			if(chipInfo !== undefined) { return chipInfo.chip }
		}

		return undefined
	}
}
