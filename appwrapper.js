(function() {

    var fs = require("fs");
    var spawn = require('child_process').spawn;
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
                callback();
            } else {
                console.log("creating project");
                exec("./create", ["--shared", "--arc", "../../../" + appdef.projectName, appdef.packageName, appdef.projectName], {
                    cwd: "lib/cordova-ios/bin"
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
            }
        }

        function updateWebFolderLink(callback) {
            iconmaker.render(appdef.projectName + "/Resources/" + appdef.artwork.folderName, appdef.artwork.iconSource, appdef.artwork.splashSource, callback);
        }


        function updateArtwork(callback) {
            iconmaker.render(appdef.projectName + "/Resources/" + appdef.artwork.folderName, appdef.artwork.iconSource, appdef.artwork.splashSource, callback);
        }


        console.log("Updating app " + appdef.projectName);



        var pf = pbxproj.open(appdef.projectName+"/"+appdef.projectName+".xcodeproj/project.pbxproj");

        for (var i = 0; i < pf.sections.PBXFileReference.fileReferences.length; i++) {
            var fr = pf.sections.PBXFileReference.fileReferences[i];
            if (fr.label == "www" && fr.settings.path == "www") {
                console.log("www path needs updating");
                fr.settings.path = "\""+appdef.wwwPath+"\"";
            }
        }

        

        return;

        ensureProjectCreated(function() {

        })



        updateArtwork(function() {

        })


        updateCordova(function() {

        })


    };

})();