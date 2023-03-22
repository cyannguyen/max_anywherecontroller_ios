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

const TARGET_ATTRIBUTE = 'android:usesCleartextTraffic';
const TARGET_VALUE = "true";
const TARGET_REGEX = new RegExp(TARGET_ATTRIBUTE+'="([^"]+)"');

const addClearTextAttribute = function(context) {

  let platformRoot = path.join(context.opts.projectRoot, 'platforms/android/app/src/main');
  let manifestFile = path.join(platformRoot, 'AndroidManifest.xml');

  if (fs.existsSync(manifestFile)) {
    fs.readFile(manifestFile, 'utf8', function (err, data) {
      if (err) {
        throw new Error('Unable to find AndroidManifest.xml: ' + err);
      }

      var result;
      if(!data.match(TARGET_ATTRIBUTE)) {
        result = data.replace(/<application/g, '<application ' + TARGET_ATTRIBUTE +'="'+ TARGET_VALUE +'"');
      }else if (data.match(TARGET_REGEX) && !data.match(TARGET_VALUE)){
        result = data.replace(TARGET_REGEX, TARGET_VALUE);
      }

      if(result){
        fs.writeFile(manifestFile, result, 'utf8', function (err) {
          if (err) throw new Error('Unable to write AndroidManifest.xml: ' + err);
        })
      }
    });
  }
};

module.exports = addClearTextAttribute;
