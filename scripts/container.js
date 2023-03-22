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

const path = require('path');
const klaw = require('klaw');
const PropertiesReader = require('properties-reader');
const { JSDOM } = require('jsdom');
const util = require('util');
const fs = require("fs-extra");
const fsc = require('fs');
const moment = require('moment');
const Logger = require('./logger.js');

const verifyIOS = require('./verification/verify-properties-ios');
const verifyAndroid = require('./verification/verify-properties-android.js');

const InitAppAndroid = require('./initialize/init-app-android.js');
const InitAppIOS = require('./initialize/init-app-ios.js');
const InitAppWindows = require('./initialize/init-app-windows.js');

const BuildAppAndroid = require('./build/build-app-android.js');
const BuildAppIOS = require('./build/build-app-ios.js');
const BuildAppWindows = require('./build/build-app-windows.js');

const utils = require('./utils.js')

const APP_DESCRIPTOR_FILE = 'application-descriptor.xml';
const CONTAINER_PROPERTIES_FILE = 'Container.properties';
const CONTAINER_DEPENDENCIES = 'container-deps'
const APPS_DIR = 'apps'
const Constants = require('./Constants.js');

const currDir = process.cwd();
const platformConfig = require(path.resolve(currDir, Constants.CORDOVA_PLATFORMS_FOLDER, Constants.CORDOVA_PLATFORM_CONFIG_FILE));
var pluginConfig


const SUMMARY_TOPIC = "summary";

function isValidApp(appPath) {
    return fs.existsSync(path.resolve(appPath, APP_DESCRIPTOR_FILE));
}

function getContainerProperties(containerFilePath){
    try {
        properties = PropertiesReader(containerFilePath);
    } catch (ex) {
        throw new Error('Could not find Container.properties file. Please make sure the Container.properties file exists in MaximoAnywhereContainer');
    }
    return properties
}

async function loadBuildContainerProperties(properties, log) {
    
    let containerPropertiesObject = { 'ios': {}, 'android': {}, 'windows': {} };
    
    let appsToBuild = null;
    let osPlatforms = null;
    let appsBaseDir = null;
    
    try{
        appsToBuild = properties.get('appsToBuild').trim() ? properties.get('appsToBuild').split(',').map(a => a.trim()) : null;
        osPlatforms = properties.get('envsToBuild').trim() ? properties.get('envsToBuild').split(',').map(a => a.trim()) : null;
        appsBaseDir = properties.get('Anywhere.Application.BaseDirectory').trim();
    }catch(ex){
        throw ex;
    }
   
    log.i(SUMMARY_TOPIC, null, "Validating Container properties");
    
    if (!appsToBuild) {
        throw new Error('Property \'appsToBuild\' cannot be empty in the Container.properties file');
    } else if (!osPlatforms) {
        throw new Error('Property \'envsToBuild\' cannot be empty in the Container.properties file');
    } else if (!appsBaseDir) {
        throw new Error('Property \'Anywhere.Application.BaseDirectory\' cannot be empty in the Container.properties file');
    }

    log.i(SUMMARY_TOPIC, null, "Apps To Build: " + appsToBuild.join(', '));
    log.i(SUMMARY_TOPIC, null, "Platforms To Build: " + osPlatforms.join(', '));
    log.i(SUMMARY_TOPIC, null, "Anywhere Base Directory: " + appsBaseDir);

    let webContentInclude = properties.get('include.webcontent') === true ? true : false;
    log.i(SUMMARY_TOPIC, null, "Web Content Included : " + webContentInclude);

    let platformToFilter = [];

    let androidPlatform = osPlatforms.indexOf(Constants.OS.ANDROID);
    if (androidPlatform > -1) {
        log.i(SUMMARY_TOPIC, null, "Processing Android Properties");
        let javaHome = null;
        let androidHome = null;
        try{
            javaHome = properties.get('JAVA_HOME').trim();
            androidHome = properties.get('android.sdk.home').trim()
        }catch(ex){
            throw new Error('Property JAVA_HOME or android.sdk.home missing in Container.properties')
        }

        log.i(SUMMARY_TOPIC, null, "Java Home: " + javaHome);
        log.i(SUMMARY_TOPIC, null, "Android Home: " + androidHome);

        if (!javaHome || !androidHome) {
            log.e(SUMMARY_TOPIC, null, 'Container.properties contains \'android\' as a platform. JAVA_HOME and android.sdk.home properties should be set properly in Container.properties for android to build. Removing android');
            osPlatforms.splice(androidPlatform, 1);
        } else {
            process.env['ANDROID_HOME'] = path.resolve(androidHome);
            process.env['JAVA_HOME'] = path.resolve(javaHome);
            process.env['ANDROID_SDK_ROOT'] = path.resolve(androidHome);
        }
        await verifyAndroid.prepareGradle(log);
        await verifyAndroid.setGradleEnvVariables(log, properties.get('Android_TARGET_DEVICE_NAME'));
        try {
            //Load Android Properties
            let packageTypeAndroid = ''
            try{
                packageTypeAndroid = properties.get('android.binary.packageType');
                containerPropertiesObject['android'] = {
                    'packageType': packageTypeAndroid
                }
            }catch(ex){
                let msg = "Could not read required property 'android.binary.packageType'"
                throw new Error(msg);
            }
            if(['release', 'releasenosign', 'development'].indexOf(packageTypeAndroid.toLowerCase()) == -1){
                throw new Error("Invalid value in 'android.binary.packageType'");
            }
            // Android SDK version:
            containerPropertiesObject['android']['buildSDKVersion'] = properties.get('Android_TARGET_DEVICE_NAME');
            
            //Ensure all signing details are provided if package type set to release
            
            if(packageTypeAndroid.toLowerCase() === 'release'){
                let keystore = null;
                let storePassword = null;
                let alias = null;
                let password = null;
                let storeType = null;
                try{
                    log.i(null, null, 'Loading Android signing properties');
                    keystore = path.resolve(currDir, properties.get('android.signapp.keystore'));
                    storePassword = properties.get('android.signapp.storePassword');
                    alias = properties.get('android.signapp.alias');
                    password = properties.get('android.signapp.password');
                    storeType = properties.get('android.signapp.storeType');
                }catch(ex){
                    throw new Error('Android package type set to Release, but no signing properties found');
                }

                if(!keystore || !storePassword || !alias || !password){
                    throw new Error('Credentials needed to create Android release apks. Please check Container.properties for all android.signapp properties.')
                }
                const exists = await fs.pathExists(keystore)
                if(!exists){
                    throw new Error('Keystore file not found. Ensure android.signapp.keystore value is valid');
                }

                containerPropertiesObject['android']['keystore'] = keystore
                containerPropertiesObject['android']['storePassword'] = storePassword
                containerPropertiesObject['android']['alias'] = alias
                containerPropertiesObject['android']['password'] = password
                containerPropertiesObject['android']['storeType'] = storeType

            }

        } catch (e) {
            log.e(null, null, e.message,  e);
            log.w(null, null, "Ignoring Android build due to errors");
            osPlatforms.splice(androidPlatform, 1);
        }

    }

    let iosplatform = osPlatforms.indexOf(Constants.OS.IOS);
    if (iosplatform > -1) {
        try {
            await verifyIOS.verifyPlatformPreReqs(log);

            //Load IOS properties
            let packageTypeios = null;
            try{
                packageTypeios = properties.get('ios.binary.packageType');
                log.i("iOs Package Type: " + packageTypeios);
            }catch(ex){
                throw new Error("Could not read require property  'ios.binary.packageType'")
            }

            if(['simulator', 'development', 'enterprise'].indexOf(packageTypeios.toLowerCase()) === -1){
                throw new Error("Invalid value in 'ios.binary.packageType'");
            }

            let useDistributionProfile = null;
            if (packageTypeios && packageTypeios.toLowerCase() === 'development') {
                useDistributionProfile = false;
            } else {
                useDistributionProfile = true;
            }

            let profilesPath = properties.get('ios.provisionigProfile.path')
            if (profilesPath) {
                profilesPath = profilesPath.indexOf(currDir) > -1 ? profilesPath : path.resolve(currDir, profilesPath);
            } else {
                path.resolve(currDir, 'signing');
            }
            containerPropertiesObject['ios'] = {
                'useWildcardProfile': properties.get('ios.provisionprofile.type.wildcard'),
                'useDistributionProfile': useDistributionProfile,
                'packageType': packageTypeios,
                'profilePath': profilesPath
            };
        } catch (e) {
            log.w(e);
            log.w("Ignoring iOS build due to errors");
            osPlatforms.splice(iosplatform, 1);
        }

    }

    let winplatform = osPlatforms.indexOf(Constants.OS.WINDOWS)
    if (winplatform > -1) {
        if (process.platform === 'win32') {
            let targetArch = properties.get('windows.platform.target') ? properties.get('windows.platform.target').trim() : null;
            let validarchs = ['x86', 'x64', 'ARM'];
            containerPropertiesObject[Constants.OS.WINDOWS] = {}
            if (validarchs.indexOf(targetArch) > -1)
                containerPropertiesObject[Constants.OS.WINDOWS]['targetArch'] = targetArch
            else {
                log.w(null, null, "Windows target will not be built since windows8.platform.target property is not a valid value");
                platformToFilter.push(Constants.OS.WINDOWS);
            }
            let targetConfig = properties.get('windows.config.target') ? properties.get('windows.config.target').trim() : null;
            targetConfig = targetConfig.toLowerCase();
            if (targetConfig === 'release' || targetConfig === 'debug')
                containerPropertiesObject[Constants.OS.WINDOWS]['targetConfig'] = targetConfig
            else {
                log.e(null, null, "Windows target will not be built since windows8.config.target property is not a valid value");
                platformToFilter.push(Constants.OS.WINDOWS);
            }
            let vsReleaseVersion = properties.getRaw('visualstudio.version.release') ? properties.getRaw('visualstudio.version.release').trim() : null;
            containerPropertiesObject[Constants.OS.WINDOWS]['vsReleaseVersion'] = vsReleaseVersion
            let vsInstallDir = properties.get('visualstudio.install.path') ? properties.get('visualstudio.install.path').trim() : null;
            if (vsInstallDir) {
                containerPropertiesObject[Constants.OS.WINDOWS]['vsInstallPath'] = path.resolve(vsInstallDir);
                process.env['VSINSTALLDIR'] = containerPropertiesObject[Constants.OS.WINDOWS]['vsInstallPath'];
            } else {
                log.e(null, null, "Windows target will not be built since visualstudio.install.path property is not a valid value");
                platformToFilter.push(Constants.OS.WINDOWS);
            }

        } else {
            log.w(null, null, 'Container.properties contains \'windows\' as a platform. This platform can only be built on Windows 10 operating systems. Ignoring this platform');
            platformToFilter.push(Constants.OS.WINDOWS);
        }

    }

    let validPlatforms = osPlatforms.filter(platform => {
        if (platform !== Constants.OS.IOS && platform !== Constants.OS.ANDROID && platform !== Constants.OS.WINDOWS) {
            log.w(null, null, "Target platform " + platform + " is not a valid platform. Valid platforms are " + Constants.OS.IOS + ", " + Constants.OS.ANDROID + ", " + Constants.OS.WINDOWS);
            return false;
        } else if (platformToFilter.length && platformToFilter.indexOf(platform) > -1) {
            return false;
        } else {
            return true;
        }
    })

    if (validPlatforms.length == 0) {
        throw new Error("Either platforms in 'envsToBuild' were ignored due to errors or no valid target platforms provided in 'envsToBuild'");
    }
    containerPropertiesObject['appsToBuild'] = appsToBuild;
    containerPropertiesObject['appsBaseDir'] = appsBaseDir;
    containerPropertiesObject['osPlatforms'] = validPlatforms;
    containerPropertiesObject['webContentInclude'] = webContentInclude;

    return containerPropertiesObject;

}


async function loadAppDescriptorProperties(appPath, containerProps, log) {

    let appDescriptorPath = path.resolve(appPath, APP_DESCRIPTOR_FILE);
    let exist = await fs.exists(appDescriptorPath);
    let folderName = appPath.split(path.sep).pop();;
    if (!exist) {
        log.w("Ignoring " + folderName + '. No application-descriptor.xml found');
        return Promise.resolve(null);
    }

    let readFile = util.promisify(fsc.readFile);
    return readFile(appDescriptorPath).then(async appdescriptor => {
        try {
            const jsdom = new JSDOM(appdescriptor, { contentType: 'text/xml' });
            const { window } = jsdom;
            const { document } = window;
            let descriptorContents = { 'author': {}, 'android': { 'packageName': null, 'version': null }, 'ios': { 'packageName': null, 'version': null }, 'defaultPackageName': null, 'defaultVersion': null };
            descriptorContents['name'] = document.getElementsByTagName('application')[0].getAttribute('id');
            if (!descriptorContents['name']) {
                log.w(null, null, "Ignoring " + folderName + 'No name found');
                return null;
            }
            descriptorContents['displayName'] = document.getElementsByTagName('displayName')[0].textContent;
            if (!descriptorContents['displayName']) {
                log.w(null, null, "Ignoring " + folderName + '. No display name found in application-descriptor.xml');
                return null;
            }

            //Merge descriptor and container properties for app related stuff
            Object.assign(descriptorContents['ios'], containerProps['ios']);
            Object.assign(descriptorContents['android'], containerProps['android'])

            //TODO: Windows merge
            //Package name and version are read from ios tag by default. If not found it takes the android. If still not found, gives an error

            let iphoneNode = document.getElementsByTagName('iphone')[0];
            descriptorContents['ios']['packageName'] = iphoneNode.getAttribute('bundleId');
            descriptorContents['defaultPackageName'] = iphoneNode.getAttribute('bundleId');
            descriptorContents['ios']['version'] = iphoneNode.getAttribute('version');
            descriptorContents['defaultVersion'] = iphoneNode.getAttribute('version');
            
            //IJ28577
            let CFBundleVersion = iphoneNode.getAttribute('CFBundleVersion');
            descriptorContents['ios']['CFBundleVersion'] = CFBundleVersion ? CFBundleVersion : null;

            //descriptorContents['ios']['provisioningProfile'] = iphoneNode.getAttribute('provisioningProfile');
            //Do this only if building for IOS
            if (containerProps.osPlatforms.indexOf(Constants.OS.IOS) > -1 && 
                        containerProps.ios.packageType.toLowerCase() !== 'simulator') {
                try{
                    let selProvProf = await verifyIOS.findValidProvisioning(
                        iphoneNode.getAttribute('bundleId'),
                        containerProps['ios']['profilePath'],
                        descriptorContents['ios']['useDistributionProfile'],
                        descriptorContents['ios']['useWildcardProfile'],
                        iphoneNode.getAttribute('provisioningProfile'),
                        log
                    );

                    if(selProvProf.found){
                        log.i("Provisioning profile for: " + folderName + ': ' + selProvProf.profile.uuid);
                        log.i("Team ID: " + folderName + ': ' + selProvProf.profile.teamID)
                        descriptorContents['ios']['provisioningProfile'] = selProvProf.profile.uuid;
                        descriptorContents['ios']['teamID'] = selProvProf.profile.teamID;
                    }else{
                        log.e(null, null, "No provisioning profile found for app: " + folderName + '. Skipping build for ' + folderName);
                        return null;
                    }
                   
                }catch(ex){
                    log.e(null, null, ex.message, ex);
                    log.e(null, null, 'Skipping build for ' + folderName);
                    return null;
                }
            }


            let androidNode = document.getElementsByTagName('android')[0];
            descriptorContents['android']['version'] = androidNode.getAttribute('version');
            //IJ28577
            let verCode = androidNode.getAttribute('versionCode');
            descriptorContents['android']['versionCode'] = verCode ? verCode : null;
            descriptorContents['defaultVersion'] = descriptorContents['defaultVersion'] ? descriptorContents['defaultVersion'] : descriptorContents['android']['version'];
            for (let i = 0; i < androidNode.childNodes.length; i++) {
                if (androidNode.childNodes[i].tagName === 'security') {
                    let securityNode = androidNode.childNodes[i];
                    for (let j = 0; j < securityNode.childNodes.length; j++) {
                        if (securityNode.childNodes[j].tagName === 'packageName') {
                            descriptorContents['android']['packageName'] = securityNode.childNodes[j].textContent;
                            descriptorContents['defaultPackageName'] = descriptorContents['defaultPackageName'] ? descriptorContents['defaultPackageName'] : descriptorContents['android']['packageName'];
                            break;
                        }
                    }
                    break;
                }
            }

            if (!descriptorContents['defaultVersion'] || !descriptorContents['defaultPackageName']) {
                if (!descriptorContents['defaultVersion'])
                    log.e('No version found in application-descriptor.xml. Ignoring build for this app. Will continue with other apps');
                if (!descriptorContents['defaultPackageName'])
                    log.e('No package name found in application-descriptor.xml. Ignoring build for this app. Will continue with other apps');
                return null;
            }

            descriptorContents['description'] = document.getElementsByTagName('description')[0].textContent;
            descriptorContents['mainFile'] = document.getElementsByTagName('mainFile')[0].textContent;
            // descriptorContents['icon'] = document.getElementsByTagName('thumbnailImage')[0].textContent;
            // if(!descriptorContents['icon']){
            //     Log.w("Ignoring " + folderName + 'No icon path found');
            //     return null;
            // }

            let authorNodeChildren = document.getElementsByTagName('author')[0].childNodes;

            for (let i = 0; i < authorNodeChildren.length; i++) {
                if (authorNodeChildren[i].tagName === 'name')
                    descriptorContents['author']['name'] = authorNodeChildren[i].textContent;
                else if (authorNodeChildren[i].tagName === 'email')
                    descriptorContents['author']['email'] = authorNodeChildren[i].textContent;
                else if (authorNodeChildren[i].tagName === 'homepage')
                    descriptorContents['author']['homepage'] = authorNodeChildren[i].textContent;
                else if (authorNodeChildren[i].tagName === 'copyright')
                    descriptorContents['author']['copyright'] = authorNodeChildren[i].textContent;

            }

            return descriptorContents;
        } catch (ex) {
            log.e(null, null, 'Error parsing application-descriptor.xml', ex);
            log.e('Skipping build for app: ' + folderName);
            return null;
        }
    });

}


function discoverApps(anywhereBaseDirectory, appList, containerProps, log) {
    log.i(null, null, "Initiating app discovery");
    return new Promise((resolve, reject) => {
        let appsDir = path.resolve(anywhereBaseDirectory, 'apps');
        let appDescDetailPromiseArray = [];
        let appPathArray = [];

        klaw(appsDir, { 'depthLimit': 0 })
            .on('readable', async function(l) {
                let item = null;
                while ((item = this.read())) {
                    //Log.i('item walk: ' + item.path);
                    if (item.stats.isDirectory()) {
                        if (appList) {
                            let appName = item.path.split(path.sep).pop();
                            if (appList.indexOf(appName) === -1)
                                continue;
                        }
                        let possibleAppsPath = item.path;
                        let validApp = isValidApp(possibleAppsPath);
                        log.i(null, null, "Valid app found in: " + possibleAppsPath);
                        if (validApp) {
                            log.i(null, null, "Loading app-descriptor.xml")
                            appDescDetailPromiseArray.push(loadAppDescriptorProperties(possibleAppsPath, containerProps, log));
                            appPathArray.push(possibleAppsPath);

                        }
                    }
                }
            })
            .on('end', () => {
                Promise.all(appDescDetailPromiseArray).then(appdescriptors => {

                    let appDetails = {}
                    for (let i = 0; i < appdescriptors.length; i++) {
                        if (appdescriptors[i] === null) {
                            continue;
                        }
                        let appFolderName = appPathArray[i].split(path.sep).pop();
                        appDetails[appFolderName] = appdescriptors[i];
                    }
                    resolve(appDetails);
                })

            });
    })

}

function loadAppBuildProperties(path) {
    return PropertiesReader(path);
}

async function installContainerDependencies(log) {
    let pluginPath = path.resolve(currDir, CONTAINER_DEPENDENCIES);
    let latestPluginZipName = await getTheLatestPluginZipName(pluginPath);
    await fs.ensureDir(path.resolve(currDir, 'plugins'));
    return utils.unzip(latestPluginZipName, path.resolve(currDir, 'plugins'), log);
}

function getTheLatestPluginZipName(pluginPath) {
    let plName = [];
    return new Promise((resolve, reject) => {
        klaw(pluginPath, { 'depthLimit': 0 })
            .on('readable', async function(l) {
                let item = null;
                while ((item = this.read())) {
                    //Log.i('item walk: ' + item.path);
                    if (item.path.indexOf('anywhere-plugins') > -1) {
                        let fileNameToken = item.path.split(path.sep).pop();
                        let timeSt = fileNameToken.split('anywhere-plugins-')[1];
                        if (!timeSt)
                            continue;
                        let tSt = timeSt.split('.')[0];
                        if (!plName.length) {
                            plName.push(item.path);
                            plName.push(tSt)
                        } else {
                            if (moment(plName[1], 'MM-DD-YYYYTH-mm-ss') < moment(tSt, 'MM-DD-YYYYTH-mm-ss')) {
                                plName[0] = item.path;
                                plName[1] = tSt;
                            }
                        }

                    }
                }
            })
            .on('end', () => {
                resolve(plName[0]);
            });
    })

}

function writeAppDownloadMD5() {
    let appDownloadPath = path.resolve(currDir, './app-download/js/appdownload.js');
    let checksum = "file:appdownload.js:" + utils.calcMD5(appDownloadPath);
    fs.writeFile(path.resolve(currDir, './app-download/js/appdownload.md5'), checksum, err => {
        if (err) {
          console.error('[writeAppDownloadMD5] Unable to write MD5 file: ' + err);
          return
        }
    });
    return checksum;
}

/**
 *Entry function that generates the binaries.
 *
 */
async function build() {
    let logDir = await fs.exists(path.resolve(currDir, 'logs'));
    if (logDir)
        await fs.remove(path.resolve(currDir, 'logs'));

    global.logSummary = new Logger(SUMMARY_TOPIC, null, "container_build_summary.log");
    logSummary.registerTopic(SUMMARY_TOPIC);

    try {
        logSummary.i("Loading Container.properties");
        let properties = getContainerProperties(path.resolve(currDir, CONTAINER_PROPERTIES_FILE))
        let containerProps = await loadBuildContainerProperties(properties, logSummary);

        logSummary.i('Loading Build properties');
        let appBuildProps = loadAppBuildProperties(path.resolve(containerProps.appsBaseDir, 'build.properties'));

        let defaultServer = null;
        if (appBuildProps.get('adapter.connection.protocol') && appBuildProps.get('adapter.connection.domain') &&
            appBuildProps.get('adapter.connection.port') && appBuildProps.get('adapter.connection.context')) {
            let serverUrl = appBuildProps.get('adapter.connection.protocol') + '://' + appBuildProps.get('adapter.connection.domain') +
                ':' + appBuildProps.get('adapter.connection.port') + '/' + appBuildProps.get('adapter.connection.context');
            defaultServer = serverUrl;
        }
        if (defaultServer)
            logSummary.i("Default Maximo server will be set to: " + defaultServer);
        else{
            logSummary.w("No default server connection set. Users will have to manually enter the server info.")
        }

        let appList = null;

        if (containerProps.appsToBuild && containerProps.appsToBuild[0] !== '*')
            appList = containerProps.appsToBuild;

        logSummary.i('Installing Container Dependencies: Plugins');
        await installContainerDependencies(logSummary);
        pluginConfig = require(path.resolve(Constants.PLUGINS_FOLDER, Constants.PLUGIN_CONFIG_FILE));

        let appDescriptorInfo = await discoverApps(containerProps.appsBaseDir, appList, containerProps, logSummary);

        let apps = Object.keys(appDescriptorInfo);
        if(apps.length === 0)
            throw new Error("No apps to build possibly due to error. Check logs");
        logSummary.i('Proceeding to build following apps: ' + apps.join(', '));
        await logSummary.flush(SUMMARY_TOPIC);
        //await Promise.all(apps.map(async app =>{
        let appCntr;
        let app = null
        for (appCntr = 0; appCntr < apps.length; appCntr++) {
            app = apps[appCntr];
            let appLogger = new Logger(app, null, app + '.build.log');
            appLogger.registerTopic(app);
            let app_topic =  app;
            let TAG = app + '::';
            logSummary.registerTopic(app_topic, "\n========================================\nSummary for " + app + " build\n========================================\n");
            let appPath = path.resolve(containerProps.appsBaseDir, APPS_DIR, app);
            let osPlatformsToBuild = containerProps.osPlatforms
            let createdLocation = null;
            for (let osCtr = 0; osCtr < osPlatformsToBuild.length; osCtr++) {
                if (osPlatformsToBuild[osCtr] === Constants.OS.ANDROID) {
                    let ostag = TAG + Constants.OS.ANDROID;
                    appLogger.setTag(ostag)
                    try {
                        logSummary.i(app_topic, ostag, "Initializing App " + app + ' for platform ' + Constants.OS.ANDROID + '--', app);
						logSummary.i(app_topic, ostag, "Generating MD5 checksum " + writeAppDownloadMD5(), app);
                        createdLocation = await new InitAppAndroid(containerProps, app, appPath, appDescriptorInfo[app], defaultServer, platformConfig, pluginConfig, appLogger).run(true)
                        logSummary.i(app_topic, ostag, "Completed App Initialization: " + app, app);
                        logSummary.i(app_topic, ostag, "Building App for: " + app, app);
                        await new BuildAppAndroid(containerProps, createdLocation, appDescriptorInfo[app], appLogger).run();
                        logSummary.i(app_topic, ostag, "Completed App Build for " + app + ' for platform ' + Constants.OS.ANDROID, app);
                    } catch (e) {
                    	console.log(e);
                        logSummary.e(app_topic, ostag, e.message, e);
                        logSummary.e(app_topic, ostag, "Could not build app: " + app + " for Android");
                    }
                } else if (osPlatformsToBuild[osCtr] === Constants.OS.IOS) {
                    let ostag = TAG + Constants.OS.IOS;
                    appLogger.setTag(ostag)
                    try {
                        logSummary.i(app_topic, ostag, "Initializing App " + app + ' for platform ' + Constants.OS.IOS + '--', app);
                        createdLocation = await new InitAppIOS(containerProps, app, appPath, appDescriptorInfo[app], defaultServer, platformConfig, pluginConfig, appLogger).run(true)
                        logSummary.i(app_topic, ostag, "Completed App Initialization: " + app, app);
                        logSummary.i(app_topic, ostag, "Building App: " + app, app);
                        await new BuildAppIOS(containerProps, createdLocation, appDescriptorInfo[app], appLogger).run();
                        logSummary.i(app_topic, ostag, "Completed App Build for " + app + ' for platform ' + Constants.OS.IOS);
                    } catch (e) {
                        logSummary.e(app_topic, ostag, e.message, e);
                        logSummary.e(app_topic, ostag, "Could not build app: " + app + " for IOS");
                    }
                } else if (osPlatformsToBuild[osCtr] === Constants.OS.WINDOWS) {
                    let ostag = TAG + Constants.OS.WINDOWS;
                    appLogger.setTag(ostag)
                    try {
                        logSummary.i(app_topic, ostag, "Initializing App " + app + ' for platform ' + Constants.OS.WINDOWS + '--', app);
                        createdLocation = await new InitAppWindows(containerProps, app, appPath, appDescriptorInfo[app], defaultServer, platformConfig, pluginConfig, appLogger).run(true)
                        logSummary.i(app_topic, ostag, "Completed App Initialization: " + app, app);
                        logSummary.i(app_topic, ostag, "Building App: " + app, app);
                        await new BuildAppWindows(containerProps, createdLocation, appDescriptorInfo[app], appLogger).run();
                        logSummary.i(app_topic, ostag, "Completed App Build for " + app + ' for platform ' + Constants.OS.WINDOWS);
                    } catch (e) {
                        logSummary.e(app_topic, ostag, e.message, e);
                        logSummary.e(app_topic, ostag, "Could not build app: " + app + " for Windows");
                    }
                }
                await appLogger.flush(app);
                await logSummary.flush(app_topic);
            }

            let winTempPath = path.resolve(currDir,"scripts/internal/windows/temp"); 
            if(fsc.existsSync(winTempPath))
                fs.rmdirSync(winTempPath, { recursive: true });
                
        }


        logSummary.i("Container build finished");
        await logSummary.flush(SUMMARY_TOPIC);
        return 0;
    } catch (e) {
        logSummary.e(e.message, e);
        logSummary.e("Container build cancelled due to errors.");
        return 1;
    }



}

if(typeof v8debug === 'object' || /--debug|--inspect/.test(process.execArgv.join(' '))){
    console.log("Running in DEBUG mode")
    build();
}
module.exports = {
    build,
    loadBuildContainerProperties,
    getContainerProperties

}
