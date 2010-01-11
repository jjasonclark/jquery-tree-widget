if(jQuery) (function($) { // keep the global namespace clean
  
    // set the default options and the prototype properties.
    $.widget('ui.tree', {
        version : '0.1',
        defaults: { // to be merged with input options (jquery ui core doesn't correctly merge the input options with defaults)
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
            themeRoller : false, // TODO: implement theme roller support.
            init    : { // initial loader.  populates the tree
                load            : null,
                data            : null
            },
            plugins : { // every plugin gets its global options via: plugins.<plugin-name>.<option-name>
                expandable      : true,
                selectable      : true
            },
            types   : {
                'default'       : {
                    decorators      : { // each decorator gets its correstponding options via: types.<node-type>.decorators.<decorator-name>
                        expandable          : true,  // to only activate the decorator, set to true.  complex options can be set via an object declared instead
                        selectable          : true,
                        icon                : true
                    },
                    expandable      : { // each plugin gets its node specific options via: types.<node-type>.<plugin-name>.<option-name>
                        // expand
                        expandAnimation     : 'show',
                        expandDuration      : 0,

                        // collapse
                        collapseAnimation   : 'hide',
                        collapseDuration    : 0,

                        load                : null,     // function(node) { return data };
                        data                : null,     // html, json, xml, or custom data type
                        preload             : false,    // lazy loading?

                        // before callbacks can prevent action if returned false.
                        beforeCollapse      : null, //function($node) { return true; },
                        beforeExpand        : null, //function($node) { return true; },
                        beforeLoad          : null, //function($node) { return true; },

                        onCollapse          : null, //function($node) { return true; },
                        onExpand            : null, //function($node) { return true; },
                        onLoad              : null  //function($node) { return true; },
                    },
                    selectable      : {
                        beforeSelect        : null,
                        onSelect            : null
                    }
                }
            }
        }
    });
    
    // utility object update function. Allows the user to set a deep option by
    // calling delimit(obj, "x.y.z", 3) which will automatically make the x, y,
    // and z objects if they don't exist in the object.
    var delimit = $.delimit = function(obj, name, val) {
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
        template: '<ul></ul>',
        _init: function() {
            var self = this, t = this.templates;

            // initialize the state
            this.plugins = {},
            this.parsers = {},

            // grab/set the root.
            this.root = this.root(),

            // allow consistent access to the node class (consistent via closure)
            this.node = function(label, type, data) {
                return new $.ui.tree.node(self, label, type, data);
            },

            // cleanup the options. jquery ui core doesn't do deep merge
            this.options = $.extend(true, {}, this.defaults, this.options);

            var c = this.option('classes');

            // bind the plugins
            for(var name in this.option('plugins')) {
                this.plugins[name] = this.plugins[name] || new $.ui.tree.plugins[name](self);
            }

            // initialize the plugins
            $.each(this.plugins, function() {
                this.init();
            });

            // make the tree.
            this.convert();
            this.construct();
            this.refresh();
            this.setHandles();

            // finally append the new tree.
            this.element.append(this.root.addClass(c.treeClass));
            
            // finalize the plugins.
            $.each(this.plugins, function() {
                this.finish();
            });
        },
        root: function() {
            var t = this.template;

            return this.root = this.element.children('ul:first')[0] ? this.element.children('ul:first') : $(t);
        },
        option: function(key, val) {
            return $.delimit(this.options, key, val);
        },
        convert: function() {
            var self = this, node = self.node,
            // grab the 'html' parser
            parser = this.parsers['html'] = new $.ui.tree.parsers['html'](node),

            // parse the data.
            tree = parser.toDOM(self.root);

            self.root.children('li').remove();
            $.each(tree, function() {
                self.root.append(this.element());
            });
        },
        construct: function() {
            var self = this, node = self.node,

            fn = this.option('init.load'),
            data = this.option('init.data');

            if(fn != undefined) {
                var
                // grab a parser for the input
                parser = new $.ui.tree.parsers[data](node),
                // parse the tree.
                tree = parser.toDOM(fn.call(self));

                $.each(tree, function() {
                    self.root.append(this.element());
                });
            }
        },
        refresh: function(root) {
            var self = this, node = self.node;

            var cascade = function(root) {
                root.refresh();

                $.each(root.children(), function() {
                    cascade(this);
                });
            }

            var tree = [];
            if(root == undefined) {
                var $top = this.root.children('li');

                $.each($top, function() {
                    tree.push(node(this).isRoot(true));
                });
            } else {
                tree.push(root);
            }

            $.each(tree, function() {
                cascade(this);
            });

            $.each(this.plugins || {}, function() {
                this.refresh(root);
            });
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

    // this is the proxy class in charge of all node control and manipulation.
    $.ui.tree.node = function(widget, label, type, data) {
        var self = this; // for closure

        // handle instantiation.
        if(typeof label == 'object' || label == undefined) {
            label = $(label || []); // normalize the input

            if(label.data('node')) { // return the instance
                return label.data('node');
            } else {
                this.elem = label; // convert the element
            }
        } else { // actually make a new node
            this.elem = $(this.template);

            // initialize the node.
            this.label(label);
            this.type(type);
            this.data(data);
        }

        this.widget = widget;
        this.decorators = [];
        this.data = {};
        this.options = {}; // specific to this particular node and not related to the type
        this.root = false;

        // decorate the node.
        this.decorate();
            
        // store the instance for later retrieval.  Does this consume too many resources?
        this.elem.data('node', this);

        return this;
    }


    $.ui.tree.node.prototype = {
        template: '<li><a href="#"></a><ul style="display: none"></ul></li>',
        decorate: function() {
            var decorators = this.option('decorators');
            for(var key in decorators) {
                if(decorators[key] != undefined) {
                    this.decorators.push(new $.ui.tree.node.decorators[key](this));
                }
            }
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
            return this.children().length == 0;
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
        data: function(key, val) {
            if(typeof key == 'object' || key == undefined) {
                this.data = key;
                return this;
            }

            var ret = $.delimit(this.data = this.data || {}, key, val);

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
            this.container().append(child.element());

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
            } else {
                return this.parent().children();
            }
        },
        refresh: function() {
            var c = this.widget.options.classes;

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

            // is this the last node in this level?
            if(this.isLast()) {
                this.ui(c.lastClass, true);
            }

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

    // DYNAMIC PARSING.  Can be extended to suit any data type.
    $.ui.tree.parser = function(type, prototype) {
        var parsers = this.parsers = this.parsers || {};

        // the dynamic constructor for parsers
        parsers[type] = function(node) {
            this.node = node; // the node constructor function.
        }

        parsers[type].prototype = $.extend({}, $.ui.tree.parser.prototype, prototype);
    }
    

    // the default parser prototype
    $.ui.tree.parser.prototype = {
        toDOM: function(data) {} // returns an array of nodes.  OVERRIDE THIS!!!
    }


    // the default html parser.
    $.ui.tree.parser('html', {
        toDOM: function(root) {
            var self = this, node = this.node,

            tree = [];
            $(root).children('li').each(function() {
                var label, type, data, children, $node;

                // get the components
                label = $(this).children('a:first').text();
                type  = $(this).attr('type');
                data  = $(this).attr('data');

                children = $(this).children('ul:first');

                // create the node.
                $node = node(label, type, data);

                // put this in the list of elements.
                tree.push($node);

                // append the children
                children && $.each(self.toDOM(children), function() {
                    $node.append(this);
                });
            });

            return tree;
        }
    });

    // the default xml parser.
    $.ui.tree.parser('xml', {
        toDOM: function(root) {
            var self = this, t = this.templates, node = this.node,

            tree = [];
            $(root).children('node').each(function() {
                var label, type, data, children, $node;

                // get the components
                label = $(this).children('label:first').text();
                type  = $(this).attr('type');
                data  = $(this).children('data:first').toJSON();

                children = $(this).children('children:first');

                // create the node.
                $node = node(label, type, data);

                // put this in the list of elements.
                tree.push($node);

                // append the children
                children && $.each(self.toDOM(children), function() {
                    $node.append(this);
                });
            });

            return tree;
        }
    });

    // the default json parser.
    $.ui.tree.parser('json', {
        toDOM: function(root) {
            var self = this, node = this.node, tree;

            // create an empty node object.
            tree = [];
            for(var i=0; i<root.length; i++) {
                var label, type, data, children, $node, $children;

                // get the components.
                label = root[i].label;
                type  = root[i].type;
                data  = root[i].data;

                children = root[i].children;

                // create the node.
                $node = node(label, type, data);

                // put the node in the list of nodes.
                tree.push($node);

                children && $.each(self.toDOM(children), function() {
                    $node.append(this);
                });
            }

            return tree;
        }
    });

    // DYNAMIC PLUGINS.  Change the tree from a global perspective.  Note: Some seemingly node-specific
    // behaviors can be extended via its prototype, rather than the specifc node.  (Saves on resources)
    $.ui.tree.plugin = function(name, prototype) {
        var plugins = this.plugins = this.plugins || {};

        // this is the constructor function for the plugins.
        plugins[name] = function(tree) {
            var esto = this, o = tree.options;

            this.widget = tree;

            this.option = function(key, val) {
                var o = this.widget.options, ret;

                if(val == undefined) {
                    ret = $.delimit($.extend(true, {}, plugins[name].defaults, prototype.defaults, o.plugins[name]), key, val);
                } else {
                    ret = $.delimit(o.plugins[name], key, val);
                }

                return val == undefined ? ret : this;
            }

            this.setting = function(node, key, val) {
                return node.option(name + '.' + key, val);
            }

            this.bind = function(evt, fn) {
                tree.root.bind(evt + '.plugins.' + name, fn);
            }

            this.unbind = function(evt) {
                tree.root.unbind(evt + '.plugins.' + name);
            }
        }

        // let the plugin objects inherit the default properties.
        plugins[name].prototype = $.extend({}, $.ui.tree.plugin.prototype, prototype);
    }
   

    $.ui.tree.plugin.prototype = {
        init: function() {}, // called before the tree is made. only called once.
        finish: function() {},
        destroy: function() {},
        refresh: function(root) {},
        setHandles: function() {},
        unsetHandles: function() {}
    }


    // DYNAMIC DECORATORS.  Affects individual nodes.
    $.ui.tree.node.decorator = function(name, prototype) {
        $.ui.tree.node.decorators[name] = function(node) {
            this.node = node;
            this.widget = node.widget;

            this.option = function(key, val) {
                var ret = $.delimit(this.node.option(name), key, val);

                return val == undefined ? ret : this;
            }

            this.init();
        }

        $.ui.tree.node.decorators[name].prototype = $.extend(true, {}, $.ui.tree.node.decorator.prototype, prototype);
    }

    $.ui.tree.node.decorator.prototype = {
        init: function() {},    // override. only explicitly called once.
        destroy: function() {}, // override.
        refresh: function() {}  // override. invoked as the node is refreshed.
    }

    // EXPANDABLE PLUGIN.  (makes the nodes expand and collapse)
    $.ui.tree.plugin('expandable', {
        init: function() {
            var self = this, w = this.widget, c = w.option('classes');

            // extend the node to account for the added behavior.
            $.extend($.ui.tree.node.prototype, {
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

                    load = self.setting(this, 'load'),
                    type = self.setting(this, 'data');

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
                        w.refresh(this.element()); // poorly coupled, but what to do???

                        // remove the load status
                        this.ui(c.loadClass, false);
                    }


                    return this;
                },
                expand: function(opts) {
                    var esto = this, anim, speed, beforeExpand, onExpand;

                    if(opts == undefined) {
                        // grab the animation.
                        anim = self.setting(this, 'expandAnimation') || 'show';

                        // grab the duration.
                        speed = self.setting(this, 'expandDuration');
                        speed = speed != undefined ? speed : self.setting(this, 'duration');
                        speed = speed != undefined ? speed : 0;

                        // grab the callbacks.
                        beforeExpand = self.setting(this, 'beforeExpand');
                        onExpand = self.setting(this, 'onExpand');
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
                        anim = self.setting(this, 'collapseAnimation') || 'hide';

                        // grab the duration.
                        speed = self.setting(this, 'collapseDuration');
                        speed = speed != undefined ? speed : self.setting(this, 'duration');
                        speed = speed != undefined ? speed : 0;

                        // grab the callbacks.
                        beforeCollapse = self.setting(this, 'beforeCollapse');
                        onCollapse = self.setting(this, 'onCollapse');
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
                }
            });

            // add the expandable decorator to the node.
            $.ui.tree.node.decorator('expandable', {
                refresh: function() {
                    var node = this.node;

                    if(!node.isLeaf()) {
                        node.isExpanded() ? node.ui(c.expandClass, true) : node.ui(c.collapseClass, true);
                    }
                }
            });
        },
        setHandles: function() {
            var self = this, w = this.widget, node = w.node;

            this.bind('click', function(e) {
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
        },
        unsetHandles: function() {
            this.unbind('click');
        }
    });

    // SELECTABLE BEHAVIOR.  makes nodes selectable
    $.ui.tree.plugin('selectable', {
        init: function() {
            var self = this, w = this.widget, c = w.option('classes');

            // extend the node to account for the added behavior.
            $.extend($.ui.tree.node.prototype, {
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
                    var beforeSelect = self.setting(this, 'beforeSelect');
                    var onSelect = self.setting(this, 'onSelect');

                    if(beforeSelect == undefined || beforeSelect.call(w, this) !== false) {
                        onSelect && onSelect.call(w, this);
                    }

                    return this;
                }
            });

            // add the selectable decorator to the node.
            $.ui.tree.node.decorator('selectable', {
                refresh: function() {
                    var node = this.node;

                    if(node.isSelected()) {
                        node.highlight();
                    }
                }
            });
        },
        setHandles: function() {
            var self = this, w = this.widget, node = w.node;
            this.bind('click', function(e) {
                var $node = node($(e.target).closest('li'));

                if($node.anchor()[0] == e.target) {
                    $node.select();

                    e.preventDefault();
                    e.stopPropagation();
                }
            });


            this.bind('mousedown', function(e) {
                var $node = node($(e.target).closest('li'));

                $node.highlight();
            });

        },
        unsetHandles: function() {
            this.unbind('click');
            this.unbind('mousedown');
        }
    });


    // add the editable behavior to the tree.
    $.ui.tree.plugin('editable', {
        template: '<input type="text" />', 
        init: function() {
            var self = this, w = this.widget, c = w.option('classes');

            // extend the node to account for the added behavior.
            $.extend($.ui.tree.node.prototype, {
                rename:  function() {
                    var esto = this;

                    // only rename if possible.
                    if(self.setting(this, 'renameable')) {
                        // create the input
                        var $in = $(esto.template).addClass(c.renameClass),

                        // grab the interior elements. (to be replaced later)
                        $c = this.anchor();

                        // remove the standard interior elements.
                        $c.hide();

                        // put in the textbox.
                        this.element().prepend($in);

                        // set the accept change handler/s.
                        $in.bind('keyup.rename', function(e) {
                            var key = $.ui.keyCode;

                            if(e.keyCode == key.ENTER || e.keyCode == key.TAB) {
                                $(this).unbind('keyup.rename');

                                esto.label($(this).remove().val());
                                esto.refresh();
                                esto.anchor().show();
                            }
                        });
                    }
                },
                remove: function() {
                    
                }
            });
        }
    });

    // add the icon decorator 
    $.ui.tree.node.decorator('icon', {
        wrapTemplate: '<span></span>',
        iconTemplate: '<ins></ins>',
        init: function() {
            var
            // grab the label before any changes are made.
            label = this.node.label(),

            // make the wrap
            $wrap = $(this.wrapTemplate),

            // make the icon
            $icon = $(this.iconTemplate),

            // grab the anchor.
            $a = this.node.anchor();

            // update the structure.
            $a.wrapInner($wrap).prepend($icon);

            // since the node's structure has changed the label method has changed'
            this.node.label = function(val) {
                var ret = this.anchor().children('span:first').text(val);

                return val == undefined ? ret : this;
            }

            // update the label.
            this.node.label(label);
        },
        refresh: function() {
            var node = this.node, src;
            
            // does this node have an icon?
            if(src = node.option('icon.src')) {
                var
                // grab the different elements of the node.
                $a = node.anchor(),

                // need to wrap the label in a span.
                $wrap = $a.children('span:first'),

                // need to make an icon for the node.
                $icon = $a.children('ins:first');

                // update the label.
                $wrap.text(node.label());

                // update the icon.
                $icon.css('background-image', "url('" + src + "')");
                $icon.css('background-repeat', 'no-repeat');

                $a.wrapInner($wrap);
                $a.prepend($icon);
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
        },
        // checks to see if the calling element contains the param element.
        hasChild: function($node) {
            return (function innerSearch($root) {
                var match, matchTree,

                $children = $root.children();

                match = $root[0] == $node[0];

                if(match) {
                    return true;
                }

                matchTree = false;
                $children.each(function() {
                    if(innerSearch($(this))) {
                        matchTree = true;
                    }
                });

                return match || matchTree;
            })($(this));
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
})(jQuery);
