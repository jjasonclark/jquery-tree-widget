<%@page contentType="text/html"%>
<%@page pageEncoding="UTF-8"%>


<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Tree Test</title>
        <script type="text/javascript" src="includes/jquery-1.3.2.js"></script>
        <script type="text/javascript" src="includes/ui.core.js"></script>
        <script type="text/javascript" src="includes/jquery-tree/jquery-tree-core.js"></script>

        <link href="test.css" rel="stylesheet" type="text/css" />
        <script type="text/javascript">
            var TestSuite = function(title, setup, teardown) {
                this.title = title;
                this.setup = setup;
                this.teardown = teardown;
                this.cases = [];
                this.suites = [];
            }

            TestSuite.prototype = {
                add: function() {
                    if(arguments.length == 1) {
                        this.suites.push(arguments[0]);
                    } else if(arguments.length == 2) {
                        this.cases.push(new TestCase(arguments[0], arguments[1]));
                    }
                },
                exec: function() {
                    var root, testCase;

                    // the containing element.  will return this.
                    root = $('<ul>' + this.title + '</ul>').addClass('test-suite');

                    for(var i=0; i<this.suites.length; i++) {
                        root.append($('<li></li>').append(this.suites[i].exec()));
                    }

                    var table = $('<table></table>');
                    for(var i=0; i<this.cases.length; i++) {
                        this.setup && this.setup();
                        table.append(this.cases[i].exec(i+1));
                        this.teardown && this.teardown();
                    }
                    table.append($('<tr></tr>')); 
                    
                    // only append the results if there is something to append.
                    if(this.cases.length > 0) {
                        root.append($('<li></li>').append(table));
                    }

                    return root;
                }
            }

            // create the tester class.
            var TestCase = function(title, fn) {
                this.title = title;
                this.fn = fn;
            }

            TestCase.prototype = {
                exec: function(i) {
                    var $row = $('<tr></tr>')
                    .append($('<td>' + i + '</td>'))
                    .append($('<td>' + this.title + '</td>'));

                    try {
                        this.fn && this.fn();

                        $row.append($('<td>Pass</td>').addClass('pass')).append($('<td></td>'));
                    } catch(er) {
                        $row.append($('<td>Fail</td>').addClass('fail')).append($('<td>' + er + '</td>'));
                    }

                    return $row;
                }
            }

            var assertExists = function(val, comment) {
                comment = comment || '';
                if(val === undefined) {
                    throw 'Error: [Param was undefined or null] ' + comment;
                }
            }

            var assertTrue = function(val, comment) {
                comment = comment || '';
                if(val === false) {
                    throw 'Error: ' + comment;
                }
            }

            var assertEquals = function(a, b, comment) {
                comment = comment || '';
                if(a !== b) {
                    throw 'Error: [Expected: ' + a + ', but was ' + b + '] ' + comment;
                }
            }
        </script>
    </head>

    <body>
        <div id="tree1"></div>
        <div id="tree2">
            <ul>
                <li>
                    <a>node1</a>
                    <ul>
                        <li>
                            <a>node1.1</a>
                            <ul></ul>
                        </li>
                    </ul>
                </li>
                <li>
                    <a>node2</a>
                    <ul>
                        <li>
                            <a>node2.1</a>
                            <ul></ul>
                        </li>
                        <li>
                            <a>node2.2</a>
                            <ul></ul>
                        </li>
                        <li>
                            <a>node2.3</a>
                            <ul></ul>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
        <script type="text/javascript">
            $(document).ready(function() {
                $('div#tree2').data('tree', null).tree({
                    types: {
                        'default' :{
                            expandAnimation: 'slideDown',
                            collapseAnimation: 'slideUp',
                            duration: 500
                        }
                    }
                });

                //** SETUP **//
                var suite = new TestSuite('Core Tests');

                //** UTILITY TESTS **//
                var utils = new TestSuite('Utility Tests');

                utils.add('Array.contains', function() {
                    var arr = [1,2,3,4];

                    assertTrue(arr.contains(1));
                    assertTrue(!arr.contains(5));

                    var arr2 = ['1', '2', '3', '4'];
                    assertTrue(arr2.contains('2'));
                    assertTrue(!arr2.contains('5'));

                    var arr3 = [true, true];
                    assertTrue(arr3.contains(true));
                    assertTrue(!arr3.contains(false));

                    var obj1 = {}, obj2 = {1: 'test'}, obj3 = {2: 'blah'};
                    var arr4 = [obj1, obj2];
                    assertTrue(arr4.contains(obj2));
                    assertTrue(!arr4.contains(obj3));
                });

                utils.add('$.fn.hasChild', function() {
                    var elem1 = $('<div></div>');
                    var elem2 = $('<div></div>');
                    var elem3 = $('<div></div>');

                    elem1.append(elem2);
                    assertTrue(elem1.hasChild(elem2));


                    var root = $('<div></div>');
                    var child1 = $('<div></div>');
                    var child2 = $('<div></div>');
                    var gChild1 = $('<div></div>');
                    var gChild2 = $('<div></div>');
                    var noChild = $('<div></div>');

                    root.append(child1).append(child2);
                    child1.append(gChild1).append(gChild2);

                    assertTrue(root.hasChild(child1));
                    assertTrue(root.hasChild(gChild1));
                    assertTrue(!root.hasChild(noChild));
                });

                utils.add('$.fn.toJSON', function() {
                    throw 'Test not implemented';
                });

                suite.add(utils);

                var tree, node;
                //** PARSER TESTS **//
                var parsers = new TestSuite('Parser Tests', function() {
                    tree = $('<div></div>').data('tree', null).tree({}).data('tree');
                    node = tree.node;
                });

                parsers.add('JSON Parser', function() {
                    var test = node('test', 'test', {});
                    var fn = function() {
                        var obj1 = {
                            label: 'obj1',
                            type: 'obj1'
                        }
                        
                        var obj2 = {
                            label: 'obj2',
                            type: 'obj2',
                            children: [{
                                    label: 'obj3',
                                    type: 'obj3'
                                }]
                        }
                        return [obj1, obj2];
                    };

                    test.option('load', fn);
                    test.option('data', 'json');

                    assertEquals(fn, test.option('load'));
                    assertEquals('json', test.option('data'));

                    test.load();
                    assertEquals(2, test.children().length);

                    // ensure the entire tree is the same.
                    var obj1 = node(test.children()[0].element()[0]);
                    var obj2 = node(test.children()[1].element()[0]);

                    assertEquals('obj1', obj1.label());
                    assertEquals('obj1', obj1.type());
                    assertEquals(0, obj1.children().length);

                    assertEquals('obj2', obj2.label());
                    assertEquals('obj2', obj2.type());
                    assertEquals(1, obj2.children().length);
                });

                parsers.add('HTML Parser', function() {
                    var test = node('test', 'test', {});
                    var fn = function() {
                        var obj1 = $('<li type="obj1"><a>obj1</a><ul></ul></li>');
                        var obj2 = $('<li type="obj2"><a>obj2</a><ul></ul></li>');
                        var obj3 = $('<li type="obj3"><a>obj3</a><ul></ul></li>');
                        
                        obj2.children('ul:first').append(obj3);

                        return $('<ul></ul>').append(obj1).append(obj2); 
                    };

                    test.option('load', fn);
                    test.option('data', 'html');

                    assertEquals(fn, test.option('load'));
                    assertEquals('html', test.option('data'));

                    test.load();
                    assertEquals(2, test.children().length);

                    // ensure the entire tree is the same.
                    var obj1 = node(test.children()[0].element()[0]);
                    var obj2 = node(test.children()[1].element()[0]);

                    assertEquals('obj1', obj1.label());
                    assertEquals('obj1', obj1.type());
                    assertEquals(0, obj1.children().length);

                    assertEquals('obj2', obj2.label());
                    assertEquals('obj2', obj2.type());
                    assertEquals(1, obj2.children().length);
                });

                parsers.add('XML Parser', function() {
                    var test = node('test', 'test', {});
                    var fn = function() {
                        var obj1 = $('<node type="obj1"><label>obj1</label><children></children></node>');
                        var obj2 = $('<node type="obj2"><label>obj2</label><children></children></node>');
                        var obj3 = $('<node type="obj3"><label>obj3</label><children></children></node>');

                        obj2.children('children:first').append(obj3);

                        return $('<children></children>').append(obj1).append(obj2);
                    };

                    test.option('load', fn);
                    test.option('data', 'xml');

                    assertEquals(fn, test.option('load'));
                    assertEquals('xml', test.option('data'));

                    test.load();
                    assertEquals(2, test.children().length);

                    // ensure the entire tree is the same.
                    var obj1 = node(test.children()[0].element()[0]);
                    var obj2 = node(test.children()[1].element()[0]);

                    assertEquals('obj1', obj1.label());
                    assertEquals('obj1', obj1.type());
                    assertEquals(0, obj1.children().length);

                    assertEquals('obj2', obj2.label());
                    assertEquals('obj2', obj2.type());
                    assertEquals(1, obj2.children().length);
                });

                suite.add(parsers);

                //** NODE CONTROLLER TESTS **//
                var tree, node, $elem;
                var nodes = new TestSuite('Node Controller Tests', function() { // setup function
                    // the tree instance
                    tree = $('div#tree1').data('tree', null).tree({}).data('tree'),
                    // the node class object
                    node = tree.node;

                    $elem = $('<li><a>elem</a><ul></ul></li>');
                });

                nodes.add('Instantiation', function() {
                    // test create new element
                    var test = node('test', 'test', {attr: 'test'});
                    assertExists(test.element().data('node'), 'Failed to attach node data');
                    assertEquals(test.element().data('node'), test);

                    var test2 = node($elem);
                    assertExists(test2.element().data('node'));
                    assertEquals(test2.element().data('node'), test2);

                    var test3 = node($elem);
                    assertEquals(test2, test3);
                });

                nodes.add('meta', function() {
                    // get shallow data
                    var test = node('test', 'test', {attr: 'test'});
                    assertEquals('test', test.meta('attr'));

                    // set shallow data
                    test.meta('attr', 'test2');
                    assertEquals('test2', test.meta('attr'));

                    // get deep data
                    test = node('test', 'test', { one: { two: 'two'}})
                    assertEquals(undefined, test.meta('one.three'));
                    assertEquals('two', test.meta('one.two'));

                    // set deep data
                    test.meta('one.three', 'three');
                    assertEquals('three', test.meta('one.three'));
                });

                nodes.add('option', function() {
                    var opts = {types : {'default' : { shallow: 'shallow',  deep: { opt: 'deep'}}}}
                    var tree = $('div#tree1').data('tree', null).tree(opts).data('tree');
                    var node = tree.node;
                    var test = node('test', 'default', {});

                    // simple get.
                    assertEquals('shallow', test.option('shallow'));

                    // simple set.
                    test.option('shallow', 'shallow2');
                    assertEquals('shallow2', test.option('shallow'));

                    // deep get.
                    assertEquals('deep', test.option('deep.opt'));

                    // deep set
                    test.option('deep.opt', 'deep2');
                    assertEquals('deep2', test.option('deep.opt'));
                });

                nodes.add('label', function() {
                    var test = node('test', 'test', {});

                    // get label
                    assertEquals('test', $('a', test.element()).text());
                    assertEquals($('a', test.element()).text(), test.label());

                    // set label
                    test.label('test2');
                    assertEquals('test2', $('a', test.element()).text());
                    assertEquals('test2', test.label());
                });
                
                nodes.add('type', function() {
                    var test = node('test', 'test', {});

                    // get type
                    assertEquals('test', test.type());

                    // set type
                    test.type('test2');
                    assertEquals('test2', test.type());
                });

                nodes.add('ui', function() {
                    var test = node('test', 'test', {});

                    // has class
                    test.element().addClass('test');
                    assertTrue(test.ui('test'), 'node should have class test');
                    assertTrue(!test.ui('test2'), "node shouldn't have class test");

                    // add class
                    var test2 = node('test', 'test', {});
                    test.ui('test3', true);
                    assertTrue(test.ui('test3'));

                    // remove class
                    test.ui('test3', false);
                    assertTrue(!test.ui('test3'));

                    // remove all classes.
                    var test3 = node('test', 'test', {});

                    test3.ui('test', true).ui('test2', true).ui(false);
                    assertTrue(!test3.ui('test'), "node shouldn't have: test");
                    assertTrue(!test3.ui('test2'), "node shouldn't have: test2");
                });

                nodes.add('anchor', function() {
                    var test = node('test', 'test', {});
                    var $a = test.element().children('a:first');

                    assertEquals($a[0], test.anchor()[0]);
                });


                nodes.add('container', function() {
                    var test = node('test', 'test', {});
                    var $ul = test.element().children('ul:first');

                    assertEquals($ul[0], test.container()[0]);
                });

                nodes.add('append', function() {
                    var $root = node('root', 'default', {});
                    var $node = node('node', 'default', {});

                    $root.append($node);

                    // make sure it got attached correctly.
                    var $children = $root.element().children('ul:first').children('li');

                    assertEquals($node.element()[0], $children[0]);

                    // append multiple nodes  nodes.
                    var $root = node('root', 'root', {});
                    var $node1 = node('test', 'test', {});
                    var $node2 = node('test', 'test', {});


                    $root.append($node1);
                    $root.append($node2);

                    assertEquals(2, $root.children().length);
                    assertEquals($node1.element()[0], $root.children()[0].element()[0]);
                    assertEquals($node2.element()[0], $root.children()[1].element()[0]);

                });

                nodes.add('children', function() {
                    var root = node('root', 'default', {});
                    var child1 = node('child1', 'default', {});
                    var child2 = node('child2', 'default', {});

                    // no children.
                    assertEquals(0, root.children().length);

                    root.append(child1).append(child2);

                    // children
                    assertEquals(2, root.children().length);
                    assertEquals(child1.element()[0], root.children()[0].element()[0]);
                    assertEquals(child2.element()[0], root.children()[1].element()[0]);
                });

                nodes.add('parent', function() {
                    var child = node('child', 'default', {});
                    var parent = node('parent', 'default', {});

                    child.isRoot(true); // prevents invalid upward traversal
                    assertEquals(0, child.parent().element().size());

                    parent.append(child)
                    assertTrue(!child.isRoot());
                    assertEquals(1, child.parent().element().size());
                    assertEquals(parent.element()[0], child.parent().element()[0]);
                });

                nodes.add('getSiblings', function() {
                    throw 'Test not implemented';
                });<%--

             nodes.add('canAccept', function() {
                 var parent = node.createNode('parent', 'parent', {});
                 var child = node.createNode('child', 'child', {});

                    // children is set to null.  can accept.
                    assertTrue(parent.canAccept(child), 'node has children set to null, any child should be accepted');

                    // set the children to this child type.
                    parent.option('children', ['child']);
                    assertTrue(parent.canAccept(child), 'node should accept children of "child" type');

                    // set the children to not this child type.
                    parent.option('children', []);
                    assertTrue(!parent.canAccept(child), 'node should not accept children of "child" type');
                });

            --%> nodes.add('expand', function() {
                    var test = node('test', 'test', {});
                    var child = node('child', 'child', {});

                    // no subtree -> no expand
                    test.expand();
                    assertEquals('none', test.container().css('display'));
                    assertTrue(!test.isExpanded());

                    // subtree -> expand
                    test.append(child).expand();
                    assertEquals('block', test.container().css('display'));
                    assertTrue(test.isExpanded());
                });

                nodes.add('collapse', function() {
                    var test = node('test', 'test', {});
                    var child = node('child', 'child', {});

                    // no subtree -> no collapse
                    test.collapse();
                    assertEquals('none', test.container().css('display'));
                    assertTrue(!test.isExpanded());

                    // subtree -> expand
                    test.append(child).expand().collapse();
                    assertEquals('none', test.container().css('display'));
                    assertTrue(!test.isExpanded());
                });

                nodes.add('refresh', function() {
                    var parent = node('parent', 'parent', {});
                    var child = node('child', 'child', {});
                    var c = $.ui.tree.prototype.defaults.classes;
                    var err = {
                        nodeClass: 'node class',
                        leafClass: 'leaf class',
                        collapseClass: 'collapse class',
                        expandClass: 'expand class',
                        type: 'node type'
                    }

                    // simple refresh.
                    parent.refresh();
                    assertTrue(parent.ui(c.nodeClass), err.nodeClass);
                    assertTrue(parent.ui(c.leafClass), err.leafClass);
                    assertTrue(!parent.ui(c.collapseClass), err.collapseClass);
                    assertTrue(!parent.ui(c.expandClass), err.expandClass);
                    assertTrue(parent.ui('parent'), err.type);

                    // add the child and then refresh.
                    parent.append(child).refresh();
                    assertTrue(parent.ui(c.nodeClass), err.nodeClass);
                    assertTrue(!parent.ui(c.leafClass), err.leafClass);
                    assertTrue(parent.ui(c.collapseClass), err.collapseClass);
                    assertTrue(!parent.ui(c.expandClass), err.expandClass);
                    assertTrue(parent.ui('parent'), err.type);
                });

                nodes.add('load', function() {
                    var test = node('test', 'test', {});
                    var fn = function() {
                        var obj1 = $('<li type="obj1"><a>obj1</a><ul></ul></li>');
                        var obj2 = $('<li type="obj2"><a>obj2</a><ul></ul></li>');
                        var obj3 = $('<li type="obj3"><a>obj3</a><ul></ul></li>');

                        obj2.children('ul:first').append(obj3);

                        return $('<ul></ul>').append(obj1).append(obj2);
                    };

                    test.option('load', fn);
                    test.option('data', 'html');

                    assertEquals(fn, test.option('load'));
                    assertEquals('html', test.option('data'));

                    test.load();
                    assertTrue(test.isLoaded());
                    assertEquals(2, test.children().length);

                    // ensure the entire tree is the same.
                    var obj1 = node(test.children()[0].element()[0]);
                    var obj2 = node(test.children()[1].element()[0]);

                    assertEquals('obj1', obj1.label());
                    assertEquals('obj1', obj1.type());
                    assertEquals(0, obj1.children().length);

                    assertEquals('obj2', obj2.label());
                    assertEquals('obj2', obj2.type());
                    assertEquals(1, obj2.children().length);
                });

                nodes.add('select', function() {
                    var test = node('test', 'test', {});
                    var on = false;

                    test.option('callbacks.beforeSelect', function() {
                        return false;
                    });

                    test.option('callbacks.onSelect', function() {
                        on = true;
                    });

                    assertTrue(!on);
                    test.select();
                    assertTrue(!on);

                    test.option('callbacks.beforeSelect', function() {
                        return true;
                    });

                    test.select();
                    assertTrue(on);
                });

                nodes.add('highlight', function() {
                    var tree = $('div#tree1').data('tree', null).tree({ classes: { selectClass: 'test' } }).data('tree');
                    var node = tree.node
                    var test = node('test', 'test', {});

                    tree.root.append(test.element()); 

                    tree.option('classes.selectClass', 'test');
                    assertEquals('test', tree.option('classes.selectClass'));
                    
                    test.highlight();
                    test.refresh(); 

                    assertEquals(test, tree.highlighted);
                    assertEquals(true, test.ui('test'));
                });
                        
                suite.add(nodes);

                // ENTIRE TREE TESTS
               

                var opts;
                var trees = new TestSuite('Tree Tests', function() {
                    $elem = $('<div></div>');

                    tree = $($elem).tree();

                    node = tree.node;
                });

                trees.add('Instantiation', function() {
                    assertExists($elem.data('tree')); 
                });
                
                trees.add('option', function() {

                });

                suite.add(trees);


                $('div#test').append(suite.exec());
            });




        </script>
        <div id="test"></div>
    </body>
</html>
