var paper = require('./lib/paper.js/node.js');
var express = require('express');
var receiver = require('./public/receiver');
var webServer = express.createServer();
var io = require('socket.io').listen(webServer);

function publishPathsToClient(socket) {
    var path = paper.project.activeLayer.firstChild;
    while (path) {
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
        var message = {
            id: path.name, 
        };
        if (segments.length > 0) {
            message.segments = segments;
        }
        message.closed = path.closed;
        socket.emit('add path', message);
        path = path.nextSibling;
    }    
}

io.set('log level', 1);
webServer.listen(8001);
webServer.set('view engine', 'jade');
webServer.use(express.static(__dirname + '/public'));
webServer.use(express.errorHandler());
webServer.use(express.bodyParser());
webServer.get('/', function(req, res) {
   res.render('index'); 
});
paper.setup();
io.sockets.on('connection', function(socket) {
    publishPathsToClient(socket);
    receiver.setupReceiver(paper, socket, true);
});
