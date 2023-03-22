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
const { OS, CORDOVA_PLATFORM_CONFIG_FILE, CORDOVA_PATH, BASE_APP_IMAGES_PATH, PUSH_CERTIFICATE_NAME_ANDROID } = require('../Constants.js');

const currDir = process.cwd();

class InitAppAndroid extends InitApp {
    constructor(containerProps, appName, appPath, appDescriptorContents, defaultServer, appBaseDir, platformsConfig, pluginsConfig, logger) {
        super(containerProps, appName, appPath, appDescriptorContents, defaultServer, appBaseDir, platformsConfig, pluginsConfig, logger);

    }



    async installPlatform(cordovaPlatformPath, platformsConfig, createAppPath) {
        let platformPath = path.resolve(cordovaPlatformPath, 'android', platformsConfig.platforms.android.name)
        let cdvCommand = path.resolve(currDir + CORDOVA_PATH);
        let cmd = cdvCommand + ' platform add ' + platformPath + ' --force'
        await utils.executeCmd(cmd, createAppPath, this.log);
        
        //Copy Gradle to local if gradle home invalid path
        if(process.env['GRADLE_SPACE_EXS']){
            let gradlePath = path.resolve(createAppPath, 'platforms/android/gradle/wrapper/');
            await fsc.ensureDir(gradlePath);
            await fsc.copy(process.env['GRADLE_SPACE_EXS'], path.resolve(gradlePath, process.env['CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL']));
        }
        this.updateGradleProperties(createAppPath);
    }

    updateGradleProperties(gradlePath) {
        let gradlePropFile = path.join(gradlePath, '../../scripts/internal/android/', 'gradle.properties');
        let outputGradlePropFile = path.join(gradlePath, 'platforms/android/', 'gradle.properties');
        fsc.copyFile(
            path.resolve(gradlePropFile),
            path.resolve(outputGradlePropFile)
        );
        this.filePropertiesCorrection(gradlePath);
    }

    filePropertiesCorrection(gradlePath) {
        // Updating these files only if Android-30 or higher is being used
        if (parseInt(this.containerProps[OS.ANDROID]['buildSDKVersion'].split("-")[1]) >= 30) {
            var self = this;
            // MaximoAnywhereContainer/output/WorkExecution/platforms/android/project.properties (target=android-30)
            console.log('  [INFO]  Updating target in platforms/android/project.properties');
            fs.readFile(path.join(gradlePath, 'platforms/android/', 'project.properties'), 'utf8', function (err,data) {
                if (err) {
                    return console.log(err + " file " + path.join(gradlePath, 'platforms/android/', 'project.properties'));
                }
                var result = data.replace(/target=android-28/g, 'target=android-' + self.containerProps[OS.ANDROID]['buildSDKVersion'].split("-")[1]);

                fs.writeFile(path.join(gradlePath, 'platforms/android/', 'project.properties'), result, 'utf8', function (err) {
                    if (err) return console.err(err + " file " + path.join(gradlePath, 'platforms/android/', 'project.properties'));
                });
            });

            // MaximoAnywhereContainer/output/WorkExecution/platforms/android/CordovaLib/project.properties (target=android-30)
            console.log('  [INFO]  Updating target in platforms/android/CordovaLib/project.properties');
            fs.readFile(path.join(gradlePath, 'platforms/android/CordovaLib/', 'project.properties'), 'utf8', function (err,data) {
                if (err) {
                    return console.log(err + " file " + path.join(gradlePath, 'platforms/android/CordovaLib/', 'project.properties'));
                }
                var result = data.replace(/target=android-28/g, 'target=android-' + self.containerProps[OS.ANDROID]['buildSDKVersion'].split("-")[1]);

                fs.writeFile(path.join(gradlePath, 'platforms/android/CordovaLib/', 'project.properties'), result, 'utf8', function (err) {
                    if (err) return console.err(err + " file " + path.join(gradlePath, 'platforms/android/CordovaLib/', 'project.properties'));
                });
            });

            // MaximoAnywhereContainer/output/WorkExecution/platforms/android/CordovaLib/build.gradle (classpath 'com.android.tools.build:gradle:4.0.1')
            console.log('  [INFO]  Updating classpath in platforms/android/CordovaLib/build.gradle');
            fs.readFile(path.join(gradlePath, 'platforms/android/CordovaLib/', 'build.gradle'), 'utf8', function (err,data) {
                if (err) {
                    return console.log(err + " file " + path.join(gradlePath, 'platforms/android/CordovaLib/', 'build.gradle'));
                }
                var result = data.replace(/com.android.tools.build:gradle:3.3.0/g, 'com.android.tools.build:gradle:4.0.1');

                fs.writeFile(path.join(gradlePath, 'platforms/android/CordovaLib/', 'build.gradle'), result, 'utf8', function (err) {
                    if (err) return console.err(err + " file " + path.join(gradlePath, 'platforms/android/CordovaLib/', 'build.gradle'));
                });
            });

            // MaximoAnywhereContainer/output/WorkExecution/platforms/android/build.gradle (classpath 'com.android.tools.build:gradle:4.0.1')
            console.log('  [INFO]  Updating classpath in platforms/android/build.gradle');
            fs.readFile(path.join(gradlePath, 'platforms/android/', 'build.gradle'), 'utf8', function (err,data) {
                if (err) {
                    return console.log(err + " file " + path.join(gradlePath, 'platforms/android/', 'build.gradle'));
                }
                var result = data.replace(/com.android.tools.build:gradle:3.3.0/g, 'com.android.tools.build:gradle:4.0.1');

                fs.writeFile(path.join(gradlePath, 'platforms/android/', 'build.gradle'), result, 'utf8', function (err) {
                    if (err) return console.err(err + " file " + path.join(gradlePath, 'platforms/android/', 'build.gradle'));
                });
            });

            // MaximoAnywhereContainer/output/WorkExecution/platforms/android/app/build.gradle (classpath 'com.android.tools.build:gradle:4.0.1' and gradleVersion = '6.5')
            console.log('  [INFO]  Updating classpath in platforms/android/app/build.gradle');
            fs.readFile(path.join(gradlePath, 'platforms/android/app/', 'build.gradle'), 'utf8', function (err,data) {
                if (err) {
                    return console.log(err + " file " + path.join(gradlePath, 'platforms/android/app/', 'build.gradle'));
                }
                var result = data.replace(/com.android.tools.build:gradle:3.3.0/g, 'com.android.tools.build:gradle:4.0.1').replace(/4.10.3/g,'6.5');
                result = result.replace(/lintOptions {/g,'lintOptions { checkReleaseBuilds false');

                fs.writeFile(path.join(gradlePath, 'platforms/android/app/', 'build.gradle'), result, 'utf8', function (err) {
                    if (err) return console.err(err + " file " + path.join(gradlePath, 'platforms/android/app/', 'build.gradle'));
                });
            });

            // MaximoAnywhereContainer/output/WorkExecution/platforms/android/cordova/lib/builders/ProjectBuilder.js (gradle-6.5-all.zip)
            console.log('  [INFO]  Updating gradle version in platforms/android/cordova/lib/builders/ProjectBuilder.js');
            fs.readFile(path.join(gradlePath, 'platforms/android/cordova/lib/builders/', 'ProjectBuilder.js'), 'utf8', function (err,data) {
                if (err) {
                    return console.log(err + " file " + path.join(gradlePath, 'platforms/android/cordova/lib/builders/', 'ProjectBuilder.js'));
                }
                var result = data.replace(/gradle-4.10.3-all.zip/g, 'gradle-6.5-all.zip');

                fs.writeFile(path.join(gradlePath, 'platforms/android/cordova/lib/builders/', 'ProjectBuilder.js'), result, 'utf8', function (err) {
                    if (err) return console.err(err + " file " + path.join(gradlePath, 'platforms/android/cordova/lib/builders/', 'ProjectBuilder.js'));
                });
            });

            // MaximoAnywhereContainer/output/WorkExecution/platforms/android/gradle.properties (android.useDeprecatedNdk)
            console.log('  [INFO]  Updating android.useDeprecatedNdk version in platforms/android/gradle.properties');
            fs.readFile(path.join(gradlePath, 'platforms/android/', 'gradle.properties'), 'utf8', function (err,data) {
                if (err) {
                    return console.log(err + " file " + path.join(gradlePath, 'platforms/android/', 'gradle.properties'));
                }
                var result = data.replace(/android.useDeprecatedNdk=true/g, '');

                fs.writeFile(path.join(gradlePath, 'platforms/android/', 'gradle.properties'), result, 'utf8', function (err) {
                    if (err) return console.err(err + " file " + path.join(gradlePath, 'platforms/android/', 'gradle.properties'));
                });
            });

            // /MaximoAnywhereContainer/output/WorkExecution/platforms/android/cordova/lib/config/GradlePropertiesParser.js (android.useDeprecatedNdk)
            console.log('  [INFO]  Updating android.useDeprecatedNdk version in platforms/android/cordova/lib/config/GradlePropertiesParser.js');
            fs.readFile(path.join(gradlePath, 'platforms/android/cordova/lib/config/', 'GradlePropertiesParser.js'), 'utf8', function (err,data) {
                if (err) {
                    return console.log(err + " file " + path.join(gradlePath, 'platforms/android/cordova/lib/config/', 'GradlePropertiesParser.js'));
                }
                var result = data.replace(/'android.useDeprecatedNdk': 'true'/g, "//'android.useDeprecatedNdk': 'true'");

                fs.writeFile(path.join(gradlePath, 'platforms/android/cordova/lib/config/', 'GradlePropertiesParser.js'), result, 'utf8', function (err) {
                    if (err) return console.err(err + " file " + path.join(gradlePath, 'platforms/android/cordova/lib/config/', 'GradlePropertiesParser.js'));
                });
            });
        }
    }

    async pushCertificateExsists(){
        return fsc.exists(path.resolve(this.baseAppPath, 'pushcertificate/android', PUSH_CERTIFICATE_NAME_ANDROID));
    }


    async copyPushCertificate(baseAppPath, targetPath) {
        let certExsist = await fsc.exists(
        					path.resolve(baseAppPath, 'pushcertificate/android', PUSH_CERTIFICATE_NAME_ANDROID));
        if (certExsist){
            try {
                await fsc.copyFile(
                	path.resolve(baseAppPath, 'pushcertificate/android/', PUSH_CERTIFICATE_NAME_ANDROID),
                	path.resolve(targetPath,  'platforms/android/app/', PUSH_CERTIFICATE_NAME_ANDROID));
            } catch (e) {
              
                throw e;
            }
        }
        
    }

    async copyImageResources(baseAppPath, descriptorDetails, outputLocation, memoizeName) {
        let srcIconPath = path.resolve(baseAppPath, BASE_APP_IMAGES_PATH, 'android');
        let imgExsist = await fsc.exists(path.resolve(srcIconPath, 'icon/drawable-hdpi-icon.png'));
        if (!imgExsist)
            srcIconPath = path.resolve(currDir, 'images', 'android');
        let targetPath = path.resolve(outputLocation, 'images/android');
        try {
            await fsc.ensureDir(targetPath);
        } catch (e) {
            if (e.code !== 'EEXIST')
                throw e;
        }
        await fsc.copy(srcIconPath, targetPath);
    }

}

module.exports = InitAppAndroid;
