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

const scriptutils = require('./utils.js');
const fs = require('fs-extra');
const fsc = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const util = require('util');



class ContainerBuild{
    
    constructor(containerLocation, appToBuild, ){
        this.containerLocation = containerLocation;
        this.appToBuild = appToBuild;
        this.outputLocation = path.resolve(containerLocation, 'output');
    }

    copyWWW(){

        let wwwSrcPath = path.resolve(this.containerLocation, 'app-download');
        let wwwDestPath = path.resolve(this.outputLocation, this.appToBuild, 'www');

        //for some reason await inside try catch doesnt wait for ones outside.
        return fs.ensureDir(wwwDestPath).catch(async e => {
            if (e.code !== 'EEXIST')
                throw e;

        }).then(() => {
            return fs.copy(wwwSrcPath, wwwDestPath);
        });
    }
    
    
    async prepIndexHtml(serverUrl){

        if (!serverUrl)
            return;
        let indexHTMLPath = path.resolve(this.outputLocation, this.appToBuild, 'www/index.html');
        let indexFile = fsc.readFileSync(indexHTMLPath, "utf-8");
        const jsdom = new JSDOM(indexFile);
        const { window } = jsdom;
        const { document } = window;

        var s = document.createElement("script");
        s.setAttribute('id', 'maxurl');
        s.innerHTML = "localStorage.setItem('maximo_url','" + serverUrl + "')"
        var head = document.getElementsByTagName("head");

        head[0].insertBefore(s, head[0].firstElementChild)

        var output = "<!doctype html>" + '\n' + window.document.documentElement.outerHTML;
        let writeFile = util.promisify(fsc.writeFile);
        await writeFile(indexHTMLPath, output);
    }

    build(destAppPath){
        let cdvCommand = path.resolve(this.containerLocation + '/node_modules/cordova/bin/cordova');
        let cmd = cdvCommand + ' build android';
        let createdAppDir = path.resolve(this.outputLocation, this.appToBuild);
        return scriptutils.executeCmd(cmd, createdAppDir);
    }

}

module.exports = ContainerBuild;
