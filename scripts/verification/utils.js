/*
 * Licensed Materials - Property of IBM
 *
 * 5725-M39
 *
 * (C) Copyright IBM Corp. 2020 All Rights Reserved
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with
 * IBM Corp.
 */

const { exec } = require('child_process');
var semver = require('semver');


/**
 * Executes a command
 *
 * @param {*} cmd
 * @returns
 */
function executeCmd(cmd, workingDir, log) {
    let options = null;
    if (workingDir) {
        options = { 'cwd': workingDir }
    }
    options ? options['maxBuffer'] = 2048 * 2048 : { 'maxBuffer': 2048 * 2048 };
    return new Promise((resolve, reject) => {
        let cm = exec(cmd, options, (error, stdout, stderr) => {
            if (error) {
                if(log)
                    log.e(error)
                reject(error);
            } else {
                if (log)
                    log.i(stdout)
                resolve(stdout);
            }

            cm.stdout.on('data', dat=>{
                
                //logger.emitLog("info", dat);
            });
    
            cm.stderr.on('data', dat=>{
                //log?log.e(null, null, dat): console.log(dat)
                //logger.emitLog("error", dat);
            });
        });
    });
}


function isSupportedVersion(actualVersion, expectedMinVersion, expectedMaxVersion) {
    let minValid = false;
    let maxValid = false;
    actualVersion = padVersions(actualVersion);
    if (expectedMinVersion) {
        expectedMinVersion = padVersions(expectedMinVersion);
        minValid = semver.gte(actualVersion, expectedMinVersion)
    }

    if (expectedMaxVersion) {
        expectedMaxVersion = padVersions(expectedMaxVersion);
        maxValid = semver.lte(actualVersion, expectedMaxVersion);
    } else {
        maxValid = true;
    }

    return minValid && maxValid;
}

function padVersions(version) {
    return version.split('.').length < 3 ? version + '.0' : version
}

module.exports = {
    executeCmd,
    isSupportedVersion
}
