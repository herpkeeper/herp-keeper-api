const commandLineArgs = require('command-line-args');

class CommandLine {

  constructor() {
    this.options = [
      { name: 'env', alias: 'e', type: String, defaultValue: 'dev' }
    ];
  }

  process() {
    return commandLineArgs(this.options);
  }

}

module.exports = CommandLine;
