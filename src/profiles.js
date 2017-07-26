const fs = require('fs');

function throwIfUndef(obj, msg) {
  if(obj === undefined){ throw new Error('undefined object:' + msg); }
  return obj;
}

/**
 * Profiles
 */
class Profiles {
 static load(filepath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filepath, 'utf8', function (err, data) {
        if(err){ reject(err); }
        //console.log('readFile', err, data);
        const json = JSON.parse(data);
        resolve(json);
      });
    }).then(json => {
      //console.log(json);
      Profiles._profiles = json;
      return json;
    });
  }

  static profile(name) {
    //console.log('searching for profile:', name, Profiles._profiles );
    return Profiles._profiles[name];
  }

  static chipProfile(jsonProfile, chip) {
    // console.log('chip profile from', jsonProfile);
    const m = Profiles.chipMode(jsonProfile.mode, chip);
    const p = Profiles.chipOversample(jsonProfile.oversampling_p, chip);
    const t = Profiles.chipOversample(jsonProfile.oversampling_t, chip);
    const h = Profiles.chipOversample(jsonProfile.oversampling_h, chip);
    const f = Profiles.chipCoefficient(jsonProfile.filter_coefficient, chip);
    const s = Profiles.chipStandby(jsonProfile.standby_time, chip);

    // console.log(m, p, t, h, f, s);

    return {
      mode: m,
      oversampling_p: p,
      oversampling_t: t,
      oversampling_h: h,
      filter_coefficient: f,
      standby_time: s
    };
  }

  static chipMode(mode, chip) {
    if(mode === undefined){ return undefined; }
    if(mode === 'SLEEP') {
      return chip.MODE_SLEEP;
    } else if(mode  === 'NORMAL') {
      return chip.MODE_NORMAL;
    } else if(mode === 'FORCED') {
      return chip.MODE_FORCED;
    }

    throw new Error('unknown mode: ' + mode);
  }

  static chipOversample(oversample, chip) {
    if(oversample === undefined){ return undefined; }
    switch(oversample){
    case false: return chip.OVERSAMPLE_SKIP; break;
    case 1: return chip.OVERSAMPLE_X1; break;
    case 2: return chip.OVERSAMPLE_X2; break;
    case 4: return chip.OVERSAMPLE_X4; break;
    case 8: return chip.OVERSAMPLE_X8; break;
    case 16: return chip.OVERSAMPLE_X16; break;
    default: throw new Error('unknown oversample: ' + oversample);
    }
  }

  static chipCoefficient(coefficient, chip) {
    if(coefficient === undefined){ return undefined; }
    switch(coefficient){
    case false: return chip.COEFFICIENT_OFF; break;
    case 2: return chip.COEFFICIENT_2; break;
    case 4: return chip.COEFFICIENT_4; break;
    case 8: return chip.COEFFICIENT_8; break;
    case 16: return chip.COEFFICIENT_16; break;
    default: throw new Error('unknown coefficient: ' + coefficient);
    }
  }

  static chipStandby(standby, chip) {
    if(standby === undefined){ return undefined; }
    switch(standby) {
    case true: return throwIfUndef(chip.STANDBY_MAX, 'Max');
    case false: return throwIfUndef(chip.STANDBY_MIN, 'Min');
    case 0.5: return throwIfUndef(chip.STANDBY_05, '0.5');
    case 10: return throwIfUndef(chip.STANDBY_10, '10');
    case 20: return throwIfUndef(chip.STANDBY_20, '20');
    case 62.5: return throwIfUndef(chip.STANDBY_62, '62');
    case 125: return throwIfUndef(chip.STANDBY_125, '125');
    case 250: return throwIfUndef(chip.STANDBY_250, '250');
    case 1000: return throwIfUndef(chip.STANDBY_1000, '1000');
    case 2000: return throwIfUndef(chip.STANDBY_2000, '2000');
    case 4000: return throwIfUndef(chip.STANDBY_4000, '4000');
    default: throw new Error('unknown standby: ' + standby);
    }
  }
}

module.exports = Profiles;
