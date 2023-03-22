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

const utils = require('../utils.js');
const {OS} = require('../Constants.js');

class BuildApp{
    constructor(containerProps, createdAppDir, info, logger){
        this.containerProps = containerProps;
        this.createdAppDir = createdAppDir;
        this.info = info;
        this.log = logger;
    }

    build(){
        
    }

    run(){
        
    }


}

module.exports = BuildApp;
