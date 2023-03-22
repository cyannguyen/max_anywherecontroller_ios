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

const utils = require('../utils.js')
const path = require('path');
const { BINARY_OUTPUT_FOLDER } = require('../Constants.js')
const fs = require('fs-extra');

const BuildApp = require('./build-app.js');

const currDir = process.cwd();

class BuildAppIOS extends BuildApp {
    constructor(containerProps, createdAppDir, info, logger) {
        super(containerProps, createdAppDir, info, logger);
    }

    async build() {
        try{
            let cdvCommand = path.resolve(currDir + '/node_modules/cordova/bin/cordova');
            let isDevSim = this.info.ios.packageType.toLowerCase();
            let releaseMode = isDevSim === 'development' || isDevSim === 'simulator' ? null : this.info.ios.packageType.toLowerCase();
            let cmd = cdvCommand + ' build ios ';
            if(isDevSim !== 'simulator'){
                cmd += ' --device'
            
                cmd += releaseMode ? ' --release' : '';
                cmd += releaseMode ? ' --packageType=' + this.info.ios.packageType.toLowerCase() : '';
                cmd += ' --codeSignIdentity=' + (releaseMode ? '"iPhone Distribution"' : '"iPhone Developer"');
                //According to cordova docs above is not valid. To be tested for distribution
                //cmd += ' --codeSignIdentity="iPhone Developer"';
                cmd += ' --provisioningProfile=' + this.info.ios.provisioningProfile;
                cmd += ' --developmentTeam=' + this.info.ios.teamID;
                cmd += " --buildFlag='VALID_ARCHS=arm64 CURRENT_ARCH=arm64 ONLY_ACTIVE_ARCH=YES'";
                cmd += " --buildFlag='VALIDATE_WORKSPACE=YES'";
            }
            //cmd += ' --automaticProvisioning=false'
            //cmd += " --buildFlag='-UseModernBuildSystem=0'";
            //cmd += " --buildFlag='PROVISIONING_PROFILE=" + this.info.ios.provisioningProfile.split('.')[0] + "'";
            //cmd += " --buildFlag='CODE_SIGN_IDENTITY=" + (releaseMode ? 'iPhone Distribution' : 'iPhone Development') + "'";
        // cmd += ' --buildFlag="CODE_SIGN_IDENTITY=""" --buildFlag="CODE_SIGNING_REQUIRED="NO"" --buildFlag="CODE_SIGN_ENTITLEMENTS=""" --buildFlag="CODE_SIGNING_ALLOWED="NO"" --buildFlag="DEVELOPMENT_TEAM="""'


            await utils.executeCmd(cmd, this.createdAppDir, this.log);
            if(isDevSim !== 'simulator'){

                let ipaPath = path.resolve(this.createdAppDir, 'platforms/ios/build/device/');
                let outputLoc = path.resolve(currDir, BINARY_OUTPUT_FOLDER, 'ios');
                await fs.ensureDir(outputLoc);
                await fs.copy(path.resolve(ipaPath, this.info.displayName + '.ipa'), path.resolve(outputLoc, this.info.name + '-' + this.info.defaultVersion + '.ipa'));
                
                logSummary.i(this.info.name, this.log.getTag(), "iOS app for " + this.info.name + " built successfully ");
                logSummary.i(this.info.name, this.log.getTag(), "Built " + this.info.name + " to: " + outputLoc);

                this.log.i("iOS app for " + this.info.name + " built successfully ");
                this.log.i("Built " + this.info.name + " to: " + outputLoc);
            }
        }catch(ex){
            this.log.e(ex.message, ex);
            throw ex;
        }
    }

    run() {
        if (process.platform !== 'darwin') {
            utils.Log.e('IOS apps can only be built on OSX operating system');
            return; //should continue build?
            //throw new Error('Unsupported Platform');
        }
        return this.build();
    }

}

module.exports = BuildAppIOS;
