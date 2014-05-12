#!/usr/bin/env node

"use strict";

var appwrapper = require("./appwrapper-lib");
var pkg = require("./package.json");


console.log("appwrapper v" + pkg.version);

appwrapper.open(process.cwd());

if (process.argv[2] == "init") {
    if (appwrapper.isConfigured) {
        console.log("App is already configured in this folder");
        return;
    }
    appwrapper.init();
    console.log("appwrapper.json created - edit it then run");
    console.log("    appwrapper update");

} else if (process.argv[2] == "update") {
    if (!appwrapper.isConfigured) {
        console.log("App configuration not found. Try changing folders or running");
        console.log("    appwrapper init");
        return;
    }
    appwrapper.update();
} else {
    console.log("Usage:");
    console.log("    appwrapper [init|update]");
}