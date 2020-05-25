
const COMMANDS = {
  path: '|',
  options: {
    //
    'mock': false
  },
  commands: {
    'i2c': { validState: true  },
    'detect': { },
    'fifo': { feature: 'fifo' },
    'profile': {
      commands: {
        'mode': {
          commands: {
            'sleep': { mode: 'SLEEP' }
          }
        },
      }
    },
    'run': {
      commands: {
        'gas': { },
        'observe': {},
        'worker': {}
      }
    }
  }
}

const result = process.argv.reduce((accumulator, currentValue, index) => {
  // console.log('reduce', accumulator, currentValue, index)

  // ignore first two arguments (node and script)
  if(index < 2) { return { ...accumulator, index }; }

  // if this is an options flag, then do not update the command
  // just set the flag and repeat
  if(accumulator.options[currentValue] !== undefined) {
    //console.log('options', currentValue);
    accumulator.options[currentValue] = true;
    return { ...accumulator  };
  }

  // currentValue references a commands that does not exist
  if(accumulator.commands[currentValue] === undefined) {
    return { ...accumulator, missingCommand: currentValue };
  }

  // if currentValue is a valid  commands, then we update commands context
  if(accumulator.commands[currentValue].commands === undefined) {
    return { options: accumulator.options, ...accumulator.commands[currentValue], path: accumulator.path + '>$' + currentValue };
  }

  // console.log('dig', currentValue);
  const options = accumulator.options;
  const commands = accumulator.commands[currentValue].commands;
  const path = accumulator.path + '>' + currentValue;

  return { options, commands, path };

}, COMMANDS);

console.log(result);
