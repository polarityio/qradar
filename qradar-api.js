let request = require('request');
let async = require('async');
let config = require('./config/config');

class QRadar {
    constructor(options, logger) {
        this.options = options;
        this.logger = logger;
    }

    defaultRequestOptions() {
        return {
            json: true,
            auth: {
                username: this.options.username,
                password: this.options.password
            },
            ca: this.options.ca,
            cert: this.options.cert,
            method: 'GET',
            proxy: config.proxy,
            strictSSL: config.request.rejectUnauthorized
        }
    }

    getOffenses(ip, callback) {
        let options = this.defaultRequestOptions();
        options.uri = this.options.host + '/api/siem/source_addresses';
        options.qs = {
            filter: 'source_ip = "' + ip + '"'
        };

        let maskedOptions = JSON.parse(JSON.stringify(options));
        maskedOptions.auth.password = '********';
        this.logger.debug({ options: maskedOptions }, 'Request Options for Offense Search');

        let offenses = [];

        request(options, (err, response, source_addresses) => {
            async.each(source_addresses,
                (address, callback) => {
                    async.each(address.offense_ids, (id, callback) => {
                        let options = this.defaultRequestOptions();
                        options.url = this.options.host + '/api/siem/offenses/' + id, // TODO get all matching offenses

                            request(
                                options,
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
