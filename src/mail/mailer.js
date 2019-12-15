const Email = require('email-templates');

const Logger = require('../logger/logger');

class Mailer {

  constructor(config) {
    this.log = Logger.getLogger('mail:mailer');
    this.config = config;
  }

  async send(to, template, locals) {
    this.log.debug(`Attempt to send email to ${to}`);

    // Create email
    const email = new Email({
      message: {
        from: this.config.get('email.from')
      },
      send: this.config.get('email.send'),
      preview: false,
      transport: this.config.get('email.transport')
    });

    /*email.preview =  {
      open: {
        app: 'firefox',
        wait: false
      }
    };*/

    const res = await email.send({
      template: template,
      message: {
        to: to
      },
      locals: locals
    });

    return res;
  }

}

module.exports = Mailer;
