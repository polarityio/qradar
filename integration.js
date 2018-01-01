let async = require('async');
let config = require('./config/config');

let QRadar = new require('./qradar-api');

let Logger;

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

            if (entity.isIP) {
                Logger.trace('Getting offense from QRadar API');

                api.getOffenses(entity.value, (err, offense) => {
                    Logger.trace('Got response from API');
                    let result;

                    if (!err) {
                        Logger.trace('Response was ok');

                        if (offense.length > 0) {
                            results.push({
                                entity: entity,
                                data: {
                                    summary: [entity.value],
                                    details: offense
                                }
                            });
                        } else {
                            Logger.trace({ ip: entity.value }, 'No offenses match this ip');
                        }
                    } else {
                        Logger.error({ error: err, ip: entity.value }, 'Error getting offense for ip');
                    }

                    callback(err);
                });
            } else {
                callback(null);
            }
        },
        (err) => {
            Logger.trace({ results: results }, 'Results sent to client')
            callback(err, results);
        });
}

function startup(logger) {
    Logger = logger;
}

module.exports = {
    doLookup: doLookup,
    startup: startup
};
