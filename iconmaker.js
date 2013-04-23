(function() {

    var spawn = require('child_process').spawn;

    function exec(command, args, options, callback) {
        var result = "";
        var proc = spawn(command, args, options);
        proc.stdout.on('data', function(data) {
            console.log(""+data);
            result += data;
        });
        proc.stderr.on('data', function(data) {
            console.log(data);
            result += data;
        });
        proc.on('exit', function(code) {
            callback(code, result);
        });
    }

    exports.render = function(destinationFolder, iconSource, splashSource, callback) {



            exec("phantomjs", [__dirname+"/render.js", destinationFolder, iconSource, splashSource], {}, function(code, data) {
                callback();
            });




    };

})();