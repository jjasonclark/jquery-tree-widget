if(jQuery) (function($) { // keeps the global namespace clean
    $.ui.tree.plugin('checkable', {
        version: '0.1',
        templates: {
            selectorTemplate: '<input type="checkbox" />'
        }
    });


    $.extend($.ui.tree.plugins.checkable.prototype, {
        _setHandles: function() {
            var self = this, o = this.options;

            // bind the select listener
            this.widget.root.bind('click.ui.tree', function(e) {
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
        _nodify: function($node) {
            var self = this, o = this.options, t = this.templates,

            // create the selector.
            $selector = $node.children('input[type=checkbox]')[0] ? $node.children('input[type=checkbox]') : $(t.selectorTemplate);

            // put the selector in the node.
            $node.prepend($selector);
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
    });
})(jQuery);



