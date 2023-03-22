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



//A summary and error file generated
//EAch app has their own log file
//Logger is created for every app
//OS are logged sequentially
//add general ones to summary 
//add app specific ones to app
//Send final to summary


const Constants = require('./Constants.js');
const currDir = process.cwd();
const fs = require("fs");
const fsc = require("fs-extra");
const util = require('util');
const path = require('path');


const SUMMARY_TOPIC = "__summary"

class Topic {
    constructor(name, header) {
        this.name = name
        this.messageBuffer = [];
        this.header = header;
    }


    addMessage(message) {
        this.messageBuffer.push(message);
    }

    clearBuffer(){
        this.messageBuffer = [];
    }

    getMessageBuffer(){
        return this.messageBuffer;
    }
}



class Log {

    constructor(topic, tag, fileName) {
        this.topic = topic;
        this.tag = tag;
        this.fileName = fileName;
        this.topicsRegister = {}
    }

    setTag(tag){
        this.tag = tag
    }
 
    getTag(){
        return this.tag;
    }

    registerTopic(topicName, topicHeader) {
        
        topicHeader = topicHeader ? topicHeader : "====================\n" + topicName.split('.').pop() + "\n====================\n";
        this.topicsRegister[topicName] = new Topic(topicName, topicHeader)
        this.topicsRegister[topicName].addMessage(topicHeader);
    }

    pushToTopic(topic, msg) {
        
        if(this.topicsRegister[topic])
            this.topicsRegister[topic].addMessage(msg);
        else
            throw new Error("Topic not registered");

    }

    //if a flush is called with no topic, all topics in the stream is emptied starting with the __summary topic
    async flush(topic) {

        if(!topic){
            throw new Error("Topic not specified");
        }

      
        let topicObj = this.topicsRegister[topic]
        let buffer = topicObj.getMessageBuffer();
        buffer.unshift('\n\n');
        await this.logToFile(this.fileName, buffer);
        topicObj.clearBuffer();
       
    }

    e(topic, tag, message, exception) {
        try{
            if(arguments.length === 1){
                message = topic
                topic = null; 
            }else if(arguments.length === 2){
                message = topic;
                exception = tag;
                topic = null;
                tag = null;
            }
            if(!topic){
                topic = this.topic;
            }

            message = exception? message + '\n' + exception.stack.toString(): message
            let msg = "  [ERROR]  " + this.format(tag, message)
            this.pushToTopic(topic, msg)
            console.error(msg);
        }catch(e){}

    }


    t(topic, tag, message, trace) {
        try{
            if(!topic){
                topic = this.topic;
            }
            let msg = "  [TRACE]  " + this.format(tag, message);
            this.pushToTopic(topic, msg)
            console.trace(msg);
        }catch(e){}
    }


    i(topic, tag, message) {
        try{
            if(arguments.length === 1){
                message = topic
                topic = null; 
            }
            if(!topic){
                topic = this.topic;
            }
            let msg = "  [INFO]  " + this.format(tag, message);
            this.pushToTopic(topic, msg)
            console.info(msg);
        }catch(e){}
    }


    w(topic, tag, message, exception) {
        try{
            if(arguments.length === 1){
                message = topic
                topic = null; 
            }else if(arguments.length === 2){
                message = topic;
                exception = tag;
                topic = null;
                tag = null;
            }
            if(!topic){
                topic = this.topic;
            }

            message = exception? message + '\n' + exception.stack.toString(): message

            let msg = "  [WARN]  " + this.format(tag, message);
            this.pushToTopic(topic, msg)
            console.warn(msg);
        }catch(e){}
    }

    format(tag, message) {

        let ts = Date.now();
        let date_ob = new Date(ts);
        let date = date_ob.getDate();
        let month = date_ob.getMonth() + 1;
        let year = date_ob.getFullYear();
        let timestamp = year + "-" + month + "-" + date + ' ' + date_ob.getHours() + ':' + date_ob.getMinutes() + ':' + date_ob.getSeconds() + ' ';
        let msg = timestamp;
        msg += tag ? '  [' + tag + ']' : '';
        msg += '  ' + message;
        return msg
    }


    logToConsole(msg) {
        console.log(msg);
    }



    async logToFile(filePath, buffer) {
        await fsc.ensureDir(path.resolve(currDir, Constants.LOGS_DIR));
        filePath = path.resolve(currDir, Constants.LOGS_DIR, filePath);
        let appendFile = util.promisify(fs.appendFile);
        let writeFile = util.promisify(fs.writeFile);
        let logFilesExists = await fsc.exists(filePath)
        if (logFilesExists)
            await appendFile(filePath, buffer.join('\n'))
        else {
            await writeFile(filePath, buffer.join('\n'));
        }

    }

}

module.exports = Log;

