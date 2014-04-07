#App wrapper

Wrap an html app with cordova.

##Installation

    npm install -g appwrapper

##Usage

To create a default config file in the current directory

    appwrapper init

To create or update a cordova project based on the config file

    appwrapper update

## Configuration

Sample config file. All paths are relative to the location of the config file.

    {
        "title": "App Title",
        "projectName": "HelloWorld", 
        "cordovaFolder": "cordova",
        "webPath": "../app/apphtml",
        "platforms": [
            "ios",
            "android"
        ],
        "plugins": [],
        "targets": {
            "default": {
                "appId": "com.example.helloworld"
            }
        }
    }

`title` (not implemented yet) is a human friendly name for the app.

`projectName` will be the name of the xcode project and the default target. Avoid spaces.

`cordovaFolder` is where the cordova project will be created. It must not already exist when `cordova create` is run.

`webPath` is the path to your actual html development folder. These files will be copied to the cordova www folder as part of the build process.

`platforms` is an array of cordova platform names. Values will be passed to `cordova platform add` if that platform does not already exist.

`plugins` (not implemented yet) is an array of plugin ids. It will use [plugdev](https://github.com/tqc/plugdev) to handle updating of plugins from custom locations.

`targets` (only default implemented so far) allows additional targets to be added to the xcode project. The default target is required and will always be named to match `projectName` so that cordova doesn't get confused. Other targets will be named to match the key in the targets object.
