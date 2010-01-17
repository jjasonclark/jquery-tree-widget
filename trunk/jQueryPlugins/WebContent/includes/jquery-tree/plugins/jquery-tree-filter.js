if (jQuery) (function($){
    $.ui.tree.plugin('filter', {
        version     : '0.1',
        defaults    : {
            searchTitle     : 'Quick Search',             // applied as a watermark
            advancedTitle   : 'Advanced Filters',
            init            : null,                 // function called before every search.
            criteria        : null,                 // a list of criterion objects
            algorithm       : 'simple',             // simple, hide, or pluck
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
            filterTemplate  : '<input type="text" />',
            advancedTemplate: '<ul><li><span>#{title}</span><ul style="display:none"></ul></li></ul>',
            criteriaTemplate: '<li>#{html}</li>'
        }
    });
    

    // a specialized search queue. after each new search is pushed onto the queue,
    // a timeout is reset and only the last element is searched.
    // greatly enhances search speed vs. keyup bindings.
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
            var self = this, w = this.widget, c = this.option('classes');

            w.option('node.decorators.filter', true);

            var filter = $.ui.tree.node.decorator('filter', {});

            filter.build = function($elem) {
                if(!w.option('node.decorators.icon')) {
                    //                    console.log($elem);
                    var
                    // wraps the anchor
                    $wrap = $('<span></span>'),
                    // grab the node anchor
                    $a = $elem.children('a:first'),
                    // the node might have interior elems.
                    $temp = $a.children().remove();

                    // update the structure
                    $a.append($wrap.append($temp));
                }
            }

            filter.extend = function() {
                // update the node methods.
                $.extend($.ui.tree.node.prototype, {
                    label: function(val) {
                        var ret = this.anchor().children('span:first').text(val);

                        return val == undefined ? ret : this;
                    },
                    expandUp: function() {
                        var ascend = function (node){
                            if (!node.isRoot()) {
                                var parent = node.parent();

                                parent.expand({
                                    animation: 'show',
                                    duration: 0
                                });

                                ascend(parent);
                            }
                        };

                        ascend(this);
                    },
                    collapseDown: function() {
                        this.collapse({
                            animation: 'hide',
                            duration: 0
                        });
                    },
                    highlightTerm: function(term) {
                        var self = this, text, textA, textB, textC, start,

                        // split the node into two spans
                        $unmatch = $('a:first > span', this.element()),
                        $match = $('span', $unmatch)[0] ? $('span', $unmatch) : $('<span></span>').addClass(c.matchClass);

                        // go ahead and reset the node text
                        this.text = this.text || this.label();

                        text = this.text;

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
                    unHighlightTerm: function() {
                        var o = self.option('classes'),

                        // split into three sections.  <unmatch, match, unmatch>
                        $unmatch = $('a:first > span', this.element()),
                        $match = $('span', $unmatch)[0] ? $('span', $unmatch) : $('<span></span>').addClass(this.option('matchClass'));

                        // reset the node
                        $unmatch.text('');
                        $match.text('');

                        // put the text back in the orig config
                        $unmatch.append(this.text);
                    }
                });
            }
        },
        finish: function() {
            var self = this, w = this.widget, c = this.option('classes'), t = this.templates, panel = w.plugins['popupPanel'];

            // set up the search queue
            var searches = new queue();

            // set up the search constructor.
            var search = function(term) {
                this.term = term;

                this.match = function(node) {
                    var searchA, searchB;

                    if (term == '')
                        return false; // by convention

                    searchA = node.label().toLowerCase();
                    searchB = term.toLowerCase();

                    return searchA.indexOf(searchB, 0) > -1;
                }
            }

            search.prototype = {
                exec: function() {
                    var esto = this, term = this.term;

                    w.traverse(function() {
                        if(esto.match(this)) {
                            this.expandUp();
                        }

                        this.collapseDown();
                        this.highlightTerm(term);
                    });
                },
                match: function(node) {}
            }

            // set up the searchbar.
            var searchbar = this.searchbar = $(t.filterTemplate).addClass(c.filterClass);

            // attach the handler.
            searchbar.bind('keyup.search', function() {
                searches.push(new search($(this).val()));
            });

            // put it in the core panel.
            panel.add('searchbar', searchbar);
        },
        showSearchBar: function() { 
            var self = this, w = this.widget, panel = w.plugins['popupPanel'];

            panel.show('searchbar');
        },
        expandSearchBar: function() {
            var self = this, w = this.widget, panel = w.plugins['popupPanel'];

        }
    });
})(jQuery);