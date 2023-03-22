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
const {BINARY_OUTPUT_FOLDER} = require('../Constants.js');
const path = require('path');
const fs = require('fs-extra');

const BuildApp  = require('./build-app.js');
const currDir = process.cwd();


class BuildAppAndroid extends BuildApp{
    constructor(containerProps, createdAppDir, info, logger){
       super(containerProps, createdAppDir, info, logger);
    }


    async build(){
        try{
            let cdvCommand = path.resolve(currDir + '/node_modules/cordova/bin/cordova');

            let cmd = cdvCommand + ' build android';
            if(this.info.android.packageType && encodeURI(this.info.android.packageType.toLowerCase())  === 'release'){
                cmd += ' --release';
                cmd += ' -- --keystore=' + this.containerProps.android.keystore;
                cmd += ' --storePassword=' + this.containerProps.android.storePassword;
                cmd += ' --alias=' + this.containerProps.android.alias;
                cmd += ' --password=' + this.containerProps.android.password;
                cmd += ' --storeType=' + this.containerProps.android.storeType;
                cmd = this.addVersionCode(cmd); //IJ28577
            }else if(this.info.android.packageType && encodeURI(this.info.android.packageType.toLowerCase())  === 'releasenosign'){
                cmd += ' --release';
                cmd = this.addVersionCode(cmd); //IJ28577
            }
            await utils.executeCmd(cmd, this.createdAppDir, this.log);

            let outputLoc = '';
            if(this.info.android.packageType && encodeURI(this.info.android.packageType.toLowerCase())  === 'release'){
                let apkPath = path.resolve(this.createdAppDir, 'platforms/android/app/build/outputs/apk/release/');
                outputLoc = path.resolve(currDir, BINARY_OUTPUT_FOLDER, 'android');
                await fs.ensureDir(outputLoc);
                await fs.copy(path.resolve(apkPath, 'app-release.apk'), path.resolve(outputLoc, this.info.name + '-' + this.info.defaultVersion + '.apk'));

            }else if(this.info.android.packageType && encodeURI(this.info.android.packageType.toLowerCase())  === 'releasenosign'){
                let apkPath = path.resolve(this.createdAppDir, 'platforms/android/app/build/outputs/apk/release/');
                outputLoc = path.resolve(currDir, BINARY_OUTPUT_FOLDER, 'android');
                await fs.ensureDir(outputLoc);
                await fs.copy(path.resolve(apkPath, 'app-release-unsigned.apk'), path.resolve(outputLoc, this.info.name + '-' + this.info.defaultVersion + '.apk'));
            }else{
                let apkPath = path.resolve(this.createdAppDir, 'platforms/android/app/build/outputs/apk/debug/');
                outputLoc = path.resolve(currDir, BINARY_OUTPUT_FOLDER, 'android');
                await fs.ensureDir(outputLoc);
                await fs.copy(path.resolve(apkPath, 'app-debug.apk'), path.resolve(outputLoc, this.info.name + '-' + this.info.defaultVersion + '.apk'));

            }

            logSummary.i(this.info.name, this.log.getTag(), "Android app for " + this.info.name + " built successfully ");
            logSummary.i(this.info.name, this.log.getTag(), "Built " + this.info.name + " to: " + outputLoc);

            this.log.i("Android app for " + this.info.name + " built successfully ");
            this.log.i("Built " + this.info.name + " to: " + outputLoc);
        }catch(ex){
            this.log.e(ex.message, ex);
            throw ex;
        }

    }

    //IJ28577
    addVersionCode(cmd){
        if(this.info.android.addVersionCode){
            if(this.info.android.packageType.toLowerCase()==='releasenosign'){
                cmd += ' -- ';
            }
            this.log.i("CODE VERSION FOR " + this.info.name + " IS " + this.info.android.versionCode);
            cmd += '--gradleArg=-PcdvVersionCode=' + this.info.android.versionCode;
        }
        return cmd;
    }

    signAndVerify(){

    }

    run(){
        return this.build();
    }
}

module.exports = BuildAppAndroid;
