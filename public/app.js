$(function() {
    var buttonCounter = 0;
    var pathCounter = 0;
    var paths = {};
    var socket = io.connect();
    var hitOptions = {
        segments: true,
        stroke: true,
        fill: true,
        tolerance: 5
    };
    var canvas = $('canvas')[0];

    function getNewPathId() {
        return socket.socket.sessionid + '-' + (++pathCounter);
    }
    
    function addButton(icon, cb) {
        var bt = $('<div class="button">')
            .css({
                height: 16,
                width: 16,
                position: 'fixed',
                top: 10 + buttonCounter * 26,
                left: 10,
                'background-image': 'url(' + icon + ')',
                'background-repeat': 'no-repeat'
            })
            .click(function() {
                $('.button').css({'background-color': ''});
                $(this).css({'background-color': '#bababe'});
                cb();
            })
            .hover(function() {
               bt.css({border: '1px solid gray'});
            }, function() {
                bt.css({border: 'none'});                
            });
        $('body').append(bt);
        ++buttonCounter;
    }

    paper.setup(canvas);
    paper.view.draw();
    
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
            path.pathId = message.id;
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
        socket.on('remove path', function(message) {
            var path = paths[message.id];
            if (typeof path !== 'undefined') {
                path.remove();
                delete paths[message.id];
                paper.view.draw();
            }
        });
        socket.on('move path', function(message) {
            var path = paths[message.id];
            if (typeof path !== 'undefined') {
                path.position.x += message.delta.x;
                path.position.y += message.delta.y;                    
                paper.view.draw();
            }
        });
        socket.on('move segment', function(message) {
            var path = paths[message.id];
            if (typeof path !== 'undefined') {
                path.segments[message.segment].point.x += message.delta.x;
                path.segments[message.segment].point.y += message.delta.y;                    
                paper.view.draw();
            }
        });

        var manipulateTool = new paper.Tool();
        manipulateTool.onMouseMove = function(event) {
            var hitResult = paper.project.hitTest(event.point, hitOptions);
            paper.project.activeLayer.selected = false;
            if (hitResult && hitResult.item) {
                hitResult.item.selected = true;         
            }
        }
        manipulateTool.onMouseDown = function(event) {
            var hitResult = paper.project.hitTest(event.point, hitOptions);
            if (hitResult) {
                if (event.modifiers.shift) {
                    if (hitResult.type == 'stroke') {
                        hitResult.item.remove();
                        socket.emit('remove path', {id: hitResult.item.pathId});
                    };
                    return;
                }
                manipulateTool.target = hitResult;
            }
            else manipulateTool.target = null;
        }
        manipulateTool.onMouseDrag = function(event) {
            if (manipulateTool.target) {
                var target = manipulateTool.target;
                if (target.segment) {
                    socket.emit('move segment', {id: target.item.pathId, segment: target.segment.index, delta: event.delta});
                    target.segment.point.x += event.delta.x;
                    target.segment.point.y += event.delta.y;
                    target.item.smooth();
                }
                else {
                    socket.emit('move path', {id: target.item.pathId, delta: event.delta});
                    target.item.position.x += event.delta.x;
                    target.item.position.y += event.delta.y;                    
                }
            }
        }
        addButton('cursor.png', function() { manipulateTool.activate(); });

        var paintTool = new paper.Tool();
        paintTool.onMouseDown = function(event) {
            paintTool.path = new paper.Path();
            paintTool.path.pathId = getNewPathId();
            paintTool.path.strokeColor = 'black';
            socket.emit('add path', {id: paintTool.path.pathId});
        }
        paintTool.onMouseDrag = function(event) {
            paintTool.path.add(event.point);
            socket.emit('add path point', {id: paintTool.path.pathId, x: event.point.x, y: event.point.y});
        }
        paintTool.onMouseUp = function(event) {
            paintTool.path.simplify();
            socket.emit('end path', {id: paintTool.path.pathId});
        }
        addButton('paintbrush.png', function() { paintTool.activate(); });
    });
});