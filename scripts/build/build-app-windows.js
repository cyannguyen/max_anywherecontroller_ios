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
const {BINARY_OUTPUT_FOLDER, OS} = require('../Constants.js');
const path = require('path');
const PropertiesReader = require('properties-reader');
const fs = require('fs-extra');
const klaw = require('klaw');
const fsc = require('fs-extra');
const { JSDOM } = require('jsdom');
const util = require('util');

const BuildApp  = require('./build-app.js');
const internal = require('stream');
const currDir = process.cwd();
const CONTAINER_PROPERTIES_FILE = 'Container.properties';

class BuildAppWindows extends BuildApp{
    constructor(containerProps, createdAppDir, info, logger){
       super(containerProps, createdAppDir, info, logger);
    }

    getContainerProperties(containerFilePath){
        try {
            properties = PropertiesReader(containerFilePath);
        } catch (ex) {
            throw new Error('Could not find Container.properties file. Please make sure the Container.properties file exists in MaximoAnywhereContainer');
        }
        return properties
    }

    build(){
        let cdvCommand = path.resolve(currDir + '/node_modules/cordova/bin/cordova');
        let targetArch = this.containerProps[OS.WINDOWS]['targetArch'];
        let configType = this.containerProps[OS.WINDOWS]['targetConfig'];
        let appVersion =  this.info.defaultVersion.split('.').length <5?this.padVersion(this.info.defaultVersion):this.info.defaultVersion;
        let winAppIdentifier = "CordovaApp.Windows10_" + appVersion+ "_" + targetArch
        let cmd = cdvCommand + ' build windows --arch=' + targetArch  + " --" + configType;
        return utils.executeCmd(cmd, this.createdAppDir, this.log);
    }

    copyArtifacts(appxSearchPath, outputLoc) {
        let ms_app_extension = ".appx";

        return new Promise((resolve, reject) => {
            let copyList = [];
            klaw(appxSearchPath)
                .on('readable', async function (l) {
                    let item = null;
                    while ((item = this.read())) {
                        let token = item.path.split(path.sep).pop();

                        if ((item.stats.isFile() && item.path.endsWith(ms_app_extension) || item.path.endsWith("cer")) && token.indexOf('CordovaApp.Windows10') > -1) {
                            copyList.push(item.path);
                        } else if (item.stats.isDirectory() && token === 'Dependencies') {
                            copyList.push(item.path);
                        }
                    }
                })
                .on('end', async () => {
                    try {
                        let tempWorkingDir = path.resolve(currDir, 'scripts/internal/windows/temp', this.info.name);

                        //tokens
                        let appArtifactToken = "appArtifacts"
                        let artifactToken = "installArtifacts"
                        let installScriptToken = "installScripts"

                        //source directory paths
                        let srcArtifactDir = path.resolve(currDir, 'scripts/internal/windows', artifactToken)
                        let srcInstallDir = path.resolve(currDir, 'scripts/internal/windows', installScriptToken)

                        //target directory paths
                        let targetAppArtifactPath = path.resolve(tempWorkingDir, appArtifactToken)
                        let targetArtifactPath = path.resolve(tempWorkingDir, artifactToken)
                        let targetInstallArtifactPath = path.resolve(tempWorkingDir, installScriptToken)

                        await fs.ensureDir(targetAppArtifactPath)
                        await Promise.all(copyList.map(item => {
                            let properties = this.getContainerProperties(path.resolve(currDir, CONTAINER_PROPERTIES_FILE));
                            let customCertificate = properties.get('windows.signing.certificate') ? properties.get('windows.signing.certificate').trim() : null;
                            if (item.endsWith('.cer') && (!customCertificate || customCertificate == "" || customCertificate == null)) {
                                return fs.copy(item, path.resolve(outputLoc, 'anywhere-test_' + this.info.defaultVersion + '.cer'))
                            } else if (item.endsWith('.cer') && customCertificate && customCertificate != "" && customCertificate != null) {
                                return fs.copy(item, path.resolve(outputLoc, path.basename(customCertificate)))
                            } else if (item.endsWith(ms_app_extension)) {
                                return fs.copy(item, path.resolve(outputLoc, this.info.name + '-' + this.info.defaultVersion + ms_app_extension));
                            } else if (item.split(path.sep).pop() === 'Dependencies') {
                                //This will be Depe folder. Handle if there are others
                                return fs.copy(item, path.resolve(outputLoc, 'Dependencies'))
                            }
                        }));

                        await fs.copy(srcArtifactDir, targetAppArtifactPath)
                        await fs.copy(srcInstallDir, targetInstallArtifactPath)

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }).on('error', (e) => {
                    reject(e);
                });

        });

    }

    async generateInstaller() {
        let workingDir = path.resolve(currDir, 'scripts/internal/windows');
        let unzipWixPath = path.resolve(workingDir, 'wix311.zip')
        let decomPath =  path.resolve(workingDir, 'wix311');
        if(!fs.existsSync(decomPath)){
            await fs.ensureDir(decomPath);
            await utils.unzip(unzipWixPath, path.resolve(workingDir, 'wix311'))
        }
        
        let installscriptPath = path.resolve(workingDir, "Generate-Installer.ps1")
        await new Promise((resolve, reject) => {
            let proc = require("child_process").spawn;
            let powerShellProc = proc("powershell.exe", [installscriptPath + " -appname " + this.info.name]);
            powerShellProc.stdout.on("data",  (data) => {
                this.log.i("Powershell Data: " + data);
            });
            powerShellProc.stderr.on("data", (data) => {
                this.log.i("Powershell Errors: " + data);
            });
            powerShellProc.on("exit", () => {
                this.log.i("Powershell Script finished");
                resolve()
            });
            powerShellProc.stdin.end(); //end input
        })

        //copy installer
        let tempWorkingDir = path.resolve(currDir, 'scripts/internal/windows/temp', this.info.name);
        let msiPath = path.resolve(tempWorkingDir, this.info.name + '.msi');
        let outputLoc = path.resolve(currDir, BINARY_OUTPUT_FOLDER, 'windows');

        await fs.copy(msiPath,  path.resolve(outputLoc, this.info.name + '.msi'))

    }

    editInstallConfig(tempAppPath){
        let configPath = path.resolve(tempAppPath, "installScripts/Root.xml");
        let indexFile = fs.readFileSync(configPath, "utf-8");
        const jsdom = new JSDOM( indexFile, {contentType:'text/xml'} );

        const { window } = jsdom;
        const { document } = window;

        let productNode = document.getElementsByTagName('Product')[0];
        productNode.setAttribute('Name', this.info.name);
        productNode.setAttribute('Version', this.info.defaultVersion);

        let rootDirNode = document.querySelector('Directory[Id = "ApplicationRootDirectory"]');
        rootDirNode.setAttribute('Name', this.info.name);
        
        //let output = (new XMLSerializer()).serializeToString(widgetNode);
        let output = "<!--?xml version='1.0' encoding='utf-8'?-->" + '\n' + window.document.documentElement.outerHTML
        
        fs.writeFileSync(path.resolve(tempAppPath, "installScripts/Root.wxs"), output)

    }

    padVersion(version) {
        let v = version.split('.');
        let l = v.length;
        while (l < 4) {
            v.push('0');
            l = v.length;
        }
        return v.join('.')
    }

    signAndVerify(){
        
    }

    async updateCustomCertificate(properties) {
        let customCertificate = properties.get('windows.signing.certificate') ? properties.get('windows.signing.certificate').trim() : null;
        let targetArch = this.containerProps[OS.WINDOWS]['targetArch'];
        let appVersion =  this.info.defaultVersion.split('.').length <5?this.padVersion(this.info.defaultVersion):this.info.defaultVersion;
        let winAppIdentifier = "CordovaApp.Windows10_" + appVersion+ "_" + targetArch;
        // The custom certificate should be copied to "appxSearchPath" before the copyArtifacts are called
        if (customCertificate && customCertificate != null && customCertificate != "") {
            await fs.copyFile(customCertificate, path.join(path.resolve(this.createdAppDir, 'platforms/windows/AppPackages/' + winAppIdentifier + '_Test/'), winAppIdentifier + ".cer"), (err) => {
                if (err)  {
                    console.log('File not available ' + customCertificate);
                    throw err;
                }
            });
        }
    }

    async run(){
        try{

            await this.build();
            let properties = this.getContainerProperties(path.resolve(currDir, CONTAINER_PROPERTIES_FILE));
            await this.updateCustomCertificate(properties);
            let appxSearchPath = path.resolve(this.createdAppDir, 'platforms/windows/AppPackages');
            let outputLoc = path.resolve(currDir, BINARY_OUTPUT_FOLDER, 'windows');
            await this.copyArtifacts(appxSearchPath, outputLoc);

            // Ensuring backward compatibility with MS Visual Studio 2015
            let vsReleaseVersion = properties.getRaw('visualstudio.version.release') ? properties.getRaw('visualstudio.version.release').trim() : null;
            if (vsReleaseVersion.indexOf("15") > -1) {
                let tempAppPath = path.resolve(currDir, 'scripts/internal/windows/temp', this.info.name);
                await this.editInstallConfig(tempAppPath);
                await this.generateInstaller();
            }

            logSummary.i(this.info.name, this.log.getTag(), "Windows app for " + this.info.name + " built successfully ");
            logSummary.i(this.info.name, this.log.getTag(), "Built " + this.info.name + " to: " + outputLoc);

            this.log.i("Windows app for " + this.info.name + " built successfully ");
            this.log.i("Built " + this.info.name + " to: " + outputLoc);

        }catch(ex){
            this.log.e(ex.message, ex);
            throw ex;
        }
    }
}

module.exports = BuildAppWindows;
