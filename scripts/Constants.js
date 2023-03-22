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


const OS = {'ANDROID': 'android', 'IOS': 'ios', 'WINDOWS': 'windows'};
const BINARY_OUTPUT_FOLDER = 'bin'
const APP_OUTPUT_FOLDER = 'output'
const CONFIG_TEMPLATES_FOLDER = 'configs/cordova-config.xml';
const PACKAGE_JSON_TEMPLATE_FOLDER = 'configs/cordova-package.json';
const DOWNLOAD_COMPONENT_FOLDER = 'app-download';
const WEB_COMPONENT_FOLDER = 'webapp-updater';
const CORDOVA_PLATFORMS_FOLDER = 'platforms';
const PLUGINS_FOLDER ='plugins';
const PLUGIN_CONFIG_FILE = 'plugin-config.json'
const CORDOVA_PLATFORM_CONFIG_FILE = 'platforms-config.json';
const CORDOVA_PATH = '/node_modules/cordova/bin/cordova';
const LOGS_DIR = 'logs';
const BASE_APP_IMAGES_PATH = 'common/images';
const  PUSH_CERTIFICATE_NAME_ANDROID = 'google-services.json';
const  PUSH_CERTIFICATE_NAME_IOS = 'GoogleService-Info.plist';



module.exports = {
    OS,
    BINARY_OUTPUT_FOLDER, 
    APP_OUTPUT_FOLDER,
    CONFIG_TEMPLATES_FOLDER,
    PACKAGE_JSON_TEMPLATE_FOLDER,
    DOWNLOAD_COMPONENT_FOLDER,
    CORDOVA_PLATFORMS_FOLDER,
    PLUGINS_FOLDER,
    PLUGIN_CONFIG_FILE,
    CORDOVA_PLATFORM_CONFIG_FILE,
    CORDOVA_PATH,
    LOGS_DIR,
    BASE_APP_IMAGES_PATH,
    WEB_COMPONENT_FOLDER,
    PUSH_CERTIFICATE_NAME_ANDROID,
    PUSH_CERTIFICATE_NAME_IOS

}
