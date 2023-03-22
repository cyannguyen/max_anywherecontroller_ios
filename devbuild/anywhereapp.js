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


class AnywhereAppBuild{
    
    constructor(anywhereLocation, appToBuild){
        this.anywhereProjectDir = anywhereLocation;
        this.appToBuild = appToBuild;
    }

    runAppBuild(){
        const cmd = 'ant all-gen copy-worklight-properties-all-apps -f build.xml'
        return scriptutils.executeCmd(cmd, this.anywhereProjectDir);
    }
    
    
    deployZip(containerUnzipPath){
        const appDistPath = path.resolve(this.anywhereProjectDir, 'bin', this.appToBuild + '.zip');
        return scriptutils.unzip(appDistPath, containerUnzipPath);
    }

}

module.exports = AnywhereAppBuild;
