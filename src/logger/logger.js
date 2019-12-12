const winston = require('winston');

const { format } = winston;
const {
  colorize,
  combine,
  label,
  printf,
  splat,
  timestamp
} = format;

const myFormat = printf(({
  // eslint-disable-next-line no-shadow
  level, message, label, timestamp
}) => `${timestamp} [${label}] ${level}: ${message}`);

class Logger {

  static getLogger(category) {
    winston.loggers.add(category, {
      format: combine(
        label({ label: category }),
        timestamp(),
        colorize(),
        splat(),
        myFormat
      ),
      transports: [
        new winston.transports.Console({ level: 'debug' })
      ]
    });
    return winston.loggers.get(category);
  }

}

module.exports = Logger;
