(function() {

    var fs = require("fs-extra");
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
            console.log("Checking for cordova submodule");

            exec("git", ["submodule", "status", "lib/cordova-ios"], {}, function(code, data) {
                if (code === 0 && data.length === 0) {
                    // folder exists in git but isn't a submodule - error
                    console.log("Unable to create submodule");
                    process.exit(1);
                } else if (code === 0) {
                    // valid submodule - update it
                    console.log("Updating existing submodule");
                    exec("git", ["pull"], {
                        cwd: "lib/cordova-ios"
                    }, function(code, data) {
                        console.log(data);
                        callback();
                    });
                } else {
                    // submodule does not exist - create it
                    console.log("Creating new submodule");
                    exec("git", ["submodule", "add", "-b", appdef.cordovaBranch, "-f", "git://github.com/apache/cordova-ios.git", "lib/cordova-ios"], {}, function(code, data) {
                        console.log(data);
                        callback();
                    });
                }
                callback();
            });
        }


        function ensureProjectCreated(callback) {
            if (fs.existsSync(appdef.projectName)) {
                console.log("Project already exists");
                pf = pbxproj.open(appdef.projectName + "/" + appdef.projectName + ".xcodeproj/project.pbxproj");
                callback();
            } else {
                console.log("creating project");
                exec("./create", ["--shared", "--arc", "../../../" + appdef.projectName, appdef.packageName, appdef.projectName], {
                    cwd: "lib/cordova-ios/bin"
                }, function(code, data) {
                    console.log(data);
                    if (code == 0) {
                        console.log("Project created");
                        pf = pbxproj.open(appdef.projectName + "/" + appdef.projectName + ".xcodeproj/project.pbxproj");
                        removePhonegapDefaultFiles(function() {
                            updateWebFolderLink(function() {
                                callback();
                            });
                        });
                    } else {
                        console.log("Unable to create project");
                        process.exit(1);
                    }

                });
            }
        }

        var pf;


        function updateWebFolderLink(callback) {


            for (var i = 0; i < pf.sections.PBXFileReference.fileReferenceArray.length; i++) {
                var fr = pf.sections.PBXFileReference.fileReferenceArray[i];
                if (fr.label == "www" && fr.settings.path == "www") {
                    console.log("www path needs updating");
                    fr.settings.path = "\"../" + appdef.wwwPath + "\"";
                    fr.settings.name = "www";
                }
            }
            callback();

        }


        function updateCordovaScript(callback) {
            fs.mkdirsSync(appdef.projectName + "/" + appdef.projectName + "/Resources/platformscripts");
            pf.ensureGroupExists("Resources/platformscripts");

            fs.copy('lib/cordova-ios/CordovaLib/cordova.ios.js', appdef.projectName + "/" + appdef.projectName + "/Resources/platformscripts/cordova.js", function(err) {
                pf.addFileToTarget(appdef.projectName, "Resources", "Resources/platformscripts/cordova.js");
            callback();
               });

        };


        function updatePlugins(callback) {

            var configxml = fs.readFileSync(appdef.projectName + "/" + appdef.projectName + "/config.xml").toString();
            var pluginStart = configxml.indexOf("<plugins>")+10;

            async.eachSeries(appdef.plugins || [], function(plugin, next) {
                var pluginNode =  "<plugin name=\""+plugin.name+"\" value=\""+plugin.name+"\"/>"
                if (configxml.indexOf(pluginNode) < 0) configxml = configxml.substr(0, pluginStart)+"\t\t"+pluginNode+"\n"+configxml.substr(pluginStart);

                async.eachSeries(plugin.sources || [plugin.name + ".m"], function(source, next) {
                    // copy source
                    fs.copy(plugin.path + "/" + source, appdef.projectName + "/" + appdef.projectName + "/Plugins/" + source, function(err) {
                        pf.addFileToTarget(appdef.projectName, "Sources", "Plugins/" + source);
                        next();
                    });
                }, function(err) {
                    async.eachSeries(plugin.headers || [plugin.name + ".h"], function(header, next) {
                        // copy header
                        fs.copy(plugin.path + "/" + header, appdef.projectName + "/" + appdef.projectName + "/Plugins/" + header, function(err) {
                            pf.ensureFileExists("Plugins/" + header);
                            next();
                        });

                    }, function(err) {
                        async.eachSeries(plugin.scripts || [plugin.name + ".js"], function(script, next) {
                            // copy script
                            fs.copy(plugin.path + "/" + script, appdef.projectName + "/" + appdef.projectName + "/Resources/platformscripts/" + script, function(err) {
                                pf.addFileToTarget(appdef.projectName, "Resources", "Resources/platformscripts/" + script);
                                next();
                            });
                        }, function(err) {
                            next();
                        });
                    });
                });
            },

            function(err) {

                fs.writeFileSync(appdef.projectName + "/" + appdef.projectName + "/config.xml", configxml.toString());
                callback();
            })



        };

        function removePhonegapDefaultFiles(callback) {


            fs.removeSync(appdef.projectName + "/" + appdef.projectName + "/Resources/icons");
            fs.removeSync(appdef.projectName + "/" + appdef.projectName + "/Resources/splash");
            fs.removeSync(appdef.projectName + "/" + appdef.projectName + "/Resources/Capture.bundle");
            fs.removeSync(appdef.projectName + "/" + appdef.projectName + "/Resources/de.lproj");
            fs.removeSync(appdef.projectName + "/" + appdef.projectName + "/Resources/se.lproj");
            fs.removeSync(appdef.projectName + "/" + appdef.projectName + "/Resources/en.lproj");
            fs.removeSync(appdef.projectName + "/" + appdef.projectName + "/Resources/es.lproj");


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

            iconmaker.render(appdef.projectName + "/" + appdef.projectName + "/Resources/" + appdef.artwork.folderName, appdef.artwork.iconSource, appdef.artwork.splashSource, callback);



        }


        console.log("Updating app " + appdef.projectName);



        // add a group for the shared icons under resources


        ensureProjectCreated(function() {

            //   updateArtwork(appdef.projectName, appdef.artwork, function() {
   updateWebFolderLink(function() {
            updateCordovaScript(function() {

                updatePlugins(function() {

                    pf.save(appdef.projectName + "/" + appdef.projectName + ".xcodeproj/project.pbxproj");

                });
            });  
             });
            //  });
        });


        return;



        updateCordova(function() {

        })


    };

})();