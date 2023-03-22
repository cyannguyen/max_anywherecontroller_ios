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


let readyCalled = false;

var app = {
    // Application Constructor
    initialize: (async function() {
       //Rooted device check
    
    if (device.platform == "Android" || device.platform == "iOS") {
    	try {
    		await this.checkDevice();
    	} catch (e) {
    		this.showDeviceRooted("RootedJailBroken");
    	}
    }
    
    document.addEventListener("offline", this.onOffline.bind(this), false);
    document.addEventListener("online", this.onOnline.bind(this), false);

    })(),

    // Handle the online event
    onOnline: function() {
        
    },

    // Handle the offline event
    onOffline: function() {
       
    },
    
    //Rooted device message display
    showDeviceRooted: function (displayMessage) {
    	
    	let messageString = $.i18n(displayMessage);
    	
    	navigator.notification.alert (
    			messageString,  // message
    			this.closeApp,         // callback
                'Device Check',            // title
                'Close'                  // buttonName
        );

    },
    
    // Exit app action
    closeApp: function() {
    	navigator.app.exitApp();
    },
    
    // Rooted device check
    checkDevice: async function () {
    	self = this;
    	return new Promise ((resolve, reject) => {
    		IRoot.isRooted(
    			function(result){
					if (result == true) {
						console.log('The device is rooted or jailbroken.');
						self.showDeviceRooted("RootedJailBroken");
					} else {
						console.log("The test verified that the device is not jailbroken or rooted.");
						//return;
					}
    			}, 
    			function(error){
    				console.log('The test was not able to verify if the device is jailbroken or rooted.');
    				self.showDeviceRooted("RootedJailBroken");
    			}
    		);
    	});
    },

    showError: function(message) {
        console.log($.i18n(message));
        SpinnerDialog.hide();
    },

    validURL: function(urlString) {
		var pattern = new RegExp("^(https?://)?(((www\\.)?([-a-z0-9]{1,63}\\.)*?[a-z0-9][-a-z0-9]{0,61}[a-z0-9]\\.[a-z]{2,6})|((\\d{1,3}\\.){3}\\d{1,3}))(:\\d{2,4})?(/[-\\w@\\+\\.~#\\?&/=%]*)?$");
  		return (pattern.test(urlString) == true)? urlString : "";
	}, 

    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    manageWebApp: async function() {
        SpinnerDialog.show(null, "", true);
        return new Promise(async (resolve, reject) => {
        
            await this.loadLanguagePack();

            let c = await appDownloadCollection.initializeCollection()
            let appUpdateCollection = await appDownloadCollection.getCollection();
           
            if(appUpdateCollection.length == 0){
                await appDownloadCollection.addToCollection([{
				        'maximo_url': this.validURL(localStorage.getItem('maximo_url')),
				        'deploydatetime': window.checksum,
				        'webRuntimeDownloadTS': null
                }]);
                
                await this.checkWithServer();
                SpinnerDialog.hide();
                resolve();
                return;
                
            }else if(appUpdateCollection.length > 0 && Math.abs(new Date() - new Date(appUpdateCollection[0].json.webRuntimeDownloadTS))/1000 > 1){
                await this.checkWithServer();
                SpinnerDialog.hide();
                resolve();
                return 
            }

            await this.loadDataAppIfAvailable();
            SpinnerDialog.hide();
            resolve();
        });
            
        //     let self = this;
        //     //document.getElementById("appLabel").textContent = BuildInfo.name;
        //     window.resolveLocalFileSystemURL(
        //         cordova.file.dataDirectory + "www/index.html",
        //         function() {
        //             self.checkForUpdate(true).then(function(){
        //                 resolve();
        //             });
        //         },
        //         function() {
        //             // try {
        //             //     let urlValue = localStorage.getItem("maximo_url");
        //             //     await setCollection({
        //             //         'maximo_url': urlValue,
        //             //         'deploydatetime': window.checksum
        //             //     });
        //             // } catch (e) {
        //             //     console.log(e);
        //             // }
        //             // self.checkForUpdate(false);
                    
        //             let sync = ContentSync.sync({
        //                 id: "www",
        //                 copyCordovaAssets: true,
        //                 type: "local",
        //                 copyRootApp: true,
        //                 copyLocalOnly:true
        //             });
            
        //             sync.on("progress", function(data) {
        //                 console.log(data.progress);
            
        //                 SpinnerDialog.show(
        //                     null,
        //                     $.i18n("download") + " " + data.progress + "%",
        //                     true, { 'overlayOpacity': 0.75, 'textColorRed': 1, 'textColorGreen': 1, textColorBlue: 1 }
        //                 );
        //             });
            
        //             sync.on("complete", async(data) => {
            
        //                 try {
        //                     let urlValue = localStorage.getItem("maximo_url");
        //                     await appDownloadCollection.setCollection({
        //                         'maximo_url': urlValue,
        //                         'deploydatetime': window.checksum,
        //                         'webRuntime': false
        //                     });
        //                 } catch (e) {
        //                     console.log(e);
        //                 }
            
        //                 checkForUpdate(true);
        //                 SpinnerDialog.hide();
        //             });
            
        //             sync.on("error", function(e) {
        //                 console.log("Error: ", e.message);
        //                 SpinnerDialog.hide();
        //                 app.showError("notavailable");
        //                 return;
        //             });
            
        //             sync.on("cancel", function() {
        //                 document.getElementById("ready").innerText = $.i18n("canceled");
        //                 // triggered if event is cancelled
        //             });
        //             //self.receivedEvent("deviceready");
        //         }
        //     );
        // })
    
    //Rooted device check
    
    // if (device.platform == "Android" || device.platform == "iOS") {
    // 	try {
    // 		await this.checkDevice();
    // 	} catch (e) {
    // 		this.showDeviceRooted("RootedJailBroken");
    // 	}
    // }
  
    },

    checkWithServer: function(){
        return new Promise(async (resolve, reject)=>{
            if (navigator.connection.type == Connection.NONE || navigator.connection.type == Connection.UNKNOWN) {
                resolve();
                return;
            }
            let updateAvailable = await this.checkForUpdate(false);
            if(updateAvailable.status){
                let server_url = this.validURL(localStorage.getItem('maximo_url'));
                let downloadSuccessful = await this.donwloadAndInstall(updateAvailable.appDetails);
                if(downloadSuccessful){
                    await appDownloadCollection.setCollection({
                        'maximo_url': server_url,
                        'deploydatetime': updateAvailable.appDetails.DEPLOYDATETIME,
                        'webRuntimeDownloadTS': new Date()
                    });
                    this.sendToLogin();
                }else{

                        await this.loadDataAppIfAvailable();
                        resolve()
                }
            }else{

                await this.loadDataAppIfAvailable();
                resolve()
            }
        })
    },

    loadDataAppIfAvailable: function(){
         return new Promise((resolve, reject)=>{
             let self = this;
             window.resolveLocalFileSystemURL(
                       cordova.file.dataDirectory + "www/index.html",
                            function() {
                                self.sendToLogin();
                            },
                            function(){
                                resolve();
                            }
             )
         })
    },

    sendToLogin: function() {
        //window.location.href = cordova.file.dataDirectory + "www/index.html";
        cordova.InAppBrowser.open(cordova.file.dataDirectory + "www/index.html");
    },

    checkForUpdate: async(dataDirExists) => {
        return new Promise(async (resolve, reject) => {
            SpinnerDialog.show(null, $.i18n("updating"), true);
            if (navigator.connection.type == Connection.NONE) {
                SpinnerDialog.hide();
                resolve({'status':false, 'appDetails': null, 'statusMessage': null});
                return;
            }
            let appUpdateCollection = await appDownloadCollection.getCollection();
            let storedurl = appUpdateCollection[0].json.maximo_url;
            localStorage.setItem(
                "maximo_url",
                storedurl
            );
            let auxUrl = new URL(storedurl);
            let serverURL = auxUrl.origin + "/maxanywhere/AnywhereAppUpdate";
            let appId = window.AnywhereAppID;
            let deployeDateTime = appUpdateCollection[0].json.deploydatetime;
            
            let res = deployeDateTime.substring(deployeDateTime.indexOf('.')+1, deployeDateTime.length);
            if(res.length == 2 ){
                deployeDateTime = deployeDateTime + '0';
            }
                
            let response;

            try {
                response = await timeout(
                    10000,
                    fetch(serverURL + "?appid=" + appId + "&deploydatetime=" + deployeDateTime, { method: "POST" })
                );
            } catch (error) {
                SpinnerDialog.hide();
                resolve({'status':false, 'appDetails': null, 'statusMessage': JSON.stringify(error)});
                return;
            }

            let body = await response.json();
            if (body.appid) {
                SpinnerDialog.hide();
                body.server_url = serverURL;
                resolve({'status':true, 'appDetails': body, 'statusMessage': ''});
                return
            }

            if (body.messageid && body.messageid != "LAST_VERSION_INSTALLED") {
                SpinnerDialog.hide();
                resolve({'status':false, 'appDetails': null, 'statusMessage': JSON.stringify(body)});
                return;
            } else {
                SpinnerDialog.hide();
                resolve({'status':false, 'appDetails': null, 'statusMessage': 'Reason Unknown'})
                return;
            }
        })
        
    },

    donwloadAndInstall: function(appToDownload) {
        
        return new Promise(async (resolve, reject) => {
            let sync = ContentSync.sync({
                src: appToDownload.server_url + "?downloadid=" + parseInt(appToDownload.appid.toString().replace(/[^\d]/g,'')), // Build  number generation problem when OS generate number's digit grouping or separator based on . (dot) or , (comma) or ' (single quote) or " " (space) or none 
                id: "www",
                copyCordovaAssets: true,
                type: "merge"
            });
    
            sync.on("progress", function(data) {
                console.log(data.progress);
    
                SpinnerDialog.show(
                    null,
                    $.i18n("download") + " " + data.progress + "%",
                    true, { 'overlayOpacity': 0.75, 'textColorRed': 1, 'textColorGreen': 1, textColorBlue: 1 }
                );
            });
    
            sync.on("complete", async(data) => {
    
                SpinnerDialog.hide();
                resolve(true);
            });
    
            sync.on("error", function(e) {
                console.log("Error: ", e.message);
                SpinnerDialog.hide();
                app.showError("notavailable");
                resolve(false);
            });
    
            sync.on("cancel", function() {
                SpinnerDialog.hide();
                resolve(false);
                // triggered if event is cancelled
            });

        })
        
    },

    loadLanguagePack: function(){
        return new Promise((resolve, reject) => {
            $.i18n().load({
                "en" : "i18n/en_US.json",
                "en-US" : "i18n/en_US.json",
                "zh" : "i18n/zh.json",
                "zh-TW" : "i18n/zh_hant.json",
                "zh-CN" : "i18n/zh_hans.json",
                "sv" : "i18n/sv.json",
                "sl" : "i18n/sl.json",
                "sk" : "i18n/sk.json",
                "ru" : "i18n/ru.json",
                "pt" : "i18n/pt.json",
                "pt-BR" : "i18n/pt_BR.json",
                "pl" : "i18n/pl.json",
                "nl" : "i18n/nl.json",
                "nb" : "i18n/nb.json",
                "ko" : "i18n/ko.json",
                "ja" : "i18n/ja.json",
                "it" : "i18n/it.json",
                "hu" : "i18n/hu.json",
                "hr" : "i18n/hr.json",
                "fr" : "i18n/fr.json",
                "fi" : "i18n/fi.json",
                "es" : "i18n/es.json",
                "de" : "i18n/de.json",
                "da" : "i18n/da.json",
                "cs" : "i18n/cs.json"
            })
            .done(function() {
                resolve();
            });
        })
        
    }


};

//injectjquery();



function timeout(ms, promise) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            SpinnerDialog.hide();
            reject(new Error("timeout"));
        }, ms);
        promise.then(resolve, reject);
    });
}

var appDownloadCollection = {

    initializeCollection: ()=> {
        let collectionName = 'appUpdate';
        var collections = {
    
            // Object that defines the 'appUpdate' collection.
            appUpdate: {}
        };
    
        return WL.JSONStore.init(collections)
    },
    
    addToCollection: (initData)=> {
        let _id = 1;
        let collectionName = 'appUpdate';
    
        return WL.JSONStore.get(collectionName).add(initData, {});
    },
    
    getCollection: ()=> {
        return new Promise((resolve, reject) => {
            let _id = 1;
            let collectionName = 'appUpdate';
            WL.JSONStore.get(collectionName).findById(1, {}).then(result => {
                resolve(result);
            }).fail(err => {
                reject(err);
            })
        })
    
    
    },
    
    setCollection: (keyValueObject)=> {
        let _id = 1;
        let collectionName = 'appUpdate';
        let repJ = [{ _id: 1, json: keyValueObject }]
        return WL.JSONStore.get(collectionName).replace(repJ, {})
    },
    
    closeCollection: (keyValueObject) => {
        WL.JSONStore.closeAll();
    }
}

document.addEventListener(
    "mfpjsonjsloaded",
    app.initialize,
    false
);
