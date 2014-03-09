module.exports = {
    listen: require('./src/capture').listen,
    replay: require('./src/replay').replay,
    save: require('./src/save').save,
    load: require('./src/save').load
};
