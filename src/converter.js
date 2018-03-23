/**
 *
 */
class Converter {
  static reconstruct20bit(msb, lsb, xlsb) {
    // return  msb << 12 | lsb << 4 | xlsb >> 4;
    return ((msb << 8 | lsb) << 8 | xlsb) >> 4;
  }

  static configFromTimingFilter(timing, filter) {
    const spi3wire = 0; // TODO
    return (timing << 5) | (filter << 2) | spi3wire;
  }

  static ctrlMeasFromSamplingMode(osrs_p, osrs_t, mode){
    return (osrs_t << 5) | (osrs_p << 2) | mode;
  }

  static ctrlHumiFromSampling(osrs_h, spi_3w_int_en) {
    if(spi_3w_int_en === undefined) { spi_3w_int_en = false; }
    return (osrs_h & 0b111) | (spi_3w_int_en ? (0x01 << 6) : 0x00);
  }

  static fromConfig(config) {
    const t_sb = (config >> 5) & 0b111; // should be Zero on bme680
    const filter = (config >> 2) & 0b111;
    const spi3w_en = config & 0b01 === 0b01;
    return [t_sb, filter, spi3w_en];
  }

  static fromStatus(status) {
    const measuring = (status & 0b1000) === 0b1000; // Zero on bme680
    // todo const spi_mem_page = (status & );
    const im_update = (status & 0b0001) === 0b0001; // Zero on bme680
    return [measuring, im_update];
  }

  static fromMeasStatus(meas_status) {
    const new_data_0 = (meas_status & 0x80) === 0x80;
    const gas_measuring = (meas_status & 0x40) === 0x40;
    const measuring = (meas_status & 0x20) === 0x20;
    const gas_meas_index = meas_status & 0x0F;
    return [new_data_0, gas_measuring, measuring, gas_meas_index];
  }

  static fromControlMeasurment(control) {
    const osrs_t = (control >> 5) & 0b111;
    const osrs_p = (control >> 2) & 0b111;
    const mode = control & 0b11;
    return [osrs_p, osrs_t, mode];
  }

  static fromControlHumidity(control) {
    const spi_3w_int_en = (control & (0x01 << 6)) === (0x01 << 6)
    const osrs_h = control & 0b111;
    return [osrs_h, spi_3w_int_en];
  }




  static compensateP(chip, adcP, Tfine, dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9){
    let pvar1 = Tfine / 2 - 64000;
    let pvar2 = pvar1 * pvar1 * dig_P6 / 32768;
    pvar2 = pvar2 + pvar1 * dig_P5 * 2;
    pvar2 = pvar2 / 4 + dig_P4 * 65536;
    pvar1 = (dig_P3 * pvar1 * pvar1 / 524288 + dig_P2 * pvar1) / 524288;
    pvar1 = (1 + pvar1 / 32768) * dig_P1;

    let pressure_hPa = 0;

    if(pvar1 !== 0) {
      let p = 1048576 - adcP;
      p = ((p - pvar2 / 4096) * 6250) / pvar1;
      pvar1 = dig_P9 * p * p / 2147483648;
      pvar2 = p * dig_P8 / 32768;
      p = p + (pvar1 + pvar2 + dig_P7) / 16;
      pressure_hPa = p / 100;
    }
    return { P: pressure_hPa * 100 };
  }

  static XcompensateP(chip, adcP, Tfine, dig_P1, dig_P2, dig_P3, dig_P4, dig_P5, dig_P6, dig_P7, dig_P8, dig_P9){
    if(adcP === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true }; }
    if(Tfine === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true, proxy: true }; }
    if(Tfine === undefined){ return { undef: 'Tfine' }; }
    if(dig_P1 === undefined){ return { undef: 'p1' }; }
    if(dig_P2 === undefined){ return { undef: 'p2' }; }
    if(dig_P3 === undefined){ return { undef: 'p3' }; }
    if(dig_P4 === undefined){ return { undef: 'p4' }; }
    if(dig_P5 === undefined){ return { undef: 'p5' }; }
    if(dig_P6 === undefined){ return { undef: 'p6' }; }
    if(dig_P7 === undefined){ return { undef: 'p7' }; }
    if(dig_P8 === undefined){ return { undef: 'p8' }; }
    if(dig_P9 === undefined){ return { undef: 'p9' }; }

    const var1 = Tfine / 2.0 - 64000.0;

    if(var1 == 0){ return 0; }

    const var2 = var1 * var1 * dig_P6 / 32768.0;
    const var3 = var2 + var1 * dig_P5 * 2.0;
    const var4 = (var3 / 4.0) + (dig_P4 * 65536.0);

    const var5 = (dig_P3 * var1 * var1 / 524288.0 + dig_P2 * var1) / 524288.0;
    const var6 = (1.0 + var5 / 32768.0) * dig_P1;

    const p1 = 1048576.0 - adcP;
    const p2 = (p1 - (var4 / 4096.0)) * 6250.0 / var6;
    const p3 = dig_P9 * p2 * p2 / 2147483648.0;
    const p4 = p2 * dig_P8 / 32768.0;
    const p5 = p2 + (p3 + p4 + dig_P7) / 16.0;

    //console.log(dig_P9, p2 * p2);
    //console.log(var1, var2, var3, var4, var5, p1, p2, p3, p4, p5, p5/256.0);

    return { P: p5 }; //  / 256 
  }

  static compensateT(chip, T, dig_T1, dig_T2, dig_T3){
    // console.log(T, dig_T1, dig_T2, dig_T3);
    if(T === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true }; }
    if(dig_T1 === undefined){ return { undef: 't1' }; }
    if(dig_T2 === undefined){ return { undef: 't2' }; }
    if(dig_T3 === undefined){ return { undef: 't3' }; }

    const var1f = (T/16384.0 - dig_T1/1024.0) * dig_T2;
    const var2f = (T/131072.0 - dig_T1/8192.0) * (T/131072.0 - dig_T1/8192.0) * dig_T3;
    const finef = var1f + var2f;
    const cf = finef / 5120.0;

/*
    const var1i = (((T >> 3) - (dig_T1 << 1)) * dig_T2) >> 11;
    const var2i = ( (( ((T >> 4) - dig_T1) * ((T >> 4) - dig_T1) ) >> 12) * dig_T3 ) >> 14;
    const finei = var1i + var2i;
    const ci = ((finei * 5 + 128) >> 8) / 100;
*/

    // console.log(var1f, var2f, finef, cf);
    // console.log(var1i, var2i, finei, ci);

    return {
      Tfine: finef,
      T: cf
    };
  }

  static compensateH(chip, adcH, Tfine, dig_H1, dig_H2, dig_H3, dig_H4, dig_H5, dig_H6) {
    if(adcH === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true }; }
    if(Tfine === chip.SKIPPED_SAMPLE_VALUE) { return { skip: true, proxy: true }; }
    if(Tfine === undefined) { return { undef: 'Tfine' }; }
    if(dig_H1 === undefined) { return { undef: 'h1' }; }
    if(dig_H2 === undefined) { return { undef: 'h2' }; }
    if(dig_H3 === undefined) { return { undef: 'h3' }; }
    if(dig_H4 === undefined) { return { undef: 'h4' }; }
    if(dig_H5 === undefined) { return { undef: 'h5' }; }
    if(dig_H6 === undefined) { return { undef: 'h6' }; }

    const var1 = Tfine - 76800.0;
    const var2 = (adcH - (
                   dig_H4 * 64.0 + dig_H5 / 16384.0 * var1
                 )) *
                 (dig_H2 / 65536.0 * (
                   1.0 + dig_H6 / 67108864.0 * var1 * (
                     1.0 + dig_H3 / 67108864.0 * var1)
                 ));
    const var3 = var2 * (1.0 - dig_H1 * var2 / 524288.0);
    const h = Math.min(Math.max(var3, 0), 100); // clamp(0, 100)

    // console.log('compH', adcH, Tfine, var3, h);

    return {
      Hunclamped: var3,
      H: h
    };
  }

  static tempatureCTomA(tempatureC) {

  }

  static fromIdacHeatTomA(idac_head) {
    return (idac_head + 1) / 8;
  }



  static altitudeFromPressure(seaLevelPa, P){
    if(P === undefined){ return { undef: 'P' }; }

    // if((searLevelPa / Pa) >= (101325 / 5474.89) { throw new Error('excides max altitude'); }

    // return (1.0 - Math.pow(pressure_hPa / seaLevelPressure_hPa, (1 / 5.2553))) * 145366.45;

    const exp = 1 / 5.2553; // 0.1903
    const foo = (1.0 - Math.pow((P / 100.0) / (seaLevelPa / 100.0), exp)) * 145366.45;

    //console.log(seaLevelPa, P, exp, foo);
    return foo;
  }

  static pressurePaToInHg(Pa) {
    return Pa * (1 / 3386.389);
  }

  static ftToMeter(ft) {
    return ft / 3.2808
  }

  static dewPoint(T, H) {
    return T - ((100 - H) / 5);
  }

  static ctof(c) {
    if(c === undefined){ return undefined; }
    return c * (9/5.0) + 32;
  }

  static trim(f, p) {
    if(f === undefined){ return undefined; }
    return Math.round(f * 10000) / 10000;
  }

}

Converter.seaLevelPa = 101325.0; // a normal guess

module.exports = Converter;
