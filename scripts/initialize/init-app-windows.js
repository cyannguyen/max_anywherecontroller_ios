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
const { JSDOM } = require( 'jsdom' );
const util = require('util');
const fsc = require('fs-extra');
const InitApp = require('./init-app.js');
const utils = require('../utils.js');
const path = require('path');
const { OS, CORDOVA_PLATFORM_CONFIG_FILE, CORDOVA_PATH, BASE_APP_IMAGES_PATH } = require('../Constants.js');

const currDir = process.cwd();

class InitAppWindows extends InitApp  {
    constructor(containerProps, appName, appPath, appDescriptorContents, defaultServer, appBaseDir, platformsConfig, pluginsConfig, logger){
        super(containerProps, appName, appPath, appDescriptorContents, defaultServer, appBaseDir, platformsConfig, pluginsConfig, logger);
    }

    async copyImageResources(baseAppPath, descriptorDetails, outputLocation, memoizeName) { 
        let srcIconPath = path.resolve(baseAppPath, BASE_APP_IMAGES_PATH, 'windows');
        let imgExsist = await fsc.exists(path.resolve(srcIconPath, 'icon/Square150x150Logo.scale-100.png'));
        if (!imgExsist)
            srcIconPath = path.resolve(currDir, 'images', 'windows');
        let targetPath = path.resolve(outputLocation, 'images/windows');
        try {
            await fsc.ensureDir(targetPath);
        } catch (e) {
            if (e.code !== 'EEXIST')
                throw e;
        }
        await fsc.copy(srcIconPath, targetPath);
    }

    async prepareWWWW(platformDownloadComponentPath, outputLocation){
        //In windows there is no platform download component. The app itself is copied over from MAximoANywhere/bin folder

        let wwwPath = path.resolve(outputLocation, 'www/',);
        let appZipPath = path.resolve(this.baseAppPath, '../../bin/', this.appName + '.zip')
        let zipExists = await fsc.exists(appZipPath);
        if(!zipExists)
            throw new Error("App zip does not exist. Try building the Anywhere web content");
        //for some reason await inside try catch doesnt wait for ones outside.
        return fsc.ensureDir(wwwPath).catch(async e =>{
            if(e.code !== 'EEXIST')
                throw e;
            
        }).then(()=>{
            return utils.unzip(appZipPath, wwwPath);
        });
    }
    

    async installPlatform(cordovaPlatformPath, platformsConfig, createAppPath) {
        let platformPath = path.resolve(cordovaPlatformPath, 'windows', platformsConfig.platforms.windows.name)
        let cdvCommand = path.resolve(currDir + CORDOVA_PATH);
        let cmd = cdvCommand + ' platform add ' + platformPath + ' --force'
        return utils.executeCmd(cmd, createAppPath, this.log);
        
    }

    async copyWinJS(outputLocation){
        let destinationPath = path.resolve(outputLocation, 'platforms/windows/platform_www/WinJS/js/base.js');
        let destinationPath2 = path.resolve(outputLocation, 'platforms/windows/www/WinJS/js');
        let srcpath = path.resolve(outputLocation, 'node_modules/winjs/js/base.js');
        await fsc.copy(srcpath, destinationPath);
        await fsc.ensureDir(destinationPath2);
        await fsc.copy(srcpath, path.resolve(destinationPath2, 'base.js'));
    }

    async changeVCLibVersionInJSProj(outputLocation){
        let filePath = path.resolve(outputLocation, 'platforms/windows',  'CordovaApp' + '.Windows10.jsproj' );
        let indexFile = fs.readFileSync(filePath, "utf-8");
        const jsdom = new JSDOM( indexFile, {contentType:'text/xml'} );
        const { window } = jsdom;
        const { document } = window;

        let sdkrefs = document.getElementsByTagName('SDKReference');
        
        for(let i =0; i < sdkrefs.length; i++){
            if(sdkrefs[i].getAttribute('Include') === 'Microsoft.VCLibs, Version=12.0'){
                let arch = sdkrefs[i].getAttribute('Condition')
                if (arch.indexOf('x64') > -1 || arch.indexOf('x86') > -1 || arch.indexOf('ARM') > -1) {
                    sdkrefs[i].setAttribute('Include', 'Microsoft.VCLibs, Version=14.0');
                }
            }
        }

        let output = "<!--?xml version='1.0' encoding='utf-8'?-->" + '\n' + window.document.documentElement.outerHTML
        await fsc.remove(filePath);
        let writeFile = util.promisify(fs.writeFile);
        return writeFile( filePath, output);

    }

    //Override since windows dowesnt have download component edits.
    //Remove memoize
    async editIndexHtml(appPath, serverUrl, baseAppPath, memoizeName) {

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
            console.log("Error parsing applicationName in the app.xml in <messages> section. Please ensure the tag with id='applicationName' is contained in a single line");
        }
        
        try{
            appIDVal = appXmlFile.match(appIDstring)[1];
        }catch(e){
            console.log(e);
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

        
        
        var output = "<!doctype html>" + '\n' + window.document.documentElement.outerHTML;
        let writeFile = util.promisify(fs.writeFile);
        await writeFile(indexHTMLPath, output);

    }


    //Overiding run from init-app.js since windows needs special care
    async run(clean){
        this.log.i("Initializing App " + this.appName);
        let appCreateLocation = path.resolve(this.outputLocation, this.appName);
        if(clean && !this.hasMemo(this.appName, 'run-clean'))
            await fsc.remove(appCreateLocation);
        try{
            await fsc.ensureDir(appCreateLocation);
        }catch(e){
            if(e.code !== 'EEXIST')
                throw e;
        }
        await this.prepareWWWW(this.downloadComponentPath, appCreateLocation, this.appName);
        await this.copyImageResources(this.baseAppPath, this.appDescriptorContents, appCreateLocation);
        await this.copyHooks(appCreateLocation, this.appName);
        let configPrep = this.prepareConfigXML(this.configLocation,  this.appDescriptorContents, appCreateLocation, this.appName);
        let packageJSONPrep = this.preparePackageJSON(this.packageJSONLocation, this.appDescriptorContents, appCreateLocation, this.appName);
        

        return Promise.all([configPrep, packageJSONPrep]).then( async () =>{
            
            await this.runNPMInstall(appCreateLocation, this.appName);
            await this.editIndexHtml(appCreateLocation, this.defaultServer, this.baseAppPath, this.appName);
            await this.installPlugins(this.pluginLocation, this.pluginsConfig, appCreateLocation, this.appName);
            await this.installPlatform(this.cordovaPlatformLocation, this.cordovaPlatformsConfig, appCreateLocation);
            //This is a workaround for bug in cordova #341 which is actively being fixed as of this writing
            //TODO: Remove this workaround 
            await new Promise((resolve, reject) => {
                setTimeout(()=>{
                    resolve()
                }, 3000)
            });

            await this.copyWinJS(appCreateLocation);
            // Ensuring backward compatibility with MS Visual Studio 2015
            let vsReleaseVersion = this.containerProps[OS.WINDOWS]['vsReleaseVersion'];

            if (vsReleaseVersion.indexOf("15") > -1) {
                //Enable the line below to support vs 2017 with cordova-windows 7 and jsonstore plugins
                await this.changeVCLibVersionInJSProj(appCreateLocation);
            }

            return appCreateLocation;
        }).catch((ex)=>{
            this.log.e(ex.message,ex);
            throw ex;
        })
    }

}

 module.exports = InitAppWindows;
