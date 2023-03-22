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
    initialize: function() {
        document.addEventListener(
            "mfpjsonjsloaded",
            this.onDeviceReady.bind(this),
            false
        );
        //register for online offiline event
        document.addEventListener("offline", this.onOffline.bind(this), false);
        document.addEventListener("online", this.onOnline.bind(this), false);

    },

    // Handle the online event
    onOnline: function() {
        app.hideError();
        // var parentElement = document.getElementById("deviceready");

        // var offilineElement = parentElement.querySelector(".offiline");

        // offilineElement.setAttribute("style", "display:nome;");

        // document.getElementById("serverURL").readOnly = false;
    },

    // Handle the offline event
    onOffline: function() {
        app.showError("offline");
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
		if (device.platform == "iOS") {
			device.exitApp();
		} else {
			navigator.app.exitApp();
		}
    },

    onEULAConfirm: function(index) {

    	if (index === 1) {
    		console.log("End User License Agreement Accepted");
    		localStorage.setItem('eulaAccepted',true);
    		return;
    	} else {
    		console.log("End User License Agreement Rejected");
    		localStorage.setItem('eulaAccepted',false);
    		if (device.platform == "iOS") {
    			device.exitApp();
    		} else {
    			navigator.app.exitApp();
    		}

    	}

    },

    validURL: function(urlString) {
		var pattern = new RegExp("^(https?://)?(((www\\.)?([-a-z0-9]{1,63}\\.)*?[a-z0-9][-a-z0-9]{0,61}[a-z0-9]\\.[a-z]{2,6})|((\\d{1,3}\\.){3}\\d{1,3}))(:\\d{2,4})?(/[-\\w@\\+\\.~#\\?&/=%]*)?$");
  		return (pattern.test(urlString) == true)? urlString : "";
	}, 

    checkAndShowEULA: function() {

    	var eulaAccepted = JSON.parse(localStorage.getItem('eulaAccepted')) ? localStorage.getItem('eulaAccepted') : false ;

    	if (eulaAccepted == 'true') {
    		return;
    	} else {
			if (device.platform == "iOS") {
		    	navigator.notification.confirm(
			    	termsnprivacy.getEULATerms(), // message
			    	app.onEULAConfirm,            // callback to invoke with index of button pressed
			    	termsnprivacy.EULATitle,           // title
			    	['Agree']     // buttonLabels
			    );
			} else {
		    	navigator.notification.confirm(
		    		termsnprivacy.getEULATerms(), // message
		    	    app.onEULAConfirm,            // callback to invoke with index of button pressed
		    	    termsnprivacy.EULATitle,           // title
		    	    ['Agree','Disagree']     // buttonLabels
		    	);
			}
    	}
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
						//self.checkAndShowEULA();
					}
    			},
    			function(error){
    				console.log('The test was not able to verify if the device is jailbroken or rooted.');
    				self.showDeviceRooted("RootedJailBroken");
    			}
    		);
    	});
    },

    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: async function() {

        if (!readyCalled) {
            readyCalled = true;
            let c = await initializeCollection()
            let appUpdateCollection = await getCollection();
            if(appUpdateCollection.length > 0){
                let storedurl = appUpdateCollection[0].json.maximo_url;
                if(storedurl){
                    localStorage.setItem("maximo_url",storedurl);
                }
            }
            $.i18n()
                .load({
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
                .then(function() {
                    $(".app").i18n();
                });
            let self = this;
            window.resolveLocalFileSystemURL(
                cordova.file.dataDirectory + "www/index.html",
                function() {
                    self.checkForUpdate();
                },
                function() {
                    self.receivedEvent("deviceready");
                }
            );
        }

    	//Rooted device check

    	if (device.platform == "Android" || device.platform == "iOS") {
    		try {
    			await this.checkDevice();
    		} catch (e) {
    			this.showDeviceRooted("RootedJailBroken");
    		}
    	} 
    },

    sendToLogin: function() {
    	//window.open(cordova.file.dataDirectory + "www/index.html");
    	SpinnerDialog.hide();
    	cordova.InAppBrowser.open(cordova.file.dataDirectory + "www/index.html");
    },

    showError: function(message) {

        let parentElement = document.getElementById("error-msg-box");
        parentElement.style.display = "block";

        let btDiv = document.getElementById("bt");
        btDiv.style.marginTop = "0rem";

        let errTextElement = document.getElementById("error-message-text");

        if (typeof message === "string") {
            errTextElement.innerText = $.i18n(message);
        } else {
            errTextElement.innerText = message.message;
        }
        SpinnerDialog.hide();
    },

    hideError: function() {
        let parentElement = document.getElementById("error-msg-box");
        parentElement.style.display = "none";

        let btDiv = document.getElementById("bt");
        btDiv.style.marginTop = "1rem";

    },

    checkForUpdate: async() => {

        SpinnerDialog.show(null, $.i18n("updating"), true);
        if (navigator.connection.type == Connection.NONE) {
            app.sendToLogin();
            return;
        }
        let appUpdateCollection = await getCollection();

        let storedurl = (appUpdateCollection && appUpdateCollection[0] && appUpdateCollection[0].json) ? appUpdateCollection[0].json.maximo_url : this.validURL(localStorage.getItem('maximo_url'));
        localStorage.setItem(
            "maximo_url",
            storedurl
        );
        let auxUrl = new URL(storedurl);
        let serverURL = auxUrl.origin + "/maxanywhere/AnywhereAppUpdate";
        let appId = window.AnywhereAppID;
        let currentDeployment = new Date();
        let deployeDateTime = (appUpdateCollection && appUpdateCollection[0] && appUpdateCollection[0].json) ? appUpdateCollection[0].json.deploydatetime : currentDeployment.toISOString().replace('T', ' ').replace('Z', ' ');

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
            app.showError("notavailable");
            app.sendToLogin();
            return;
        }

        let body = await response.json();
        if (body.appid) {
            app.donwloadAndInstall(serverURL, body);
            return;
        }

        if (body.messageid && body.messageid != "LAST_VERSION_INSTALLED") {
            app.showError(body);
            return;
        } else {
            app.sendToLogin();
        }
    },

    // Update DOM on a Received Event
    receivedEvent: async function(id) {
        let urltxt = document.getElementById("serverURL")
        urltxt.value = this.validURL(localStorage.getItem('maximo_url'));
        let initData = [{ 'maximo_url': urltxt.value, 'deploydatetime': 'null' }];
        let aData = await addToCollection(initData);

        if (
            device.platform != "browser" &&
            (!navigator.connection.type || navigator.connection.type == "none")
        ) {
            this.onOffline();
        }

        console.log("Received Event: " + id);
    },

    donwloadAndInstall: function(serverURL, appToDownload) {

        let sync = ContentSync.sync({
            src: serverURL + "?downloadid=" + parseInt(appToDownload.appid.toString().replace(/[^\d]/g,'')), // Build number generation problem when OS generate number's digit grouping or separator based on . (dot) or , (comma) or ' (single quote) or " " (space) or none 
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

            try {
                let urlValue = this.validURL(localStorage.getItem('maximo_url'));
                await setCollection({
                    'maximo_url': urlValue,
                    'deploydatetime': appToDownload.DEPLOYDATETIME
                });
            } catch (e) {
                console.log(e);
            }

            app.sendToLogin();
            SpinnerDialog.hide();
        });

        sync.on("error", function(e) {
            console.log("Error: ", e.message);
            SpinnerDialog.hide();
            app.showError("notavailable");
            return;
        });

        sync.on("cancel", function() {
            document.getElementById("ready").innerText = $.i18n("canceled");
            // triggered if event is cancelled
        });
    },


};

app.initialize();

const authenticate = async() => {
    app.hideError();
    SpinnerDialog.show(null, $.i18n("loading"),true);
    var pattern = new RegExp("^(https?://)?(((www\\.)?([-a-z0-9]{1,63}\\.)*?[a-z0-9][-a-z0-9]{0,61}[a-z0-9]\\.[a-z]{2,6})|((\\d{1,3}\\.){3}\\d{1,3}))(:\\d{2,4})?(/[-\\w@\\+\\.~#\\?&/=%]*)?$");
    let urlValue = document.getElementById("serverURL").value.trim();
    urlValue = (pattern.test(urlValue) == true)? urlValue : "";
    let pingresponse = null;
    try {
        pingresponse = await timeout(
            10000,
            fetch(urlValue + "/ping.jsp", { method: "GET" })
        );
        if (!pingresponse || !pingresponse.ok) {
            app.showError("notavailable");
            return;
        }
    } catch (error) {
        app.showError("notavailable");
        return;
    }

    localStorage.setItem(
        "maximo_url",
        urlValue
    );
    try {
        var sCol = await setCollection({ 'maximo_url': urlValue, 'deploydatetime': 'null' });
    } catch (e) {
        console.log(e);
    }

    let auxUrl = null;
    try {
        auxUrl = new URL(urlValue.trim());
    } catch (e) {
        app.showError("serverurlinvalid");
    }

    let serverURL = auxUrl.origin + "/maxanywhere/AnywhereAppUpdate";
    let response;
    try {
        response = await timeout(
            10000,
            fetch(
                serverURL + "?appid=" + window.AnywhereAppID,
                { method: "POST" }
            )
        );
    } catch (error) {
        SpinnerDialog.hide();
        app.showError("notavailable");
        return;
    }

    if (response && response.status != 200) {
        SpinnerDialog.hide();
        app.showError("notavailable");
        return;
    }

    let body = await response.json();

    if (body.messageid) {
        app.showError(body);
        return;
    }

    SpinnerDialog.show(null, $.i18n("loading"),true);
    app.donwloadAndInstall(serverURL, body);
};

function timeout(ms, promise) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            SpinnerDialog.hide();
            reject(new Error("timeout"));
        }, ms);
        promise.then(resolve, reject);
    });
}

function initializeCollection() {
    let collectionName = 'appUpdate';
    var collections = {

        // Object that defines the 'appUpdate' collection.
        appUpdate: {}
    };

    return WL.JSONStore.init(collections)
}

function addToCollection(initData) {
    let _id = 1;
    let collectionName = 'appUpdate';

    WL.JSONStore.get(collectionName).add(initData, {});
}

function getCollection() {
    return new Promise((resolve, reject) => {
        let _id = 1;
        let collectionName = 'appUpdate';
        WL.JSONStore.get(collectionName).findById(1, {}).then(result => {
            resolve(result);
        }).fail(err => {
            reject(err);
        })
    })


}

function setCollection(keyValueObject) {
    let _id = 1;
    let collectionName = 'appUpdate';
    let repJ = [{ _id: 1, json: keyValueObject }]
    return WL.JSONStore.get(collectionName).replace(repJ, {})
}

function closeCollection(keyValueObject) {
	WL.JSONStore.closeAll();
}

function showPrivacyAlert(){
    //cordova.InAppBrowser.open("https://www.ibm.com/support/pages/node/6574761","_blank","location=no,footer=yes");
    /*navigator.notification.alert (
        termsnprivacy.getPrivacyPolicy(),  // message
        function() {},         // callback
        termsnprivacy.privacyTitle,            // title
        'Done'                  // buttonName
    );*/
    var link = document.getElementById("ppbt");
    var privacyModal = document.getElementById("privacyDialog");
    link.onclick = function() {
        privacyModal.style.display = "block";
    }

    var span = document.getElementsByClassName("close")[0];
    span.onclick = function() {
        privacyModal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target.id == "ppbt") {
            privacyModal.style.display = "block";
        }
    }

    document.getElementById("modal-header").innerHTML= termsnprivacy.privacyTitle ;
    document.getElementById("modal-header").style = "font-weight:bold";

    document.getElementById("modal-text").innerHTML= termsnprivacy.getPrivacyPolicy() ;
    document.getElementById("modal-text").style = "text-align:left";
}
