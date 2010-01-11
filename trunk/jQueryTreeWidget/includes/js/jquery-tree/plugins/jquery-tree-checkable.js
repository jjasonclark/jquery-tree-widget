if (jQuery)(function($) { // keeps the global namespace clean
    $.ui.tree.plugin('checkable', {
        version		: '0.1',
        defaults 	: {
            actions     : null, // a 
            classes 	: {
                checkClass      : 'ui-tree-checkable-checked',
                unCheckClass    : 'ui-tree-checkable-unchecked',
                selectorClass   : 'ui-tree-checkable-selector',
                actionClass     : 'ui-tree-checkable-action',
                menuClass       : 'ui-tree-checkable-menu'
            }
        },
        templates : {
            selectorTemplate 	: '<input type="checkbox" />',
            iconTemplate		: '<ins></ins>',
            actionTemplate      : '<input type=button value="#{name}" />',
            menuTemplate        : '<div></div>'
        }
    });


    $.extend(true, $.ui.tree.prototype.defaults.types['default'], {
        decorators : {
            checkable : true
        },
        checkable : true
    });

    $.extend($.ui.tree.plugins.checkable.prototype, {
        init: function() {
            var w = this.widget, c = this.option('classes');

            // extend the node to reflect the checkable behavior.
            $.extend($.ui.tree.node.prototype, {
                isChecked: function(val) {
                    return this.checkbox().hasClass(c.checkClass);
                },
                isIcon: function() {
                    return this.option('checkable.icon');
                },
                checkbox: function() {
                    var self = this, $check;

                    if(this.isIcon()) {
                        $check = this.element().children('ins');
                    } else {
                        $check = this.element().children('input');
                    }

                    return $check;
                },
                check: function() {
                    var self = this,

                    // handles setting the check state of the node.
                    check = function(node) {
                        var $check = node.checkbox();

                        if(node.isIcon()) { // we are dealing with an icon.
                            $check.css('background-image', "url('" + self.option('icon.check') + "')");
                            $check.css('background-repeat', 'no-repeat');
                        } else {
                            $check[0].checked = true;
                        }

                        $check.addClass(c.checkClass);
                        $check.removeClass(c.unCheckClass);
                    },

                    // checks the entire subtree
                    cascade = function(node) {
                        check(node);

                        $.each(node.children(), function() {
                            cascade(this);
                        });
                    },
                    // checks the parent if the row is completely checked.
                    ascend = function(row) {
                        var allSel = true, parent = row[0].parent();

                        if (row[0].isRoot()) {
                            return; // stop.
                        }

                        // check the entire row
                        $.each(row, function() {
                            if(!this.isChecked()) {
                                allSel = false;
                            }
                        });

                        // go up if the entire row is checked.
                        if (allSel === true) {
                            parent.check()

                            ascend(parent.siblings());
                        }
                    };

                    // handle the check event.
                    cascade(this);

                    if(!this.isRoot()) {
                        ascend(this.siblings());
                    }
                },
                uncheck: function() {
                    var
                    // sets the uncheck state of the node.
                    uncheck = function(node) {
                        var $check = node.checkbox();
                
                        if(node.isIcon()) { // we are dealing with an icon.
                            $check.css('background-image', "url('" + node.option('checkable.icon.uncheck') + "')");
                            $check.css('background-repeat', 'no-repeat');
                        } else {
                            $check[0].checked = false;
                        }
                
                        $check.removeClass(c.checkClass);
                        $check.addClass(c.unCheckClass);
                    },
                    // unselects the entire subtree.
                    cascade = function($root) {
                        uncheck($root);
                
                        $.each($root.children(), function() {
                            cascade(this);
                        });
                    },
                    // unselects all the ancestors.
                    ascend = function($root) {
                        uncheck($root);
                
                        if (!$root.isRoot()) {
                            ascend($root.parent());
                        }
                    };
                
                    cascade(this);
                
                    ascend(this);
                }
            });

            // add the appearance decorations.
            $.ui.tree.node.decorator('checkable', {
                templates : {
                    selectorTemplate 	: '<input type="checkbox" />',
                    iconTemplate		: '<ins></ins>'
                },
                init: function() {
                    var self = this, t = this.templates, node = this.node, $selector;

                    if(this.option('icon')) {
                        $selector = node.element().children('ins')[0] ? node.element().children('ins')[0] : $(t.iconTemplate);

                        $selector.css('background-image', "url('" + this.option('icon.uncheck') + "')");
                        $selector.css('background-repeat', 'no-repeat');
                    } else  {
                        $selector = node.children('input[type=checkbox]')[0] ? node.children('input[type=checkbox]') : $(t.selectorTemplate);
                    }

                    node.element().prepend($selector);
                },
                refresh: function() {
                    var self = this, node = this.node;

                    if(node.isChecked()) {
                        node.checkbox().addClass(c.checkClass);
                        node.checkbox().removeClass(c.unCheckClass);
                    } else {
                        node.checkbox().addClass(c.unCheckClass);
                        node.checkbox().removeClass(c.checkClass);
                    }
                }
            });
        },
        finish: function() {
            var self = this, w = this.widget, c = this.option('classes'), t = this.templates,
        
            // create the menu and bind the respective actions.
            $menu = $(t.menuTemplate).addClass(c.menuClass),

            actions = this.option('actions');
            for(var a in actions || {}) {
                var
                // grab the action components
                label = actions[a].label,
                action = actions[a].action,
        
                $action = $(t.actionTemplate.replace(/#\{name\}/, label)).addClass(c.actionClass).addClass(a);
        
                $action.bind('click.checkable', function(e) {
                    action.call(self, self._getSelection());
                });
        
                $menu.append($action);
            }
        
            this.widget.element.append($menu);
        },
        _getSelection: function() {
            var self = this, w = this.widget, node = w.node, ret = [],
            
            // gathers the selection. only returns the topmost selected element in any subtree.
            gather = function($node) {
                if($node.isChecked()) {
                    ret.push($node);
                    return;
                }
        
                $.each($node.children(), function() {
                    gather(this);
                });
            };
        
            this.widget.root.children('li').each(function() {
                gather(node(this));
            });
        
            return ret;
        },
        setHandles : function() {
            var self = this, w = this.widget, node = w.node;

            // bind the select listener
            this.bind('click', function(e) {
                var $node = node($(e.target).closest('li'));

                //                console.log($node.element());
                if($node.checkbox()[0] == e.target) {
                    
                    if (!$node.isChecked()) {
                        $node.check();
                    } else {
                        $node.uncheck();
                    }

                    e.stopPropagation();
                }
            });
        }
    });
})(jQuery);
