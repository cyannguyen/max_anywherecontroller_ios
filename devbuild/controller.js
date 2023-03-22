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


const PropertiesReader = require('properties-reader');
const platform = require('./platform.js');
const anywhereapp = require('./anywhereapp.js');
const contanier = require('./container.js');
const path = require('path');
const devConfig = require('./buildconfig.json');
const fs = require('fs');
const readline = require('readline');

const currDir = process.cwd();
let appToBuild = null;

const ContainerProjectPath = currDir;
const MaximoAnywhereProjectPath = path.resolve(currDir, '../MaximoAnywhere');
const AnywherePlatformPath = path.resolve(currDir, '../AnywherePlatform');

const serverUrl = 'http://192.168.1.138:7001/maximo'

function readContainerProperties(){
    let containerPath = path.resolve(currDir, 'Container.properties');
    properties = PropertiesReader(containerPath);
    let appsToBuild = properties.get('appsToBuild').trim() ? properties.get('appsToBuild').split(',').map(a => a.trim()) : null;
    return appsToBuild[0];
}

function editAppBuildProperties(appToBuild){
    
    let buildPropPath = path.resolve(MaximoAnywhereProjectPath, 'build.properties');
    let builPropNew = path.resolve(MaximoAnywhereProjectPath, 'build_new.properties');
    let buildPropBackup = path.resolve(MaximoAnywhereProjectPath, 'build_bkp.properties');
    let containerPath = path.resolve(currDir, '../');
    
   return new Promise((resolve, reject)=>{
        const fileStream = fs.createReadStream(buildPropPath);
        const rl = readline.createInterface({
            input: fileStream
        });
        let targetContent = ''

        rl.on('line', function(line) {
            if (line.indexOf('appsToBuild') > -1 && line.indexOf('#appsToBuild') === -1) {
                line = 'appsToBuild=' + appToBuild;
            }
            targetContent += line + '\n';
        })

        rl.on('close', function() {
            fs.renameSync(buildPropPath, buildPropBackup)
            fs.writeFile(buildPropPath, targetContent, 'utf8', function(err) {
                if (err)
                    reject('Unable to write Build.prop ' + err);
                resolve();
            })
        });
   })

}



async function run(){
    let appToBuild = readContainerProperties();
    await editAppBuildProperties(appToBuild);

    let platformbuild = new platform(AnywherePlatformPath);
    await platformbuild.buildWorklightLib();
    let destWebAppPath = path.resolve(MaximoAnywhereProjectPath, 'apps', appToBuild)
    await platformbuild.deployWorklightLib(destWebAppPath);
    await platformbuild.deployPlatform(destWebAppPath);
    console.log('Building Web App ...');
    let anywhereappbuild = new anywhereapp(MaximoAnywhereProjectPath, appToBuild);
    await anywhereappbuild.runAppBuild();
    console.log('Deploying Web App ...');
    await anywhereappbuild.deployZip(path.resolve(ContainerProjectPath, 'app-download'));
    console.log('Building APK ...');
    let containerbuild = new contanier(ContainerProjectPath, appToBuild);
    await containerbuild.copyWWW();
    await containerbuild.prepIndexHtml(serverUrl);
    await containerbuild.build(destWebAppPath);

    console.log("Dev Build complete");

}

run();
