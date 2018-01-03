let assert = require('chai').assert;
let bunyan = require('bunyan');
let async = require('async');
let integration = require('./integration');

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
            assert.isEmpty(result);
            done();
        });
    });

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
                        assert.isEmpty(result);
                    }

                    cb(err);
                });
            }, (err) => {
                done(err);
            });
        });
    });
});
