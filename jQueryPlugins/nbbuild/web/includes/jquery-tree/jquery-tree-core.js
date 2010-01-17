if(jQuery) (function($) { // keep the global namespace clean
  
    // set the default options and the prototype properties.
    $.widget('ui.tree', {
        version : '0.1',
        defaults: { // to be merged with input options (jquery ui core doesn't 
            //correctly merge the input options with defaults)
            classes : {
                treeClass       : 'ui-tree',
                nodeClass       : 'ui-tree-node',
                collapseClass   : 'ui-tree-node-collapsed',
                compositeClass  : 'ui-tree-node-composite',
                expandClass     : 'ui-tree-node-expanded',
                lastClass       : 'ui-tree-node-last',
                leafClass       : 'ui-tree-node-leaf',
                loadClass       : 'ui-tree-node-loading',
                selectClass     : 'ui-tree-node-selected',
                renameClass     : 'ui-tree-node-rename'
            },
            init    : { 
                load            : null, // initial loader.  populates the tree
                data            : null  // datatype of the loader.  'html', 'json', 'xml', etc...
            },
            // every plugin gets its global options via: plugins.<plugin-name>.<option-name>
            plugins : { 
                core            : true,
                popupPanel      : true,
                mainPanel       : true, 
                menu            :  {
                    openAnimation   : 'fadeIn',
                    showDuration    : 300,
            
                    closeAnimation  : 'fadeOut',
                    closeDuration   : 300,
            
                    items           : null
                }
            },
            // used by the node builder to construct template node. enables custom node markup
            node    : { 
                template    : '<li><a href="#"></a><ul style="display: none"></ul></li>',
                decorators      : {
                    core            : true,
                    icon            : false
                }
            },
            types   : {
                'default'       : {
                    // every plugin gets its node specific options via : types.<node-type>.<option-name>
                    // each decorator gets its corresponding options via: types.<node-type>.<option-name>

                    // expand
                    expandAnimation     : 'show',
                    expandDuration      : 0,

                    // collapse
                    collapseAnimation   : 'hide',
                    collapseDuration    : 0,

                    load                : null,     // function(node) { return data };
                    data                : null,     // html, json, xml, or custom data type
                    preload             : false,    // lazy loading? careful, can result in race

                    callbacks           : {
                        // before callbacks can prevent action if returned false.
                        beforeCollapse      : null, //function($node) { return true; },
                        beforeExpand        : null, //function($node) { return true; },
                        beforeLoad          : null, //function($node) { return true; },
                        beforeSelect        : null,

                        onCollapse          : null, //function($node) { return true; },
                        onExpand            : null, //function($node) { return true; },
                        onLoad              : null, //function($node) { return true; },
                        onSelect            : null
                    }
                }
            }
        }
    });
    
    // utility object update function. Allows the user to set a deep option by
    // calling delimit(obj, "x.y.z", 3) which will automatically make the x, y,
    // and z objects if they don't exist in the object.
    $.delimit = function(obj, name, val) {
        if(name == undefined) {
            return obj;
        }
        
        // need to split the option name into between it's levels.
        var arr = name.split("."),

        lvl = obj;
        for(var i=0; i<arr.length-1; i++) {
            if(val !== undefined) {
                lvl[arr[i]] = lvl[arr[i]] !== undefined ? lvl[arr[i]] : {};
            }

            lvl = lvl[arr[i]] || {};
        }

        // are we returning or setting a value?
        if(val == undefined) {
            return lvl[arr[arr.length-1]];
        } else {
            lvl[arr[arr.length-1]] = val;
        }
    }

    // the core tree utility functions.
    $.extend($.ui.tree.prototype, {
        _init: function() {
            var self = this;

            // cleanup the options. jquery ui core doesn't do deep merge
            this.options = $.extend(true, {}, this.defaults, this.options);

            // initialize the state
            this.plugins = {};
            this.root = null;  // the container for the tree
            this.nodeTemplate = null; // a template node that the tree can use to make new nodes.

            // grab the root
            this.root = this.element.children('ul:first')[0] ? this.element.children('ul:first') : $('<ul></ul>');

            // allow consistent access to the node class (consistent via closure)
            this.node = function(label, type, data) {
                return new Node(self, label, type, data);
            };

            // grab the plugins.
            var p = this.option('plugins');
            for(var name in p) {
                if(p[name]) {
                    this.plugins[name] = this.plugins[name] || new $.ui.tree.plugins[name](self);
                }
            }

            // temporarily remove the contents. (to be converted and inserted later).
            var html = this.root.children().remove();

            // initialize the plugins
            $.each(this.plugins, function() {
                this.init();
            });

            // create the template node.
            var builder = new NodeBuilder(this);
            this.nodeTemplate = builder.build();
     
            // finally append the new tree.
            this.element.append(this.root.addClass(this.option('classes.treeClass')));

            // finalize the plugins.
            $.each(this.plugins, function() {
                this.finish();
            });

            // lastly set the handlers.
            $.each(this.plugins, function() {
                this.setHandles();
            });

            this.root.addClass('loading');

            // make the tree.
            this.insert(html, 'html');
            this.construct();
            this.refresh();

            //
            this.root.removeClass('loading');

        },
        destroy: function() {
            $.widget.prototype.destroy.apply(this); // call the default

            this.traverse($.ui.tree.node.destroy);

            $.each(this.plugins, function() {
                this.destroy();
            });
        },
        traverse: function(fn, root) {
            var self = this, node = self.node, ret = [];

            var cascade = function(tree) { // TODO: implement non-recursive dfs.
                var cur = null;

                // okay start traversing.
                while(cur = tree.pop()) {
                    if(fn.apply(cur)) {
                        ret.push(cur);
                    }

                    // grab the children.
                    $.each(cur.children(), function() {
                        tree.push(this);
                    });
                }
            }

            // normalize the input.
            var tree = [];
            if(root == undefined) {
                var $top = this.root.children('li');

                $.each($top, function() {
                    tree.push(node(this).isRoot(true));
                });
            } else {
                tree.push(root);
            }

            cascade(tree);

            return ret;
        },
        option: function(key, val) {
            return $.delimit(this.options, key, val);
        },
        insert: function(data, type) {
            var self = this, node = self.node,

            // grab the 'html' parser
            parser = new $.ui.tree.parsers[type](node),

            // parse the data.
            tree = parser.toDOM(data);

            // put the data back in the tree
            $.each(tree, function() {
                self.root.append(this.element());
            });
        },
        construct: function() {
            var self = this, node = self.node,

            fn = this.option('init.load'),
            data = this.option('init.data');

            var time1 = (new Date()).valueOf();

            if(fn != undefined) {
                this.insert(fn.call(self), data);
            }

            var time2 = (new Date()).valueOf() - time1;
            console.log('Constructed in: ' + time2 + ' milliseconds');
        },
        refresh: function(root) {
            var time1 = (new Date()).valueOf();

            this.traverse($.ui.tree.node.prototype.refresh, root);
            
            $.each(this.plugins || {}, function() {
                this.refresh(root);
            });

            var time2 = (new Date()).valueOf() - time1;
            console.log('Refreshed in: ' + time2 + ' milliseconds');
        },
        setHandles: function() {
            $.each(this.plugins || {}, function() {
                this.setHandles();
            });
        },
        unsetHandles: function() {
            $.each(this.plugins || {}, function() {
                this.unsetHandles();
            });
        }
    });

    // NODE BUILDER.  responsible for building the node template for a widget.
    var NodeBuilder = function(widget) {
        this.template = '';
        this.decorators = [];

        // grab the decorators
        var d = widget.option('node.decorators');
        for(var key in d) {
            if(d[key] === true) {
                this.decorators.push($.ui.tree.node.decorators[key]);
            }
        }

        // grab the default node template
        this.template = widget.option('node.template');
    }

    NodeBuilder.prototype = {
        build: function() {
            var $ret = $(this.template);

            $.each(this.decorators, function() {
                this.build($ret);
                this.extend();
            });
        
            return $ret;
        }
    }

    // NODE CLASS. this is the proxy class in charge of all node control and manipulation.
    var Node = $.ui.tree.node = function(widget, label, type, data) {
        var self = this; // for closure;

        // initialize the node.
        this.widget = widget;  // widget specific props needed
        this.decorators = [];
        this.data = {};
        this.options = {};
        this.root = false;

        // handle: node(), node($elem)
        if(typeof label == 'object' || label == undefined) {
            label = $(label || []); // normalize the input

            if(label.data('node')) { // return the instance
                return label.data('node');
            } else {
                this.elem = label; // convert the element
            }

        // handle: node('<label>', '<type>', <data>)
        } else { // actually make a new node

            this.elem = widget.nodeTemplate.clone(false);

            // initialize the node.
            this.label(label);
            this.type(type);
            this.meta(data);
        }

        // decorate the node.
        this.decorate();
        
        // store the instance for later retrieval.  
        this.elem.data('node', this);
    }

    Node.prototype = {
        decorate: function() {
            var d = this.widget.option('node.decorators');
            
            for(var key in d) {
                if(d[key] === true) {
                    this.decorators.push(new $.ui.tree.node.decorators[key](this));
                }
            }
        },
        trigger: function(name) {
            var opt = this.option('callbacks');

            trigger(opt, name, this);
        },
        element: function() {
            return this.elem;
        },
        isRoot: function(val) {
            if(val == undefined) {
                return this.root;
            } else {
                this.root = val;
                return this;
            }
        },
        isLeaf: function() {
            return this.container().children('li:first').size() == 0;
        },
        isLast: function() {
            var sibs = this.siblings();
            
            return sibs && sibs[sibs.length-1].element()[0] == this.element()[0];
        },
        type: function(val) {
            var ret = this.elem.attr('type', val);

            return val == undefined ? ret : this;
        },
        label: function(val) {
            var ret = this.anchor().text(val);

            return val == undefined ? ret : this;
        },
        option: function(key, val) {
            var obj, o = this.widget.options, ret;

            if(val == undefined) {
                obj = $.extend(true, {}, o.types['default'], o.types[this.type()], this.options);
            } else {
                obj = this.options;
            }

            ret = $.delimit(obj, key, val);

            return val == undefined ? ret : this;
        },
        callback: function(name, val) {
            return this.option('callbacks.' + name, val);
        },
        meta: function(key, val) {
            if(typeof key == 'object') {
                this.data = key;
                return this;
            } else if(key == undefined) {
                return this.data;
            }

            var ret = $.delimit(this.data, key, val);

            return val == undefined ? ret : this;
        },
        ui: function(name, val) {
            if(val === undefined && typeof name !== 'boolean') {
                return this.elem.hasClass(name);
            }

            val === true ? this.elem.addClass(name) : this.elem.removeClass(name === false ? undefined : name);

            return this;
        },
        append: function(child) {
            this.container().append(child.isRoot(false).element());

            return this;
        },
        container: function() {
            return this.elem.children('ul:first');
        },
        anchor: function() {
            return this.elem.children('a:first');
        },
        parent: function() {
            var self = this, w = this.widget;
            return this.isRoot() ? w.node() : w.node(this.elem.parent('ul:first').parent('li'));
        },
        children: function() {
            var self = this, ret = [], children = this.container().children('li');

            $.each(children, function() {
                ret.push(self.widget.node(this));
            });

            return ret;
        },
        siblings: function() {
            if(this.isRoot()) { // special case of root nodes.
                var self = this, ret = [],

                sibs = this.element().parent('ul').children('li');

                $.each(sibs, function() {
                    ret.push(self.widget.node(this));
                });

                return ret;
            } else if(this.parent().element().size() > 0) {
                return this.parent().children();
            } else {
                return [this];
            }
        },
        refresh: function() {
            var c = this.widget.option('classes');
            
            // reset the ui state.
            this.ui(false);

            // set the ui state.
            this.ui(c.nodeClass, true);
            this.ui(this.type(), true);

            // is this a composite node?
            if(this.isLeaf()) {
                this.ui(c.leafClass, true);
            } else {
                this.ui(c.compositeClass, true);
            }

            //            // is this the last node in this level?
            //            if(this.isLast()) {
            //                this.ui(c.lastClass, true);
            //            }
            
            $.each(this.decorators, function() {
                this.refresh();
            });

            return this;
        },
        destroy: function() {
            // reset ui state.
            this.ui(false);

            $.each(this.decorators, function() {
                this.destroy();
            });

            this.elem.data('node', null);
        }
    }
    
    // DYNAMIC PLUGINS.  Add extra behaviors to the tree.
    var plugin = $.ui.tree.plugin = function(name, prototype) {
        var plugins = $.ui.tree.plugins = $.ui.tree.plugins || {};
        
        // this is the constructor function for the plugins.
        plugins[name] = function(tree) {
            var esto = this, o = tree.options;

            this.widget = tree;

            // sets/gets an option
            this.option = function(key, val) {
                var w = this.widget, ret;

                if(val == undefined) {
                    ret = $.delimit($.extend(true, {}, plugins[name].defaults, prototype.defaults, w.option('plugins.' + name)), key, val);
                } else {
                    ret = $.delimit(o.plugins[name], key, val);
                }

                return val == undefined ? ret : this;
            }

            // binds an event to the tree root. can be namespaced.
            this.bind = function(evt, fn) {
                tree.root.bind(evt + '.plugins.' + name, fn);
            }

            // unbinds an event from the tree root. can be namespaced.
            this.unbind = function(evt) {
                tree.root.unbind(evt + '.plugins.' + name);
            }
        }

        // let the plugin objects inherit the default properties.
        plugins[name].prototype = $.extend({}, plugin.prototype, prototype);
    }
   
    plugin.prototype = {
        // called once to initialize the plugin. use this to add any components
        // before the root.
        init: function() {},

        // called once to finalie the plugin.  Use this to add any components
        // after the root.
        finish: function() {},

        // used to deallocate any resources created by the plugin.
        destroy: function() {},

        // refresh the plugin from the global perspective.
        refresh: function(root) {},

        // sets the handlers for the plugin
        setHandles: function() {},

        // unsets the handlers for the plugin.
        unsetHandles: function() {}
    }

    // DYNAMIC DECORATORS.  Use this to add extra appearance to the node.
    var decorator = $.ui.tree.node.decorator = function(name, prototype) {
        var decorators = $.ui.tree.node.decorators = $.ui.tree.node.decorators || {};
        
        // make the constructor function.
        decorators[name] = function(node) {
            this.node = node;
            this.widget = node.widget;
        }

        // option: override this to extend the node class.
        decorators[name].extend = function() {};

        // option: override this to alter the node structure.
        decorators[name].build = function($template) {};

        // bind the prototype.
        decorators[name].prototype = $.extend(true, {}, $.ui.tree.node.decorator.prototype, prototype);

        return decorators[name];
    }

    decorator.prototype = {
        // used to deallocate any resources used by this decorators.
        destroy: function() {},

        // used to refresh the visual state of the node.
        refresh: function() {} 
    }
    
    // DYNAMIC PARSING.  Can be extended to suit any data type.
    var parser = $.ui.tree.parser = function(type, prototype) {
        var parsers = $.ui.tree.parsers = $.ui.tree.parsers || {};
        
        // the dynamic constructor for parsers
        parsers[type] = function(node) {
            this.node = node;
        }

        parsers[type].prototype = $.extend({}, parser.prototype, prototype);
    }
    
    parser.prototype = {
        toDOM: function(root) {
            var self = this, node = this.node,

            // create an empty array for returning the set of trees.
            ret = [],

            // need a set of queues.
            queue1 = [],
            queue2 = [];
            for(var i=0; i<root.length; i++) { 
                var
                // get the data from the data element
                _cur = this.makeNode(root[i]),
                _children = this.getChildren(root[i]) || [];

                $.each(_children, function() {
                    queue1.push(this);
                });

                ret.push(_cur);

                queue2.push({
                    elem: _cur,
                    count: _children.length
                });

                var _parent = null;
                while(_parent = queue2.shift()) {// cur parent
                    var count = _parent.count;
                    var $elem = _parent.elem;

                    while(count > 0) {
                        var
                        // grab the current data node.
                        cur = queue1.shift(),

                        // make the cur node and grab the children.
                        $cur = this.makeNode(cur),
                        children = this.getChildren(cur) || [];

                        $elem.append($cur);

                        queue2.push({
                            elem : $cur,
                            count : children.length
                        })

                        $.each(children, function() {
                            queue1.push(this);
                        });

                        count--;
                    }
                }
            }
            return ret;
        },
        makeNode: function(datum) {},
        getChildren: function(datum) {}
    }

    // the default html parser.
    parser('html', {
        makeNode: function(datum) {
            var self = this, node = this.node,

            // get the components
            label = $(datum).children('a:first').text(),
            type  = $(datum).attr('type'),
            data  = $(datum).attr('data');

            return node(label, type, data);
        },
        getChildren: function(datum) {
            return $(datum).children('ul:first').children('li');
        }
    });
    
    // the default xml parser.
    parser('xml', {
        makeNode: function(datum) {
            var self = this, node = this.node,

            // get the components
            label = $(this).children('label:first').text(),
            type  = $(this).attr('type'),
            data  = $(this).children('data:first').toJSON();

            return node(label, type, data);
        },
        getChildren: function(datum) {
            return $(this).children('children:first');
        }
    });

    // the default json parser.
    parser('json', {
        makeNode: function(datum) {
            var self = this, node = this.node,

            // get the components
            label = datum.label,
            type  = datum.type,
            data  = datum.data;

            return node(label, type, data);
        },
        getChildren: function(datum) {
            return datum.children;
        }
    });

    // Core plugin. (Expandable, collapsible, loadable, selectable)
    plugin('core', {
        init: function() {
            var self = this, w = this.widget, c = w.option('classes');

            // add the expandable decorator to the node.
            var core = decorator('core', {
                refresh: function() {
                    var node = this.node;

                    if(!node.isLeaf()) {
                        node.isExpanded() ? node.ui(c.expandClass, true) : node.ui(c.collapseClass, true);
                    }

                    if(node.isSelected()) {
                        node.highlight();
                    }
                }
            });

            core.extend = function() {
                // extend the node to account for the added behavior.
                $.extend(Node.prototype, {
                    isExpanded: function() {
                        var $ul = this.container();

                        return $ul.css('display') == 'block';
                    },
                    isLoaded: function(val) {
                        if(val != undefined && typeof val == 'boolean') {
                            this.loaded = val;
                            return this;
                        } else {
                            return this.loaded = this.loaded || false;
                        }
                    },
                    load: function() {
                        var esto = this,

                        load = this.option('load'),
                        type = this.option('data');

                        // is there anything to load?
                        if(!this.isLoaded() && load != undefined) {
                            var
                            // grab the parser.
                            parser = new $.ui.tree.parsers[type](w.node),

                            // grab the data
                            data = load.call(w, this),

                            // parse the data
                            children = parser.toDOM(data);

                            // set the load status
                            this.ui(c.loadClass, true);

                            $.each(children, function() {
                                esto.append(this);
                            });

                            this.isLoaded(true);
                            w.refresh(this); // poorly coupled, but what to do???

                            // remove the load status
                            this.ui(c.loadClass, false);
                        }


                        return this;
                    },
                    expand: function(opts) {
                        var esto = this, anim, speed, beforeExpand, onExpand;

                        if(opts == undefined) {
                            // grab the animation.
                            anim = this.option('expandAnimation') || 'show';

                            // grab the duration.
                            speed = this.option('expandDuration');
                            speed = speed != undefined ? speed : this.option('duration');
                            speed = speed != undefined ? speed : 0;

                            // grab the callbacks.
                            beforeExpand = this.callback('beforeExpand');
                            onExpand = this.callback('onExpand');
                        } else {
                            // grab the anim.
                            anim = opts.animation || 'show';

                            // grab the duration.
                            speed  = opts.duration !== undefined ? opts.duration : 0;

                            // grab the callbacks.
                            beforeExpand = opts.beforeCollapse;
                            onExpand = opts.onCollapse;
                        }

                        var $ul = this.container();

                        // see if we need to proceed with expanding
                        if((beforeExpand == undefined || beforeExpand.call(w, this) !== false) && !this.isLeaf()) {
                            this.ui(c.collapseClass, false);
                            this.ui(c.expandClass, true);

                            $ul[anim](speed, function() {
                                onExpand && onExpand.call(w, this);
                            });
                        }

                        return this; // for method chaining.
                    },
                    collapse: function(opts) {
                        var esto = this, anim, speed, beforeCollapse, onCollapse;
                        if(opts == undefined) { // do default.
                            // grab the anim.
                            anim = this.option('collapseAnimation') || 'hide';

                            // grab the duration.
                            speed = this.option('collapseDuration');
                            speed = speed != undefined ? speed : this.option('duration');
                            speed = speed != undefined ? speed : 0;

                            // grab the callbacks.
                            beforeCollapse = this.callback('beforeCollapse');
                            onCollapse = this.callback('onCollapse');
                        } else {
                            // grab the anim.
                            anim = opts.animation || 'hide';

                            // grab the duration.
                            speed = opts.duration !== undefined ? opts.duration : 0;

                            // grab the callbacks.
                            beforeCollapse = opts.beforeCollapse;
                            onCollapse = opts.onCollapse;
                        }

                        var $ul = this.container(), children = this.children();

                        // see if we need to proceed with collapsing
                        if((beforeCollapse == undefined || beforeCollapse.call(w, this) !== false) && !this.isLeaf()) {
                            $ul[anim](speed, function() {
                                onCollapse && onCollapse.call(w, this);
                            });

                            this.ui(c.collapseClass, true);
                            this.ui(c.expandClass, false);

                            $.each(children, function() {
                                this.collapse({
                                    animation: 'hide',
                                    duration: 0
                                });
                            });
                        }

                        return this; // for method chaining.
                    },
                    isSelected: function() {
                        return w.highlighted == this;
                    },
                    highlight: function() {
                        w.highlighted && w.highlighted.ui(c.selectClass, false);

                        this.ui(c.selectClass, true);

                        w.highlighted = this;

                        return this;
                    },
                    select: function() {
                        var beforeSelect = this.callback('beforeSelect');
                        var onSelect = this.callback('onSelect');

                        if(beforeSelect == undefined || beforeSelect.call(w, this) !== false) {
                            onSelect && onSelect.call(w, this);
                        }

                        return this;
                    }
                });
            }

            // add the icon decorator
            var icon = decorator('icon', {
                refresh: function() { // only nodes with
                    var node = this.node, src;

                    // does this node have an icon?
                    if(src = node.option('icon')) {
                        var $icon = $('ins', node.anchor());

                        // update the icon.
                        $icon.css('background-image', "url('" + src + "')");
                        $icon.css('background-repeat', 'no-repeat');
                    }
                }
            });

            icon.build = function($elem) {
                var
                // wraps the anchor 
                $wrap = $('<span><span>'),
                // an icon holder.
                $icon = $('<ins></ins>'),
                // grab the node anchor
                $a = $elem.children('a:first');

                // update the structure
                var $temp = $a.children().remove();

                $a.append($wrap.append($temp)).prepend($icon);
            }

            icon.extend = function() {
                $.extend(Node.prototype, {
                    label: function(val ) {
                        var ret = this.anchor().children('span:first').text(val);
                        
                        return val == undefined ? ret : this;
                    }
                })
            }
        },
        setHandles: function() {
            var self = this, w = this.widget, node = w.node;

            this.bind('click.expand', function(e) {
                var $node = node($(e.target).closest('li'));

                if($node.element()[0] == e.target) {
                    if(!$node.isExpanded()) {
                        $node.load();
                        $node.expand();
                    } else {
                        $node.collapse();
                    }
                }
            });

            this.bind('click.select', function(e) {
                var $node = node($(e.target).closest('li'));

                if($node.anchor()[0] == e.target) {
                    $node.select();

                    e.preventDefault();
                    e.stopPropagation();
                }
            });


            this.bind('mousedown.highlight', function(e) {
                var $node = node($(e.target).closest('li'));

                $node.highlight();
            });
        },
        unsetHandles: function() {
            this.unbind('click.expand');
            this.unbind('click.select');
            this.unbind('mousedown.hightlight');
        }
    });


    var size = function(elem, style) {
        return parseInt($(elem).css(style).replace(/px/, ''));
    }

    $.ui.tree.plugin('menu', {
        menuTemplate: '<div></div>',
        itemTemplate: '<a href="#"></a>',
        defaults: {
            classes: {
                menuClass: 'ui-tree-menu',
                itemClass: 'ui-tree-menu-item'
            }
        },
        init: function() {
            var w = this.widget, c = this.option('classes'), items = this.option('items');

            // create the menu.
            this.menu = $(this.menuTemplate).addClass(c.menuClass);

            // populate it
            for(var key in items) {
                var $item = $(this.itemTemplate), item = items[key];

                $item.addClass(c.itemClass)
                $item.addClass(key);

                $item.attr('title', item.tooltip);
                $item.attr('href', '#' + key);

                // put the icon in, if needed.
                if(item.icon) {
                    // update the icon.
                    $item.css('background-image', "url('" + item.icon + "')");
                    $item.css('background-repeat', 'no-repeat');
                }

                this.menu.append($item);
            }

            w.root.prepend(this.menu.hide());
        },
        setHandles: function() {
            var self = this, w = this.widget;

            this.bind('mouseenter', function() {
                self.showMenu();
            });

            this.bind('mouseleave', function() {
                self.hideMenu();
            });

            this.menu.bind('click.menu', function(e) {
                var $a = $(e.target).closest('a');
                
                if($a[0] && $($(e.target), $a)[0]) {
                    var name = $a.attr('href').replace(/#/, ''),

                    // grab the item.
                    item = self.option('items.' + name),

                    // lastly grab the action.
                    action = item.action;

                    if(typeof action == 'function') {
                        action.call(w,w);
                    }
                }
            });

        },
        unsetHandles: function() {
            this.unbind('mouseenter');
            this.unbind('mouseleave');
            this.menu.unbind('click.menu');
        },
        showMenu: function() {
            var w = this.widget, root = w.root, an, dur,

            // set the styling and position.
            off = root.offset(),
            top = off.top + 5,
            left = off.left + root.width() - this.menu.width() - 5;
            
            this.menu.css('position', 'absolute');
            this.menu.css('top', top + 'px');
            this.menu.css('left', left + 'px');

            // grab the animation and display it.
            an = this.option('openAnimation');
            dur = this.option('openDuration');

            this.menu[an](dur);
        },
        hideMenu: function() {
            var an = this.option('closeAnimation'), dur = this.option('closeDuration');

            this.menu[an](dur);
        }
    });

    $.ui.tree.plugin('mainPanel', {
        defaults: {
            classes: {
                panelClass : 'ui-tree-main-panel'
            }
        },
        template: '<div><a href="#navLeft"><-</a><ul></ul><a href="#navRight">-></a></div>',
        finish: function() {
            var self = this, w = this.widget, t = this.template, c = this.option('classes'), root = w.root;

            var $panel = this.panel = $(this.template).addClass(c.panelClass);
            
            w.element.append($panel);
        },
        startHandles: function() {
            var self = this;

            $('a[href=#navLeft]', this.panel).bind('click.panel', function(e) {
                self.prev();
            });

            $('a[href=#navRight]', this.panel).bind('click.panel', function(e) {
                self.next();
            });
        },
        prev: function() {
            var self = this, content = $('span', this.panel); 
        },
        next: function() {
            
        }
    });

    // used to attach elements to a common popup panel.
    $.ui.tree.plugin('popupPanel', {
        defaults: {
            classes: {
                containerClass : 'ui-tree-container',
                panelClass     : 'ui-tree-popup-panel'
            }
        },
        template: '<div><a href="#close">close</a><span></span></div>',
        init: function() {
            this.items = {};    // an object containing all of the available items.
            this.key = null;    // the item currently in the panel.
        },
        finish: function() {
            var self = this, w = this.widget, t = this.template, c = this.option('classes'), root = w.root;

            // put the container in.
            root.wrap($('<div></div>').addClass(c.containerClass));

            // grab the container
            var $c = this.container = root.parent('div.' + c.containerClass);

            // style the root. ensure it takes up all of the container.
            var bt = size(root, 'border-top-width');
            var bb = size(root, 'border-bottom-width');
            var height = $c.height() - bt - bb;

            root.height(height);

            // make the panel.
            var $p = this.panel = $(t).addClass(c.panelClass);
            
            $c.append($p.hide());
        },
        setHandles: function() {
            var self = this;

            // set the hide/r
            $('a', this.panel).bind('click', function() {
                self.hide();
            });
        },
        unsetHandles: function() {
            // set the hide/r
            $('a', this.panel).unbind();
        },
        add: function(key, elem) {
            var self = this, w = this.widget, panel = this.panel, root = w.root;

            var insert = function(html) {
                $('span', panel).append(html);
            }

            // clean the panel. make sure nothing is in it.
            this.clean();

            // append the element.
            insert(elem);

            // determine styling
            var oh = root.height(); // original height of the root.
            
            var pbt = size(panel, 'border-top-width');
            var pbb = size(panel, 'border-bottom-width');
            var ppt = size(panel, 'padding-top');
            var ppb = size(panel, 'padding-bottom');

            var ph = panel.height();
            var rh = oh - pbt - pbb - ppt -ppb;

            // make this element an item.
            this.items[key] = $(elem);

            panel.bind('panel.expand.' + key, function() {
                panel.animate({
                    height : ph
                }, 300);
                root.animate({
                    height : rh - ph
                }, 300);
            });

            panel.bind('panel.collapse.' + key, function() {
                panel.animate({
                    height: 0
                }, 300);
                root.animate({
                    height: oh
                }, 300);
            });

            panel.bind('panel.remove.' + key, function() {
                // grab the html to remove
                var trash = self.items[key];

                // copy the html with its handlers
                self.items[key] = trash.clone(true);

                // remove it from the DOM
                trash.remove();
            });

            panel.bind('panel.insert.' + key, function() {
                insert(self.items[key]);
            });

            // we appended an item.  we need to remove it.
            panel.trigger('panel.remove.' + key);
        },
        clean: function() {
            var panel = this.panel;

            this.hide(); // hide what we're doing... :)

            if(this.key) {
                panel.trigger('panel.remove.' + this.key);
            }
        },
        show: function(key) {
            var self = this, w = this.widget, panel = this.panel, root = w.root;

            if(this.key != key) {
                this.hide(); // need to hide it first.

                panel.trigger('panel.remove.' + this.key);  // remove the item currently in the panel.
                panel.trigger('panel.insert.' + key);       // insert the new item;

                this.key = key;
            }

            panel.trigger('panel.expand.' + key);
        },
        hide: function() {
            var self = this, w = this.widget, panel = this.panel, root = w.root;

            if(this.key) {
                panel.trigger('panel.collapse.' + this.key);
            }
        }
    });
    

    // jquery utility functions.
    $.fn.extend({
        // returns a JSON object from the interior html or xml elements of the jquery object.
        toJSON: function() {
            var retObj = {}, array = false, $children = this.children();

            if($children.length == 0) {
                var val = $(this).text();
                switch($(this).attr('type')) {
                    case 'boolean':
                        return val == 'true' || val == '1';
                        break;
                    case 'int':
                        return parseInt(val);
                        break;
                    case 'float':
                        return parseFloat(val);
                        break;
                    default:
                        return val;
                        break;
                }
            }

            $children.each(function() {
                var name = this.nodeName.toLowerCase();

                // is this an array we're converting?
                if(retObj[name] == undefined) {
                    retObj[name] = $(this).toJSON();
                } else {
                    retObj = [], array = true;
                }
            });

            if(array === true) {
                $children.each(function() {
                    retObj.push($(this).toJSON());
                });
            }

            return retObj;
        }
    });



    // Array utility functions.
    Array.prototype.contains = function(val) {
        for(var i=0; i<this.length; i++) {
            if(this[i] == val) {
                return true;
            }
        }

        return false;
    }

    Array.prototype.enqueue = function(val) {
        this.push(val);
    }

    Array.prototype.dequeue = function() {
        return this.shift();
    }
})(jQuery);
