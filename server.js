var paper = require('./lib/paper.js/node.js');
var express = require('express');
var webServer = express.createServer();
var io = require('socket.io').listen(webServer);

io.set('log level', 1);
webServer.listen(8001);
webServer.set('view engine', 'jade');
webServer.use(express.static(__dirname + '/public'));
webServer.use(express.errorHandler());
webServer.use(express.bodyParser());
webServer.get('/', function(req, res) {
   res.render('index'); 
});

function publishPathsToClient(socket, paths) {
    for (var pathIndex in paths) {
        var path = paths[pathIndex];
        var segments = [];
        for (var segmentIndex = 0, l = path.segments.length; segmentIndex < l; ++segmentIndex) {
            var segment = path.segments[segmentIndex];
            segments.push({
                x: segment.point.x, 
                y: segment.point.y,
                ix: segment.handleIn.x,
                iy: segment.handleIn.y,
                ox: segment.handleOut.x,
                oy: segment.handleOut.y,
            });
        }
        socket.emit('add path', {id: path.pathId, segments: segments});
    }    
}

paper.setup();
var pathCounter = 0;
var paths = {};

io.sockets.on('connection', function(socket) {
    publishPathsToClient(socket, paths);
    socket.on('add path', function(message) {
        var path = new paper.Path();
        path.pathId = message.id;
        paths[path.pathId] = path;
        socket.broadcast.emit('add path', message);
    });
    socket.on('add path point', function(message) {
        if (typeof message == 'undefined' || typeof message.id == 'undefined') return;
        var path = paths[message.id];
        if (typeof path !== 'undefined') {
            path.add(new paper.Point(message.x, message.y));
            socket.broadcast.emit('add path point', message);
        }
    });
    socket.on('end path', function(message) {
        if (typeof message == 'undefined' || typeof message.id == 'undefined') return;
        var path = paths[message.id];
        if (typeof path !== 'undefined') {
            path.simplify();
            socket.broadcast.emit('end path', message);
        }
    });
    socket.on('remove path', function(message) {
        if (typeof message == 'undefined' || typeof message.id == 'undefined') return;
        var path = paths[message.id];
        if (typeof path !== 'undefined') {
            path.remove();
            delete paths[message.id];
            socket.broadcast.emit('remove path', message);
        }
    });
    socket.on('move path', function(message) {
        if (typeof message == 'undefined' || typeof message.id == 'undefined') return;
        var path = paths[message.id];
        if (typeof path !== 'undefined') {
            path.position.x += message.delta.x;
            path.position.y += message.delta.y;
            socket.broadcast.emit('move path', message);
        }
    });
    socket.on('move segment', function(message) {
        if (typeof message == 'undefined' || typeof message.id == 'undefined') return;
        var path = paths[message.id];
        if (typeof path !== 'undefined') {
            var pt = path.segments[message.segment].point;
            pt.x += message.delta.x;
            pt.y += message.delta.y;
            path.smooth();
            socket.broadcast.emit('move segment', message);
        }
    });
});
