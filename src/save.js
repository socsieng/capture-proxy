var util = require('util');
var fs = require('fs');
var path = require('path');
var fsUtil = require('./util/fs');

var saveFolder = path.join(fsUtil.homePath(), '.capture/save/');

function save (filePath, name) {
    fsUtil.ensurePath(saveFolder);
    fs.writeFileSync(path.join(saveFolder, name), fs.readFileSync(filePath));
}

function load (name) {
    var fileName = name;
    if (fs.existsSync(fileName)) {
        return fs.readFileSync(fileName, 'utf-8');
    }
    fileName = path.join(saveFolder, name);
    if (fs.existsSync(fileName)) {
        return fs.readFileSync(fileName, 'utf-8');
    }
    return null;
}

module.exports = {
    save: save,
    load: load
};
