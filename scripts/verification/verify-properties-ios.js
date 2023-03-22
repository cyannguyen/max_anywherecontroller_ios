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
const iosPrrReqs = require('./prereqs.json').platforms.ios;
const { executeCmd, isSupportedVersion } = require('./utils.js');
const fsextra = require('fs-extra');
const klaw = require('klaw');
const moment = require('moment-timezone');
const fs = require('fs');


const currDir = process.cwd();
const homedir = require('os').homedir();

const verifyIOS = {
    //Dictionary of already read files
    //{bundleId: {profileName: }}
    provProfileCache: {},
    readAllProvisionProfiles: false,


    currentPlatformSupported: () => {

    },

    //Parses a .mobileprovision file in the signing folder and return the bundleId, team, expiration date, app type
    /*bundleId1:{
                profile:{
                    type:dev,
                    team:PETKK,
                    udid: 28378-237-2039823
                },
                profile:{
                    type:dist,
                    team: PETKK,
                    udid: 28378-237-2039823
                },
            bundleId2:{
                profile:{
                    type:dev,
                    team:PETKK,
                    udid: 28378-237-2039823
                                
                },
                profile:{
                    type:dist,
                    team: PETKK,
                    udid: 28378-237-2039823
                }
            }

    

            Also return the current details
            */
    getProvisioningDetails: async(filePath) => {
        let fileParts = filePath.split(path.sep)
        let fileName = fileParts.pop();
        let location = fileParts.join(path.sep);

        //Get Expiration Date
        let attribute = 'ExpirationDate'
        let expirationDate = await verifyIOS.extractAttributeFromProfile(attribute, fileName, location);
        expirationDate = expirationDate.trim();
        //discard if expired profile
        let parsedExpiration = moment(expirationDate, 'ddd MMM DD HH:mm:ss z YYYY');
        if (parsedExpiration < moment.now())
            return null;

        attribute = 'Entitlements:get-task-allow'
        let isDevProfile = await verifyIOS.extractAttributeFromProfile(attribute, fileName, location);
        isDevProfile = isDevProfile.trim() === "false" ? false : true;
        //Get the app prefix name
        attribute = 'ApplicationIdentifierPrefix:0'
        let appPrefix = await verifyIOS.extractAttributeFromProfile(attribute, fileName, location);
        appPrefix = appPrefix.trim()
            //Get the bundleId
        attribute = 'Entitlements:application-identifier'
        let buId = await verifyIOS.extractAttributeFromProfile(attribute, fileName, location);
        let bundleId = buId.replace(appPrefix.trim() + '.', '').trim();

        //Get uuid
        attribute = 'UUID'
        let uuid = await verifyIOS.extractAttributeFromProfile(attribute, fileName, location);
        uuid = uuid.trim();

        //Get Team ID
        attribute = 'TeamIdentifier:0'
        let teamID = await verifyIOS.extractAttributeFromProfile(attribute, fileName, location);
        teamID = teamID.trim();
        //Add to Cache. 
        let sObj = {};
        sObj[uuid] = {
            'bundleid': bundleId,
            'isDev': isDevProfile,
            'uuid': uuid,
            'teamID': teamID,
            'expirationDate': expirationDate,
            'filePath': filePath

        }
        if (!verifyIOS.provProfileCache[bundleId]) {
            verifyIOS.provProfileCache[bundleId] = sObj
        } else {
            verifyIOS.provProfileCache[bundleId][uuid] = sObj[uuid];
        }


        return {
            bundleId: {
                'bundleid': bundleId,
                'isDev': isDevProfile,
                'uuid': uuid,
                'teamID': teamID,
                'expirationDate': expirationDate,
                'filePath': filePath
            }
        }

    },

    extractAttributeFromProfile: (attributeName, filename, location) => {
        let cmd1 = "/usr/libexec/PlistBuddy -c 'Print :" + attributeName + "' ";
        let cmd2 = '/dev/stdin <<< $(security cms -D -i "' + filename + '")';

        let cmd = cmd1 + cmd2;
        return executeCmd(cmd, location);
    },

    installProfile: async(profileFullPath, uuid) => {

    	// let destPath = path.resolve(homedir, 'Library⁩/MobileDevice⁩/Provisioning Profiles')
        // await fsextra.ensureDir(destPath);
        // let toCopy = path.resolve(destPath, uuid + '.mobileprovision');
        // let profileAleadyInstalled = await fsextra.exists(toCopy);
        // if(!profileAleadyInstalled) {
        //     await fsextra.copy(profileFullPath, toCopy)
        //     //General belief is we don't need the command below, and copying prile to Users/use/Library should be enough(done above) 
        //     //but without xcode explicitly installing the profile into System/Library the build fails
        //     await executeCmd('open -g "' + profileFullPath + '"');
        // }

        let arg1 = uuid + '.mobileprovision';
        let arg2 = '"' + profileFullPath + '"'
        let cmd = 'ruby install_profile.rb ' + arg1 + ' ' + arg2;
        let location = path.resolve(currDir, 'scripts/internal/ios');
        try{
            fs.chmodSync(path.resolve(location, 'install_profile.rb'), 0o755);
        }catch(e){}
        await executeCmd(cmd, location);

    },

    findValidProvisioning: async(bundleid, profilesPath, preferDistributionProfile, preferWildcard, provisioningProfileName, log) => {
        log.i(null,null, "Searching for valid provisioning profile for: " + bundleid);
        let returnObj = { 'profile': null, 'warningSecurity': null, 'warningWildcard': null, 'error': null, 'found': false };
        if (provisioningProfileName) {
            //This profile should be in the signing folder in the MaximoAnywhereContainer
            let profileDetail = await this.getProvisioningDetails(provisioningProfileName, profilesPath);
            try {
                await verifyIOS.installProfile(path.resolve(profilesPath, provisioningProfileName), profileDetail.uuid);
            }catch(e){
                log.e(null, null, "Error installing profile. Continuing build")
            }
            returnObj.profile = profileDetail;
            return returnObj;
        }

        if (!bundleid) {
            throw new Error("Bundle Id cannot be null. Please check the app-descriptor.xml")
        }

        let profiles = [];
        if (!verifyIOS.readAllProvisionProfiles) {
            await verifyIOS.loadAllProvisioningProfile(profilesPath);
        }

        let provProfToTest = verifyIOS.loadQualifiedProvisioningProfiles(bundleid, verifyIOS.provProfileCache)

        let secProfiles = verifyIOS.getProfileSecurityType(provProfToTest, preferDistributionProfile);
        if (secProfiles.warning) {
            returnObj.warningSecurity = secProfiles.warning;
        }

        let idProfile = verifyIOS.getProfileIdType(secProfiles.profiles, preferWildcard);
        if (idProfile.warning) {
            returnObj.warningWildcard = idProfile.warning;
        }

        returnObj.profile = idProfile['profiles'][Object.keys(idProfile.profiles)[0]];
        if(!returnObj.profile){
            returnObj.found = false;
            returnObj.error = "No Valid provisioning profile found for bundleid: " + bundleid
        }else{
            try {
                await verifyIOS.installProfile(returnObj.profile.filePath, returnObj.profile.uuid);
            } catch (e) {
                log.w("Error installing profile. Continuing build ", e);
            }
            returnObj.found = true;
        }
       
        return returnObj;
    },

    loadQualifiedProvisioningProfiles: (bundleId, provProfiles) => {
        bundleIds = Object.keys(provProfiles);
        let returnObj = {};
        let qualBundleIds = bundleIds.filter(bid => {
            let wildCardToken = bid === '*'? '*': '.*'
            if (bid.indexOf(wildCardToken) > -1)
                return bundleId.indexOf(bid.replace(wildCardToken, '')) > -1
            else
                return bundleId === bid;
        });

        qualBundleIds.map(bid => {
            Object.assign(returnObj, provProfiles[bid]);
        })
        return returnObj;
    },

    getProfileSecurityType: (profiles, preferDist) => {
        let uuids = Object.keys(profiles);
        let warningMsgDist = "ios.binary.packageType property in Container.properties is not set to Development  which will prefer a distribution profile. A Distribution profile could not be found for this app. Using the available profile. If this was unintentional, please maintain the signing folder with the correct profiles"
        let warningMsgDev = "ios.binary.packageType property in Container.properties is set to Development which will  prefer a Development profile. A Development profile could not be found for this app. Using the available profile. If this was unintentional, please maintain the signing folder with the correct profiles"
        let returnObj = { 'profiles': {}, 'warning': null }
        let qualifiedUuids = null;
        let warning = null;
        if (preferDist) {
            let distUUIDS = uuids.filter(uuid => !profiles[uuid]['isDev']);
            if (distUUIDS.length > 0) {
                qualifiedUuids = distUUIDS;
            } else {
                qualifiedUuids = uuids;
                warning = warningMsgDist;
            }
        } else {
            let devUUIDS = uuids.filter(uuid => profiles[uuid]['isDev']);
            if (devUUIDS.length > 0) {
                qualifiedUuids = devUUIDS
            } else {
                qualifiedUuids = uuids;
                warning = warningMsgDev
            }
        }

        qualifiedUuids.map(uuid => {
            let obj = {}
            obj[uuid] = profiles[uuid]
            Object.assign(returnObj['profiles'], obj);
        })

        returnObj.warning = warning;
        return returnObj;


    },

    getProfileIdType: (profiles, preferWildCard) => {
        let uuids = Object.keys(profiles);
        let warningIdTypeExact = "ios.provisionprofile.type.wildcard property in Container.properties is set to false which will prefer an exact bundle id profile. An exact profile could not be found for this app. Using the available profile. If this was unintentional, please maintain the signing folder with the correct profiles"
        let warningIdTypeWildCard = "ios.provisionprofile.type.wildcard in Container.properties is set to true which will  prefer a wildcard profile. A wildcard profile could not be found for this app. Using the available profile. If this was unintentional, please maintain the signing folder with the correct profiles"
        let returnObj = { 'profiles': {}, 'warning': null }
        let qualifiedUuids = null;
        let warning = null;
        if (preferWildCard) {
            let wildCardUUIDS = uuids.filter(uuid => profiles[uuid]['bundleid'].indexOf('.*') > -1);
            if (wildCardUUIDS.length > 0) {
                qualifiedUuids = wildCardUUIDS;
            } else {
                qualifiedUuids = uuids;
                warning = warningIdTypeWildCard;
            }
        } else {
            let exactUUIDS = uuids.filter(uuid => profiles[uuid]['bundleid'].indexOf('.*') === -1);
            if (exactUUIDS.length > 0) {
                qualifiedUuids = exactUUIDS
            } else {
                qualifiedUuids = uuids;
                warning = warningIdTypeExact
            }
        }

        qualifiedUuids.map(uuid => {
            let obj = {}
            obj[uuid] = profiles[uuid]
            Object.assign(returnObj['profiles'], obj);
        })

        returnObj.warning = warning;
        return returnObj;


    },

    loadAllProvisioningProfile: async(profilesPath) => {

        function getAllPaths(profilesPath) {
            let profiles = [];
            return new Promise((resolve, reject) => {
                klaw(profilesPath, { 'depthLimit': 0 })
                    .on('readable', async function(l) {
                        let item = null;
                        while ((item = this.read())) {
                            //Log.i('item walk: ' + item.path);
                            if (item.stats.isFile() && item.path.indexOf('.mobileprovision') > -1) {
                                profiles.push(item.path);
                            }
                        }
                    })
                    .on('end', () => {
                        resolve(profiles)
                    });
            })
        }

        let pprofiles = await getAllPaths(profilesPath);
        return Promise.all(pprofiles.map(async profile => {
            await verifyIOS.getProvisioningDetails(profile);
        })).then(() => {
            verifyIOS.readAllProvisionProfiles = true;
            return verifyIOS.provProfileCache;
        })

    },

    verifyPlatformPreReqs: async(log) => {
        log.i(null,null, 'Verifying pre-requisites for iOS build')
        if (process.platform !== 'darwin') {
            throw new Error('Current operating system not supported for ios. Should be OSX');
        }
        try{
            let sdkvalid = await verifyIOS.verifyIOSSDK(log);
            if (!sdkvalid) {
                throw new Error("IOS sdk version requirement not met. Min Version: " + iosPrrReqs.iosSdk.minVersion);
            }
            let xcodevalid = await verifyIOS.verifyXCode(log);
            if (!xcodevalid) {
                throw new Error("Xcode version requirement not met. Min Version: " + iosPrrReqs.iosSdk.minVersion);
            }
        }catch(e){
            log.w("Could not validate iOS pre-requisites. Will proceed with build", e);
        }

        return true;
    },

    verifyIOSSDK: (log) => {
        log.i('Verify required SDK')
        let minVersion = iosPrrReqs.iosSdk.minVersion;
        let maxVersion = iosPrrReqs.iosSdk.maxVersion ? iosPrrReqs.iosSdk.maxVersion : null;
        let cmd = "xcodebuild -showsdks"
        return executeCmd(cmd, currDir, log).then((result) => {
            let sdkStringMatch = result.match(/iOS ([0-9]*[\.][0-9]*)/g);
            let found = sdkStringMatch.filter(s => s.indexOf('Simulator') === -1)
            let sdkString = found[0];
            if (!sdkString)
                return false
            let sdkVersion = sdkString.replace('iOS', '').trim();
            return isSupportedVersion(sdkVersion, minVersion, maxVersion);
        });
    },

    verifyXCode: (log) => {
        log.i('Verify XCode')
        let minVersion = iosPrrReqs.xcode.minVersion;
        let maxVersion = iosPrrReqs.xcode.maxVersion ? iosPrrReqs.xcode.maxVersion : null;
        let cmd = "xcodebuild -version"
        return executeCmd(cmd, currDir, log).then((result) => {
            let xcodeVersionStringMatch = result.match(/Xcode ([0-9]*[\.][0-9]*)/g);
            let xcodeVersionString = xcodeVersionStringMatch[0];
            if (!xcodeVersionString)
                return false;
            let xcodeVersion = xcodeVersionString.replace('Xcode', '').trim();
            return isSupportedVersion(xcodeVersion, minVersion, maxVersion);
        })
    }
}

module.exports = verifyIOS;
