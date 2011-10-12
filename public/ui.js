(function(exports) {
    // Todo: clean up the 'addButton' mess, and introduce tool buttons
    var buttonCounter = 0;
    exports.addButton = function(group, icon, onClick, active) {
        var bt = $('<div class="button">')
            .addClass('button')
            .addClass('toolbutton')
            .addClass('button-group-' + group)
            .css({
                top: 10 + (buttonCounter++) * 26,
                'background-image': 'url(' + icon + ')'
            })
            .click(function() {
                $('.button.button-group-' + group).removeClass('active');
                $(this).addClass('active');
                onClick();
            })
            .hover(function() {
                bt.addClass('hover');
            }, function() {
                bt.removeClass('hover');
            });
        if (active) {
            bt.addClass('active');
            onClick();
        }
        $('body').append(bt);
        return bt;
    }

    function CanvasButtonContainer(x, y) {
        this.container = $('<div>');
        this.container.addClass('canvasbuttoncontainer');
        $('body').append(this.container);
        this.buttons = [];
        this.move(x, y);
    }
    CanvasButtonContainer.prototype.addButton = function(button) {
        this.buttons.push(button);
        this.container.append(button.bt);
    }
    CanvasButtonContainer.prototype.removeButton = function(button) {
        var i = this.buttons.indexOf(button);
        if (i != -1) {
            this.buttons.splice(i, 1);
            button.remove();
            // todo: Pack other buttons
        }
    }
    CanvasButtonContainer.prototype.move = function(x, y) {
        this.container.css({
            left: x + 8, 
            top: y - 25
        });
    }
    CanvasButtonContainer.prototype.moveBy = function(x, y) {
        var pos = this.container.offset();
        this.container.css({
            left: pos.left + x, 
            top: pos.top + y
        });
    }
    CanvasButtonContainer.prototype.remove = function() {
        this.container.remove();
    }    
    exports.CanvasButtonContainer = CanvasButtonContainer;

    function CanvasButton(icon) {
        var self = this;
        var bt = $('<div class="button">')
            .addClass('button')
            .css({
                'background-image': 'url(' + icon + ')'
            })
            .mousedown(function(e) { 
                if (self.onMouseDown) self.onMouseDown(e);
                $(window).one('mouseup', function(e) { self.onMouseUp(e); });
            })
            .hover(function() {
                bt.addClass('hover');
            }, function() {
                bt.removeClass('hover');
            });
        this.bt = bt;
    }
    CanvasButton.prototype.remove = function() {
        this.bt.remove();
    }
    exports.CanvasButton = CanvasButton;
})(window);
