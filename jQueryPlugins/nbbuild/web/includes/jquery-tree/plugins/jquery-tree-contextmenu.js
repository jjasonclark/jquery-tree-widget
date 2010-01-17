if(jQuery) (function($) {
    $.ui.tree.plugin('contextmenu', {
        version: '0.1',
        defaults: {
            menuItems      : null, // TODO: IMPLEMENT!!!! returns an object containing menu items.
            classes: {
                menuClass	: 'ui-tree-contextmenu',
                itemClass   : 'ui-tree-contextmenu-item'
            }
        },
        templates: {
            contextMenuTemplate: '<ul></ul>',
            contextMenuActionTemplate: '<li><a href="#"><ins class="#{class}"></ins><span>#{label}</span></a></li>'
        }
    });


    $.extend(true, $.ui.tree.prototype.defaults.types['default'], {
        menuItems : null // default no menu items.
    });

    $.extend($.ui.tree.plugins.contextmenu.prototype, {
        init: function() {
            var self = this, t = this.templates, w = this.widget, c = this.option('classes'),
            
            $menu = this.menu = $(t.contextMenuTemplate).addClass(c.menuClass).hide();

            // insert the menu
            this.widget.element.append($menu);
        },
        setHandles: function() {
            var self = this, w = this.widget, node = w.node, $root, $menu;

            // disable the 'default' context menu
            this.widget.element[0].oncontextmenu = function() {
                return false;
            }

            // set the handler
            this.menu.bind('click', function(e) {
                var $item, $node, action;

                $item 	= $(e.target).closest('li');
                $node 	= $item.data('node');
                action 	= $item.data('action');

                // hide the menu
                self._hideMenu();

                // execute the action.
                action && action.call(self.widget, $node);

                // prevent the default action.
                e.preventDefault();
            });

            // create the right click menu handler.
            this.bind('mousedown', function (evt) {
                // make sure this was a right click.
                if(evt.button !== 2)
                    return;

                // bind the mouseup handler
                $(this).mouseup(function(e) {
                    $(this).unbind('mouseup');

                    // grab the node.
                    var $node = node($(e.target).closest('li'));

                    // are we over a node.
                    if($node.element()[0]) {
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
            this.menu.children().remove();

            // hide it.
            this.menu.hide();
        },
        _showMenu: function(x, y, node) {
            var self = this, c = this.option('classes'), t = this.templates, items, opts;

            // reset the menu.
            this.menu.html('');

            // set the position.
            this.menu.css('position', 'absolute');
            this.menu.css('top', y + 'px');
            this.menu.css('left', x + 'px');

            // get the menu items.
            items = (function (node) {
                var retObj = {},

                // grab the default menu items.
                items = node.option('menuItems') || {};

                retObj.length = 0;
                for(var key in items) {
                    retObj[key] = items[key];
                    retObj.length++;
                }

                return retObj;
            })(node);

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
                $item = $(t.contextMenuActionTemplate.replace(/#\{label\}/g, label)).addClass(c.itemClass).addClass(key);

                // is there an icon?
                if(icon) {
                    var $icon = $('ins', $item)[0] ? $('ins', $item) : $(o.iconTemplate);

                    $icon.css('background-image', "url('" + icon + "')");
                    $icon.css('background-repeat', 'no-repeat');

                    $('a', $item).prepend($icon);
                }

                
                // place it in the menu.
                self.menu.append($item.data('node', node).data('action', action));
            }

            // set the necessary styling
            this.menu.css('margin', '0px');

            // show it.
            this.menu.show();
        }
    });
})(jQuery);
