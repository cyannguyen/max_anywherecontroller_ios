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

const {exec} = require('child_process')


function executeInstall(){
    let options = null;
    options?options['maxBuffer']= 2048 * 2048:{'maxBuffer': 2048 * 2048};
    return new Promise((resolve, reject) => {
        let cm = exec('npm install --production', options, async (error, stdout, stderr) => {
            if(error){
                reject(error);
            }else{
                 resolve();
           }
            
        });

        cm.stdout.on('data', dat=>{
            console.log(dat);
        })

        cm.stderr.on('data', dat=>{
            console.log(dat);
        })
    });
}

executeInstall().then(()=>{
    const BuildContainer = require('./container.js');
    BuildContainer.build();
})

