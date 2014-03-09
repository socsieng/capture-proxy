var fs = require('fs');
var path = require('path');

function ensurePath (fullPath) {
    var parts = fullPath.split(path.sep);
    for (var i = 1; i <= parts.length; i++) {
        var folder = parts.slice(0, i).join(path.sep);
        if (folder) {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder);
            }
        }
    }
}

function homePath () {
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

module.exports = {
    ensurePath: ensurePath,
    homePath: homePath
};
