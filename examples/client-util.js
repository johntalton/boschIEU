/* eslint-disable max-classes-per-file */

import { Converter } from '@johntalton/boschieu'

export class Util {
  static bulkup(chip, raw) {
    const P = raw.pressure;
    const T = raw.temperature;
    const H = raw.humidity;
    const G = raw.gas;

    if(P === undefined) { console.log('odd P', raw); throw new Error('no P'); }
    if(T === undefined) { console.log('odd T', raw); throw new Error('no T'); }

    const result = { sensortime: raw.sensortime };

    if(chip.features.pressure) {
      if(P.skip !== undefined && P.skip) {
        result.pressure = { skip: true };
      } else {
        const inHg = Converter.pressurePaToInHg(P.Pa);
        const altFt = Converter.altitudeFromPressure(Converter.seaLevelPa, P.Pa);
        const altM = Converter.ftToMeter(altFt);

        result.pressure = { ...P, inHg: inHg };
        result.altitude = { Ft: altFt, M: altM };
      }
    }

    if(chip.features.temperature) {
      if(T.skip !== undefined && T.skip) {
        result.temperature = { skip: true };
      } else {
        const f = Converter.ctof(T.C);
        result.temperature = { ...T, F: f };
      }
    }

    if(chip.features.humidity) {
      if(H.skip !== undefined && H.skip) {
        result.humidity = { skip: true };
      } else {
        result.humidity = { ...H };
      }
    }

    if(chip.features.gas) {
      if(G.skip !== undefined && G.skip) {
        result.gas = { skip: true };
      } else {
        result.gas = { ...G };
      }
    }

    return result;
  }

  static log(device, result) {
    const P = result.pressure;
    const T = result.temperature;
    const H = result.humidity;
    const A = result.altitude;
    const G = result.gas;
    const sensortime = result.sensortime;
    //console.log(result);

    console.log('"' + device.name + '" (' + device.sensor.chip.name + ' @ ' + device.bus.name + '):');
    if(device.signature !== undefined) {
      console.log('\tsignature:', (device.signature !== null) ? device.signature : '(disabled)' );
    }

    if(device.sensor.chip.features.pressure) {
      if(P.skip) {
        console.log('\tPressure: skipped');
      } else {
        console.log('\tPressure (Pa):', Converter.trim(P.Pa), '(inHg):', Converter.trim(P.inHg));
        console.log('\tAltitude','(ft):', Converter.trim(A.Ft), '(m): ', Converter.trim(A.M));
      }
    }
    if(device.sensor.chip.features.temperature) {
      if(T.skip) {
        console.log('\tTemperature: skipped');
      } else {
        console.log('\tTemperature: (c)', Converter.trim(T.C), '(F)', Converter.trim(T.F));
      }
    }
    if(device.sensor.chip.features.humidity) {
      if(H.skip) {
        console.log('\tHumidity: skipped');
      } else {
        console.log('\tHumidity:', Converter.trim(H.percent), '%');
      }
    }
    if(device.sensor.chip.features.gas) {
      if(G.skip) {
        console.log('\tGas: skipped');
      } else {
        console.log('\tGas:', Converter.trim(G.Ohm), '(Ohm)');
      }
    }
    console.log();
  }

  static machine() {
    return {
      state: '1init',
      states: {
        '1init': {
          // none
          'some': { next: '2some', event: '' },
          // dsome
          'all': { next: '3all', event: '' },
          'mqtt': { next: '5mqtt', event: '' },
          'dmqtt': { next: '1init', event: '' } }, // we know, thanks
        '2some': {
          'none': { next: '1init', event: '' },
          'some': { next: '2some', event: '' },
          'dsome': { next: '2some', event: '' },
          'all': { next: '3all', event: '' },
          'mqtt': { next: '6mqttsome', event: 'stream' },
          'dmqtt': { next: '2some', event: '' } }, // we know, thanks
        '3all': {
          'none': { next: '1init', event: '' },
          // some
          'dsome': { next: '2some', event: '' },
          // all (becuase the providing layer can detect active
          // devices in a single reporting/event cycle, but it can
          // not detect (yet?) that all devices have reported, it
          // will send the `all` event for each repprting device
          // And thus, if all devices become active prior to the
          // async tick that checks for status and generates events,
          // the all message will be sent once for every device.
          'all': { next: '3all' },
          'mqtt': { next: '4active', event: 'stream' },
          'dmqtt': { next: '3all', event: '' } }, // we know, thanks
        '4active': { // streaming state
          'none': { next: '5mqtt', event: 'stopstream' },
          // some
          'dsome': { next: '6mqttsome', event: 'restopstream' },
          // all
          // mqtt
          'dmqtt': { next: '3all', event: 'stopstream' } },
        '5mqtt': {
          // none
          'some': { next: '6mqttsome', event: 'stream' },
          // dsome
          'all': { next: '4active', event: 'stream' },
          // mqtt
          'dmqtt': { next: '1init', event: '' } },
        '6mqttsome': { // streaming state
          'none': { next: '5mqtt', event: 'stopstream' },
          'some': { next: '6mqttsome', event: 'restream' },
          'dsome': { next: '6mqttsome', event: 'restopstream' },
          'all': { next: '4active', event: 'restream' },
          // mqtt
          'dmqtt': { next: '2some', event: 'stopstream' } }
      }
    };
  }
}

export class State {
  static to(machine, state) {
    const transition = machine.states[machine.state][state];
    console.log('\u001b[91mtransition', machine.state, state, transition, '\u001b[0m');

    const on = machine.ons[transition.event];
    if(on !== undefined) {
      try { on(); } catch (e) { console.log('machine callback error', e); }
    }

    machine.state = transition.next;
    return transition.event;
  }

  static on(machine, event, callback) {
    if(machine.ons === undefined) { machine.ons = {}; }
    machine.ons[event] = callback;
  }
}
