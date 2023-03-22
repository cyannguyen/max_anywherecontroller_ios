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

const utils = require('../utils.js');
const path = require('path');
const { OS } = require('../Constants.js');
const Constants = require('../Constants.js');
const { Log } = require('../utils.js');

const PropertiesReader = require('properties-reader');

const currDir = process.cwd();

class InitApp {
    constructor(containerProps, appName, baseAppPath, appDescriptorContents, defaultServer, platformsConfig, pluginsConfig, appLogger) {

        if (this.constructor === InitApp) {
            throw new TypeError('Abstract class "InitApp" cannot be instantiated directly.');
        }

        this.containerProps = containerProps;
        this.appDescriptorContents = appDescriptorContents;
        this.appName = appName;
        this.baseAppPath = baseAppPath;
        this.defaultServer = defaultServer;

        this.configLocation = path.resolve(currDir, Constants.CONFIG_TEMPLATES_FOLDER);
        this.packageJSONLocation = path.resolve(currDir, Constants.PACKAGE_JSON_TEMPLATE_FOLDER);
        this.downloadComponentPath = path.resolve(currDir, Constants.DOWNLOAD_COMPONENT_FOLDER);
        this.webappComponentPath = path.resolve(currDir, Constants.WEB_COMPONENT_FOLDER);
        this.cordovaPlatformsConfig = platformsConfig;
        this.cordovaPlatformLocation = path.resolve(currDir, Constants.CORDOVA_PLATFORMS_FOLDER);

        //Plugins Directory from where plugins will be installed
        this.pluginLocation = path.resolve(currDir, Constants.PLUGINS_FOLDER);
        this.pluginsConfig = pluginsConfig;

        this.outputLocation = path.resolve(currDir, Constants.APP_OUTPUT_FOLDER);

        this.memoizationTable = {};
        this.log = appLogger;


    }

    setConfigAttributes(document, descriptorDetails, memoizeName) {
        if (this.hasMemo(memoizeName, 'setConfigAttributes')) {
            return;
        }
        let widgetNode = document.getElementsByTagName('widget')[0];
        widgetNode.setAttribute('id', descriptorDetails.defaultPackageName);
        widgetNode.setAttribute('version', descriptorDetails.defaultVersion);

        //IJ28577
        if(descriptorDetails.ios.CFBundleVersion){
            widgetNode.setAttribute('ios-CFBundleVersion', descriptorDetails.ios.CFBundleVersion);
            this.log.i(null, null, 'IOS BUILD VERSION: ' + descriptorDetails.ios.CFBundleVersion);
        }

        let nameNode = document.getElementsByTagName('name')[0];
        nameNode.textContent = descriptorDetails.displayName;

        let descriptionNode = document.getElementsByTagName('description')[0];
        descriptionNode.textContent = descriptorDetails.description;

        let authorNode = document.getElementsByTagName('author')[0];
        if (descriptorDetails['author']['name'])
            authorNode.textContent = descriptorDetails['author']['name'];

        if (descriptorDetails['author']['email'])
            authorNode.setAttribute('email', descriptorDetails['author']['email']);

        let srcNode = document.getElementsByTagName('content')[0];
        srcNode.setAttribute('src', descriptorDetails.mainFile);

        return document;
    }

    prepareConfigXML(platformConfigPath, descriptorDetails, outputLocation, memoizeName) {
        if (this.hasMemo(memoizeName, 'prepareConfigXML')) {
            return;
        }
        //Load the config file
        let readFile = util.promisify(fs.readFile);
        return readFile(platformConfigPath).then((configXml, err) => {
            if (err) {
                throw err;
            }

            const jsdom = new JSDOM(configXml, { contentType: 'text/xml' });
            //const {window: {document, XMLSerializer}} = new JSDOM(configXml);

            const { window } = jsdom;
            const { document } = window;

            //Should we use XPath?

            this.setConfigAttributes(document, descriptorDetails, memoizeName);

            //let output = (new XMLSerializer()).serializeToString(widgetNode);
            let output = "<!--?xml version='1.0' encoding='utf-8'?-->" + '\n' + window.document.documentElement.outerHTML;
            let writeFile = util.promisify(fs.writeFile);
            return writeFile(path.resolve(outputLocation, 'config.xml'), output);

        });
    }

    hasMemo(memoizeName, funcName) {
        if (!memoizeName) {
            return false
        }
        if (InitApp.memTable[memoizeName] && InitApp.memTable[memoizeName].indexOf(funcName) > -1) {
            return true;
        } else {
            if (!InitApp.memTable[memoizeName]) {
                InitApp.memTable[memoizeName] = [];
            }
            InitApp.memTable[memoizeName].push(funcName);
            return false;
        }
    }

    prepareWWWW(platformDownloadComponentPath, outputLocation, memoizeName) {
        if (this.hasMemo(memoizeName, 'prepareWWWW')) {
            return;
        }

        let wwwPath = path.resolve(outputLocation, 'www/', );

        //for some reason await inside try catch doesnt wait for ones outside.
        return fsc.ensureDir(wwwPath).catch(async e => {
            if (e.code !== 'EEXIST')
                throw e;

        }).then(() => {
            return fsc.copy(path.resolve(platformDownloadComponentPath), wwwPath);
        });
    }

    prepareWWWWforWebApp(platformDownloadComponentPath, baseAppPath, outputLocation, memoizeName) {
        if (this.hasMemo(memoizeName, 'prepareWWWWforWebApp')) {
            return;
        }

        let wwwPath = path.resolve(outputLocation, 'www/', );
        let unzipPath = path.resolve(baseAppPath, '../../bin/' + baseAppPath.split(path.sep).pop() + '.zip')
        //for some reason await inside try catch doesnt wait for ones outside.
        return fsc.ensureDir(wwwPath).catch(async e => {
            if (e.code !== 'EEXIST')
                throw e;

        }).then(async () => {
            let wwwOutpath = path.resolve((platformDownloadComponentPath), wwwPath);
            await fsc.copy(platformDownloadComponentPath, wwwPath);
            await utils.unzip(unzipPath,wwwOutpath);
        });
    }

    async editWebIndexHtml(appPath, serverUrl, baseAppPath, memoizeName) {

        if (this.hasMemo(memoizeName, 'editWebIndexHtml')) {
            return;
        }
        if (!serverUrl)
            return;
        let indexHTMLPath = path.resolve(appPath, "www/index.html")
        let indexFile = fs.readFileSync(indexHTMLPath, "utf-8");

        let checksumPath = path.resolve(appPath, 'www', this.appName+ '.checksum');
        let checksumFile = null;
        let datechecksum = "";

        try{
            checksumFile = fs.readFileSync(checksumPath, "utf-8");
            datechecksum = checksumFile.match(/(deployeddatetime=)(\d{0,4}-\d{0,2}-\d{0,2}\ \d{0,2}\:\d{0,2}\:\d{0,2}\.\d{0,3})/)[2];
        }catch(ex){
            throw ex
        }
        
        let appXml = path.resolve(baseAppPath, "artifact/app.xml")
        let appXmlFile = fs.readFileSync(appXml, "utf-8");
        let appstring = /<message\s*?defaultMessage="(.+?)"\s*id="applicationName"\s*\/>/;
        let appIDstring = /<app[\s\S]+?id="(.+?)"[\s\S]+?>/;
        let appVal;
        let appIDVal;
        try{
            appVal = appXmlFile.match(appstring)[1];
            
        }catch(e){
            this.log.e("Error parsing applicationName in the app.xml in <messages> section. Please ensure the tag with id='applicationName' is contained in a single line");
            throw e
        }
        
        try{
            appIDVal = appXmlFile.match(appIDstring)[1];
        }catch(e){
            this.log.e(e.message, e);
            throw e
        }

        const jsdom = new JSDOM(indexFile);
        const { window } = jsdom;
        const { document } = window;

        var s = document.createElement("script");
        s.setAttribute('id', 'maxurl');
        s.innerHTML = 'window.webAppRuntime=true; \n window.checksum = "' + datechecksum + '"\n' +
                        'window.AnywhereAppID = "' + appIDVal + '"\n' +
                        "localStorage.setItem('maximo_url','" + serverUrl + "')\n"
        var head = document.getElementsByTagName("head");

        head[0].insertBefore(s, head[0].firstElementChild);

        let downloadAnchor = document.getElementById('downloaddanchor');
        let nodeToInsert = ["js/appdownloadWeb.js", 
                            "js/lib/jquery-i18n/languages/ml.js","js/lib/jquery-i18n/languages/fi.js",
                            "js/lib/jquery-i18n/languages/he.js","js/lib/jquery-i18n/jquery.i18n.language.js",
                            "js/lib/jquery-i18n/jquery.i18n.emitter.js", "js/lib/jquery-i18n/jquery.i18n.parser.js",
                            "js/lib/jquery-i18n/jquery.i18n.fallbacks.js", "js/lib/jquery-i18n/jquery.i18n.messagestore.js",
                            "js/lib/jquery-i18n/jquery.i18n.js"]

        nodeToInsert.map(node =>{
            let scrNode = document.createElement("script");
            scrNode.setAttribute('type', 'text/javascript');
            scrNode.setAttribute('src', node);
            let newLineNode = document.createTextNode('\n')
            downloadAnchor.parentNode.insertBefore(newLineNode, downloadAnchor.nextSibling);
            downloadAnchor.parentNode.insertBefore(scrNode, downloadAnchor.nextSibling);

        });
       
        var output = "<!doctype html>" + '\n' + window.document.documentElement.outerHTML;
        let writeFile = util.promisify(fs.writeFile);
        await writeFile(indexHTMLPath, output);

    }

    async editIndexHtml(appPath, serverUrl, baseAppPath, memoizeName) {

        if (this.hasMemo(memoizeName, 'setDeaultMaxServer')) {
            return;
        }
        if (!serverUrl)
            return;
        let indexHTMLPath = path.resolve(appPath, "www/index.html")
        let indexFile = fs.readFileSync(indexHTMLPath, "utf-8");

        let appXml = path.resolve(baseAppPath, "artifact/app.xml")
        let appXmlFile = fs.readFileSync(appXml, "utf-8");
        let appstring = /<message\s*?defaultMessage="(.+?)"\s*id="applicationName"\s*\/>/;
        let appIDstring = /<app[\s\S]+?id="(.+?)"[\s\S]+?>/;
        let appVal;
        let appIDVal;
        try{
            appVal = appXmlFile.match(appstring)[1];

        }catch(e){
            this.log.e("Error parsing applicationName in the app.xml in <messages> section. Please ensure the tag with id='applicationName' is contained in a single line", e);
            throw e
        }
        
        try{
            appIDVal = appXmlFile.match(appIDstring)[1];
        }catch(e){
            this.log(e.message, e);
            throw e
        }

        const jsdom = new JSDOM(indexFile);
        const { window } = jsdom;
        const { document } = window;

        var s = document.createElement("script");
        s.setAttribute('id', 'maxurl');
        s.innerHTML = 'window.AnywhereAppID = "' + appIDVal + '"' + "\n localStorage.setItem('maximo_url','" + serverUrl + "')\n"
        var head = document.getElementsByTagName("head");

        head[0].insertBefore(s, head[0].firstElementChild)
        //head[0].appendChild(s);

        var s = document.getElementById("title");
        s.innerHTML = appVal;

        
        
        var output = "<!doctype html>" + '\n' + window.document.documentElement.outerHTML;
        let writeFile = util.promisify(fs.writeFile);
        await writeFile(indexHTMLPath, output);

    }

    async setMainIcon(appPath, baseAppPath, memoizeName){
        
        if (this.hasMemo(memoizeName, 'setMainIcon')) {
            return;
        }
        let targetImagePath = path.resolve(appPath, 'www/img/mx_icon.svg');
        let srcImagePath = path.resolve(baseAppPath, 'common/images/mdpi/app_icon_main.svg');

		let targetBDPOCImagePath = path.resolve(appPath, 'www/img/BDPOCLogo.png');
        let srcBDPOCImagePath = path.resolve(baseAppPath, 'common/images/mdpi/BDPOCLogo.png');

        let srcPathExsists = await fsc.exists(srcImagePath);
        //If custom apps do not have its own image, fallback to default image
        if(!srcPathExsists){
            srcImagePath = path.resolve(currDir, 'images/app/app_icon_main.svg');
        }
		
		fsc.copy(srcBDPOCImagePath, targetBDPOCImagePath);
        
        return fsc.copy(srcImagePath, targetImagePath);
    }

    preparePackageJSON(platformPJsonPath, descriptorDetails, outputLocation, memoizeName) {

        if (this.hasMemo(memoizeName, 'preparePackageJSON')) {
            return;
        }
        let pjson = require(platformPJsonPath);
        pjson.name = descriptorDetails.defaultPackageName;
        pjson.displayName = descriptorDetails.displayName;
        pjson.version = descriptorDetails.defaultVersion;
        pjson.description = descriptorDetails.description;
        pjson.main = descriptorDetails.mainFile;

        let output = JSON.stringify(pjson, null, 2);
        let writeFile = util.promisify(fs.writeFile);
        return writeFile(path.resolve(outputLocation, 'package.json'), output)
    }

    runNPMInstall(outputAppDir, memoizeName) {
        if (this.hasMemo(memoizeName, 'runNPMInstall')) {
            return;
        }
        let cmd = 'npm install'
        return utils.executeCmd(cmd, outputAppDir, this.log)
    }

    async installPlugins(platformPluginPath, pluginsConfig, appPath, memoizeName, excludePush) {
        if (this.hasMemo(memoizeName, 'installPlugins')) {
            return;
        }

        let pluginsToInstall = Object.keys(pluginsConfig);

        return Promise.all(pluginsToInstall.map(async plugin => {
            let pluginPath = path.resolve(platformPluginPath, plugin);
            let appPluginPath = path.resolve(appPath, 'plugins');

            if(excludePush && plugin === 'cordova-plugin-maximo-pushnotification'){
                return 
            }

            return fsc.ensureDir(appPluginPath).catch(e => {
                if (e.code !== 'EEXIST')
                    throw e;
            }).then(() => {
                return fsc.copy(pluginPath, path.resolve(appPluginPath, plugin));
            })

        }));

    }

    //Abstract function. Subclasses will implement
    async installPlatform(platformPath, platformConfig, appPath) {
        throw new Error('Should implement in subclass');
    }

    //Abstract function. Subclasses will implement
    async copyPushCertificate(baseAppPath, targetPath) {
        console.info('Should implement in subclass');
    }

    async pushCertificateExsists(){
        console.info('Should implement in subclass');
    }

    async copyImageResources(baseAppPath, descriptorDetails, outputLocation, memoizeName) {
        //Don't need below code..Subclasses will take care of this
        // if(this.hasMemo(memoizeName, 'copyImageResources')){
        //     return;
        // }
        // let srcIconPath = path.resolve(baseAppPath, Constants.BASE_APP_IMAGES_PATH)
        // let targetPath = path.resolve(outputLocation, 'images');
        // try{
        //     await fsc.ensureDir(targetPath);
        // }catch(e){
        //     if(e.code !== 'EEXIST')
        //         throw e;
        // }
        // await fsc.copy(srcIconPath, targetPath);
    }

    async copyHooks(outputLocation, memoizeName) {
        if (this.hasMemo(memoizeName, 'copyHooks')) {
            return;
        }
        let srcHooksPath = path.resolve(currDir, 'hooks');
        let targetPath = path.resolve(outputLocation, 'hooks');
        try {
            await fsc.ensureDir(targetPath);
        } catch (e) {
            if (e.code !== 'EEXIST')
                throw e;
        }
        await fsc.copy(srcHooksPath, targetPath);
    }


    async run(clean) {
        this.log.i("Initializing App " + this.appName);
        let appCreateLocation = path.resolve(this.outputLocation, this.appName);
        if (clean && !this.hasMemo(this.appName, 'run-clean'))
            await fsc.remove(appCreateLocation);
        try {
            await fsc.ensureDir(appCreateLocation);
        } catch (e) {
            if (e.code !== 'EEXIST')
                throw e;
        }
        if(this.containerProps['webContentInclude'])
            await this.prepareWWWWforWebApp(this.webappComponentPath, this.baseAppPath, appCreateLocation, this.appName);
        else
            await this.prepareWWWW(this.downloadComponentPath, appCreateLocation, this.appName);
        await this.copyImageResources(this.baseAppPath, this.appDescriptorContents, appCreateLocation, this.appName);
        await this.copyHooks(appCreateLocation, this.appName);

        let configPrep = this.prepareConfigXML(this.configLocation, this.appDescriptorContents, appCreateLocation, this.appName);
        let packageJSONPrep = this.preparePackageJSON(this.packageJSONLocation, this.appDescriptorContents, appCreateLocation, this.appName);


        return Promise.all([configPrep, packageJSONPrep]).then(async() => {
            try{
                this.log.i('Initializing app directory')
                await this.runNPMInstall(appCreateLocation, this.appName);
                this.log.i("Prepare entry page");
                if(this.containerProps['webContentInclude'])
                    await this.editWebIndexHtml(appCreateLocation, this.defaultServer, this.baseAppPath, this.appName);
                else
                    await this.editIndexHtml(appCreateLocation, this.defaultServer, this.baseAppPath, this.appName);
                await this.setMainIcon(appCreateLocation, this.baseAppPath, this.appName);
                let certFileExsist = await this.pushCertificateExsists();
                let properties = PropertiesReader(this.baseAppPath + '/app-feature.properties');
                let certExsist = certFileExsist && (properties.get('pushnotification.enabled') || properties.get('pushnotification.enabled') === 'true');
                this.log.i("Push enabled: " + certExsist);
                await this.installPlugins(this.pluginLocation, this.pluginsConfig, appCreateLocation, this.appName, !certExsist);
                await this.installPlatform(this.cordovaPlatformLocation, this.cordovaPlatformsConfig, appCreateLocation);
                await this.copyPushCertificate(this.baseAppPath, appCreateLocation);
                
                return appCreateLocation;
            }catch(ex){
                throw ex;
            }
        }).catch((ex) => {
            //Log.e(ex);
            throw ex;
        })
    }
}

InitApp.memTable = {};

module.exports = InitApp;
