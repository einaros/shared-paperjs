var paper = require('./lib/paper.js/node.js');
var express = require('express');
var app = express.createServer();
var io = require('socket.io').listen(app);

io.set('log level', 1);
app.listen(8000);
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use(express.errorHandler());
app.use(express.bodyParser());
app.get('/', function(req, res) {
   res.render('index'); 
});

paper.setup();
var pathCounter = 0;
var paths = {};
io.sockets.on('connection', function(socket) {
    for (var i in paths) {
        var path = paths[i];
        var segments = [];
        for (var si = 0, l = path.segments.length; si < l; ++si) {
            var s = path.segments[si];
            segments.push({
                x: s.point.x, 
                y: s.point.y,
                ix: s.handleIn.x,
                iy: s.handleIn.y,
                ox: s.handleOut.x,
                oy: s.handleOut.y,
            });
        }
        socket.emit('add path', {id: path._id, segments: segments});
    }
    socket.on('add path', function(message, callback) {
        var path = new paper.Path();
        path._id = pathCounter;
        pathCounter += 1;
        paths[pathCounter] = path;
        var pathId = paths.length;
        callback(pathCounter);
        socket.broadcast.emit('add path', {id: pathCounter});
    });
    socket.on('add path point', function(message) {
        if (typeof message == 'undefined' || typeof message.id == 'undefined') return;
        var path = paths[message.id];
        if (typeof path !== 'undefined' && !path.ended) {
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
});
