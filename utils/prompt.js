const PromptBase = require('prompt-base');
const PromptPass = require('prompt-password');

class Prompt {

  promptFor(message, name) {
    const prompt = new PromptBase({
      message: message,
      name: name
    });
    return prompt.run();
  }

  promptForPass(message, name) {
    const prompt = new PromptPass({
      type: 'password',
      message: message,
      name: name
    });
    return prompt.run();
  }

}

module.exports = Prompt;
