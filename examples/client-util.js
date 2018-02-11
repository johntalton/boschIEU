"use strict";


class Util {
  static log(result) {
    // console.log(P, T, H);
    const P = result.pressure;
    const T = result.tempature;
    const H = result.humidity;

    console.log(device.sensor.chip.name + ' (' + device.bus.name + '):');
    if(device.sensor.chip.supportsPressure){
      if(P === undefined || P.skip === true) {
        console.log('\tPressure: ', 'Skipped');
      } else if(P.undef !== undefined) {
        console.log('\tPressue:', 'uncalibrated');
      } else {
        const altitudeFt = Converter.altitudeFromPressure(Converter.seaLevelPa, P.P);

        console.log('\tPressure (Pa):', Converter.trim(P.P), 
          '(inHg):', Converter.trim(Converter.pressurePaToInHg(P.P)));
        console.log('\tAltitude',
          '(ft):', Converter.trim(altitudeFt),
          '(m): ', Converter.trim(Converter.ftToMeter(altitudeFt)) );
      }
    }
    if(device.sensor.chip.supportsTempature){
      if(T === undefined || T.skip === true) {
        console.log('\tTempature:', 'Skipped');
      } else if(T.undef !== undefined) {
        console.log('\tTempature:', 'uncalibrated');
      } else {
        console.log('\tTempature: (c)', Converter.trim(T.T), '(F)', Converter.trim(Converter.ctof(T.T)));
      }
    }
    if(device.sensor.chip.supportsHumidity){
      if(H === undefined || H.skip === true) {
        console.log('\tHumidity: ', 'Skipped');
      } else if(T.undef !== undefined) {
        console.log('\tHumidity: ', 'uncalibrated');
      } else {
        console.log('\tHumidity:', Converter.trim(H.H));
      }
    }
    console.log();
  }

  static machine() {
    return {
      state: '1init',
      states: {
        '1init': {
          'some': { next: '2some', event: '' },
          'mqtt': { next: '5mqtt', event: '' },
          'dmqtt': { next: '1init', event: '' } }, // we know, thanks
        '2some': {
          'none': { next: '1init', event: '' },
          'some': { next: '2some', event: '' },
          'dsome': { next: '2some', event: '' },
          'all': { next: '3all', event: '' },
          'mqtt': { next: '6mqttsome', event: 'stream' },
          'dmqtt': { next: '2some', evnet: '' } }, // we know, thanks
        '3all': {
          'mqtt': { next: '4active', event: 'stream' },
          'dsome': { next: '2some', event: '' },
          'dmqtt': { next: '3all', evnet: '' } }, // we know, thanks
        '4active': {
          'dsome': { next: '6mqttsome', event: '' },
          'dmqtt': { next: '3all', evnet: 'stopstream' } },
        '5mqtt': {
          'some': { next: '6mqttsome', event: 'stream' },
          'dmqtt': { next: '1init', event: '' } },
        '6mqttsome': {
          'none': { next: '5mqtt', event: 'stopstream' },
          'some': { next: '6mqttsome', event: '' },
          'dsome': { next: '6mqttsome', event: '' },
          'all': { next: '4active', event: '' },
          'dmqtt': { next: '2some', event: 'stopstream' } }
      }
    };
  }
}

class State {
  static to(machine, state) {
    const transition = machine.states[machine.state][state];
    console.log('\u001b[91mtransition', machine.state, state, transition, '\u001b[0m');
    machine.state = transition.next;
    return transition.event;
  }
}

Util.State = State;
module.exports = Util;
