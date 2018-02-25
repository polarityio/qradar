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

    getOffenses(ips, callback) {
        let options = this.defaultRequestOptions();
        options.uri = this.options.host + '/api/siem/source_addresses';
        options.qs = {
            filter: 'source_ip in (' + ips.map(ip => `'${ip}'`).join(',') + ')'
        };

        let maskedOptions = JSON.parse(JSON.stringify(options));
        maskedOptions.auth.password = '********';
        this.logger.debug({ options: maskedOptions }, 'Request Options for Offense Search');

        let offenses = [];

        request(options, (err, response, source_addresses) => {
            if (err) {
                this.logger.error({ error: err }, 'Search returned error');
                callback(err);
                return;
            }

            async.each(source_addresses,
                (address, callback) => {
                    let ids = address.offense_ids
                        .reduce((accum, next) => accum.concat(next), []);

                    this.logger.trace({ ids: ids }, 'Looking up ids');

                    async.each(ids, (id, callback) => {
                        let options = this.defaultRequestOptions();
                        options.url = this.options.host + '/api/siem/offenses/' + id;
                        request(
                            options,
                            (err, response, offense) => {
                                if (err || response.statusCode !== 200) {
                                    this.logger.error({ error: err }, 'Error during single offense lookup');
                                    callback(err || new Error('request failed with status ' + response.statusCode));
                                    return;
                                }

                                this.logger.trace({ responseBody: offense }, 'Offense lookup response body');
                                offenses.push(offense);
                                callback(null);
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
