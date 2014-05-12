(function() {
    "use strict";
    var fs = require("fs-extra");
    var path = require("path");
    var childproc = require('child_process');
    var async = require("async");
    var iconmaker = require("./iconmaker");
    var pbxproj = require("./pbxproj");

    var appDir;
    var appConfig = {};

    exports.isConfigured = false;

    exports.open = function(dir) {
        appDir = dir;
        if (fs.existsSync(path.resolve(dir, "appwrapper.json"))) {
            appConfig = require(path.resolve(dir, "appwrapper.json"));
            exports.isConfigured = true;
        }
    };

    exports.init = function() {
        appConfig = {
            title: "App Title",
            // name of the native project file/folder
            projectName: "HelloWorld",
            // folder where cordova stuff will go. Must be empty.
            cordovaFolder: "cordova",
            webPath: "../app/apphtml",
            platforms: ["ios", "android"],
            plugins: [],
            targets: {
                "default": {
                    appId: "com.example.helloworld",
                }
            }
        };
        fs.writeFileSync(path.resolve(appDir, "appwrapper.json"), JSON.stringify(appConfig, null, 4));
    };


    function exec(command, args, options, callback) {
        console.log(process.platform);
        var proc;
        if (process.platform == "win32") {
            // Workaround for https://github.com/joyent/node/issues/2318
            var fullCommand = command + " " + args.join(" ");
            console.log("running " + fullCommand);
            proc = childproc.exec(fullCommand, options, function(error, stdout, stderr) {
                if (stdout) console.log(stdout);
                if (stderr) console.error(stderr);
                callback((error && error.code) || 0, stdout + stderr);
            });

        } else {
            var result = "";
            proc = childproc.spawn(command, args, options);
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
    }

    function createIfNeeded(callback) {
        if (!fs.existsSync(path.resolve(appDir, appConfig.cordovaFolder))) {
            console.log("cordova create needed.");
            exec("cordova", ["create", appConfig.cordovaFolder, appConfig.targets.
                default.appId, appConfig.projectName
            ], {
                cwd: appDir
            }, function(code, data) {
                if (!code) callback();
            });
        } else {
            console.log("cordova project already exists.");
            callback();
        }
    }

    function addPlatformIfNeeded(platform, callback) {
        if (!fs.existsSync(path.resolve(appDir, appConfig.cordovaFolder, "platforms", platform))) {
            exec("cordova", ["platform", "add", platform], {
                cwd: path.resolve(appDir, appConfig.cordovaFolder)
            }, function(code, data) {
                if (!code) callback();
            });
        } else {
            console.log("platform " + platform + " already exists.");
            callback();
        }

    }


    function addPlatforms(callback) {
        function loopfn(i) {
            if (!appConfig.platforms || !appConfig.platforms[i]) return callback();
            addPlatformIfNeeded(appConfig.platforms[i], function() {
                loopfn(i + 1);
            });
        }
        loopfn(0);
    }

    // add a before_prepare hook that replaces everything in the cordova www folder
    // with contents of apphtml folder specified in appConfig
    function addWebCopyHook(callback) {
        console.log("updating web copy hook");
        var hookTemplate = fs.readFileSync(path.join(__dirname, "templates/webcopy.js"), "utf8");
        var hookFolder = path.resolve(appDir, appConfig.cordovaFolder, "hooks", "before_prepare");

        if (!fs.existsSync(hookFolder)) {
            fs.mkdirSync(hookFolder);
        }
        var hookPath = path.resolve(hookFolder, "webcopy.js");
        var fromPath = path.resolve(appDir, appConfig.webPath);
        fromPath = path.relative(path.resolve(appDir, appConfig.cordovaFolder), fromPath);
        fromPath = fromPath.replace(/\\/g, "/");
        fs.writeFileSync(hookPath, hookTemplate.replace("__sourcepath__", fromPath));
        if (process.platform != "win32") {
            fs.chmodSync(hookPath, "777");
        }
        callback();
    }

    exports.update = function() {
        console.log("updating");
        createIfNeeded(function() {
            addWebCopyHook(function() {
                addPlatforms(function() {

                });
            });
        });


    };

    exports.update2 = function(appdef) {



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
                    if (code === 0) {
                        console.log("Project created");
                        console.log("creating ios project");
                        exec("cordova", ["platform", "add", "ios"], {
                            //                    cwd: "lib/cordova-ios/bin"
                        }, function(code, data) {
                            console.log(data);
                            if (code === 0) {
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

        }


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
                });



        }

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