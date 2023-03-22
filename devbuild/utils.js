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
const StreamZip = require('node-stream-zip');
const fs = require('fs-extra');
const path = require('path');

/**
 * Executes a command
 *
 * @param {*} cmd
 * @returns
 */
function executeCmd(cmd, workingDir, logger){
    let options = null;
    if(workingDir){
        options = {'cwd': workingDir}
    }
    options?options['maxBuffer']= 2048 * 2048:{'maxBuffer': 2048 * 2048};
    return new Promise((resolve, reject) => {
        let cm = exec(cmd, options, (error, stdout, stderr) => {
            if(error){
                reject(error);
            }else{
                resolve(workingDir);
            }
        });

        cm.stdout.on('data', dat=>{
            console.log(dat);
        });

        cm.stderr.on('data', dat=>{
            console.log(dat);
        });
    });
}

/**
 *
 *
 * @param {String} zipPath
 * @param {String} extractLocation
 * @returns
 */
function unzip(zipPath, extractLocation, log){
    return new Promise(async (resolve, reject) => {
       
        let exists = await fs.pathExists(zipPath);
        if(exists){
            const lz_zip = new StreamZip({
                file: zipPath,
                storeEntries: true
            });
            lz_zip.on('ready',  async() => {
                lz_zip.extract(null, path.resolve(extractLocation), (err, count) => {
                    log?log.i(err ? 'Extract error' : `Extracted ${count} entries`):null;
                    lz_zip.close();
                    resolve();
                });
            });
        }else{
            resolve();
        }
    })
}

module.exports = {
    executeCmd,
    unzip
}
