const config = require('./config/config');
const QRadar = new require('./qradar-api');
const fs = require('fs');

let Logger;
let caContents;
let certContents;

const PRIVATE_IPS = ['0.0.0.0', '255.255.255.255', '127.0.0.1'];

function doLookup(entities, options, callback) {
  let api = new QRadar(
    {
      username: options.username,
      password: options.password,
      secToken: options.secToken,
      ca: caContents,
      cert: certContents,
      host: options.url
    },
    Logger
  );

  Logger.trace({ entities: entities }, 'Entities received by integration');

  let candidates = entities
    .filter((entity) => entity.isIP)
    .filter((entity) => !(options.ignorePrivateIps && PRIVATE_IPS.includes(entity.value)));

  let ips = candidates.map((entity) => entity.value);
  let entityByIp = entities.reduce((accum, next) => {
    accum[next.value] = {
      entity: next,
      data: {
        summary: [], // we add tags via a custom summary block
        details: []
      }
    };
    return accum;
  }, {});

  Logger.trace('Getting offense from QRadar API', { entityByIp: entityByIp });

  api.getOffenses(ips, { severity: options.minimumSeverity, openOnly: options.openOnly }, (err, offenses) => {
    if (err) {
      Logger.error({ error: err, ips: ips }, 'Error getting offense for ips');
      callback(err);
      return;
    }

    let results = [];

    Logger.trace({ candidates: offenses }, 'Got response from API');

    offenses.forEach((offense) => {
      if (!offense) {
        // Filter out undefined entries where QRadar filtered the response
        return;
      }

      if (!entityByIp[offense.offense_source]) {
        // Do nothing
        return;
      }
      offense._link = `${options.url}/console/qradar/jsp/QRadar.jsp?appName=Sem&noBTrail=true&pageId=OffenseAttackerList&summaryId=${offense.id}`;
      entityByIp[offense.offense_source].data.details.push(offense);
    });

    for (let k in entityByIp) {
      let result = entityByIp[k];

      if (result.data.details.length == 0) {
        result.data = null;
      }

      results.push(result);
    }

    Logger.trace({ results: results });

    callback(null, results);
  });
}

function startup(logger) {
  Logger = logger;

  if (typeof config.request.cert === 'string' && config.request.cert.length > 0) {
    certContents = fs.readFileSync(config.request.cert);
  }

  if (typeof config.request.ca === 'string' && config.request.ca.length > 0) {
    caContents = fs.readFileSync(config.request.ca);
  }
}

function validateOption(errors, options, optionName, errMessage) {
  if (
    typeof options[optionName].value !== 'string' ||
    (typeof options[optionName].value === 'string' && options[optionName].value.length === 0)
  ) {
    errors.push({
      key: optionName,
      message: errMessage
    });
  }
}

function validateOptions(options, callback) {
  let errors = [];

  const hasUsername = options.username.value.length > 0;
  const hasPassword = options.password.value.length > 0;
  const hasToken = options.secToken.value.length > 0;

  validateOption(errors, options, 'url', 'You must provide a valid host for the IBM QRadar server.');

  if (!hasUsername && !hasPassword && !hasToken) {
    errors.push({
      key: 'username',
      message:
        'You must provide either a Username and Password, or a Security Token for authentication with the IBM QRadar server, .'
    });

    errors.push({
      key: 'password',
      message:
        'You must provide either a Username and Password, or a Security Token. for authentication with the IBM QRadar server.'
    });

    errors.push({
      key: 'secToken',
      message:
        'You must provide either a Security Token, or a Username and Password for authentication with the IBM QRadar server.'
    });
  }

  if ((hasUsername || hasPassword) && hasToken) {
    errors.push({
      key: 'username',
      message: 'Provide a Username and Password, or a Security Token, but not both.'
    });

    errors.push({
      key: 'password',
      message: 'Provide a Username and Password, or a Security Token, but not both.'
    });

    errors.push({
      key: 'secToken',
      message: 'Provide a Username and Password, or a Security Token, but not both.'
    });
  }

  // Return any combo errors and exit early before testing single options to prevent duplicate
  // error messages on the same field.
  if (errors.length > 0) {
    return callback(null, errors);
  }

  if (hasUsername && !hasPassword) {
    errors.push({
      key: 'password',
      message: 'A valid Password is required with a Username.'
    });
  }

  if (!hasUsername && hasPassword) {
    errors.push({
      key: 'username',
      message: 'A valid Username is required with a Username.'
    });
  }

  callback(null, errors);
}

module.exports = {
  doLookup,
  startup,
  validateOptions
};
