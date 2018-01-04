let request = require('request');
let async = require('async');

class QRadar {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    getOffenses(ip, callback) {
        let options = {
            uri: this.config.host + '/api/siem/source_addresses',
            method: 'GET',
            json: true,
            auth: {
                username: this.config.username,
                password: this.config.password
            },
            qs: {
                filter: 'source_ip = "' + ip + '"'
            },
            rejectUnauthorized: false
        };

        let maskedOptions = JSON.parse(JSON.stringify(options));
        maskedOptions.auth.password = '********';
        this.logger.debug({ options: maskedOptions }, 'Request Options for Offense Search');

        let offenses = [];

        request(options, (err, response, source_addresses) => {
            async.each(source_addresses,
                (address, callback) => {
                    async.each(address.offense_ids, (id, callback) => {
                        request(
                            {
                                uri: this.config.host + '/api/siem/offenses/' + id, // TODO get all matching offenses
                                method: 'GET',
                                json: true,
                                auth: {
                                    username: this.config.username,
                                    password: this.config.password
                                },
                                rejectUnauthorized: false
                            },
                            (err, response, offense) => {
                                if (!err && offense != null) {
                                    this.logger.trace({ responseBody: offense }, 'Offense lookup response body');
                                    offenses.push(offense);
                                }

                                if (err) {
                                    this.logger.error({ error: err }, 'Error during single offense lookup');
                                }

                                callback(err);
                            });
                    }, err => {
                        callback(err);
                    });
                },
                err => {
                    if (err) {
                        this.logger.error({ error: err }, 'Error during offenses lookup');
                    }
                    callback(err, offenses);
                });

        });
    }
}

module.exports = QRadar;
