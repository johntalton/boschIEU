import { BitSmush } from '@johntalton/bitsmush'

import { NameValueUtil } from '../nvutil.js'
import { reconstruct9bit, reconstruct24bit } from './bits.js'
import { bmp3xx, ODR_PRESCALER, OVERSAMPLES_3XX } from './bmp3xx.js'
import { enumMap } from './generic.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */
/** @import { Profile3xx } from '../types/profile.js' */

export class bmp38x extends bmp3xx {

  /**
	 * @override
	 */
	static get name() { return 'bmp38x' } // 384 388

	/**
	 * @override
	 * @param {I2CAddressedBus} bus
	 * @returns {Promise<Profile3xx>}
	 */
	static async profile(bus) {
		const {
			config,
			odr,
			osr,
			pwr_ctrl,
			if_conf,
			int_ctrl,
			fifo_config_2,
			fifo_config_1,
			fifo_wtm_1,
			fifo_wtm_0
		} = await bmp3xx._rawProfile(bus)

		//
		const iff_filter = BitSmush.extractBits(config, 3, 3)
		// const short_in = BitSmush.extractBits(config, 0, 1)
		const odr_sel = BitSmush.extractBits(odr, 4, 5)
		const osr_p = BitSmush.extractBits(osr, 2, 3)
		const osr_t = BitSmush.extractBits(osr, 5, 3)
		const mode = BitSmush.extractBits(pwr_ctrl, 5, 2)
		const temp_en = BitSmush.extractBits(pwr_ctrl, 1, 1)
		const press_en = BitSmush.extractBits(pwr_ctrl, 0, 1)
		const i2c_wdt_sel = BitSmush.extractBits(if_conf, 2, 1)
		const i2c_wdt_en = BitSmush.extractBits(if_conf, 1, 1)
		// const spi3 = BitSmush.extractBits(if_conf, 0, 1)
		const drdy_en = BitSmush.extractBits(int_ctrl, 6, 1)
		// const int_ds = BitSmush.extractBits(int_ctrl, 5, 1) // bmp390
		const ffull_en = BitSmush.extractBits(int_ctrl, 4, 1)
		const fwtm_en = BitSmush.extractBits(int_ctrl, 3, 1)
		const int_latch = BitSmush.extractBits(int_ctrl, 2, 1)
		const int_level = BitSmush.extractBits(int_ctrl, 1, 1)
		const int_od = BitSmush.extractBits(int_ctrl, 0, 1)
		const data_select = BitSmush.extractBits(fifo_config_2, 4, 2)
		const fifo_subsampling = BitSmush.extractBits(fifo_config_2, 2, 3)
		const fifo_temp_en = BitSmush.extractBits(fifo_config_1, 4, 1)
		const fifo_press_en = BitSmush.extractBits(fifo_config_1, 3, 1)
		const fifo_time_en = BitSmush.extractBits(fifo_config_1, 2, 1)
		const fifo_stop_on_full = BitSmush.extractBits(fifo_config_1, 1, 1)
		const fifo_mode = BitSmush.extractBits(fifo_config_1, 0, 1)
		const fifo_water_mark_8 = BitSmush.extractBits(fifo_wtm_1, 0, 1)
		const fifo_water_mark_7_0 = fifo_wtm_0

		//
		const fifo_watermark = reconstruct9bit(fifo_water_mark_8, fifo_water_mark_7_0)
		const intMode = modeFrom(int_od, int_level)

		return {
			mode: NameValueUtil.toName(mode, enumMap.modes),
			standby_prescaler: NameValueUtil.toName(odr_sel, ODR_PRESCALER),
			oversampling_p: press_en === PRESS_ENABLED ?
				NameValueUtil.toName(osr_p, OVERSAMPLES_3XX) : false,
			oversampling_t: temp_en === TEMP_ENABLED ?
				NameValueUtil.toName(osr_t, OVERSAMPLES_3XX) : false,
			filter_coefficient: NameValueUtil.toName(iff_filter, enumMap.filters),

			watchdog: i2c_wdt_en === WATCHDOG_ENABLED ?
				NameValueUtil.toName(i2c_wdt_sel, watchdogtimes) : false,

			interrupt: {
				mode: intMode,
				latched: int_latch === LATCHED,
				onFifoWatermark: fwtm_en === ONWATER_ENABLED,
				onFifoFull: ffull_en === ONFULL_ENABLED,
				onReady: drdy_en === ONREADY_ENABLED
			},
			fifo: {
				active: fifo_mode === FIFO.ENABLED,
				data: NameValueUtil.toName(data_select, dataselects),
				subsampling: fifo_subsampling,
				highWatermark: fifo_watermark,
				stopOnFull: fifo_stop_on_full === FIFO.FULL_STOP_ENABLED,
				temp: fifo_temp_en === FIFO.TEMP_ENABLED,
				press: fifo_press_en === FIFO.PRESS_ENABLED,
				time: fifo_time_en === FIFO.TIME_ENABLED
			}
		}
	}
}