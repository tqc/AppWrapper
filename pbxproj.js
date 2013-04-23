(function() {

    var fs = require('fs');

    function parsePBXFileReferenceSection(section) {
        section.fileReferences = [];

        for (var i = 1; i < section.lines.length - 1; i++) {
            var line = section.lines[i];
            var m = line.match(/\t\t([0-9A-F]{24}) \/\* (.*) \*\/ = \{((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?\};/);
            var fr = {
                originalContent: line,
                id: m[1],
                label: m[2],
                settings: {}
            };
            section.fileReferences.push(fr);
            for (var j = 3; j < m.length; j += 3) {
                fr.settings[m[j + 1]] = m[j + 2];
            }

            console.log(fr.settings.path);

        }

        section.summary = function() {
            return section.fileReferences.length + " file references";
        };

        section.write = function(outputLines) {
            outputLines.push(section.lines[0]);

            for (var k = 0; k < section.fileReferences.length; i++) {
                var fr = section.fileReferences[k];
                var line = "\t\t" + fr.id + " /* " + fr.label + " */ {";
                for (var pn in fr.settings) {
                    line += pn + " = " + fr.settings[pn] + "; ";
                }
                line += "};";
            }

            outputLines.push(section.lines[section.lines.length - 1]);
        };

    }

    var pbxprojFile = function() {
        var pf = this;

        pf.open = function(path) {
            pf.originalContent = fs.readFileSync(path).toString();
            pf.lines = pf.originalContent.split("\n");

            pf.sectionArray = [];
            var currentSection = {
                label: "",
                lines: []
            };
            pf.sectionArray.push(currentSection);
            pf.sections = {};

            for (var i = 0; i < pf.lines.length; i++) {
                var line = pf.lines[i];
                if (line.indexOf("/* Begin ") === 0) {
                    // starting a new section
                    currentSection = {
                        label: line.substr(9, line.length - 20),
                        lines: [line]
                    };
                    pf.sections[currentSection.label] = currentSection;
                    pf.sectionArray.push(currentSection);
                } else if (line.indexOf("/* End ") === 0) {
                    // starting a new unlabeled section
                    currentSection.lines.push(line);
                    currentSection = {
                        label: "",
                        lines: []
                    };
                    pf.sectionArray.push(currentSection);
                } else {
                    currentSection.lines.push(line);
                }
            }


            parsePBXFileReferenceSection(pf.sections.PBXFileReference);


            for (var j = 0; j < pf.sectionArray.length; j++) {
                var section = pf.sectionArray[j];
                if (section.summary) {
                    console.log("Section \"" + section.label + "\" - " + section.summary())
                } else {
                    console.log("Section \"" + section.label + "\" - " + section.lines.length + " lines");
                }
            }

        };


    };


    exports.open = function(path) {

        var f = new pbxprojFile();
        f.open(path);
        return f;

    };

})();