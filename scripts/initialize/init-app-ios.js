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

const fs = require("fs");
const { JSDOM } = require('jsdom');
const util = require('util');
const fsc = require('fs-extra');
const InitApp = require('./init-app.js');
const utils = require('../utils.js');
const path = require('path');
const xcode = require('xcode');
const { OS, CORDOVA_PLATFORM_CONFIG_FILE, CORDOVA_PATH, BASE_APP_IMAGES_PATH, PUSH_CERTIFICATE_NAME_IOS } = require('../Constants.js');

const currDir = process.cwd();

class InitAppIOS extends InitApp {
    constructor(containerProps, appName, appPath, appDescriptorContents, defaultServer, appBaseDir, platformsConfig, pluginsConfig, logger) {
        super(containerProps, appName, appPath, appDescriptorContents, defaultServer, appBaseDir, platformsConfig, pluginsConfig, logger);
    }


    async installPlatform(cordovaPlatformPath, platformsConfig, createAppPath) {
        let platformPath = path.resolve(cordovaPlatformPath, 'ios', platformsConfig.platforms.ios.name)
        let cdvCommand = path.resolve(currDir + CORDOVA_PATH);
        let cmd = cdvCommand + ' platform add ' + platformPath + ' --force'
        await utils.executeCmd(cmd, createAppPath, this.log);
        //await this.prepareFrameworkArch(this.containerProps.ios.packageType, createAppPath)
        this.prepareXCodeProjForiOS14(createAppPath);
    }

    prepareXCodeProjForiOS14(appCreateLocation) {
        try {
            let pbxprojPath = path.join(appCreateLocation, 'platforms/ios', this.appDescriptorContents.displayName + '.xcodeproj', 'project.pbxproj');
            let xcodeProject = xcode.project(pbxprojPath);

            xcodeProject.parseSync();

            // Linking Order of SQLCipher.framework should be well before the libsqlite3.a file as resolution for XCode 12.x upgrade for iOS 14.x devices in the 'Link Binary With Libraries' section
            let buildPhaseFiles = xcodeProject.pbxFrameworksBuildPhaseObj(xcodeProject.getFirstTarget().uuid).files;
            let reshuffleFile;
            for(var pos = buildPhaseFiles.length - 1; pos >= 0; pos--) {
                let fileRef = buildPhaseFiles[pos], tmpFile = buildPhaseFiles[pos - 1];
                if(!reshuffleFile && fileRef && fileRef.comment.indexOf('SQLCipher.framework') != -1) {
                    reshuffleFile = buildPhaseFiles[pos];
                    buildPhaseFiles[pos] = tmpFile;
                } else if (reshuffleFile && fileRef && fileRef.comment.indexOf('Security.framework') == -1 && tmpFile && tmpFile.comment.indexOf('Security.framework') == -1) {
                    buildPhaseFiles[pos] = tmpFile;
                } else if (reshuffleFile && fileRef && fileRef.comment.indexOf('Security.framework') != -1 && tmpFile && tmpFile.comment.indexOf('Security.framework') == -1) { 
                    buildPhaseFiles[pos + 1] = reshuffleFile;
                    break;
                }
            }
            xcodeProject.pbxFrameworksBuildPhaseObj(xcodeProject.getFirstTarget().uuid).files = buildPhaseFiles;
            fs.writeFileSync(pbxprojPath, xcodeProject.writeSync());

        } catch (e) {
            throw e;
        }
    }

    async prepareFrameworkArch(packageType, appCreateLocation){
        if(packageType.toLowerCase()!== 'simulator'){ //&& packageType.toLowerCase()!== 'development'){
             //update pbxProject
            try{
                let pbxprojPath = path.join(appCreateLocation, 'platforms/ios', this.appDescriptorContents.displayName + '.xcodeproj', 'project.pbxproj');
                let xcodeProject = xcode.project(pbxprojPath);

                xcodeProject.parseSync();
                const comment = "Preprocess Dynamic frameworks to strip invalid architectures";
                const uuid = xcodeProject.getFirstTarget().uuid;
                
                const script = path.resolve(currDir, 'scripts/internal/ios/strip_framework_arch.sh');
                //Load the config file
                let readFile = util.promisify(fs.readFile);
                let scriptFileString = await readFile(script);
                let options = {shellPath: '/bin/sh', shellScript: scriptFileString.toString()};
                
                xcodeProject.addBuildPhase([], "PBXShellScriptBuildPhase", comment, uuid, options );

                fs.writeFileSync(pbxprojPath, xcodeProject.writeSync());

            }catch(e){
                throw e;
            }

        }
    }

    async copyImageResources(baseAppPath, descriptorDetails, outputLocation, memoizeName) {
        let srcIconPath = path.resolve(baseAppPath, BASE_APP_IMAGES_PATH, 'ios');
        let imgExsist = await fsc.exists(path.resolve(srcIconPath, 'icon/icon-72.png'));
        if (!imgExsist)
            srcIconPath = path.resolve(currDir, 'images', 'ios');
        let targetPath = path.resolve(outputLocation, 'images/ios');
        try {
            await fsc.ensureDir(targetPath);
        } catch (e) {
            if (e.code !== 'EEXIST')
                throw e;
        }
        await fsc.copy(srcIconPath, targetPath);
    }

    async pushCertificateExsists(){
        if(this.containerProps.ios.packageType.toLowerCase() === 'simulator')
            return false;
        return fsc.exists(path.resolve(this.baseAppPath, 'pushcertificate/ios', PUSH_CERTIFICATE_NAME_IOS));
    }

    async copyPushCertificate(baseAppPath, targetPath) {
        let certExsist = await fsc.existsSync(path.resolve(baseAppPath, 'pushcertificate/ios', PUSH_CERTIFICATE_NAME_IOS));
        if (certExsist){
            try {
                let basePlistFilePath = path.resolve(baseAppPath, 'pushcertificate/ios', PUSH_CERTIFICATE_NAME_IOS);
                let targetPlistFilePath = path.resolve(targetPath, 'platforms/ios/', this.appDescriptorContents.displayName, 'Resources', PUSH_CERTIFICATE_NAME_IOS)
                await fsc.copyFileSync(basePlistFilePath, targetPlistFilePath);
                
                //update pbxProject
                let pbxprojPath = path.join(targetPath, 'platforms/ios', this.appDescriptorContents.displayName + '.xcodeproj', 'project.pbxproj');
                let xcodeProject = xcode.project(pbxprojPath);

                xcodeProject.parseSync();

                xcodeProject.addResourceFile(targetPlistFilePath);

                //Reset the provisioning Sytle since Push notification plugin hooks resets it to automatic
                xcodeProject.addTargetAttribute('ProvisioningStyle', 'Manual');

                fs.writeFileSync(pbxprojPath, xcodeProject.writeSync());

            } catch (e) {
              
                throw e;
            }

            
        }
        
    }

}

module.exports = InitAppIOS;
