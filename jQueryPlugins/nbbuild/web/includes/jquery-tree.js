if(jQuery) (function($) { // keep the global namespace clean
    //$.require("/Test/includes/jquery-mouse.js");

    $.widget("ui.tree", {
        _init: function() {
            var self = this, o = this.options;

            //  make the root if it doesn't exist.
            (this.root = this.element.children('ul:first')[0] ?  this.element.children('ul:first') : $(o.treeTemplate)).addClass('ui-tree');

            // initialize the plugins
            for(var plugin in o.plugins || {}) {
                self[plugin]._init(this);
            }

            // create the DOM tree(s), if necessary.
            if(o.types && o.types.root) {
                // get the data from the custom loader.
                var data = o.types.root.call(self);

                // go through the children of the root. build the tree along the way.
                for(var i=0; i<data.length; i++) {
                    // append the new subtree
                    this.root.append(this._dataToDOM(data[i]));
                }
            }

            // convert the DOM to a jQuery tree
            this.root.children('li').each(function() {
                self._treeify($(this).data('root', true));
            });

            // set the event handlers.
            this._setHandles();
             
            // append the tree.
            this.element.append(this.root.show());
        },
        /**
         * Builds the DOM tree defined by the data tree.
         */
        _dataToDOM: function(root) {
            // build the representative root node.
            var o = this.options,

            // get the node data
            label = root.label || '',
            type = root.type || null,
            data = root.data || null,
            children = root.children || [],

            // convert/build the node
            $node = this._nodify(label, type, data);

            // traverse the children. do the same.
            for(var i=0; i<children.length; i++) {
                $node.children('ul:first').append(this._dataToDOM(children[i]));
            }

            // finish up building the node
            return $node;
        },

        /**
         * Converts an existing DOM tree into a jQuery tree.  A DOM tree may
         * be treeified many times.
         */
        _treeify: function($root) {
            var self = this, o = this.options;

            function reload($node) {
                var
                // grab the data associated with the node.
                label = $node.children('a').text(),
                type = $node.attr('type') || null,
                data = $node.attr('data') || null;

                // convert the node
                $node = self._nodify(label, type, data, $node);

                // recurse...
                $node.children('ul').children('li').each(function() {
                    reload($(this));
                });
            }

            // do we want to treeify a subtree or the entire tree?
            var $tree = $root || this.root.children('li');

            // treeify using the plugins
            $tree.each(function() {
                // make the
                reload($(this));

                // go through the selected plugins and treeify them
                for(var plugin in o.plugins || {}) {
                    if(self[plugin]._treeify) {
                        self[plugin]._treeify($(this));
                    }
                }
            });
        },
        _customOption: function($node, optName) {
            var o = this.options, nodeOpts = o.types || {};

            // climb the option hierarchy to find the appropriate option
            return (nodeOpts[$node.data('type')] && nodeOpts[$node.data('type')][optName]) || (nodeOpts['default'] && nodeOpts['default'][optName]);
        },
        _unsetHandles: function() {
            var self = this, o = this.options;

            // unbind the events
            this.root.unbind('click.* dblclick.* mousedown.* mouseup.* mousemove.* mouseover.* mouseout.* mouseenter.* mouseleave.* keydown.* keypress.* keyup.*');
        },
        /**
         * Sets the default handlers for the tree.
         */
        _setHandles: function() {
            var self = this, o = this.options, $root = this.element.children('ul.ui-tree');

            // set the expand/er handler
            $root.click(function(e) {
                // grab the node.
                var $node = $(e.target).closest('li');

                // did we in fact click the node?
                if(e.target !== $node[0])
                    return; // nope...

                // determine which action.
                if(!$node.data('expanded')) {
                    self._load($node);
                    self._expand($node);
                } else {
                    self._collapse($node);
                }

                self._highlight($node);
            });

            //            // set the select/er handler
            //            $root.dblclick(function(e) {
            //                var $node = $(e.target).closest('li'), $a = $(e.target).closest('a');
            //
            //                // was the anchor actually clicked?
            //                if(e.target !== $a[0])
            //                    return; // nope...
            //
            //                // determine which action.
            //                if(!$node.data('expanded')) {
            //                    self._load($node);
            //                    self._expand($node);
            //                } else {
            //                    self._collapse($node);
            //                }
            //
            //                e.preventDefault();
            //            });

            // set the select/er handler
            $root.click(function(e) {
                var $a = $(e.target).closest('a'), $node = $(e.target).closest('li');
                
                // was the anchor actually clicked?
                if(e.target !== $a[0])
                    return; // nope...

                self._select(e, $node);
                self._highlight($node);
                
                e.preventDefault();
            });           

            // highlights the node(s).
            $root.mousedown(function(evt) {
                if(evt.button !== 2)
                    return;
                
                self._highlight($(evt.target).closest('li'));
            });

            // set the handlers for the plugins
            for(var plugin in o.plugins || {}) {
                self[plugin]._setHandles();
            }
        },
        _collapse: function($node) {
            var self = this, o = this.options,

            // grab the custom handler for collapse evt
            oncollapse = self._customOption($node, 'oncollapse'),

            // call the custom handler.
            custom = oncollapse && oncollapse.call(self, $node);

            if(custom === false)
                return; // do nothing.

            // collapse the tree
            (function innerCollapse($node) {
                var $ul = $node.children('ul:first'), $children = $ul.children('li');

                if($children.length == 0)
                    return; // do nothing.

                $node.data('expanded', false);

                // do the animation.
                $ul.slideUp(self._customOption($node, 'collapse') || 400, function() {
                    $node.addClass(o.collapseClass);
                    $node.removeClass(o.expandClass);
                });

                // need to collapse the subtrees. recurse...
                $children.each(function() {
                    innerCollapse($(this));
                });
            })($node);
        },
        _expand: function($node) {
            var self = this, o = this.options,
            
            // grab the custom options for expand evt.
            onexpand = this._customOption($node, 'onexpand'),

            // grab the nec. components
            $ul = $node.children('ul:first'), $children = $ul.children('li'),

            // call the custom expand handler
            custom = onexpand && onexpand.call(this, $node);

            if(custom === false || $children.length == 0)
                return; // do nothing.

            $node.data('expanded', true);

            // show the children
            $ul.slideDown(self._customOption($node, 'collapse') || 300, function() {
                $node.removeClass(o.collapseClass);
                $node.addClass(o.expandClass);
            });
        },
        _load: function($node) {
            var self = this, o = this.options,

            // grab the load function for this node.
            load = this._customOption($node, 'load');

            // check to see if the data can be loaded.
            if($node.data('loaded') || !load)
                return; // nothing to load.

            // grab the data tree.
            var data = load.call(this, $node) || [];

            for(var i=0; i<data.length; i++) {
                $node.children('ul:first').append(this._dataToDOM(data[i]));
            }

            // make sure the node has been treeified.
            this._treeify($node);

            // we have loaded this node.
            $node.data('loaded', true);
        },
        _highlight: function($node) {
            var self = this, o = this.options;

            // remove the select status of the currently selected node
            if(this.element.data('highlightedNode')) {
                this.element.data('highlightedNode').removeClass(o.selectClass);
            }
                
            // set the highlight class
            this.element.data('highlightedNode', $node.addClass(o.selectClass));
        },
        _select: function(e, $node) {
            var self = this, o = this.options,

            // grab the custom handler
            onselect = this._customOption($node, 'onselect'),

            // call the custom handler.
            custom = onselect && onselect.call(self, $node)

            // call the custom select handler
            if(custom === false) {
                e.stopPropagation();
            }

            e.preventDefault();
        },
            
        /**
             * Converts a DOM node into a jquery tree node.
             */
        _nodify: function(label, type, data, $node) {
            var self = this, o = this.options, icon;

            // build the node, or convert it.
            $node = $node || $(o.nodeTemplate.replace(/#\{label\}/g, label || ''));

            // initialize the node state. params take precedence.
            $node.data('type', type || $node.data('type'));
            $node.data('data', data || $node.data('data'));
            $node.data('expanded', false);
            $node.data('loaded', false);

            // grab the different elements of the node.
            var $a = $node.children('a:first'), $ul = $node.children('ul:first');
            
            // collapse it.
            $ul.hide();
   
            // reset the node ui state.
            $node.removeClass(o.nodeClass)
            $node.removeClass(o.collapseClass);
            $node.removeClass(o.expandClass);
            $node.removeClass(o.leafClass);
            $node.removeClass(o.lastClass);

            // set the ui state.
            $node.addClass(o.nodeClass);
            $node.addClass($node.data('type') || '');

            // is this a leaf node?
            if(this._customOption($node, 'load') || $ul.children('li').length > 0) {
                $node.addClass(o.collapseClass);
            } else {
                $node.addClass(o.leafClass);
            }
            
            // is this the last node?
            if($node.parent('ul').children('li:last')[0] == $node[0]) {
                $node.addClass(o.lastClass);
            }
            
            // does this node have a custom icon?
            if(icon = this._customOption($node, 'icon')) {
                // create the custom icon, if it doesn't exist all ready
                var $icon = $a.children('ins:first')[0] ? $a.children('ins:first') : $(o.iconTemplate);

                // setup the icon
                $icon.css('background', "url('" + icon.src + "') no-repeat " + icon.pos || "0px 0px");
                
                // insert it
                $a.prepend($icon);
            }

            return $node;
        },
        destroy: function() {
            $.widget.prototype.destroy.apply(this, arguments);
            var self = this, o = this.options;

            // go down the tree.
            this.root.children('li').each(function() {
                self._cleanSubTree($(this));
            });

            // unbind the event handlers.
            this.root.unbind('.ui.tree');
        },
        _cleanNode: function($node) {
            // grab the components;
            var
            $ul = $node.children('ul:first'),
            $a = $node.children('a'),
            label = $a.text();

            // remove all the node's children.
            $node.children(':not(ul)').remove();
            $node.children('ul').show();
            $node.prepend(label);

            // remove the attributes added by the widget
            $node.removeAttr('class');
            $ul.removeAttr('style');

            // remove the data from the nodes.
            delete $.cache[$.data($node[0])];
        },
        _cleanSubTree: function($root) {
            var self = this, o = this.options;

            // clean the node
            this._cleanNode($root);
          
            // otherwise, traverse down the tree and remove the subtree.
            $root.children('ul').children('li').each(function() {
                self._cleanSubTree($(this));
            });
        }
    });

    $.extend($.ui.tree, {
        version: '0.1',
        defaults: {
            selected: null,
            checkable: false,
            expandEvent: 'click',
            collapseEvent: 'click',
            selectEvent: 'click',
            treeTemplate: '<ul></ul>',
            nodeTemplate: '<li><a href="#">#{label}</a><ul style="display:none"></ul></li>',
            iconTemplate: '<ins></ins>',

            nodeClass: 'ui-tree-node',
            expandClass: 'expanded',
            collapseClass: 'collapsed',
            selectClass: 'selected',
            leafClass: 'leaf',
            compositeClass: 'composite',
            lastClass: 'last'
        }
    });

    $.extend($.ui.tree.prototype, {
        navigator: {
            _widget: null,
            _init: function(widget) {
                this.__widget = widget;
            },
            _setHandles: function() {
                var self = this, o = this._widget.options, opts = o.plugins.navigator;


            },
            /**
             * Moves up in the tree. No other special functionality.
             */
            _moveUp: function($node) {

            },
            /**
             * If node is collapsed, expands the node.  If the node is expanded,
             * goes to the topmost node in the subtree.
             */
            _moveRight: function($node) {

            },
            /**
             * If node is collapsed, goes to the parent node.  Otherwise, collapses
             * the node.
             */
            _moveLeft: function($node) {

            }
        }
    });

    $.extend($.ui.tree.prototype,{
        checkable: {
            _widget: null,
            _init:function(widget) {
                this._widget = widget;
            },
            _setHandles: function($root) {
                var self = this, o = this._widget.options;

                // bind the select listener
                this._widget.root.bind('click.ui.tree', function(e) {
                    // grab the node.
                    var $node = $(e.target).closest('li');

                    if(e.target !== $(e.target).closest('input')[0])
                        return;

                    if(e.target.checked) {
                        self._check($node);
                    } else {
                        self._uncheck($node);
                    }
                });
            
            },
            _treeify: function($root) {
                var self = this, o = this._widget.options;

                function innerTreeify($node){
                    var
                    // grab the necessary elements.
                    $ul = $node.children('ul:first'), $children = $ul.children('li'),

                    // create the selector.
                    $selector = $node.children('input[type=checkbox]')[0] ? $node.children('input[type=checkbox]') : $(o.selectorTemplate);

                    // put the selector in the node.
                    $node.prepend($selector);

                    // go through the children and do the same.
                    $children.each(function() {
                        innerTreeify($(this));
                    });
                };

                var $tree = $root || this.root.children('li');

                $tree.each(function() {
                    innerTreeify($(this));
                });
               
            },
            _uncheck: function($node) {
                (function unSelectSubTree($root) {
                    // select the root element.
                    var $in = $root.children('input[type=checkbox]');

                    // make sure it exists.
                    if($in && $in.length > 0) {
                        $in[0].checked = false;
                    }

                    // traverse down the tree.
                    var $ul = $root.children('ul');

                    $ul.children('li').each(function() {
                        unSelectSubTree($(this));
                    });
                })($node);

                // traverses up the tree selecting the parents.
                (function unSelectParent($root) {
                    // select the root element.
                    var $in = $root.children('input[type=checkbox]');

                    // make sure it exists.
                    if($in && $in.length > 0) {
                        $in[0].checked = false;
                    }

                    // check to see if this is the root.
                    if(!$root.data('root'))
                        unSelectParent($root.parent('ul').parent('li'));
                })($node);
            },
            _check: function($node) {
                // select the root element.
                var self = this;

                // traverse down the tree
                (function selectSubTree($node) {
                    var $in = $node.children('input[type=checkbox]'),
                    $ul = $node.children('ul');

                    // make sure it exists.
                    if($in && $in.length > 0) {
                        $in[0].checked = true;
                    }
                       
                    $ul.children('li').each(function() {
                        selectSubTree($(this));
                    });
                })($node);

                // are we at the top?
                if($node.data('root'))
                    return; // no use continuing...

                // go up until there are no more ancestors to check
                (function checkRow($row) {
                    var allSel = true, $parent = $row.parent('ul:first').parent('li:first');

                    // is this the root
                    if($($row[0]).data('root'))
                        return; // stop.

                    // check the entire row
                    $row.each(function() {
                        var $in = $(this).children('input[type=checkbox]');

                        // make sure it exists.
                        if($in && $in.length > 0) {
                            if($in[0].checked === false) {
                                allSel = false;
                            }
                        }
                    });

                    // go up if the entire row is checked.
                    if(allSel === true) {
                        var $in = $parent.children('input[type=checkbox]');

                        if($in && $in.length > 0) {
                            $in[0].checked = true
                        }

                        checkRow($parent.parent('ul:first').children('li'));
                    }
                })($node.parent('ul:first').children('li')); // check the row.
            }
        }
    });

    $.extend($.ui.tree.defaults, {
        selectorTemplate: '<input type="checkbox" />',
        checkClass: 'checked'
    });

    $.extend($.ui.tree.prototype, {
        contextMenu: {
            _widget: null,
            _init: function(widget) {
                this._widget = widget;

                var self = this, o = widget.options, opts = o.plugins.contextMenu;

                // create the menu container.
                this.menu = $(o.contextMenuTemplate).hide();

                // insert the menu
                $(document.body).append(this.menu);
            },
            _setHandles: function() {
                var self = this, o = this._widget.options, opts = o.plugins.contextMenu, invokeFn,
                $root = this._widget.element.children('ul.ui-tree');

                // disable the 'default' context menu
                this._widget.element.mousedown(function(e) {
                    $(this)[0].oncontextmenu = function() {
                        return false;
                    }
                });

                // set the handler
                self.menu.click(function(e) {
                    $(this).unbind('click');

                    // grab the nearest item.
                    var $item = $(e.target).closest('li'),

                    // grab the action.
                    $node = $item.data('node'), action = $item.data('action') || function() {};

                    // execute the action.
                    action($node);
                });

                // create the right click menu handler.
                $root.mousedown(invokeFn = function (evt) {
                    $(this).mouseup(function(e) {
                        $(this).unbind('mouseup');

                        // make sure this was a right click.
                        if(evt.button !== 2)
                            return;

                        // set the hider
                        $(document.body).click(function(e) {
                            $(this).unbind('click');

                            // hide the menu. if it is visible.
                            self._hideMenu();

                            // (re)set the handlers.
                            self._widget._setHandles();
                        });

                        // disable all other listeners.
                        self._widget._unsetHandles();

                        // reset the initial invoker.
                        $root.mousedown(invokeFn);

                        // show the menu
                        self._showMenu(e.clientX, e.clientY, $(e.target).closest('li'));
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
                var self = this, o = this._widget.options, opts = o.plugins.contextMenu, items;

                // reset the menu.
                this.menu.html('');

                // set the position.
                this.menu.css('position', 'absolute');
                this.menu.css('top', y + 'px');
                this.menu.css('left', x + 'px');

                // get the menu items.
                items = (function menuItems($node) {
                    var retObj = {},

                    // grab the default menu items.
                    items = o.types && o.types['default'] && o.types['default'].contextMenu || {};

                    for(var key in items) {
                        retObj[key] = items[key];
                    }

                    // grab type specific menu items.
                    items = o.types && o.types[$node.data('type') || ''] && o.types[$node.data('type') || ''].contextMenu || {};

                    // merge the items
                    for(var key in items) {
                        retObj[key] = items[key];
                    }

                    return retObj;
                })($node);
                
                // create the menu
                for(var key in items) {
                    var
                    // grab the necessary data
                    label = items[key].label || '',
                    action = items[key].action || null,

                    // the menu item
                    $li = $(o.contextMenuActionTemplate.replace(/#\{class\}/g, key).replace(/#\{label\}/g, label));

                    // place it in the menu.
                    self.menu.append($li.data('node', $node).data('action', action));
                }

                // set the necessary styling
                this.menu.css('margin', '0px');

                // show it.
                this.menu.show();
            }
        }
    });

    $.extend($.ui.tree.defaults, {
        contextMenuTemplate: '<ul id="ui-tree-contextmenu"></ul>',
        contextMenuActionTemplate: '<li><a href="#"><ins class="#{class}"></ins><span>#{label}</span></a></li>'
    });

    

    //    $.extend($.ui.tree.prototype, {
    //        filterTemplate: '<table id="ui-tree-filter"><tr><td>#{title}<td><td /></tr><tr><td><input type="text"/></td><td /></tr><tr><td id="ui-tree-filter-container"></td></tr><tr><td /><td align="right"></td></tr></table>',
    //        criteriaTemplate: '<table><tr><td>#{title}</td></tr> <tr><td>View By: </td><td id="ui-tree-filter-types"></tr></td></tr></table>',
    //        dropTemplate: '<select></select>',
    //        optionTemplate: '<option>#{label}</option>',
    //        filter:{
    //            _setHandles: function() {
    //                var self = this, o = this.options;
    //
    //                // preload the entire jQuery tree.
    //                this.root.children('li').each(function() {
    //                    self._loadTree($(this));
    //                });
    //
    //                // place the filter element in the DOM
    //                var $filter = $(self.filterTemplate.replace(/#\{title\}/g, 'Search'));
    //                var $opts = $(self.criteriaTemplate.replace(/#\{title\}/g, 'Filter Options'));
    //                var $selector = $(self.dropTemplate);
    //
    //                // create the type selector.
    //                var types = self._getTypes();
    //
    //                $selector.append($(self.optionTemplate.replace(/#\{label\}/g, '')));
    //                for(var i=0; i<types.length; i++)
    //                    $selector.append($(self.optionTemplate.replace(/#\{label\}/g, types[i])));
    //
    //
    //                // create the filter handler.
    //                $('#ui-tree-filter', $filter).bind('keyup change', function(e) {
    //                    function getCriteria() {
    //
    //                    }
    //
    //                    // go down the tree applying the criteria
    //                    function applyFilter($root, crit) {
    //                        var data = $root.data('data') || {};
    //
    //                    }
    //
    //                    var $root = self.root;
    //
    //                    $root.children('li').each(function() {
    //                        applyFilter($(this));
    //                    });
    //
    //                });
    //
    //                // place the options panel in the search panel
    //                $('#ui-tree-filter-types', $opts).append($selector);
    //                $('#ui-tree-filter-container', $filter).append($opts);
    //
    //                this.element.prepend($search);
    //            },
    //            _getTypes: function() {
    //                var self = this, arr = [];
    //
    //                // grabs the types of the subtree(s)
    //                function getTreeTypes($root) {
    //                    var arr = [];
    //
    //                    if($root.data('type'))
    //                        arr.push($root.data('type'));
    //
    //                    $root.children('ul:first').children('li').each(function() {
    //                        var types = getTreeTypes($(this)) || [];
    //
    //                        for(var i=0; i<types.length; i++) {
    //                            arr.push(types[i]);
    //                        }
    //                    });
    //
    //                    return arr;
    //                }
    //
    //                this.root.children('li').each(function() {
    //                    var types = getTreeTypes($(this)) || [];
    //
    //                    for(var i=0; i<types.length; i++) {
    //                        arr.push(types[i]);
    //                    }
    //                });
    //
    //                // return the array.
    //                return arr.unique().sort();
    //            },
    //            _treeify: function() {
    //
    //            }
    //
    //        }
    //
    //    });

    Array.prototype.unique = function() {
        var retArr = [];

        // go through the elements.
        for(var i=0; i<this.length-1; i++) {
            var unique = true;

            // go through the remaining elements, and see if there are any duplicates.
            for(var j=i+1; j<this.length-i-1; j++) {
                if(this[i] == this[j])
                    unique = false;
            }

            if(unique)
                retArr.push(this[i]);
        }

        return retArr;
    }
})(jQuery);