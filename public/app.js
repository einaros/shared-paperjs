$(function() {
    paper.setup($('canvas')[0]);
    var socket = io.connect();
    var hitOptions = {
        segments: true,
        stroke: true,
        fill: true,
        tolerance: 5
    };
 
    function getPathUniqueId(path) {
        return socket.socket.sessionid + '-' + path.id;
    }

    function publishNewPath(path) {
        path.name = getPathUniqueId(path);
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
        socket.emit('add path', {id: path.name, segments: segments, closed: path.closed});
    }
    
    socket.on('connect', function() {
        // Socket listeners follow
        setupReceiver(paper, socket, false);
        
        // Tools follow
        var selectTool = new paper.Tool();
        selectTool.init = function() {
            this.showToolButtons();
            this.activate();
        }
        selectTool.showToolButtons = function() {
            if (paper.project.selectedItems.length <= 0) return;
            
            var self = this;
            if (this.buttonContainer) this.buttonContainer.remove();
            this.buttonContainer = new CanvasButtonContainer();
            this.updateSelectBounds();
            this.moveButton = new CanvasButton('images/move.png');
            this.moveButton.onMouseDown = function(e) {
                self.isInMoveMode = true;
            }
            this.moveButton.onMouseUp = function(e) {
                self.isInMoveMode = false;
            }
            this.buttonContainer.addButton(this.moveButton);
            this.rotateButton = new CanvasButton('images/rotate.png');
            this.rotateButton.onMouseDown = function(e) {
                self.isInRotateMode = true;
                var center = new paper.Point(self.selectRect.x + self.selectRect.width/2, self.selectRect.y + self.selectRect.height/2);
                self.rotateStartAngle = new paper.Point(e.pageX, e.pageY).subtract(center).angle;                
            }
            this.rotateButton.onMouseUp = function(e) {
                self.isInRotateMode = false;
                self.updateSelectBounds();
                paper.view.draw();
            }
            this.buttonContainer.addButton(this.rotateButton);
            this.trashButton = new CanvasButton('images/trash.png');
            this.trashButton.onMouseUp = function(e) {
                var pathIds = [];
                while (paper.project.selectedItems.length > 0) {
                    var path = paper.project.selectedItems[0];
                    pathIds.push(path.name);
                    path.remove();
                }
                socket.emit('remove path', {id: pathIds});
                self.hideToolButtons();
                paper.view.draw();
            }
            this.buttonContainer.addButton(this.trashButton);
        }
        selectTool.updateSelectBounds = function() {
            var topLeft = new paper.Point(0, 0);
            var bottomRight = new paper.Point(0, 0);
            for (var i = 0, l = paper.project.selectedItems.length; i < l; ++i) {
                var p = paper.project.selectedItems[i].bounds;
                if (i == 0 || p.x < topLeft.x) topLeft.x = p.x;
                if (i == 0 || p.y < topLeft.y) topLeft.y = p.y;
                if (i == 0 || p.x + p.width > bottomRight.x) bottomRight.x = p.x + p.width;
                if (i == 0 || p.y + p.height > bottomRight.y) bottomRight.y = p.y + p.height;
            }

            this.selectRect = new paper.Rectangle(topLeft, bottomRight);
            if (this.selectBounds) this.selectBounds.remove();
            this.selectBounds = new paper.Path.Rectangle(topLeft, bottomRight);
            this.selectBounds.strokeColor = 'gray';
            this.selectBounds.dashArray = [2, 2];
            // Todo: 30 is a hotfix. deal properly with buttoncontainer coords.
            this.buttonContainer.move(Math.max(0, topLeft.x), Math.max(30, topLeft.y));
        }
        selectTool.hideToolButtons = function() {
            if (this.selectBounds) this.selectBounds.remove();
            if (this.buttonContainer) this.buttonContainer.remove();
            if (this.moveButton) this.moveButton = null;
        }
        selectTool.onMouseMove = function(event) {
            if (this.isInMoveMode) {
                this.buttonContainer.moveBy(event.delta.x, event.delta.y);
                var pathIds = [];
                for (var i = 0, l = paper.project.selectedItems.length; i < l; ++i) {
                    var c = paper.project.selectedItems[i];
                    c.position.x += event.delta.x;
                    c.position.y += event.delta.y;
                    pathIds.push(c.name);
                }
                socket.emit('move path', {id: pathIds, delta: event.delta});
                this.selectBounds.position.x += event.delta.x;
                this.selectBounds.position.y += event.delta.y;
            }
            else if (this.isInRotateMode) {
                var center = new paper.Point(this.selectBounds.position.x, this.selectBounds.position.y);
                var angle = event.point.subtract(center).angle;
                var angleDelta = angle - this.rotateStartAngle;
                this.rotateStartAngle = angle;
                var pathIds = [];
                for (var i = 0, l = paper.project.selectedItems.length; i < l; ++i) {
                    var c = paper.project.selectedItems[i];
                    c.rotate(angleDelta, center);
                    pathIds.push(c.name);
                }
                socket.emit('rotate path', {id: pathIds, angle: angleDelta, center: [center.x, center.y]});
            }
        }
        selectTool.onMouseDown = function(event) {
            this.hideToolButtons();
            paper.project.deselectAll();

            var hitResult = paper.project.hitTest(event.point, hitOptions);
            if (hitResult) {
                hitResult.item.selected = true;
            }

            this.origin = event.point;
            this.dashArray = [2, 2, 0];
            var self = this;
            var alternate = 0;
            this.dashIntervalId = setInterval(function() {
                if (self.path) {
                    alternate = alternate == 1 ? 0 : 1;
                    self.dashArray = self.path.dashArray = alternate == 1 ? [2, 2, 0] : [0, 2, 2];
                    paper.view.draw();
                }
            }, 500);
        }
        selectTool.onMouseDrag = function(event) {
            this.moving = event.point;
            if (this.path) this.path.remove();
            this.path = new paper.Path.Rectangle(this.origin, this.moving);
            this.path.strokeColor = '#0022FF';
            this.path.dashArray = this.dashArray;
        }
        selectTool.onMouseUp = function(event) {
            clearInterval(this.dashIntervalId);
            if (this.path && this.path.bounds) {
                var p = this.path.bounds;
                var x1 = p.x;
                var x2 = p.x + p.width;
                var y1 = p.y;
                var y2 = p.y + p.height;
                for (var i = 0, l = paper.project.activeLayer.children.length; i < l; ++i) {
                    var c = paper.project.activeLayer.children[i];
                    if (c.segments.length &&
                        c.position.x > x1 && c.position.x < x2 &&
                        c.position.y > y1 && c.position.y < y2) {
                        c.selected = true;
                    };
                }
                this.path.remove();
                this.path = null;
            }
            this.showToolButtons();
        }

        var paintTool = new paper.Tool();
        paintTool.onMouseDown = function(event) {
            this.path = new paper.Path();
            this.path.strokeColor = 'black';
            publishNewPath(this.path);
        }
        paintTool.onMouseDrag = function(event) {
            this.path.add(event.point);
            socket.emit('add path point', {id: this.path.name, x: event.point.x, y: event.point.y});
        }
        paintTool.onMouseUp = function(event) {
            this.path.simplify();
            socket.emit('end path', {id: this.path.name});
        }

        var rectTool = new paper.Tool();
        rectTool.onMouseDown = function(event) {
            this.angle = 0;
            this.origin = event.point;
            this.path = new paper.Path.Rectangle(event.point, new paper.Size(1, 1));
            this.path.strokeColor = 'black';
            publishNewPath(this.path);
        }
        rectTool.onMouseDrag = function(event) {
            var size = event.point.subtract(this.origin);
            var angle = size.angle - 45;
            var angleDelta = angle - this.angle;
            this.angle = angle;
            this.path.rotate(angleDelta);
            var w = Math.abs(size.x) > Math.abs(size.y) ? size.x : size.y;
            var r = new paper.Rectangle(this.origin.x - w, this.origin.y - w, 2*w, 2*w);
            this.path.fitBounds(r);
            socket.emit('fit path', {id: this.path.name, rect: r, angle: angleDelta});
        }
        
        var circleTool = new paper.Tool();
        circleTool.onMouseDown = function(event) {
            this.angle = 0;
            this.origin = event.point;
            this.path = new paper.Path.Circle(event.point, 1);
            this.path.strokeColor = 'black';
            publishNewPath(this.path);
        }
        circleTool.onMouseDrag = function(event) {
            var size = event.point.subtract(this.origin);
            var angleDelta = size.angle - this.angle;
            this.path.rotate(angleDelta);
            this.angle = size.angle;
            var w = Math.abs(size.x) > Math.abs(size.y) ? size.x : size.y;
            var r = new paper.Rectangle(this.origin.x - w, this.origin.y - w, 2*w, 2*w);
            this.path.fitBounds(r);
            socket.emit('fit path', {id: this.path.name, rect: r, angle: angleDelta});
        }
        
        var resizeTool = new paper.Tool();
        resizeTool.onMouseMove = function(event) {
            var hitResult = paper.project.hitTest(event.point, hitOptions);
            paper.project.activeLayer.selected = false;
            if (hitResult && hitResult.item) {
                hitResult.item.selected = true;         
            }
        }
        resizeTool.onMouseDown = function(event) {
            var hitResult = paper.project.hitTest(event.point, hitOptions);
            if (hitResult) {
                this.path = hitResult.item;
                var bounds = this.path.bounds;
                var center = new paper.Point(bounds.x, bounds.y);
                center.x += bounds.width / 2;
                center.y += bounds.height / 2;
                this.origin = center;
                this.angle = event.point.subtract(center).angle;
            }
            else this.path = null;
        }
        resizeTool.onMouseDrag = function(event) {
            var size = event.point.subtract(this.origin);
            var angleDelta = size.angle - this.angle;
            this.path.rotate(angleDelta);
            this.angle = size.angle;
            var w = Math.abs(size.x) > Math.abs(size.y) ? size.x : size.y;
            var r = new paper.Rectangle(this.origin.x - w, this.origin.y - w, 2*w, 2*w);
            this.path.fitBounds(r);
            socket.emit('fit path', {id: this.path.name, rect: r, angle: angleDelta});
        }

        addButton('tools', 'images/cursor.png', function() { selectTool.init(); }, true);
        addButton('tools', 'images/scale.png', function() { resizeTool.activate(); });        
        addButton('tools', 'images/paintbrush.png', function() { paintTool.activate(); });
        addButton('tools', 'images/rect.png', function() { rectTool.activate(); });
        addButton('tools', 'images/circle.png', function() { circleTool.activate(); });
    });
});
