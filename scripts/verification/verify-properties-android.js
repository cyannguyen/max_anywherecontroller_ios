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

const process = require('process');
const path = require('path');
const iosPrrReqs = require('./prereqs.json').platforms.android;
const { executeCmd } = require('../utils.js');
const fsextra = require('fs-extra');
const klaw = require('klaw');
const moment = require('moment-timezone');
const fs = require("fs");
const Constants = require('../Constants.js');

const currDir = process.cwd();
const homedir = require('os').homedir();

const verifyAndroid = {

    prepareGradle: async(log) => {
        try{
            gradleWrapperScriptLocation = path.resolve(currDir, 'scripts/internal/android');
            let gradleWrapperCmd = null;

            if (process.platform === 'darwin') {
                gradleWrapperCmd = "./gradlew wrapper";

            } else if (process.platform === 'win32') {
                gradleWrapperCmd = "gradlew.bat wrapper"
            } else { //Test for Linux
                log.w(null, null, "Unsupported OS for managing gradle. Make sure Gradle is downloaded and environment variable GRADLE_HOME is set.");
                return;
            }

            log.i(null, null, "Attempting to download gradle");
            await executeCmd(gradleWrapperCmd, gradleWrapperScriptLocation, log);
        }catch(ex){
            throw ex;
        } 
    },

    setGradleEnvVariables: async(log, buildSDKVersion) => {
        //find the gradle install folder. a distribution in homedir/.gradle/wrapper/dist 
        //on windows we need to set path environment variable
        try{
            let gradleZipPath = null
            if (process.platform === 'win32') {
                let rootPath = (parseInt(buildSDKVersion.split("-")[1]) >= 30) ? path.resolve(homedir, ".gradle/wrapper/dists/gradle-6.5-bin") : path.resolve(homedir, ".gradle/wrapper/dists/gradle-4.10.3-bin");
                let gPath = await verifyAndroid.getGradleInnerPath(rootPath);
                let gBinPath = path.resolve(gPath, (parseInt(buildSDKVersion.split("-")[1]) >= 30) ? "gradle-6.5/bin": "gradle-4.10.3/bin")
                process.env.Path += ";" + gBinPath;
                gradleZipPathsep = "file:///" + path.resolve(gPath, (parseInt(buildSDKVersion.split("-")[1]) >= 30) ? 'gradle-6.5-bin.zip' : 'gradle-4.10.3-bin.zip');
                gradleZipPath = gradleZipPathsep.replace(/\\/g, "/");
                if(gradleZipPath.indexOf(' ') > -1){
                    process.env['GRADLE_SPACE_EXS'] = gradleZipPath.replace('file:///', '');
                    gradleZipPath = (parseInt(buildSDKVersion.split("-")[1]) >= 30) ? 'gradle-6.5-bin.zip' : 'gradle-4.10.3-bin.zip';
                }
                log.i(null, null, "Setting Gradle Path to : " + gradleZipPath);
                process.env['CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL'] = gradleZipPath
            } else if (process.platform === 'darwin') {

                let rootPath = path.resolve(homedir, (parseInt(buildSDKVersion.split("-")[1]) >= 30) ? ".gradle/wrapper/dists/gradle-6.5-bin" : ".gradle/wrapper/dists/gradle-4.10.3-bin")
                let gPath = await verifyAndroid.getGradleInnerPath(rootPath);
                //let gBinPath = path.resolve(gPath, "gradle-4.10.3/bin")
                //process.env.Path += ";" + gBinPath;
                gradleZipPathsep = "file://" + path.resolve(gPath, (parseInt(buildSDKVersion.split("-")[1]) >= 30) ? 'gradle-6.5-bin.zip' : 'gradle-4.10.3-bin.zip');
                gradleZipPath = gradleZipPathsep.replace(/\\/g, "/");
                if(gradleZipPath.indexOf(' ') > -1){
                    process.env['GRADLE_SPACE_EXS'] = gradleZipPath.replace('file://', '');
                    gradleZipPath = (parseInt(buildSDKVersion.split("-")[1]) >= 30) ? 'gradle-6.5-bin.zip' : 'gradle-4.10.3-bin.zip';
                }
                log.i(null, null, "Setting Gradle Path to : " + gradleZipPath);
                process.env['CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL'] = gradleZipPath
            } else if (process.platform === 'linux'){
                //Do nothing use the gradle home path
                //gradleZipPath = process.env['GRADLE_HOME'];
                log.w('Will user environemtn variable GRADLE_HOME')
            }
        }catch(ex){
            throw ex;
        }

        
    },

    getGradleInnerPath: async(rootPath) => {
        return new Promise((resolve, reject) => {
            fs.readdir(rootPath, function(err, files) {
                if (err) reject(err);
                let filepath = path.join(rootPath, files[0]);
                resolve(filepath);
            });
        })
    },

    
}

module.exports = verifyAndroid;
