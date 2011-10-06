$(function() {
    var canvas = $('canvas')[0];
    paper.setup(canvas);
    paper.view.draw();
    
    var pathCounter = 0;
    var paths = {};
    var socket = io.connect();
    
    function getNewPathId() {
        return socket.socket.sessionid + '-' + (++pathCounter);
    }
    
    socket.on('connect', function() {
        socket.on('add path', function(message) {
            var path;
            if (typeof message.segments !== 'undefined') {
                var segments = [];
                for (var i = 0, l = message.segments.length; i < l; ++i) {
                    var segment = message.segments[i];
                    segments.push(new paper.Segment(
                        new paper.Point(segment.x, segment.y),
                        new paper.Point(segment.ix, segment.iy),
                        new paper.Point(segment.ox, segment.oy)));                
                }
                path = new paper.Path(segments);
            }
            else path = new paper.Path();
            path.strokeColor = 'black';
            paths[message.id] = path;
            paper.view.draw();
        });
        socket.on('add path point', function(message) {
            var path = paths[message.id];
            if (typeof path !== 'undefined') {
                path.add(new paper.Point(message.x, message.y));
                paper.view.draw();
            }
        });
        socket.on('end path', function(message) {
            var path = paths[message.id];
            if (typeof path !== 'undefined') {
                path.simplify();
                paper.view.draw();
            }
        });

        var tool = new paper.Tool();
        tool.onMouseDown = function(event) {
            tool.path = new paper.Path();
            tool.pathId = getNewPathId();
            tool.path.strokeColor = 'black';
            socket.emit('add path', {id: tool.pathId});
        }
        tool.onMouseDrag = function(event) {
            tool.path.add(event.point);
            socket.emit('add path point', {id: tool.pathId, x: event.point.x, y: event.point.y});
        }
        tool.onMouseUp = function(event) {
            tool.path.simplify();
            socket.emit('end path', {id: tool.pathId});
        }
    });
});