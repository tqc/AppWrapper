(function() {

    var fs = require("fs-extra");
    var path = require("path");
    var spawn = require('child_process').spawn;
    var async = require("async");
    var iconmaker = require("./iconmaker");
    var pbxproj = require("./pbxproj");

    function exec(command, args, options, callback) {
        var result = "";
        var proc = spawn(command, args, options);
        proc.stdout.on('data', function(data) {
            console.log("" + data);
            result += data;
        });
        proc.stderr.on('data', function(data) {
            console.log("" + data);
            result += data;
        });
        proc.on('exit', function(code) {
            callback(code, result);
        });
    }

    exports.update = function(appdef) {



        function updateCordova(callback) {

            callback();

        }


        function ensureProjectCreated(callback) {
            if (fs.existsSync("platforms/ios/" + appdef.projectName + ".xcodeproj/project.pbxproj")) {
                console.log("Project already exists");
                callback();
            } else {
                console.log("creating cordova project");
                exec("cordova", ["create", ".", appdef.packageName, appdef.projectName], {
                    //                    cwd: "lib/cordova-ios/bin"
                }, function(code, data) {
                    console.log(data);
                    if (code == 0) {
                        console.log("Project created");
                        console.log("creating ios project");
                        exec("cordova", ["platform", "add", "ios"], {
                            //                    cwd: "lib/cordova-ios/bin"
                        }, function(code, data) {
                            console.log(data);
                            if (code == 0) {
                                console.log("Project created");
                                callback();

                            } else {
                                console.log("Unable to create project");
                                process.exit(1);
                            }

                        });
                    } else {
                        console.log("Unable to create project");
                        process.exit(1);
                    }

                });
            }
        }

        var pf;



        function addSettingsJson(callback) {
            var settingsPath = "platforms/ios/settings.json";

            if (!fs.existsSync(settingsPath)) {
                fs.writeFileSync(settingsPath, "{\n\n}");
            }

            pf.addFileToTarget(appdef.projectName, "Resources", "CustomTemplate/settings.json");

            callback();

        };


        function updatePlugins(callback) {



            //            var configxml = fs.readFileSync(appdef.projectName + "/" + appdef.projectName + "/config.xml").toString();


            async.eachSeries(appdef.plugins || [], function(plugin, next) {
                    //                var pluginNode = "<plugin name=\"" + plugin.name + "\" value=\"" + plugin.name + "\"/>"                

                    exec("cordova", ["plugin", "add", plugin.path], {}, function(code, data) {
                        next();
                    });

                },

                function(err) {
                    callback();
                })



        };

        function removePhonegapDefaultFiles(callback) {


            fs.removeSync("platforms/ios/" + appdef.projectName + "/Resources/icons");
            fs.removeSync("platforms/ios/" + appdef.projectName + "/Resources/splash");
            fs.removeSync("platforms/ios/" + appdef.projectName + "/Resources/Capture.bundle");
            fs.removeSync("platforms/ios/" + appdef.projectName + "/Resources/de.lproj");
            fs.removeSync("platforms/ios/" + appdef.projectName + "/Resources/se.lproj");
            fs.removeSync("platforms/ios/" + appdef.projectName + "/Resources/en.lproj");
            fs.removeSync("platforms/ios/" + appdef.projectName + "/Resources/es.lproj");


            // remove resources/icons/icon-72@2x.png
            // todo: get main group from PBXProject section

            //     pf.removeItem("Resources/icons/icon-72@2x.png");

            pf.removeItem("Resources/icons");
            pf.removeItem("Resources/splash");
            pf.removeItem("Resources/Capture.bundle");
            pf.removeItem("Resources/de.lproj");
            pf.removeItem("Resources/se.lproj");
            pf.removeItem("Resources/en.lproj");
            pf.removeItem("Resources/es.lproj");

            callback();

        }


        function updateArtwork(targetName, artwork, callback) {

            if (!targetName || !artwork) return callback();

            pf.ensureGroupExists("Resources/" + appdef.artwork.folderName);

            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/icon-72@2x.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/icon-72.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/icon@2x.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/icon.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/Default-568h@2x~iphone.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/Default-Landscape@2x~ipad.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/Default-Landscape~ipad.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/Default-Portrait@2x~ipad.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/Default-Portrait~ipad.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/Default@2x~iphone.png");
            pf.addFileToTarget(targetName, "Resources", "Resources/" + artwork.folderName + "/Default~iphone.png");

            iconmaker.render("platforms/ios/" + appdef.projectName + "/Resources/" + appdef.artwork.folderName, appdef.artwork.iconSource, appdef.artwork.splashSource, callback);



        }


        console.log("Updating app " + appdef.projectName);


        updateCordova(function() {
            ensureProjectCreated(function() {
                updatePlugins(function() {
                    pf = pbxproj.open("platforms/ios/" + appdef.projectName + ".xcodeproj/project.pbxproj");
                    addSettingsJson(function() {
                        removePhonegapDefaultFiles(function() {
                            updateArtwork(appdef.projectName, appdef.artwork, function() {

                                pf.save("platforms/ios/" + appdef.projectName + ".xcodeproj/project.pbxproj");
                            });
                        });
                    });
                });
            });
        });


    };

})();