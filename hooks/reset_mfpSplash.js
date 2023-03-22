#!/usr/bin/env node
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



const fs = require('fs');
const path = require('path');


const resetMFPSplashforAndroid = function(context) {

  let platformRoot = path.join(context.opts.projectRoot, 'platforms/android/app/src/main/res');
  
  if (fs.existsSync(platformRoot)) {

    try{
    let targetImgArray = ['drawable-ldpi', 'drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi'];
    let srcImgArray = ['drawable-ldpi-screen.9.png', 'drawable-mdpi-screen.9.png', 'drawable-hdpi-screen.9.png', 'drawable-xhdpi-screen.9.png', 'drawable-xxhdpi-screen.9.png']
    
    for(let i = 0; i < targetImgArray.length; i++){
        let targetImg = path.join(context.opts.projectRoot, 'platforms/android/app/src/main/res', targetImgArray[i], 'splash.9.png');
        let srcImg = path.join(context.opts.projectRoot, 'images/android/splash', srcImgArray[i]);
        fs.copyFileSync(srcImg, targetImg);
    }
}catch(e){}
    
    // const ldpiTargetImg = path.join(context.opts.projectRoot, 'platforms/android/app/src/main/res/drawable-ldpi/splash.9.png');
    // const mdpiTargetImg = path.join(context.opts.projectRoot, 'platforms/android/app/src/main/res/drawable-mdpi/splash.9.png');
    // const hdpiTargetImg = path.join(context.opts.projectRoot, 'platforms/android/app/src/main/res/drawable-hdpi/splash.9.png');
    // const xhdpiTargetImg = path.join(context.opts.projectRoot, 'platforms/android/app/src/main/res/drawable-xhdpi/splash.9.png');
    // const xxhdpiTargetImg = path.join(context.opts.projectRoot, 'platforms/android/app/src/main/res/drawable-xxhdpi/splash.9.png');

    // const srcldpiImg = path.join(context.opts.projectRoot, 'images/android/splash/drawable-ldpi-screen.9.png');
    // const srcmdpiImg = path.join(context.opts.projectRoot, 'images/android/splash/drawable-mdpi-screen.9.png');
    // const srchdpiImg = path.join(context.opts.projectRoot, 'images/android/splash/drawable-hdpi-screen.9.png');
    // const srcnhdpiImg = path.join(context.opts.projectRoot, 'images/android/splash/drawable-xhdpi-screen.9.png');
    // const srcxxhdpiImg = path.join(context.opts.projectRoot, 'images/android/splash/drawable-xxhdpi-screen.9.png');
    // try{
        
    //     fs.copyFileSync(srcldpiImg, ldpiTargetImg);
    //     fs.copyFileSync(srcmdpiImg, mdpiTargetImg);
    //     fs.copyFileSync(srchdpiImg, hdpiTargetImg);
    //     fs.copyFileSync(srcnhdpiImg, xhdpiTargetImg);
    //     fs.copyFileSync(srcxxhdpiImg, xxhdpiTargetImg)

    // }catch(e){}
    
  }
};

module.exports = resetMFPSplashforAndroid;
