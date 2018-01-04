#!/usr/bin/env node

let watch = require('node-watch');
let client = require('scp2');
let NodeSsh = require('node-ssh');
let ssh = new NodeSsh();
let readline = require('readline');
let reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

reader.question('Polarity server username > ', (USERNAME) => {
    reader.question('Polarity server password > ', (PASSWORD) => {
        console.log('Watch sever started');
        watch('.', { recursive: true }, (eventType, filename) => {
            if (filename.indexOf('.git') !== -1) {
                return;
            }

            console.log('Change detected: ' + filename);

            client.scp(filename, {
                username: USERNAME,
                password: PASSWORD,
                host: 'dev.polarity',
                path: '/app/polarity-server/integrations/qradar'
            }, (err) => {
                if (err) {
                    console.error('Failed to sync change for ' + filename + ', error was: ' + err);
                    return;
                }

                ssh.connect({
                    host: 'dev.polarity',
                    username: USERNAME,
                    password: PASSWORD
                })
                    .then(() => {
                        return ssh.exec('service polarityd restart');
                    })
                    .catch((err) => {
                        if (err && err.message === 'Redirecting to /bin/systemctl restart polarityd.service') {
                            return;
                        }

                        throw err;
                    })
                    .then(() => {
                        console.log('Change synced: ' + filename);
                    })
                    .catch((err) => {
                        if (err) {
                            console.error('Failed to restart polarity server, error was: ' + err);
                        }
                    });
            });
        });
    });
});