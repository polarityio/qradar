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

  validateOption(errors, options, 'url', 'You must provide a valid host for the IBM QRadar server.');
  validateOption(
    errors,
    options,
    'username',
    'You must provide a valid username for authentication with the IBM QRadar server.'
  );
  validateOption(
    errors,
    options,
    'password',
    'You must provide a valid password for authentication with the IBM QRadar server.'
  );

  callback(null, errors);
}

module.exports = {
  doLookup: doLookup,
  startup: startup,
  validateOptions: validateOptions
};
