let async = require('async');
let config = require('./config/config');

let QRadar = new require('./qradar-api');

let Logger;

const PRIVATE_IPS = [
    '0.0.0.0',
    '255.255.255.255',
    '127.0.0.1'
];

function doLookup(entities, options, callback) {
    let api = new QRadar({
        username: options.username,
        password: options.password,
        host: options.url
    }, Logger);

    Logger.trace({ entities: entities }, 'Entities received by integration');

    let candidates = entities.filter(entity => entity.isIP);
    let results = [];

    async.each(candidates,
        (entity, callback) => {
            Logger.trace('Checking if entity is IP');

            if (!entity.isIP) {
                callback(null);
                return;
            }

            if (PRIVATE_IPS.includes(entity.value)) {
                callback(null);
                return;
            }

            Logger.trace('Getting offense from QRadar API');

            api.getOffenses(entity.value, (err, candidates) => {
                Logger.trace('Got response from API');
                let result;

                if (err) {
                    Logger.error({ error: err, ip: entity.value }, 'Error getting offense for ip');
                    callback(err);
                    return;
                }

                let offenses = [];

                candidates.forEach((candidate) => {
                    if (options.openOnly && candidate.status !== 'OPEN') {
                        return;
                    }

                    if (candidate.severity < options.minimumSeverity) {
                        return;
                    }

                    offenses.push(candidate);
                });

                if (offenses.length < 1) {
                    Logger.trace({ ip: entity.value }, 'No offenses match this ip');
                    callback(null);
                    return;
                }

                results.push({
                    entity: entity,
                    data: {
                        summary: ['test'],
                        details: offenses
                    }
                });

                callback(null);
            });
        },
        (err) => {
            Logger.trace({ results: results }, 'Results sent to client')
            callback(err, results);
        });
}

function startup(logger) {
    Logger = logger;
}

function validateOption(errors, options, optionName, errMessage) {
    if (typeof options[optionName].value !== 'string' ||
        (typeof options[optionName].value === 'string' && options[optionName].value.length === 0)) {
        errors.push({
            key: optionName,
            message: errMessage
        });
    }
}

function validateOptions(options, callback) {
    let errors = [];

    validateOption(errors, options, 'url', 'You must provide a valid host for the IBM QRadar server.');
    validateOption(errors, options, 'username', 'You must provide a valid username for authentication with the IBM QRadar server.');
    validateOption(errors, options, 'password', 'You must provide a valid password for authentication with the IBM QRadar server.');

    callback(null, errors);
}

module.exports = {
    doLookup: doLookup,
    startup: startup,
    validateOptions: validateOptions
};
