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

const addAndroidManifestAttributes = function(context) {

  let platformRoot = path.join(context.opts.projectRoot, 'platforms/android/app/src/main');
  let manifestFile = path.join(platformRoot, 'AndroidManifest.xml');

  if (fs.existsSync(manifestFile)) {
	  fs.readFile(manifestFile, 'utf8', function(err, data) {
		  if (err) {
			  throw new Error('Unable to find AndroidManifest.xml: ' + err);
		  }

		  var addAttribute = function(xml, pattern, attr, value, regex) {
			  if (!xml.match(attr)) {
				  return xml.replace(pattern, pattern + ' ' + attr + '="' + value + '"');
			  } else if (xml.match(regex) && !data.match(value)) {
				  return xml.replace(regex, value);
			  } else {
				  return xml;
			  }
		  }

		  data = addAttribute(data, '<manifest', 'xmlns:tools', 'http://schemas.android.com/tools', new RegExp('xmlns:tools' + '="([^"]+)"'));
		  data = addAttribute(data, '<application', 'tools:replace', 'android:allowBackup', new RegExp('tools:replace' + '="([^"]+)"'));
		  data = addAttribute(data, '<application', 'android:allowBackup', 'false', new RegExp('android:allowBackup' + '="([^"]+)"'));
		  data = addAttribute(data, '<application', 'android:usesCleartextTraffic', 'true', new RegExp('android:usesCleartextTraffic' + '="([^"]+)"'));

		  if (data) {
			  fs.writeFileSync(manifestFile, data, 'utf8', function(err) {
				  if (err)
					  throw new Error('Unable to write AndroidManifest.xml: ' + err);
			  })
		  }
	  });
  }
};

module.exports = addAndroidManifestAttributes;
