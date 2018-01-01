let assert = require('chai').assert;
let bunyan = require('bunyan');
let integration = require('./integration');

describe('IBM QRadar Integration', () => {
    let options = {
        username: 'mocha',
        password: 'test',
        url: 'https://localhost:5555'
    };

    before(() => {
        let logger = bunyan.createLogger({name: 'Mocha Test'});
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
});
