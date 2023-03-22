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


const scriptutils = require('./utils.js');
const fs = require('fs-extra');
const path = require('path');


class PlatformBuild{
    
    constructor(platformLocation){
        this.platformDir = platformLocation;
        this.worklighLibDir = path.resolve(this.platformDir, 'anywhere-worklight-lib');
    }

    buildWorklightLib(){
        return scriptutils.executeCmd('npm run build:prod', this.worklighLibDir);
    }
    
    deployWorklightLib(destAppPath){
        let distributionLib = path.resolve(this.worklighLibDir, 'dist/anywhere-worklight.js');
        let destPath = path.resolve(destAppPath, 'common/js/anywhere-worklight.js');
        return fs.copy(distributionLib, destPath);
    }
    
    deployPlatform(destAppPath){
        const platformDir = path.resolve(this.platformDir, 'client-runtime/js/');
        const artifactsDir =  path.resolve(this.platformDir, 'client-runtime/miniapps/');
        const destPlatformLocation = path.resolve(destAppPath, 'common/js/');
        const destArtifactsDir = path.resolve(destAppPath, 'platform-artifacts/');
        return fs.copy(platformDir, destPlatformLocation).then(function(){
            return fs.copy(artifactsDir, destArtifactsDir);
        });
    }

}

module.exports = PlatformBuild;




