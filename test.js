let assert = require('chai').assert;
let bunyan = require('bunyan');
let async = require('async');
let integration = require('./integration');
let QRadar = require('./qradar-api');
let config = require('./config/config');
config.request.rejectUnauthorized = false;

let qradar = new QRadar({}, {});

describe('IBM QRadar Integration', () => {
    let options = {
        username: 'mocha',
        password: 'test',
        url: 'https://localhost:5555'
    };

    before(() => {
        let logger = bunyan.createLogger({ name: 'Mocha Test' });
        integration.startup(logger);
    });

    it('should retrieve offenses by ip entities', (cb) => {
        integration.doLookup([{ isIP: true, value: '172.31.60.5' }], options, (err, result) => {
            if (!err) {
                assert.isNotEmpty(result);
            }

            cb(err);
        });
    });

    it('should handle ibm api errors gracefully', (done) => {
        let ipWithCorruptedData = '1.1.1.1';
        integration.doLookup([{ isIP: true, value: ipWithCorruptedData }], options, (err, result) => {
            assert.isOk(err);
            done();
        });
    });

    it('should batch ips in groups of 10', () => {
        assert.equal(1, qradar.getBatches([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).length);
        assert.equal(2, qradar.getBatches([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).length);
    })

    describe('user configuration options', () => {
        it('should pass valid options', (done) => {
            integration.validateOptions({
                url: { value: 'google.com' },
                username: { value: 'mocha' },
                password: { value: 'test' }
            }, (op, errs) => {
                assert.deepEqual(errs, []);
                done();
            });
        });

        it('should reject missing url', (done) => {
            integration.validateOptions({
                url: { value: '' },
                username: { value: 'mocha' },
                password: { value: 'test' }
            }, (op, errs) => {
                assert.deepEqual(errs, [{
                    key: 'url',
                    message: 'You must provide a valid host for the IBM QRadar server.'
                }]);
                done();
            });
        });

        it('should reject missing username', (done) => {
            integration.validateOptions({
                url: { value: 'google.com' },
                username: { value: '' },
                password: { value: 'test' }
            }, (op, errs) => {
                assert.deepEqual(errs, [{
                    key: 'username',
                    message: 'You must provide a valid username for authentication with the IBM QRadar server.'
                }]);
                done();
            });
        });

        it('should reject missing password', (done) => {
            integration.validateOptions({
                url: { value: 'google.com' },
                username: { value: 'mocha' },
                password: { value: '' }
            }, (op, errs) => {
                assert.deepEqual(errs, [{
                    key: 'password',
                    message: 'You must provide a valid password for authentication with the IBM QRadar server.'
                }]);
                done();
            });
        });

        it('collect multiple errors', (done) => {
            integration.validateOptions({
                url: { value: 'google.com' },
                username: { value: '' },
                password: { value: '' }
            }, (op, errs) => {
                assert.deepEqual(errs, [{
                    key: 'username',
                    message: 'You must provide a valid username for authentication with the IBM QRadar server.'
                }, {
                    key: 'password',
                    message: 'You must provide a valid password for authentication with the IBM QRadar server.'
                }]);
                done();
            });
        });

        it('should allow private ips to be ignored', (done) => {
            async.each(['0.0.0.0', '255.255.255.255', '127.0.0.1'], (ip, cb) => {
                let opts = JSON.parse(JSON.stringify(options));
                opts.ignorePrivateIps = true;
                integration.doLookup([{ isIP: true, value: ip }], opts, (err, result) => {
                    if (!err) {
                        assert.deepEqual(result, [{
                            entity: {
                                isIP: true,
                                value: ip
                            },
                            data: null
                        }]);
                    }

                    cb(err);
                });
            }, (err) => {
                done(err);
            });
        });

        describe('non-open issue filtering', (done) => {
            it('should show all issues when not filtering', (done) => {
                let opts = JSON.parse(JSON.stringify(options));
                opts.openOnly = false;
                integration.doLookup([{ isIP: true, value: '111.111.111.111' }], opts, (err, result) => {
                    if (!err) {
                        assert.equal(1, result.length);
                        assert.equal(result[0].data.details.length, 5);
                    }

                    done(err);
                });
            });

            it('should only show open issues when filtering', (done) => {
                let opts = JSON.parse(JSON.stringify(options));
                opts.openOnly = true;
                integration.doLookup([{ isIP: true, value: '111.111.111.111' }], opts, (err, result) => {
                    if (!err) {
                        assert.equal(1, result.length);
                        assert.equal(result[0].data.details.length, 1);
                    }

                    done(err);
                });
            });
        });

        describe('severity filtering', () => {
            it('should filter issues below a threshold', (done) => {
                let opts = JSON.parse(JSON.stringify(options));
                opts.minimumSeverity = 6;
                integration.doLookup([{ isIP: true, value: '111.111.111.111' }], opts, (err, result) => {
                    if (!err) {
                        assert.equal(1, result.length);
                        assert.equal(result[0].data.details.length, 4);
                    }

                    done(err);
                });
            });

            it('should return no results when all offenses are filtered', (done) => {
                let opts = JSON.parse(JSON.stringify(options));
                opts.minimumSeverity = 999;
                integration.doLookup([{ isIP: true, value: '111.111.111.111' }], opts, (err, result) => {
                    if (!err) {
                        assert.notOk(result[0].data);
                    }

                    done(err);
                });
            });
        });
    });
});
