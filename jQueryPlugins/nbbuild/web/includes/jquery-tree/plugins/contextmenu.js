if(jQuery) (function($) {
    $.ui.tree.plugin('contextmenu', {
        version: '0.1',
        defaults: {
            menuItems      : function($node) {}, // returns an object containing menu items.
            types       : {
                'default'   : {
                    menuItems   : null, // an object containing menu items.
                    callbacks   : {
                        beforeAction    : function($node) { return true; },
                        beforeOpen      : function($node) { return true; },

                        onAction        : function($node) { return true; },
                        onOpen          : function($node) { return true; }
                    }
                }
            }
        },
        templates: {
            contextMenuTemplate: '<ul id="ui-tree-contextmenu"></ul>',
            contextMenuActionTemplate: '<li><a href="#"><ins class="#{class}"></ins><span>#{label}</span></a></li>'
        },
        _init: function() {
            var self = this, o = this.options, t = this.templates;

            // insert the menu
            $(document.body).append(this.menu = $(t.contextMenuTemplate).hide());
        },
        _setHandles: function() {
            var self = this, o = this.options, $root, $menu;

            // disable the 'default' context menu
            this.widget.root[0].oncontextmenu = function() {
                return false;
            }

            // set the handler
            this.menu.click(function(e) {
            	var $item, $node, action;
            	
                $item 	= $(e.target).closest('li'); 
                $node 	= $item.data('node');
                action 	= $item.data('action');

                // hide the menu
                self._hideMenu();

                // execute the action.
                action && action($node);

                // prevent the default action.
                e.preventDefault();
            });

            // create the right click menu handler.
            this.widget.root.mousedown(function (evt) {
                // make sure this was a right click.
                if(evt.button !== 2)
                    return;

                // bind the mouseup handler
                $(this).mouseup(function(e) {
                    $(this).unbind('mouseup');

                    // grab the node.
                    var $node = $(e.target).closest('li');

                    // are we over a node.
                    if($node[0]) {
                        // set the hider
                        $(document.body).mousedown(function(e) {
                            if(!self.menu.hasChild($(e.target))) {
                                $(document.body).unbind('mousedown');

                                // hide the menu. if it is visible.
                                self._hideMenu();
                            }
                        });
                        
                        self._showMenu(e.clientX, e.clientY, $node);
                    }
                });
               
            });
        },
        _hideMenu: function() {
            // reset the menu.
            this.menu.html('');

            // hide it.
            this.menu.hide();
        },
        _showMenu: function(x, y, $node) {
            var self = this, o = this.options, t = this.templates, items, opts;

            // reset the menu.
            this.menu.html('');

            // set the position.
            this.menu.css('position', 'absolute');
            this.menu.css('top', y + 'px');
            this.menu.css('left', x + 'px');

            // get the menu items.
            items = (function ($node) {
                var retObj = {},

                // grab the default menu items.
                items = o.types && o.types['default'] && o.types['default'].menuItems || {};

                retObj.length = 0;
                for(var key in items) {
                    retObj[key] = items[key];
                    retObj.length++;
                }

                // grab type specific menu items.
                items = o.types && o.types[$node.data('type') || ''] && o.types[$node.data('type') || ''].menuItems || {};

                // merge the items
                for(key in items) {
                    retObj[key] = items[key];
                    retObj.length++;
                }

                return retObj;
            })($node);

            if(items.length == 0) {
                return; // nothing to show.
            }
            
            // create the menu
            for(var key in items) {
                var 
                // grab the necessary data
                label = items[key].label || '',
                action = items[key].action,
                icon = items[key].icon || {}, 

                // create the menu item
                $item = $(t.contextMenuActionTemplate.replace(/#\{label\}/g, label)).addClass(key);

                // is there an icon?
                if(icon) {
                    var $icon = $('ins', $item)[0] ? $('ins', $item) : $(o.iconTemplate);

                    $icon.css('background-image', "url('" + icon + "')");
                    $icon.css('background-repeat', 'no-repeat');

                    $('a', $item).prepend($icon);
                }

                
                // place it in the menu.
                self.menu.append($item.data('node', $node).data('action', action));
            }

            // set the necessary styling
            this.menu.css('margin', '0px');

            // show it.
            this.menu.show();
        }
    });
})(jQuery);
