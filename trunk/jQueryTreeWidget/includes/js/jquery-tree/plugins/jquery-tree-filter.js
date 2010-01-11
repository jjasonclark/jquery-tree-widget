if (jQuery) (function($){
    $.ui.tree.plugin('filter', {
        version     : '0.1',
        defaults    : {
            searchTitle     :   'Search',           // applied as a watermark
            advancedTitle   : 'Advanced Filters',
            init            :   null,               // function called before every search.
            criteria        :   null,               // a list of criterion objects
            subtreeBrowsing : true,             // if a node is matched, should the subtree be visible?
            classes         : {
                filterClass		: 'ui-tree-filter-search',
                advancedClass	: 'ui-tree-filter-advanced',
                openClass       : 'ui-tree-filter-advanced-opened',
                closeClass      : 'ui-tree-filter-advanced-closed',
                titleClass		: 'ui-tree-filter-advanced-title', 
                criteriaClass 	: 'ui-tree-filter-criteria',
                matchClass  	: 'ui-tree-filter-matched'
            }
        },
        templates   : {
            filterTemplate  : '<div><input type="text" /></div>',
            advancedTemplate: '<ul><li><span>#{title}</span><ul style="display:none"></ul></li></ul>',
            criteriaTemplate: '<li>#{html}</li>'
        }
    });

    $.extend($.ui.tree.prototype.defaults.types['default'], {
        filter : true
    });

    // a specialized search queue.  
    var queue = function() {
        this.length = 0;
        this.timeout = null;
    }

    queue.prototype.push = function(search) {
        var self = this;

        this[this.length++] = search;

        clearTimeout(this.timeout);

        this.timeout = setTimeout(function() {
            self[self.length-1].exec();

            // reset the array.
            for(var i=self.length; i>0; i--) {
                delete self[i-1];
            }

            self.length = 0;
        }, 200); // TODO: make a timeout function that is tree size dependent.
    }

    $.extend($.ui.tree.plugins.filter.prototype, {
        init: function() {
            // update the node methods.
            $.extend($.ui.tree.node.prototype, {
                expandUp: function(){
                    var self = this,

                    ascend = function (node){
                        if (!node.isLeaf()) {
                            var parent = node.parent();

                            parent.expand({
                                animation: 'show',
                                duration: 0
                            })

                            innerExpand(parent);
                        }
                    };

                    ascend(this);
                },
                collapseDown: function(){
                    var self = this, widget = this.widget, o = this.options;

                    this.collapse({
                        animation: 'hide',
                        duration: 0
                    });
                },
                highlightTerm: function(term) {
                    var self = this, o = this.options, c = o.classes, $unmatch, text, textA, textB, textC, $match, start;

                    $unmatch = $('a:first > span', this.element());
                    $match = $('span', $unmatch)[0] ? $('span', $unmatch) : $('<span></span>').addClass(c.matchClass);


                    // go ahead and reset the node text
                    this.label = this.label = this.label();

                    $node.data('label', $node.data('label') || $unmatch.text());
                    text = $node.data('label');

                    // reset the node
                    $unmatch.text('');
                    $match.text('');

                    start = text.indexOf(term, 0);
                    if (start > -1) {
                        textA = text.slice(0, start);
                        textB = text.slice(start, start + term.length);
                        textC = text.slice(start + term.length);
                    }
                    else {
                        textA = text;
                        textB = '';
                        textC = '';
                    }

                    $match.append(textB);
                    $unmatch.append(textA);
                    $unmatch.append($match);
                    $unmatch.append(textC);
                }
            });

            // update the node appearance.
            $.ui.tree.node.decorator('filter', {
                init: function() {
                    if(!this.node.option('icon')) {
                        this.node.anchor().wrapInner($('<span></span>'));
                    }
                }
            });

        },
        finish: function() {
            var self = this, w = this.widget, o = this.option(), c = o.classes, t = this.templates, criteria, $advanced, $filter;

            // make the filter and add it to the element.
            $filter = this.filter = $(t.filterTemplate).addClass(c.filterClass);

            // shows the search title as a watermark
            $.watermark && $('input[type=text]', $filter).watermark(o.searchTitle);

            $(this.widget.element).prepend($filter);

            // make the advanced options panel.
            $advanced = this.advanced = $(t.advancedTemplate.replace(/#\{title\}/, o.advancedTitle)).addClass(c.advancedClass);

            criteria = o.criteria || [];

            this.criteria = [];
            for (var i = 0; i < criteria.length; i++) {
                this.criteria[i] = {};
                this.criteria[i].html = $(t.criteriaTemplate.replace(/#\{html\}/, criteria[i].html)).addClass(c.criteriaClass);
                this.criteria[i].compare = criteria[i].compare;

                $advanced.children('li').children('ul:first').append(this.criteria[i].html);
            }

            w.element.append($advanced);
        },
        _setHandles: function(){
            var self = this, o = this.options, c = o.classes,

            // need to put searches in a queue, where only the latest search is applied.
            searches = this.searches = this.searches || {
                length: 0,
                timeout: null,
                prev: null,
                push: function(search) {
                    var self = this;

                    this[this.length++] = search;

                    clearTimeout(this.timeout);

                    this.timeout = setTimeout(function() {
                        self[self.length-1].exec();

                        // reset the array.
                        for(var i=self.length; i>0; i--) {
                            delete self[i-1];
                        }

                        self.length = 0;
                    }, 200); // TODO: make a timeout function dependent on
                // the size of the tree.
                }
            },

            // the dynamic search constructor.
            search = function(term, criteria) {
                this.exec = function() {
                    var esto = this;

                    // grab the callback.
                    o.init && o.init.call(this);

                    self.widget.root.hide();

                    self.widget.root.children('li').each(function() {
                        esto.reset($(this));
                    });

                    self.widget.root.children('li').each(function(){
                        esto.filter($(this), criteria);
                        esto.search($(this), term);

                    });

                    self.widget.root.show();
                }
            };

            search.prototype = {
                search: function($root, term) {
                    // the match function
                    var match = function($node, search){
                        var searchA, searchB;

                        if (search == '') 
                            return true; // by convention
                        
                        searchA = $node.children('a').text().toLowerCase();
                        searchB = search.toLowerCase();

                        return searchA.indexOf(searchB, 0) > -1;
                    },

                    $ul = $root.children('ul:first'), $children = $ul.children('li'),

                    matchNode = match($root, term),

                    // should we be able to browse the subtree?
                    subtree = o.subtreeBrowsing;

                    if (matchNode) {
                        (function innerSearch($node, search){
                            var $ul = $node.children('ul:first'), $children = $ul.children('li'), fn;

                            if(match($node, search)) {
                                fn = self._callback('onMatch', $node);
                                fn && fn.call(self.widget, $node);
                                
                                // update the ui state
                                self._expandUp($node);
                                self._collapseDown($node);
                                self._highlight($node, search);

                                if(search !== '' && subtree) {
                                    $children.each(function() {
                                        innerSearch($(this), search);
                                    });
                                }
                            }
                        })($root, term);


                        if(subtree) {
                            return true;
                        }
                    }

                    // go through the children and filter them.
                    var matchTree = false;
                    for (var i = 0; i < $children.length; i++) {
                        if (this.search($($children[i]), term)) {
                            matchTree = true;
                        }
                    }

                    if (!matchNode && !matchTree) {
                        $root.hide();
                    }

                    return matchTree || matchNode;
                },
                filter: function($root, criteria) {
                    // the match function
                    var match = function($node){
                        for (var i = 0; i < criteria.length; i++) {
                            var match = criteria[i].compare($node, criteria[i].html);
                            if (!match) {
                                return false;
                            }
                        }

                        return true;
                    },
                    $ul = $root.children('ul:first'), $children = $ul.children('li'),

                    matchNode = match($root),

                    subtree = o.subtreeBrowsing;

                    if (matchNode && subtree) {
                        return true;
                    }

                    // go through the children and filter them.
                    var matchTree = false;
                    for (var i = 0; i < $children.length; i++) {
                        if (this.filter($($children[i]), criteria)) {
                            matchTree = true;
                        }
                    }

                    if (!matchNode && !matchTree) {
                        $root.hide();
                    }

                    return matchTree || matchNode;
                },
                reset: function($root) {
                    var esto = this,
                    
                    $ul = $root.children('ul:first'), $children = $ul.children('li');

                    // reset the node state
                    self._unhighlight($root);
                    self._collapseDown($root.show());

                    $children.each(function(){
                        esto.reset($(this));
                    });
                }
            }

            // re-filter the tree as the filters are changed.
            this.advanced.change(function(e){
                searches.push(self.search || '', self.criteria);
            });

            // set the handler for the search bar. this needs to be separate
            $('input[type=text]', this.filter).keyup(function(e){
                searches.push(self.search = $(this).val() || '', self.criteria);
            });

            // set the open/close advanced handler
            $('li:first', this.advanced).addClass(c.closeClass).click(function(e){
                if(e.target !== this)
                    return;

                if(!self.advanced.data('open')) {
                    $(this).children('ul:first').slideDown(500);
                    $(this).addClass(c.openClass);
                    $(this).removeClass(c.closeClass);
                    self.advanced.data('open', true);
                } else {
                    $(this).children('ul:first').slideUp(500);
                    $(this).removeClass(c.openClass);
                    $(this).addClass(c.closeClass);
                    self.advanced.data('open', false);
                }
                
            });
        },
        _expandUp: function($node){
            var self = this;

            (function innerExpand($node){
                if (!$node || $node.data('root'))
                    return;
                        
                var $parent = $node.parent('ul:first').parent('li');
                        
                self.widget.expand($parent, {
                    animation: 'show',
                    duration: 0
                });
                        
                innerExpand($parent);
            })($node);
        },
        _collapseDown: function($node){
            var self = this, widget = this.widget, o = this.options;
                    
            this.widget.collapse($node, {
                animation: 'hide',
                duration: 0
            });
        },
        _highlight: function($node, term){
            var self = this, o = this.options, c = o.classes, $unmatch, text, textA, textB, textC, $match, start;
                    
            $unmatch = $('a:first > span', $node);
            $match = $('span', $unmatch)[0] ? $('span', $unmatch) : $('<span></span>').addClass(c.matchClass);
      

            // go ahead and reset the node text
            $node.data('label', $node.data('label') || $unmatch.text());
            text = $node.data('label');

            // reset the node
            $unmatch.text('');
            $match.text('');

            start = text.indexOf(term, 0);
            if (start > -1) {
                textA = text.slice(0, start);
                textB = text.slice(start, start + term.length);
                textC = text.slice(start + term.length);
            }
            else {
                textA = text;
                textB = '';
                textC = '';
            }

            $match.append(textB);
            $unmatch.append(textA);
            $unmatch.append($match);
            $unmatch.append(textC);
        },
        _unhighlight: function($node){
            var self = this, o = this.options, $unmatch, text, $match;
                    
            $unmatch = $('a:first > span', $node);
            $match = $('span', $unmatch)[0] ? $('span', $unmatch) : $('<span></span>').addClass(o.matchClass);
            
            // go ahead and reset the node text
            text = $node.data('label') || $unmatch.text();

            // reset the node
            $unmatch.text('');
            $match.text('');

            // put the text back in the orig
            $unmatch.append(text);
        }
    });
})(jQuery);