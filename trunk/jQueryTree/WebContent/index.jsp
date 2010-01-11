<%@page contentType="text/html"%>
<%@page pageEncoding="UTF-8"%>


<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Complete Tree Page</title>
        <script type="text/javascript" src="includes/js/jquery-1.3.2.js"></script>
        <script type="text/javascript" src="includes/js/ui.core.js"></script>
        <script type="text/javascript" src="includes/js/jquery-tree/jquery-tree-core.js"></script>
        <script type="text/javascript" src="includes/js/jquery-tree/plugins/jquery-tree-checkable.js"></script>
        <script type="text/javascript" src="includes/js/jquery-tree/plugins/jquery-tree-contextmenu.js"></script>
        <script type="text/javascript" src="includes/js/jquery-tree/plugins/jquery-tree-filter.js"></script>
        
        <!-- For watermark support. (needed by fiter) -->
        <script type="text/javascript" src="includes/js/jquery.watermark.min.js"></script>

        <link rel="stylesheet" type="text/css" href="includes/style.css" />
    </head>
    <body>
        <script type="text/javascript">
            $(document).ready(function() {
                $('.tree').tree({
                    plugins : {
                        'contextmenu' : {
                            // globally defined menu items, called for each node.
                            menuItems: function($node) {
                                return {
                                    'blah3' : {
                                        label: 'blah3',
                                        action: ''
                                    }
                                }
                            }
                        },
                        'filter' : {
                            subtreeBrowsing: true,
                            criteria: [
                                {
                                    html: 'Bad: <input type="checkbox" id="checkbox" />',
                                    compare: function($node, $context) {
                                        var data, tags, $in;

                                        $in = $('input[type=checkbox]', $context);
                                        data = $node.data('data') || {};
                                        tags = data.tags || '';

                                        if($in[0] && $in[0].checked) {
                                            return tags == 'bad';
                                        }

                                        return true;
                                    }
                                }
                            ]
                        },
                        'checkable' : {
                            icon: false,
                            actions: {
                                'email': {
                                    label: 'Email',
                                    action: function(selection) {
                                        console.log(selection);
                                    }
                                },
                                'delete': {
                                    label: 'Delete',
                                    action: function(selection) {
                                        console.log(selection);
                                    }
                                },
                                'update': {
                                    label: 'Update',
                                    action: function(selection) {
                                        console.log(selection);
                                    }
                                },
                                'refresh': {
                                    label: 'Refresh',
                                    action: function(selection) {
                                        console.log(selection);
                                    }
                                },
                                'Backup': {
                                    label: 'Backup',
                                    action: function(selection) {
                                        console.log(selection);
                                    }
                                }
                            }
                        }
                    },
                    init : {
                        load : function() {
                            var retArr = [];
                            for(var i=0; i<5; i++) {
                                retArr.push({
                                    label: "test1",
                                    children:
                                        [{
                                            label: "test2",
                                            type: 'test',
                                            data: {
                                                tags: 'bad'
                                            }
                                        }]
                                });
                            }
                            return retArr;
                        },
                        data            : 'json'
                    },
                    types: {
                        'default' : {
                            expandable      : {
                                // expand
                                expandAnimation     : 'show',
                                expandDuration      : 400,

                                // collapse
                                collapseAnimation   : 'hide',
                                collapseDuration    : 400,

                                load                : null,     // function that returns data from the data store.
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
                            },
                            icon            : {
                                src: 'images/icons/user_16.gif'
                            },
                            contextmenu     : {
                                menuItems               : {
                                    'edit'                  : {
                                        label                   : 'Edit',
                                        icon                    : 'images/icons/phone_16.gif',
                                        action                  : function($node) {
                                            console.log($node);
                                        }
                                    },
                                    'rename'                : {
                                        label                   : 'Rename',
                                        action                  : function($node) {
                                            this.rename($node);
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
        </script>

        <div class="tree">
            <ul>
                <li type="test">
                    <a>item1</a>
                    <ul>
                        <li>
                            <a>item1.1</a>
                            <ul></ul>
                        </li>
                    </ul>
                </li>
                <li>
                    <a>item2</a>
                    <ul></ul>
                </li>
            </ul>
        </div>

        <div id="msg">

        </div>
    </body>
</html>
