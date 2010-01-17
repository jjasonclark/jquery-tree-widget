<%@page contentType="text/html"%>
<%@page pageEncoding="UTF-8"%>


<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Test Page</title>
        <script type="text/javascript" src="includes/jquery-1.3.2.js"></script>
        <script type="text/javascript" src="includes/ui.core.js"></script>
        <script type="text/javascript" src="includes/jquery-extensions.js"></script>
        <script type="text/javascript" src="includes/jquery-tree/jquery-tree-core.js"></script>
        <%--<script type="text/javascript" src="includes/jquery-tree/plugins/jquery-tree-checkable.js"></script>
        <script type="text/javascript" src="includes/jquery-tree/plugins/jquery-tree-contextmenu.js"></script>
        --%><script type="text/javascript" src="includes/jquery-tree/plugins/jquery-tree-filter.js"></script><%--
        <script type="text/javascript" src="includes/jquery-tree/plugins/keyboard-navigator.js"></script>
        --%><script type="text/javascript" src="includes/jquery.watermark.min.js"></script>

        <link rel="stylesheet" type="text/css" href="includes/style.css" />
    </head>
    <body>
        <script type="text/javascript">
            $(document).ready(function() {
                $('.tree').tree({
                    init : {
                        data            : 'json',
                        load : function() {
                            var time1 = (new Date()).valueOf()
                            var retArr = [];
                            for(var i=0; i<1; i++) {
                                retArr.push({
                                    label: "test1",
                                    children:
                                        [{
                                            label: "test1.1",
                                            type: 'test',
                                            data: {
                                                tags: 'bad'
                                            }
                                        },
                                        {
                                            label: "test1.2",
                                            type: 'test',
                                            data: {
                                                tags: 'bad'
                                            },
                                            children: [{
                                                    label: "test1.2.1",
                                                    type: 'test',
                                                    data: {
                                                        tags: 'bad'
                                                    }
                                                },
                                                {
                                                    label: "test1.2.2",
                                                    type: 'test',
                                                    data: {
                                                        tags: 'bad'
                                                    }
                                                }]
                                        }]
                                },
                                {
                                    label: "test1",
                                    children:
                                        [{
                                            label: "test2",
                                            type: 'test',
                                            data: {
                                                tags: 'bad'
                                            }
                                        },
                                        {
                                            label: "test2",
                                            type: 'test',
                                            data: {
                                                tags: 'bad'
                                            }
                                        }]
                                }
                            );
                            }

                            var time2 = (new Date()).valueOf() - time1;
                            console.log('Grabbed Data in: ' + time2 + ' milliseconds');
                            return retArr;
                        }
                    },
                    plugins: {
                        filter      : true,
                        menu        : {
                            items       : {
                                'refresh'   : {
                                    tooltip     : 'Refresh Tree',
                                    action      : function(tree) {
                                        console.log('refresh');
                                    }
                                },
                                'search'    : {
                                    tooltip     : 'Quick Seach',
                                    action      : function(tree) {
                                        var filter = tree.plugins['filter'];

                                        filter.showSearchBar();
                                    }
                                },
                                'about'     : {
                                    tooltip     : 'About',
                                    action      : function(tree) {
                                        console.log('about');
                                    }
                                }
                            }
                        },<%--
             checkable   : {
                 actions     : {
                     'email'     : {
                         label       : 'Email',
                         action      : function(selection) {
                             console.log(selection);
                         }
                     },
                     'delete'    : {
                         label       : 'Delete',
                         action      : function(selection) {
                             console.log(selection);
                         }
                     },
                     'update'    : {
                         label       : 'Update',
                         action      : function(selection) {
                             console.log(selection);
                         }
                     },
                     'refresh': {
                         label: 'Refresh',
                         action: function(selection) {
                             console.log(selection);
                         }
                     },
                     'backup': {
                         label: 'Backup',
                         action: function(selection) {
                             console.log(selection);
                         }
                     }
                 }
             }--%>
                         },
                         types: {
                             'default' : {
                                 // expand
                                 expandAnimation     : 'show',
                                 expandDuration      : 500,

                                 // collapse
                                 collapseAnimation   : 'hide',
                                 collapseDuration    : 500,

                                 load                : null,     // function(node) { return data };
                                 data                : null,     // html, json, xml, or custom data type
                                 preload             : false,    // lazy loading? careful, can result in race
                            
                                 menuItems           : {
                                     'backup': {
                                         label: 'Backup',
                                         action: function(node) {
                                             console.log(node);
                                         }
                                     }
                                 },
                                 callbacks           : {
                                     // before callbacks can prevent action if returned false.
                                     beforeCollapse      : function($node) { console.log('beforeCollapse'); },
                                     beforeExpand        : function($node) { console.log('beforeExpand'); },
                                     beforeLoad          : function($node) { console.log('beforeLoad'); },
                                     beforeSelect        : function($node) { console.log('beforeSelect'); },

                                     onCollapse          : function($node) { console.log('onCollapse'); },
                                     onExpand            : function($node) { console.log('onExpand'); },
                                     onLoad              : function($node) { console.log('onLoad'); },
                                     onSelect            : function($node) { console.log('onSelect'); }
                                 }
                             }
                         }
                     });
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
