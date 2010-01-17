// jQuery Right-Click Plugin
//
// Version 1.01
//
// Cory S.N. LaViska
// A Beautiful Site (http://abeautifulsite.net/)
// 20 December 2008
//
// Visit http://abeautifulsite.net/notebook/68 for more information
//
// Usage:
//
//		// Capture right click
//		$("#selector").rightClick( function(e) {
//			// Do something
//		});
//		
//		// Capture right mouse down
//		$("#selector").rightMouseDown( function(e) {
//			// Do something
//		});
//		
//		// Capture right mouseup
//		$("#selector").rightMouseUp( function(e) {
//			// Do something
//		});
//		
//		// Disable context menu on an element
//		$("#selector").noContext();
// 
// History:
//
//		1.01 - Updated (20 December 2008)
//		     - References to 'this' now work the same way as other jQuery plugins, thus
//		       the el parameter has been deprecated.  Use this or $(this) instead
//		     - The mouse event is now passed to the callback function
//		     - Changed license to GNU GPL
//
//		1.00 - Released (13 May 2008)
//
// License:
// 
// This plugin is dual-licensed under the GNU General Public License and the MIT License
// and is copyright 2008 A Beautiful Site, LLC. 
//
if(jQuery) (function(){
	
      $.extend($.fn, {
            mouseClick: function(lcHandler, rcHandler) {
                  $(this).each( function() {
                        // bind the handlers to the element.
                        $(this)[0]._lcHandler = lcHandler ? lcHandler : $(this)[0]._lcHandler;
                        $(this)[0]._rcHandler = rcHandler ? rcHandler : $(this)[0]._rcHandler;



                        // TODO:  Bind using $(this).click() but prevent from
                        // double binding.
                        $(this)[0].onclick = function(evt) {
                              if(this._lcHandler)
                                    return this._lcHandler.call(this, evt);
                        };

                        $(this).mousedown(function(evt) {
                              $(this).mouseup(function(e) {
                                    $(this).unbind('mouseup');
                                    if(evt.button == 2) {
                                          if(this._rcHandler)
                                                this._rcHandler.call(this, e);
                                          // prevent default.
                                          return false;
                                    }
                              });
                        });

                        // disable the 'default' context menu.
                        $(this)[0].oncontextmenu = function() {
                              return false;
                        }
                  });
                  
                  return $(this);
            },
            noContext: function() {
                  $(this).each( function() {
                        $(this)[0].oncontextmenu = function() {
                              return false;
                        }
                  });
                  return $(this);
            }
		
      });
	
})(jQuery);	