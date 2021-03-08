/* eslint-disable no-extra-parens */
/* eslint-disable fp/no-let */
/* eslint-disable immutable/no-let */
/* eslint-disable fp/no-mutation */
/* eslint-disable fp/no-throw */
/* eslint-disable no-undefined */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-magic-numbers */
/* eslint-disable fp/no-nil */
/* eslint-disable import/group-exports */
/* eslint max-classes-per-file: ["error", 2] */

/**
 *
 **/
export class Compensate {
  static from(measurement, calibration) {
    if(measurement.type === '2xy') { return Compensate.from_2xy(measurement, calibration) }
    if(measurement.type === '6xy') { return Compensate.from_6xy(measurement, calibration) }
    if(measurement.type === '3xy') { return Compensate.from_3xy(measurement, calibration) }

    throw new Error('unknown measurement type: ' + measurement.type)
  }

  static from_3xy(measurement, calibration) {
    const t = Compensate.temperature_3xy(measurement.adcT, calibration.T)
    return {
      // ...measurement,
      ...Compensate.sensortime(measurement.sensortime),
      temperature: t,
      pressure: Compensate.pressure_3xy(measurement.adcP, t.tlin, calibration.P)
    }
  }

  static sensortime(sensortime) {
    if(sensortime === undefined) { return undefined }
    return {
      sensortime: sensortime
      // date: how?
    }
  }

  static temperature_3xy(adcT, caliT) {
    const [T1, T2, T3] = caliT
    /*
    const data1 = adcT - (256 * T1);
    const data2 = data1 * T2;
    const data3 = (data1 * data1) * T3;
    const t_lin = ((data2 * 262144) + data3) / 4294967296;

    const c = (t_line * 25 ) / 16384;
    */

    const data1 = adcT - T1
    const data2 = data1 * T2
    const t_lin = data2 + (data1 * data1) * T3
    const c = t_lin

    return { adc: adcT, tlin: t_lin, C: c }
  }

  static pressure_3xy(adcP, tlin, caliP) {
    const [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11] = caliP

    const data1 = P6 * tlin
    const data2 = P7 * (tlin * tlin)
    const data3 = P8 * (tlin * tlin * tlin)
    const out1 = P5 + data1 + data2 + data3

    const data4 = P2 * tlin
    const data5 = P3 * (tlin * tlin)
    const data6 = P4 * (tlin * tlin * tlin)
    const out2 = adcP * (P1 + data4 + data5 + data6)

    const data7 = adcP * adcP
    const data8 = P9 + P10 * tlin
    const data9 = data7 * data8
    const data10 = data9 + (adcP * adcP * adcP) * P11

    const press = out1 + out2 + data10

    return { adc: adcP, tlin: tlin, Pa: press }
  }

  static from_6xy(measurement, calibration) {
    const t = Compensate.temperature_6xy(measurement.adcT, calibration.T)
    return {
      temperature: t,
      pressure: Compensate.pressure_6xy(measurement.adcP, t.Tfine, calibration.P),
      humidity: Compensate.humidity_6xy(measurement.adcH, t.Tfine, calibration.H),
      gas: Compensate.gas_6xy(measurement.adcG, calibration.G)
    }
  }

  static temperature_6xy(adcT, caliT) {
    if(adcT === false) { return { adc: false, skip: true } }

    if(caliT.length !== 3) { return { adc: adcT, skip: true, calibration: caliT.length } }
    const [T1, T2, T3] = caliT

    function tfloat() {
      const var1f = (adcT / 16384.0 - T1 / 1024.0) * T2
      const var2f = (adcT / 131072.0 - T1 / 8192.0) * (adcT / 131072.0 - T1 / 8192.0) * T3
      const Tfinef = var1f + var2f
      const cf = Tfinef / 5120.0

      return [ cf, Tfinef ]
    }

    // eslint-disable-next-line no-unused-vars
    function tint() {
      const var1i = (adcT >> 3) - (T1 << 1)
      const var2i = (var1i * T2) >> 11
      const tmpi = ((var1i >> 1) * (var1i >> 1)) >> 12
      const var3i = (tmpi * (T3 << 4)) >> 14
      const Tfinei = var2i + var3i
      const ci = (Tfinei * 5 + 128) >> 8

      return [ci, Tfinei]
    }

    const [fC, fTfine] = tfloat()

    return { adc: adcT, C: fC, Tfine: fTfine }
  }

  static pressure_6xy(adcP, Tfine, caliP) {
    if(adcP === false) { return { adc: false, skip: true } }

    if(caliP.length !== 10) { return { skip: true, calibration: caliP.length } }
    const [ P1, P2, P3, P4, P5, P6, P7, P8, P9, P10 ] = caliP

    function pfloat() {
      let var1 = (Tfine / 2.0) - 64000.0
      let var2 = var1 * var1 * (P6 / 131072.0)
      var2 = var2 + (var1 * P5 * 2.0)
      var2 = (var2 / 4.0) + (P4 * 65536.0)
      var1 = (((P3 * var1 * var1) / 16384.0) + (P2 * var1)) / 524288.0
      var1 = (1.0 + (var1 / 32768.0)) * P1

      let pressure_hPa = 0

      if(var1 !== 0) {
        let p = 1048576.0 - adcP
        p = ((p - (var2 / 4096.0)) * 6250.0) / var1
        var1 = (P9 * p * p) / 2147483648.0
        var2 = p * (P8 / 32768.0)
        const var3 = (p / 256.0) * (p / 256.0) * (p / 256.0) * (P10 / 131072.0)
        p = p + (var1 + var2 + var3 + (P7 * 128.0)) / 16
        pressure_hPa = p / 100
      }
      return pressure_hPa * 100
    }

    const fPa = pfloat()

    return { adc: adcP, Pa: fPa, Tfine: Tfine }
  }

  static humidity_6xy(adcH, Tfine, caliH) {
    if(adcH === false) { return { adc: false, skip: true } }

    if(caliH.length !== 7) { return { skip: true, calibration: caliH.length } }
    const [H1, H2, H3, H4, H5, H6, H7] = caliH

    function hfloat() {
      const temp_comp = Tfine / 5120.0
      const var1 = adcH - ((H1 * 16.0) + ((H3 / 2.0) * temp_comp))
      const var2 = var1 * (
        (
          (H2 / 262144.0) *
          (1.0 +
            ((H4 / 16384.0) * temp_comp) +
            ((H5 / 1048576.0) * temp_comp * temp_comp)
          )
        )
      )
      const var3 = H6 / 16384.0
      const var4 = H7 / 2097152.0
      const unclamped = var2 + ((var3 + (var4 * temp_comp)) * var2 * var2)
      const hum = Math.min(Math.max(unclamped, 0), 100) // clamp(0, 100)
      return [ hum, unclamped ]
    }

    const [hum, raw] = hfloat()

    return { adc: adcH, percent: hum, Hunclamped: raw, skip: false }
  }

  static gas_6xy(adcG, caliG) {
    if(adcG === false) { return { adc: false, skip: true } }

    const Gg = caliG.G
    if(Gg.length !== 3) { return { skip: true, calibration: Gg.length } }
    // const [ g1, g2, g3 ] = Gg

    function gfloat() {
      const lookup1 = [
        0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, -0.8, 0.0, 0.0, -0.2, -0.5, 0.0, -1.0, 0.0, 0.0
      ]

      const lookup2 = [
        0.0, 0.0, 0.0, 0.0, 0.1, 0.7, 0.0, -0.8, -0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
      ]

      const var1 = (1340.0 + (5.0 * caliG.range_switching_error))
      const var2 = var1 * (1.0 + (lookup1[adcG.range] / 100.0))
      const var3 = 1.0 + (lookup2[adcG.range] / 100.0)
      // eslint-disable-next-line max-len
      const calc_gas_res = 1.0 / (var3 * (0.000000125) * (1 << adcG.range) * ((((adcG.resistance) - 512.0) / var2) + 1.0))
      return calc_gas_res
    }

    const ohms = gfloat()

    return { adc: adcG, Ohm: ohms, skip: !adcG.stable, stable: adcG.stable }
  }

  static from_2xy(measurement, calibration) {
    const ct = Compensate.temperature(measurement.adcT, calibration.T)
    const Tfine = ct.skip ? false : ct.Tfine
    const cp = Compensate.pressure(measurement.adcP, Tfine, calibration.P)
    const ch = Compensate.humidity(measurement.adcH, Tfine, calibration.H)

    return {
      temperature: ct,
      pressure: cp,
      humidity: ch
    };
  }

  static temperature(adcT, caliT) {
    if(adcT === false) { return { adc: false, skip: true } }

    if(caliT.length !== 3) { return { skip: true, calibration: caliT.length } }
    const [dig_T1, dig_T2, dig_T3] = caliT

    // console.log(T, dig_T1, dig_T2, dig_T3);
    if(dig_T1 === undefined) { return { undef: 't1' } }
    if(dig_T2 === undefined) { return { undef: 't2' } }
    if(dig_T3 === undefined) { return { undef: 't3' } }

    const var1f = (adcT / 16384.0 - dig_T1 / 1024.0) * dig_T2
    const var2f = (adcT / 131072.0 - dig_T1 / 8192.0) * (adcT / 131072.0 - dig_T1 / 8192.0) * dig_T3
    const finef = var1f + var2f
    const cf = finef / 5120.0

    return {
      skip: false,
      adc: adcT,
      Tfine: finef,
      C: cf
    }
  }


  static pressure(adcP, Tfine, caliP) {
    if(adcP === false) { return { skip: true, adc: false } }
    if(Tfine === false) { return { skip: true, Tfine: false } }

    if(caliP.length !== 9) { return { skip: true, calibration: caliP.length } }
    const [ dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9 ] = caliP

    let pvar1 = Tfine / 2 - 64000
    let pvar2 = pvar1 * pvar1 * dig_P6 / 32768
    pvar2 = pvar2 + pvar1 * dig_P5 * 2
    pvar2 = pvar2 / 4 + dig_P4 * 65536
    pvar1 = (dig_P3 * pvar1 * pvar1 / 524288 + dig_P2 * pvar1) / 524288
    pvar1 = (1 + pvar1 / 32768) * dig_P1

    let pressure_hPa = 0

    if(pvar1 !== 0) {
      let p = 1048576 - adcP
      p = ((p - pvar2 / 4096) * 6250) / pvar1
      pvar1 = dig_P9 * p * p / 2147483648
      pvar2 = p * dig_P8 / 32768
      p = p + (pvar1 + pvar2 + dig_P7) / 16
      pressure_hPa = p / 100
    }
    return { adc: adcP, Pa: pressure_hPa * 100 }
  }

  static humidity(adcH, Tfine, caliH) {
    if(adcH === false) { return { skip: true, adc: false } }
    if(Tfine === false) { return { skip: true, Tfine: false } }

    if(caliH.length !== 6) { return { skip: true, calibration: caliH.length } }
    const [ dig_H1, dig_H2, dig_H3, dig_H4, dig_H5, dig_H6 ] = caliH

    if(Tfine === undefined) { return { undef: 'Tfine' } }
    if(dig_H1 === undefined) { return { undef: 'h1' } }
    if(dig_H2 === undefined) { return { undef: 'h2' } }
    if(dig_H3 === undefined) { return { undef: 'h3' } }
    if(dig_H4 === undefined) { return { undef: 'h4' } }
    if(dig_H5 === undefined) { return { undef: 'h5' } }
    if(dig_H6 === undefined) { return { undef: 'h6' } }

    const var1 = Tfine - 76800.0
    // eslint-disable-next-line max-len
    const var2 = (adcH - (dig_H4 * 64.0 + dig_H5 / 16384.0 * var1)) * (dig_H2 / 65536.0 * (1.0 + dig_H6 / 67108864.0 * var1 * (1.0 + dig_H3 / 67108864.0 * var1)))

    const var3 = var2 * (1.0 - dig_H1 * var2 / 524288.0)
    const h = Math.min(Math.max(var3, 0), 100) // clamp(0, 100)

    return {
      adc: adcH,
      Hunclamped: var3,
      percent: h
    }
  }
}

export class AltComp {
  static fivdiCompensate(raw, coefficients) {
    return AltComp.compensateRawData(raw, coefficients)
  }
  static compensateTemperature(adcT, coef) {
    const c = { t1: coef[0], t2: coef[1], t3: coef[2] }
    return ((adcT / 16384 - c.t1 / 1024) * c.t2) +
      ((adcT / 131072 - c.t1 / 8192) * (adcT / 131072 - c.t1 / 8192) * c.t3)
  }

  static compensateHumidity(adcH, tFine, coef) {
    const c = {
      h1: coef[0],
      h2: coef[1],
      h3: coef[2],
      h4: coef[3],
      h5: coef[4],
      h6: coef[5]
    };

    let h = tFine - 76800
    h = (adcH - (c.h4 * 64 + c.h5 / 16384 * h)) *
      (c.h2 / 65536 * (1 + c.h6 / 67108864 * h * (1 + c.h3 / 67108864 * h)))
    h = h * (1 - c.h1 * h / 524288)

    if(h > 100) {
      h = 100
    } else if(h < 0) {
      h = 0
    }

    return h
  }

  static compensatePressure(adcP, tFine, coef) {
    const c = {
      p1: coef[0],
      p2: coef[1],
      p3: coef[2],
      p4: coef[3],
      p5: coef[4],
      p6: coef[5],
      p7: coef[6],
      p8: coef[7],
      p9: coef[8]
    }

    let var1 = tFine / 2 - 64000
    let var2 = var1 * var1 * c.p6 / 32768
    var2 = var2 + var1 * c.p5 * 2
    var2 = (var2 / 4) + (c.p4 * 65536)
    var1 = (c.p3 * var1 * var1 / 524288 + c.p2 * var1) / 524288
    var1 = (1 + var1 / 32768) * c.p1

    if(var1 === 0) {
      return 0 // avoid exception caused by division by zero
    }

    let p = 1048576 - adcP
    p = (p - (var2 / 4096)) * 6250 / var1
    var1 = c.p9 * p * p / 2147483648
    var2 = p * c.p8 / 32768
    p = p + (var1 + var2 + c.p7) / 16

    return p
  }

  static compensateRawData(rawData, coefficients) {
    const tFine = AltComp.compensateTemperature(rawData.adcT, coefficients.T)
    let pressure = AltComp.compensatePressure(rawData.adcP, tFine, coefficients.P)
    const humidity = AltComp.compensateHumidity(rawData.adcH, tFine, coefficients.H)

    const temperature = tFine / 5120
    pressure = pressure / 100

    return {
      adc: rawData,
      temperature, pressure, humidity
    }
  }

  static skyCompensate(raw, calib) {
    const adc_T = raw.adcT
    const adc_P = raw.adcP
    const adc_H = raw.adcH


    const dig_T1 = calib.T[0]
    const dig_T2 = calib.T[1]
    const dig_T3 = calib.T[2]

    const dig_P1 = calib.P[0]
    const dig_P2 = calib.P[1]
    const dig_P3 = calib.P[2]
    const dig_P4 = calib.P[3]
    const dig_P5 = calib.P[4]
    const dig_P6 = calib.P[5]
    const dig_P7 = calib.P[6]
    const dig_P8 = calib.P[7]
    const dig_P9 = calib.P[8]

    const dig_H1 = calib.H[0]
    const dig_H2 = calib.H[1]
    const dig_H3 = calib.H[2]
    const dig_H4 = calib.H[3]
    const dig_H5 = calib.H[4]
    const dig_H6 = calib.H[5]

    // Temperature (temperature first since we need t_fine for pressure and humidity)
    //
    const tvar1 = ((((adc_T >> 3) - (dig_T1 << 1))) * dig_T2) >> 11
    const tvar2  = (((((adc_T >> 4) - dig_T1) * ((adc_T >> 4) - dig_T1)) >> 12) * dig_T3) >> 14
    const t_fine = tvar1 + tvar2

    const temperature_C = ((t_fine * 5 + 128) >> 8) / 100

    // Pressure
    //
    let pvar1 = t_fine / 2 - 64000
    let pvar2 = pvar1 * pvar1 * dig_P6 / 32768
    pvar2 = pvar2 + pvar1 * dig_P5 * 2
    pvar2 = pvar2 / 4 + dig_P4 * 65536
    pvar1 = (dig_P3 * pvar1 * pvar1 / 524288 + dig_P2 * pvar1) / 524288
    pvar1 = (1 + pvar1 / 32768) * dig_P1

    let pressure_hPa = 0

    if(pvar1 !== 0) {
      let p = 1048576 - adc_P
      p = ((p - pvar2 / 4096) * 6250) / pvar1
      pvar1 = dig_P9 * p * p / 2147483648
      pvar2 = p * dig_P8 / 32768
      p = p + (pvar1 + pvar2 + dig_P7) / 16

      pressure_hPa = p / 100
    }

    // Humidity
    //
    let h = t_fine - 76800
    h = (adc_H - (dig_H4 * 64 + dig_H5 / 16384 * h)) *
        (dig_H2 / 65536 * (1 + dig_H6 / 67108864 * h * (1 + dig_H3 / 67108864 * h)))
    h = h * (1 - dig_H1 * h / 524288)

    const humidity = (h > 100) ? 100 : (h < 0 ? 0 : h)

    return {
      temperature_C, humidity, pressure_hPa
    }
  }

  static agsysCompensate(raw, calib) {
    const adc_T = raw.adcT
    const adc_P = raw.adcP
    const adc_H = raw.adcH

    const dig_T1 = calib.T[0]
    const dig_T2 = calib.T[1]
    const dig_T3 = calib.T[2]

    const dig_P1 = calib.P[0]
    const dig_P2 = calib.P[1]
    const dig_P3 = calib.P[2]
    const dig_P4 = calib.P[3]
    const dig_P5 = calib.P[4]
    const dig_P6 = calib.P[5]
    const dig_P7 = calib.P[6]
    const dig_P8 = calib.P[7]
    const dig_P9 = calib.P[8]

    const dig_H1 = calib.H[0]
    const dig_H2 = calib.H[1]
    const dig_H3 = calib.H[2]
    const dig_H4 = calib.H[3]
    const dig_H5 = calib.H[4]
    const dig_H6 = calib.H[5]

    // temperature
    let var1 = ((((adc_T >> 3) - (dig_T1 << 1))) * dig_T2) >> 11
    let var2 = (((((adc_T >> 4) - dig_T1) * ((adc_T >> 4) - dig_T1)) >> 12) * dig_T3) >> 14
    const t_fine = var1 + var2

    // humidity
    var1 = t_fine - 76800
    var1 = (adc_H - (dig_H4 * 64 + dig_H5 / 16384 * var1)) *
      (dig_H2 / 65536 * (1 + dig_H6 / 67108864 * var1 * (1 + dig_H3 / 67108864 * var1)))
    var1 = var1 * (1 - dig_H1 * var1 / 524288)

    let hum = (var1 > 100) ? 100 : (var1 < 0 ? 0 : var1)
    hum = Math.round(hum * 10) / 10

    // pressure
    var1 = t_fine / 2 - 64000
    var2 = var1 * var1 * dig_P6 / 32768
    var2 = var2 + var1 * dig_P5 * 2
    var2 = var2 / 4 + dig_P4 * 65536
    var1 = (dig_P3 * var1 * var1 / 524288 + dig_P2 * var1) / 524288
    var1 = (1 + var1 / 32768) * dig_P1

    // need to avoid division by zero
    let pressure_hPa  = NaN // uh oh, we must be in deep space

    if(var1 !== 0) {
      let p = 1048576 - adc_P
      p = ((p - var2 / 4096) * 6250) / var1
      var1 = dig_P9 * p * p / 2147483648
      var2 = p * dig_P8 / 32768
      p = (p + (var1 + var2 + dig_P7) / 16) / 100

      // if (this.device.elevation > 0) {
      //     p = this._seaLevelPressure(p);
      // }

      pressure_hPa = Math.round(p * 100) / 100
    }

    //
    return {
      humidity: hum,
      temperature_C: Math.round(((t_fine * 5 + 128) >> 8) / 10) / 10,
      tfine: t_fine,
      pressure_hPa: pressure_hPa
    }
  }
}
