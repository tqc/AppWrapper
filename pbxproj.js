(function() {

    var fs = require('fs');


    var pbxprojFile = function() {
        var pf = this;


        function parsePBXFileReferenceSection(section) {
            section.fileReferenceArray = [];
            section.fileReferences = {};

            for (var i = 1; i < section.lines.length - 1; i++) {
                var line = section.lines[i];
                var m = line.match(/\t\t([0-9A-F]{24}) \/\* (.*) \*\/ = \{((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?((\w*) = ([^;]*); )?\};/);
                var fr = {
                    originalContent: line,
                    id: m[1],
                    label: m[2],
                    name: m[2],
                    settings: {}
                };

                section.fileReferenceArray.push(fr);
                section.fileReferences[fr.id] = fr;
                for (var j = 3; j < m.length; j += 3) {
                    var pn = m[j + 1];
                    if (pn) fr.settings[pn] = m[j + 2];
                }
            }

            section.getByPath = function(path) {
                for (var k = 0; k < section.fileReferenceArray.length; k++) {
                    var fr = section.fileReferenceArray[k];
                    if (fr.isDeleted) continue;
                    if (fr.path == path) return fr;
                }
                return null;
            };

            section.summary = function() {
                return section.fileReferenceArray.length + " file references";
            };

            section.write = function(outputLines) {
                outputLines.push(section.lines[0]);

                for (var k = 0; k < section.fileReferenceArray.length; k++) {
                    var fr = section.fileReferenceArray[k];
                    if (fr.isDeleted) continue;
                    var line = "\t\t" + fr.id + " /* " + fr.label + " */ = {";
                    for (var pn in fr.settings) {
                        line += pn + " = " + fr.settings[pn] + "; ";
                    }
                    line += "};";
                    outputLines.push(line);
                }

                outputLines.push(section.lines[section.lines.length - 1]);
            };
        }


        function parsePBXBuildFileSection(section) {
            section.buildFileArray = [];
            section.buildFiles = {};
            for (var i = 1; i < section.lines.length - 1; i++) {
                var line = section.lines[i];
                var m = line.match(/\t\t([0-9A-F]{24}) \/\* (.*) \*\/ = \{((isa) = ((PBXBuildFile)); )?((fileRef) = ((\);|";|[^;])*); )?((settings) = (\{(.)*\}); )?\};$/);
                var fr = {
                    originalContent: line,
                    id: m[1],
                    label: m[2],
                    name: m[2],
                    settings: {}
                };

                for (var j = 3; j < m.length; j += 4) {
                    var pn = m[j + 1];
                    if (pn) fr.settings[pn] = m[j + 2];
                }
                //              console.log(fr.settings);

                fr.fileRef = pf.sections.PBXFileReference.fileReferences[fr.settings.fileRef.substr(0, 24)];
                //                console.log(fr.fileRef);
                // console.log("reference to " + fr.fileRef.label);
                section.buildFileArray.push(fr);
                section.buildFiles[fr.id] = fr;


            }

            section.summary = function() {
                return section.buildFileArray.length + " build file references";
            };

            section.write = function(outputLines) {
                outputLines.push(section.lines[0]);

                for (var k = 0; k < section.buildFileArray.length; k++) {
                    var fr = section.buildFileArray[k];
                    if (fr.isDeleted) continue;

                    if (fr.fileRef && fr.fileRef.isDeleted) continue;

                    var line = "\t\t" + fr.id + " /* " + fr.label + " */ = {";
                    for (var pn in fr.settings) {
                        line += pn + " = " + fr.settings[pn] + "; ";
                    }
                    line += "};";

                    outputLines.push(line);
                }

                outputLines.push(section.lines[section.lines.length - 1]);
            };

        }


        function parsePBXGroupSection(section) {
            section.groupArray = [];
            section.groups = {};

            var i = 1;
            while (i < section.lines.length - 1) {
                var l1 = section.lines[i++];

                var m1 = l1.match(/\t*([0-9A-F]{24}) \/\* (.*) \*\/ = {/);

                var g = {
                    id: m1[1],
                    label: m1[2],
                    children: []
                };
                section.groupArray.push(g);
                section.groups[g.id] = g;

                i++; // isa = PBXGroup;
                i++; // children = (
                var line = section.lines[i++];
                while (line.indexOf(");") < 0) {
                    var m2 = line.match(/\t*([0-9A-F]{24}) \/\* (.*) \*\/,/);
                    g.children.push(m2[1]);
                    line = section.lines[i++];
                }

                line = section.lines[i++];
                while (line.indexOf("};") < 0) {
                    var m3 = line.match(/\t*(\w*) = (.*);$/);
                    g[m3[1]] = m3[2];
                    line = section.lines[i++];
                }
            }

            section.getRootGroupByName = function(name) {
                for (var k = 0; k < section.groupArray.length; k++) {
                    var g = section.groupArray[k];
                    if (pf.sourceTree != "SOURCE_ROOT") continue;
                    if (g.name == name) return g;
                }
                return null;
            };

            section.getGroupByName = function(name) {
                for (var k = 0; k < section.groupArray.length; k++) {
                    var g = section.groupArray[k];
                    //      if (pf.sourceTree != "SOURCE_ROOT") continue;
                    if (g.name == name) return g;
                }
                return null;
            };


            section.getChildByName = function(parentGroup, name) {
                for (var n = 0; n < parentGroup.children.length; n++) {
                    var frid = parentGroup.children[n];
                    fr = pf.sections.PBXFileReference.fileReferences[frid] || pf.sections.PBXReferenceProxy.referenceProxies[frid] || pf.sections.PBXGroup.groups[frid] || pf.sections.PBXVariantGroup.groups[frid];
                    if (!fr) continue;
                    if (fr.isDeleted) continue;
                    if (fr.name == name || fr.label == name) return fr;
                }
                return null;
            };

            section.deleteChildItems = function(g) {
                for (var n = 0; n < g.children.length; n++) {
                    var frid = g.children[n];
                    fr = pf.sections.PBXFileReference.fileReferences[frid] || pf.sections.PBXReferenceProxy.referenceProxies[frid] || pf.sections.PBXGroup.groups[frid] || pf.sections.PBXVariantGroup.groups[frid];
                    if (!fr) continue;
                    fr.isDeleted = true;
                    if (fr.children) section.deleteChildItems(fr);
                }
            };


            section.summary = function() {
                return section.groupArray.length + " groups";
            };

            section.write = function(outputLines) {
                outputLines.push(section.lines[0]);

                for (var k = 0; k < section.groupArray.length; k++) {
                    var g = section.groupArray[k];
                    outputLines.push("\t\t" + g.id + " /* " + g.label + " */ = {");
                    outputLines.push("\t\t\tisa = PBXGroup;");
                    outputLines.push("\t\t\tchildren = (");
                    for (var n = 0; n < g.children.length; n++) {
                        var frid = g.children[n];
                        fr = pf.sections.PBXFileReference.fileReferences[frid] || pf.sections.PBXReferenceProxy.referenceProxies[frid] || pf.sections.PBXGroup.groups[frid] || pf.sections.PBXVariantGroup.groups[frid];
                        if (fr.isDeleted) continue;
                        outputLines.push("\t\t\t\t" + fr.id + " /* " + fr.label + " */,");
                    }
                    outputLines.push("\t\t\t);");
                    if (g.name) outputLines.push("\t\t\tname = " + g.name + ";");
                    if (g.path) outputLines.push("\t\t\tpath = " + g.path + ";");
                    if (g.sourceTree) outputLines.push("\t\t\tsourceTree = " + g.sourceTree + ";");
                    outputLines.push("\t\t};");
                }

                outputLines.push(section.lines[section.lines.length - 1]);
            };
        }


        function parsePBXVariantGroupSection(section) {
            section.groupArray = [];
            section.groups = {};

            var i = 1;
            while (i < section.lines.length - 1) {
                var l1 = section.lines[i++];

                var m1 = l1.match(/\t*([0-9A-F]{24}) \/\* (.*) \*\/ = {/);

                var g = {
                    id: m1[1],
                    label: m1[2],
                    name: m1[2],
                    children: []
                };
                section.groupArray.push(g);
                section.groups[g.id] = g;

                i++; // isa = PBXGroup;
                i++; // children = (
                var line = section.lines[i++];
                while (line.indexOf(");") < 0) {
                    var m2 = line.match(/\t*([0-9A-F]{24}) \/\* (.*) \*\/,/);
                    g.children.push(m2[1]);
                    line = section.lines[i++];
                }

                line = section.lines[i++];
                while (line.indexOf("};") < 0) {
                    var m3 = line.match(/\t*(\w*) = (.*);$/);
                    g[m3[1]] = m3[2];
                    line = section.lines[i++];
                }
            }

            section.getRootGroupByName = function(name) {
                for (var k = 0; k < section.groupArray.length; k++) {
                    var g = section.groupArray[k];
                    if (g.sourceTree != "SOURCE_ROOT") continue;
                    if (g.name == name) return g;
                }
                return null;
            };

            section.getChildByName = function(parentGroup, name) {
                for (var n = 0; n < parentGroup.children.length; n++) {
                    var frid = parentGroup.children[n];
                    fr = pf.sections.PBXFileReference.fileReferences[frid] || pf.sections.PBXReferenceProxy.referenceProxies[frid] || pf.sections.PBXGroup.groups[frid] || pf.sections.PBXVariantGroup.groups[frid];
                    if (fr.isDeleted) continue;
                    if (fr.name == name || fr.label == name) return fr;
                }
                return null;
            };



            section.summary = function() {
                return section.groupArray.length + " groups";
            };

            section.write = function(outputLines) {
                outputLines.push(section.lines[0]);

                for (var k = 0; k < section.groupArray.length; k++) {
                    var g = section.groupArray[k];
                    outputLines.push("\t\t" + g.id + " /* " + g.label + " */ = {");
                    outputLines.push("\t\t\tisa = PBXVariantGroup;");
                    outputLines.push("\t\t\tchildren = (");
                    for (var n = 0; n < g.children.length; n++) {
                        var frid = g.children[n];
                        fr = pf.sections.PBXFileReference.fileReferences[frid] || pf.sections.PBXReferenceProxy.referenceProxies[frid] || pf.sections.PBXGroup.groups[frid] || pf.sections.PBXVariantGroup.groups[frid];
                        if (fr.isDeleted) continue;
                        outputLines.push("\t\t\t\t" + fr.id + " /* " + fr.label + " */,");
                    }
                    outputLines.push("\t\t\t);");
                    if (g.name) outputLines.push("\t\t\tname = " + g.name + ";");
                    if (g.path) outputLines.push("\t\t\tpath = " + g.path + ";");
                    if (g.sourceTree) outputLines.push("\t\t\tsourceTree = " + g.sourceTree + ";");
                    outputLines.push("\t\t};");
                }

                outputLines.push(section.lines[section.lines.length - 1]);
            };
        }


        function parsePBXReferenceProxySection(section) {
            section.referenceProxyArray = [];
            section.referenceProxies = {};

            var i = 1;
            while (i < section.lines.length - 1) {
                var l1 = section.lines[i++];
                var m1 = l1.match(/\t*([0-9A-F]{24}) \/\* (.*) \*\/ = {/);

                var g = {
                    id: m1[1],
                    label: m1[2],
                    settings: {}
                };
                section.referenceProxyArray.push(g);
                section.referenceProxies[g.id] = g;

                var line = section.lines[i++];
                while (line.indexOf("};") < 0) {
                    var m3 = line.match(/\t*(\w*) = (.*);$/);
                    g.settings[m3[1]] = m3[2];
                    line = section.lines[i++];
                }
            }

            section.summary = function() {
                return section.referenceProxyArray.length + " reference proxies";
            };

            section.write = function(outputLines) {
                outputLines.push(section.lines[0]);

                for (var k = 0; k < section.referenceProxyArray.length; k++) {
                    var g = section.referenceProxyArray[k];
                    outputLines.push("\t\t" + g.id + " /* " + g.label + " */ = {");
                    for (var pn in g.settings) {
                        outputLines.push("\t\t\t" + pn + " = " + g.settings[pn] + ";");
                    }
                    outputLines.push("\t\t};");
                }

                outputLines.push(section.lines[section.lines.length - 1]);
            };
        }


        function parsePBXResourcesBuildPhaseSection(section) {
            section.buildPhaseArray = [];
            section.buildPhases = {};

            var i = 1;
            while (i < section.lines.length - 1) {
                var m1 = section.lines[i++].match(/\t*([0-9A-F]{24}) \/\* (.*) \*\/ = {/);

                var g = {
                    id: m1[1],
                    label: m1[2],
                    files: []
                };
                section.buildPhaseArray.push(g);
                section.buildPhases[g.id] = g;

                var line = section.lines[i++];
                while (line.indexOf("files =") < 0) {
                    var m3 = line.match(/\t*(\w*) = (.*);$/);
                    g[m3[1]] = m3[2];
                    line = section.lines[i++];
                }

                line = section.lines[i++];
                while (line.indexOf(");") < 0) {
                    var m2 = line.match(/\t*([0-9A-F]{24}) \/\* (.*) \*\/,/);
                    g.files.push(m2[1]);
                    line = section.lines[i++];
                }

                line = section.lines[i++];
                while (line.indexOf("};") < 0) {
                    var m3 = line.match(/\t*(\w*) = (.*);$/);
                    g[m3[1]] = m3[2];
                    line = section.lines[i++];
                }
            }

            section.summary = function() {
                return section.buildPhaseArray.length + " build phases";
            };

            section.write = function(outputLines) {
                outputLines.push(section.lines[0]);

                for (var k = 0; k < section.buildPhaseArray.length; k++) {
                    var g = section.buildPhaseArray[k];
                    outputLines.push("\t\t" + g.id + " /* " + g.label + " */ = {");
                    outputLines.push("\t\t\tisa = " + g.isa + ";");
                    outputLines.push("\t\t\tbuildActionMask = " + g.buildActionMask + ";");
                    outputLines.push("\t\t\tfiles = (");
                    for (var n = 0; n < g.files.length; n++) {
                        var frid = g.files[n];
                        fr = pf.sections.PBXBuildFile.buildFiles[frid]
                        if (fr.isDeleted || (fr.fileRef && fr.fileRef.isDeleted)) continue;
                        outputLines.push("\t\t\t\t" + fr.id + " /* " + fr.label + " */,");
                    }
                    outputLines.push("\t\t\t);");
                    if (g.runOnlyForDeploymentPostprocessing) outputLines.push("\t\t\trunOnlyForDeploymentPostprocessing = " + g.runOnlyForDeploymentPostprocessing + ";");
                    outputLines.push("\t\t};");
                }

                outputLines.push(section.lines[section.lines.length - 1]);
            };
        }


        function parsePBXNativeTargetSection(section) {
            section.targetArray = [];
            section.targets = {};

            var i = 1;
            while (i < section.lines.length - 1) {
                var l1 = section.lines[i++];

                var m1 = l1.match(/\t*([0-9A-F]{24}) \/\* (.*) \*\/ = {/);

                var g = {
                    id: m1[1],
                    label: m1[2],
                    buildPhases: []
                };
                section.targetArray.push(g);
                section.targets[g.id] = g;

                i++; // isa = PBXNativeTarget;
                i++; // buildConfigurationList
                i++; // buildPhases = (
                var line = section.lines[i++];
                while (line.indexOf(");") < 0) {
                    var m2 = line.match(/\t*([0-9A-F]{24}) \/\* (.*) \*\/,/);
                    g.buildPhases.push(m2[1]);
                    line = section.lines[i++];
                }

                line = section.lines[i++];
                while (line.indexOf("};") < 0) {
//                    var m3 = line.match(/\t*(\w*) = (.*);$/);
//                    g[m3[1]] = m3[2];
                    line = section.lines[i++];
                }
            }

            section.getByName = function(name) {
                for (var k = 0; k < section.targetArray.length; k++) {
                    var g = section.targetArray[k];
                    if (g.name == name || g.label == name) return g;
                }
                return null;
            };


            section.getBuildPhase = function(target, name) {
                for (var k = 0; k < target.buildPhases.length; k++) {
                    var phaseId = target.buildPhases[k];
                    var phase = pf.sections.PBXResourcesBuildPhase.buildPhases[phaseId] ||
                    pf.sections.PBXSourcesBuildPhase.buildPhases[phaseId];
                    if (!phase) continue;
                    if (phase.name == name || phase.label == name) return phase;
                }
                return null;
            };


            // read only for now - no write implementation

        }



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
            parsePBXReferenceProxySection(pf.sections.PBXReferenceProxy);
            parsePBXBuildFileSection(pf.sections.PBXBuildFile);
            parsePBXGroupSection(pf.sections.PBXGroup);
            if (pf.sections.PBXVariantGroup) parsePBXVariantGroupSection(pf.sections.PBXVariantGroup);
            parsePBXResourcesBuildPhaseSection(pf.sections.PBXResourcesBuildPhase);
            parsePBXResourcesBuildPhaseSection(pf.sections.PBXSourcesBuildPhase);
            parsePBXNativeTargetSection(pf.sections.PBXNativeTarget);

            parsePBXGroupSection(pf.sections.PBXGroup);


            for (var j = 0; j < pf.sectionArray.length; j++) {
                var section = pf.sectionArray[j];
                if (section.summary) {
                    console.log("Section \"" + section.label + "\" - " + section.summary());
                } else {
                    console.log("Section \"" + section.label + "\" - " + section.lines.length + " lines");
                }
            }

        };

        // remove a file or agroup and its contents
        pf.removeItem = function(path) {

            var pathComponents = path.split("/");

            var item = pf.sections.PBXGroup.getGroupByName(pathComponents[0]);
            var i = 1;
            while (i < pathComponents.length) {
                item = pf.sections.PBXGroup.getChildByName(item, pathComponents[i++]);
            }
if (!item) return;

            item.isDeleted = true;
            if (item.children) {
                pf.sections.PBXGroup.deleteChildItems(item);
            }
        }

        var lastId = new Date().getTime();

        pf.getNewId = function() {
            lastId++;
            var pad = "000000000000000000000000";
            hex = lastId.toString(16).toUpperCase();
            hex = hex + pad.substring(0, pad.length - hex.length);
            return hex;
        };


        pf.ensureGroupExists = function(path) {

            var pathComponents = path.split("/");

            var parent = null;
            var item = pf.sections.PBXGroup.getGroupByName(pathComponents[0]);
            var i = 1;
            while (i < pathComponents.length) {
                parent = item;
                item = pf.sections.PBXGroup.getChildByName(item, pathComponents[i++]);
            }

            if (item) return item;
            console.log("creating group " + path);
            var newgroup = {
                id: pf.getNewId(),
                label: pathComponents[pathComponents.length - 1],
                name: pathComponents[pathComponents.length - 1],
                path: pathComponents[pathComponents.length - 1],
                sourceTree: "\"<group>\"",
                children: []
            };
            pf.sections.PBXGroup.groups[newgroup.id] = newgroup;
            pf.sections.PBXGroup.groupArray.push(newgroup);
            parent.children.push(newgroup.id);

            return newgroup;

        };

        pf.ensureFileExists = function(path) {

            var pathComponents = path.split("/");

            var parent = null;
            var item = pf.sections.PBXGroup.getGroupByName(pathComponents[0]);
            var i = 1;
            while (i < pathComponents.length) {
                parent = item;
                item = pf.sections.PBXGroup.getChildByName(item, pathComponents[i++]);
            }

            if (item) return item;
           console.log("creating file " + path);
            var newfile = {
                id: pf.getNewId(),
                label: pathComponents[pathComponents.length - 1],
                name: pathComponents[pathComponents.length - 1],


                settings: {
                    isa: 'PBXFileReference',
                    path: "\"" + pathComponents[pathComponents.length - 1] + "\"",
                    sourceTree: "\"<group>\"",
                }
            };

            pf.sections.PBXFileReference.fileReferences[newfile.id] = newfile;
            pf.sections.PBXFileReference.fileReferenceArray.push(newfile);
            parent.children.push(newfile.id);

            return newfile;

        };

        // add file reference and add to a group
        pf.addFile = function(path, group) {

        }

        pf.addFileToTarget = function(targetName, phaseName, path) {
            // get target
            var target = pf.sections.PBXNativeTarget.getByName(targetName);
            if (!target) {
                console.log("Could not find target "+targetName);
                return;
            }
            // find appropriate build phase
            var phase = pf.sections.PBXNativeTarget.getBuildPhase(target, phaseName);

            var fileRef = pf.ensureFileExists(path);

            // check if file is already included

            for (var i = 0; i < phase.files.length; i++) {
                var bfid = phase.files[i];
                var bf = pf.sections.PBXBuildFile.buildFiles[bfid];
                if (bf.fileRef == fileRef) return;
            }

            // not found -  

            // add a new buildfile

            var newfile = {
                id: pf.getNewId(),
                label: fileRef.label,
                name: fileRef.name,
                settings: {
                    isa: 'PBXBuildFile',
                    fileRef: fileRef.id
                }
            };


            pf.sections.PBXBuildFile.buildFiles[newfile.id] = newfile;
            pf.sections.PBXBuildFile.buildFileArray.push(newfile);
            phase.files.push(newfile.id);

        }


        pf.save = function(path) {
            console.log("saving " + path);
            var outputLines = [];
            for (var i = 0; i < pf.sectionArray.length; i++) {
                var section = pf.sectionArray[i];
                if (section.write) {
                    section.write(outputLines);
                } else {
                    for (var j = 0; j < section.lines.length; j++) {
                        outputLines.push(section.lines[j]);
                    }
                }

                fs.writeFileSync(path, outputLines.join("\n"));
            }
        };


    };


    exports.open = function(path) {

        var f = new pbxprojFile();
        f.open(path);
        return f;

    };

})();