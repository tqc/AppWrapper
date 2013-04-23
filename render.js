var fs = require("fs");
var system = require('system');

var page = require("webpage").create();

var destinationFolder = system.args[1];
var iconSource = system.args[2];
var splashSource = system.args[3];

function generate(url, w, h, fn, callback) {

    page.viewportSize = {
        width: w,
        height: h
    };

    page.open(url, function() {
        page.render(destinationFolder+"/"+fn);
        callback();
    });


};

generate(iconSource, 1024, 1024, "icon-1024.png", function() {
    generate(iconSource, 144, 144, "icon-72@2x.png", function() {
        generate(iconSource, 72, 72, "icon-72.png", function() {
            generate(iconSource, 114, 114, "icon@2x.png", function() {
                generate(splashSource, 640, 1136, "Default-568h@2x~iphone.png", function() {
                    generate(splashSource, 2048, 1496, "Default-Landscape@2x~ipad.png", function() {
                        generate(splashSource, 1024, 748, "Default-Landscape~ipad.png", function() {
                            generate(splashSource, 1536, 2008, "Default-Portrait@2x~ipad.png", function() {
                                generate(splashSource, 768, 1004, "Default-Portrait~ipad.png", function() {
                                    generate(splashSource, 640, 960, "Default@2x~iphone.png", function() {
                                        generate(splashSource, 320, 480, "Default~iphone.png", function() {
                                                phantom.exit();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});