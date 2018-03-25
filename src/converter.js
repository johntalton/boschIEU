/**
 *
 */
class Converter {
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
