if (jQuery) (function($){
    $.ui.tree.plugin('filter', {
        version     : '0.1',
        defaults    : {
            init        :   null,   // function called before every search.
            criteria    :   null,   // a list of criterion objects
            subtreeBrowsing : true, // if a node is matched, should the subtree be visible? 
            types       : {
                'default'   : {
                    callbacks   : {
                        onMatch     : function($node) {}
                    }
                }
            },
            classes     : {
                matchClass  : 'matched'
            }
        },
        templates: {
            filterTemplate: '<ul id="ui-tree-filter"><li>#{title}</li><li><input id="ui-tree-search" type="text" /><a id="ui-tree-advanced-show" href="#">advanced</a></li><li id="ui-tree-advanced-anchor"></li></ul>',
            advancedTemplate: '<ul id="ui-tree-filter-advanced"></ul>',
            criteriaTemplate: '<li class="ui-tree-filter-criteria">#{html}</li>'
        },
        _init: function() {
            var self = this, o = this.options, c = o.classes, t = this.templates, criteria,
                    
            // make the filter and add it to this
            $filter = this.filter = $(t.filterTemplate.replace(/#\{title\}/g, o.title || 'Search')),
            $advanced = this.advanced = $(t.advancedTemplate).prepend($('<li class="ui-tree-filter-title">Filter</li>'));

            // parse the options, grab the custom criterion
            criteria = o.criteria || [];

            this.criteria = [];
            for (var i = 0; i < criteria.length; i++) {
                this.criteria[i] = {};
                this.criteria[i].html = $(t.criteriaTemplate.replace(/#\{html\}/, criteria[i].html));
                this.criteria[i].compare = criteria[i].compare;

                $advanced.append(this.criteria[i].html);
            }
                    
            // put it in the DOM
            $(this.widget.element).prepend($filter);
                    
            // put the advanced in the DOM
            $(document.body).append($advanced.hide());

            // TODO: make copy of tree for search optimization paring technique.
            this.root = null;
        },
        _setHandles: function(){
            var self = this, o = this.options,

            // grabs/creates the searches object.
            searches = this.searches = this.searches || {
                length: 0,
                timeout: null,
                prev: null,
                push: function(term, criteria) {
                    var self = this;

                    this[this.length] = new search(term, criteria);

                    this.length = this.length + 1;

                    // clear the current timeout
                    clearTimeout(this.timeout);

                    // set the timeout handler to be the latest search object
                    this.timeout = setTimeout(function() {
                        self[self.length-1].exec();

                        // reset the array.
                        for(var i=self.length; i>0; i--) {
                            delete self[i-1];
                        }

                        self.length = 0;
                    }, 200); // TODO: make a timeout function dependent on the size of the tree.
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

                        if (search == '') {
                            return true; // by convention
                        }

                        searchA = $node.children('a').text().toLowerCase();
                        searchB = search.toLowerCase();

                        return searchA.indexOf(searchB, 0) > -1;
                    },

                    // grab the necessary components
                    $ul = $root.children('ul:first'), $children = $ul.children('li'),

                    matchNode = match($root, term),

                    // should we be able to browse the subtree?
                    subtree = o.subtreeBrowsing;

                    if (matchNode) {
                        (function innerSearch($node, search){
                            // grab the necessary components
                            var $ul = $node.children('ul:first'), $children = $ul.children('li'), fn;

                            if(match($node, search)) {
                                // call the callback.
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

                    // this entire subtree doesn't have a match, therefore hide it
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

                    // grab the necessary components
                    $ul = $root.children('ul:first'), $children = $ul.children('li'),

                    // does this node match?
                    matchNode = match($root),

                    // should we be able to browse the subtree?
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

                    // this entire subtree doesn't have a match, therefore hide it
                    if (!matchNode && !matchTree) {
                        $root.hide();
                    }

                    return matchTree || matchNode;
                },
                reset: function($root) {
                    var esto = this,
                    // grab the necessary components
                    $ul = $root.children('ul:first'), $children = $ul.children('li');

                    // reset the node state
                    self._unhighlight($root);
                    self._collapseDown($root.show());

                    // go through the
                    $children.each(function(){
                        esto.reset($(this));
                    });
                }
            }

            // re-filter the tree as the filters are changed.
            this.advanced.change(function(e){
                searches.push(self.search || '', self.criteria);
            });

            // set the handler for the search bar.  this needs to be separate
            $('input[type=text]#ui-tree-search', this.filter).keyup(function(e){
                searches.push(self.search = $(this).val() || '', self.criteria);
            });

            // set the open/close advanced handler
            $('a#ui-tree-advanced-show', this.filter).click(function(evt){
                if (!self.advanced.data('open')) {
                    // determine the position.
                    var pos = $('li#ui-tree-advanced-anchor', self.filter).position();
                    self.advanced.css('position', 'absolute');
                    self.advanced.css('top', pos.top);
                    self.advanced.css('left', pos.left);
                    self.advanced.css('width', self.widget.root.width());

                    // open it
                    self.advanced.data('open', true);
                    self.advanced.slideDown(500);
                    evt.preventDefault();

                    // bind the closer
                    $(document.body).mousedown(function(e){
                        if (!self.advanced.hasChild($(e.target)) && e.target !== $('a#ui-tree-advanced-show', this.filter)[0]) {
                            // unbind it.
                            $(document.body).unbind('mousedown');

                            // close it
                            self.advanced.data('open', false);
                            self.advanced.slideUp(500);
                            e.preventDefault();
                        }
                    });
                }
                else {
                    // close it
                    self.advanced.data('open', false);
                    self.advanced.slideUp(500);
                    evt.preventDefault();
                }
            });
        },
        _expandUp: function($node){
            var self = this;

            (function innerExpand($node){
                if (!$node || $node.data('root'))
                    return;
                        
                var $parent = $node.parent('ul:first').parent('li');
                        
                self.widget.expand($parent, false);
                        
                innerExpand($parent);
            })($node);
        },
        _collapseDown: function($node){
            var self = this, widget = this.widget, o = this.options;
                    
            this.widget.collapse($node, false);
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
        
//    Array.prototype.unique = function(){
//        var retArr = [];
//
//        // go through the elements.
//        for (var i = 0; i < this.length - 1; i++) {
//            var unique = true;
//
//            // go through the remaining elements, and see if there are any duplicates.
//            for (var j = i + 1; j < this.length - i - 1; j++) {
//                if (this[i] == this[j])
//                    unique = false;
//            }
//
//            if (unique)
//                retArr.push(this[i]);
//        }
//
//        return retArr;
//    }
})(jQuery);