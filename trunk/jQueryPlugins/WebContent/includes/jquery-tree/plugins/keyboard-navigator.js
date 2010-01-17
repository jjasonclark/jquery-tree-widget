if(jQuery) (function($) {
    $.ui.tree.plugin('keynavigator', {
        _setHandles: function() {
            var self = this, o = this.options, fn;

            // the focus handler
            this.widget.root.bind('click.keynavigator', function(e) {
                var highlighted = self.widget.highlighted;
                if(highlighted) {
                    highlighted.focus();
                }
            });

            // standard one-key combination
            this.widget.root.bind('keyup.keynavigator', function(e) {
                console.log(e.keyCode);
                var key = $.ui.keyCode, highlighted = self.widget.highlighted;
                switch(e.keyCode) {
                    case key.UP:
                        self._moveUp(highlighted);
                        break;
                    case key.RIGHT:
                        self._moveRight(highlighted);
                        break;
                    case key.DOWN:
                        self._moveDown(highlighted);
                        break;
                    case key.LEFT:
                        self._moveLeft(highlighted);
                        break;
                    case key.ENTER:
                        self._select(highlighted);
                        break;
                }
            });

            // two-key combination
            this.widget.root.keydown(fn = function(e) {
                });
        },
        _select: function($node) {

        },
        /**
         * Moves up in the tree. No other special functionality.
         */
        _moveUp: function($node) {
            var $up = $node.siblings('');
        },
        /**
         * If node is collapsed, expands the node.  If the node is expanded,
         * goes to the topmost node in the subtree.
         */
        _moveRight: function($node) {
            var $next;
            if($node.data('expanded')) {
                $('a', $next = $node.children('ul:first').children('li:first'))[0].focus();
                this.widget.highlight($next);
            } else {
                this.widget.load($node);
                this.widget.expand($node);
            }
        },
        /**
         * Moves down in the tree. No other special functionality.
         */
        _moveDown: function($node) {
            var $next;
            if($node.data('expanded')) {
                $('a', $next = $node.children('ul:first').children('li:first'))[0].focus();
                this.widget.highlight($next);
            } else {
                $('a', $next = $node.siblings('li:first'))[0].focus();
                this.widget.highlight($next);
            }
        },
        /**
         * If node is collapsed, goes to the parent node.  Otherwise, collapses
         * the node.
         */
        _moveLeft: function($node) {
            var $prev;
            if(!$node.data('expanded') && !$node.data('root')) {
                $('a', $prev = $node.parent('ul:first').parent('li'))[0].focus();
                this.widget.highlight($prev);
            } else {
                this.widget.collapse($node);
            }
        }
    });
})(jQuery);


