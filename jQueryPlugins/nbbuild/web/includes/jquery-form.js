(function() {
    /**
     * Binds jQuery to the jForm class.
     */
    jQuery.prototype.form = function(opts) {
        // parse the options.
        var customSubmit = null;
        var customHandlers = null; // to be called on change.
        var customValidators = null; // to be called on validate.

        if(opts) {
            customSubmit = opts['submit'] || null;
            customHandlers = opts['handlers'] || [];
            customValidators = opts['validators'] || [];
        }

        return this.each(function() {
            var form = this.jForm ? this.jForm : new jForm(this); 
            
            if(!form)
                return;

            // bind the custom handlers.
            form.setCustomSubmit(customSubmit);

            var length = customHandlers.length;
            for(var i=0; i<length; i++)
                form.addCustomHandler(customHandlers[i]);

            length = customValidators.length;
            for(var j=0; j<length; j++)
                form.addCustomValidator(customValidators[j]);        
        });
    }

    /**
     * This is a wrapper class that binds a form element to a few basic common
     * functions. First the form is provided a default submitter which gathers
     * the data from the form and provides the custom submitter the data. An
     * example form will look like this:
     *
     * <pre>
     * <code>
     * $(formelem).form( {
     * 	submit : function(data) {
     * 		$.ajax( {
     * 			type : 'GET',
     * 			url : 'test.html',
     * 			data : data
     * 		});
     * 	}
     * });
     * </code>
     * </pre>
     *
     */
    var jForm = function(elem) {
        var that = this; // needed for closure.

        /**
         * The custom submit handler. Note: The data from the form will be
         * serialized and passed to the handler to facilitate in sending the
         * data.
         */
        var _submit = null;

        /**
         * The update handlers for inter-input communication.
         */
        var _handlers = null;

        /**
         * The custom handlers for inter-input validatrion. Called by the
         * validate function to determine if the form can be submitted.
         */
        var _validators = null;


        /**
         * Binds the events to their handlers and sets the triggers.
         */
        this.init = function() {
            if (elem.nodeName !== 'FORM')
                return null; // this is not a form element. stop.

            // bind the event handlers.
            $(elem).submit(function(e) {
                return that.submit(); // see?? we needed 'that' for closure.

                e.preventDefault();
            });

            $(elem).keyup(function(e) {
                that.updateHandler(); // again...haha!

                e.preventDefault(); 
            });

            //            $(elem).change(function() {
            //                that.updateHandler();
            //            });

            return this;
        }

        /**
         * Validates the form w.r.t the custom validators.
         */
        this._validate = function() {
            if(!_validators)
                return;

            var length = _validators.length;
            for(var i=0; i<length; i++)
                _validators[i].call(this);
        }

        /**
         * The handler called when change events are triggered in the form elem.
         */
        this.updateHandler = function() {
            console.log("Form update handler: " + elem);
            var length = null;

            if(!_handlers) {
                return;
            }

            length = _handlers.length;
            for(var i=0; i<length; i++) {
                _handlers[i].call(this);
            }
        }

        /**
         * The default submit handler for the form.
         */
        this.submit = function() {
            console.log("Submitted form: " + elem);
            var data;
            
            if (!this.validate())
                return false;

            // grab all the data from the form.
            data = this.getData();

            // now call the handler defined by the opts.

            if (_submit)
                return _submit(data);

            // do the default submit
            return false;
        }

        /**
         * Iterates through the form's input elements and determines the validity
         * of the data.
         */
        this.validate = function() {
            console.log("Validating form: " + elem);
            var length = elem.length;

            // call the custom validator.
            if(!this._validate())
                return false;

            // validate each of the inputs.
            for ( var i = 0; i < length; i++) {
                // check to make sure the fn exists for the input.
                if (elem[i].jInput === undefined)
                    continue;

                // validate the input
                if (!elem[i].jInput.update())
                    return false;
            }

            return true; // if we get here, validated.
        }

        /**
         * Grabs all the data in the form along with the name attributes for each
         * input and returns an array containing the key value pairs of the data. If
         * an input is without a name attribute, the index is used as the key for
         * the pair.
         */
        this.getData = function() {
            var retArr = new Object();

            // iterate through the inputs, grabbing the names
            // and values along the way.
            var length = elem.length; // num of children.

            for ( var i = 0; i < length; i++) {
                // make sure this is a valid input field
                if ($(elem[i]).attr("type").toLowerCase() == 'submit')
                    continue;

                var key = $(elem[i]).attr('name') == "" ? i.toString(10) : $(elem[i]).attr('name');
                var value = $(elem[i]).val();

                retArr[key] = value;
            }

            console.log("Form data: " + retArr.toSource());

            return retArr;
        }

        /**
         * Sets the custom submit handler for this form.
         */
        this.setCustomSubmit = function(fn) {
            _submit = fn;
        }

        /**
         * Adds a handler to be executed when the update handler is called.
         */
        this.addCustomHandler = function(fn) {
            if(!_handlers)
                _handlers = [];

            _handlers.push(fn);
        }

        /**
         * Adds a custom validator.
         */
        this.addCustomValidator = function(fn) {
            if(!_validators)
                _validators = [];

            _validators.push(fn);
        }

        return this.init();
    }

    /**
     * Binds the jQuery engine to the jInput class.
     */
    jQuery.prototype.input = function(opts) {
        // parse the opts.
        var message = null;
        var display = null;
        var validate = null;

        if(opts) {
            message = opts['message'] || null;
            display = opts['display'] || null;
            validate = opts['validate'] || null;
        }

        return this.each(function() {
            var input = this.jInput ? this.jInput : new jInput(this);

            // set the options
            input.setMessage(message);
            input.setDisplay(display);
            input.setValidator(validate);
        });
    }




    /**
     * This is a wrapper class that binds input elements to validators, error
     * messages, and error display elements.
     *
     * <pre>
     *<code>
     * (inputelem).input({
     *      validator: function(data) {
     *          return true;
     *     },
     *     display: $(displayelem),
     *     message: &quot;Invalid input&quot;;
     * })
     * </code>
     * </pre>
     */
    var jInput = function(elem) {
        var that = this; // for closure
        /**
         * The standard error message to be displayed if _validate(data) returns
         * false.
         */
        var _message = null;

        /**
         * The display where the message will be displayed.
         */
        var _display = null;

        /**
         * The custom validate function.
         */
        var _validate = null;


        /**
         * The initalization function. Binds the elem and initializes the member
         * variables.
         */
        this.init = function() {
            // verify this element type.
            if (elem.nodeName != 'INPUT')
                return null; // do not cont, not an input.

         
            // bind and trigger events.
            $(elem).keyup(function() {
                that.update();
            });
            
            $(elem).change(function() {
                that.update();
            });

            return this;
        }

        /**
         * The update handler to be bound to the 'onkeyup' evt. Should be called in
         * the context of the jInput obj.
         */
        this.update = function() {
            console.log("update handler: " + elem);
            // check to see if we need to do anything.
            if (!_display || !_message || !_validate)
                return;

            $(_display).text(_message);
            this.validate() ? $(_display).hide() : $(_display).show();
        }

        /**
         * Validates the inputs data against the user supplied validate function.
         */
        this.validate = function() {
            // grab the data.
            var data = $(elem).val();

            // validate the data against user supplied fn.
            if (!_validate)
                return true; // no validate function, is valid.

            var isValid = _validate(data);
            console.log('Calling custom validate: [' + data + "] returned: "
                + isValid);
            return isValid; 
        }

        /**
         * Sets the message value.
         */
        this.setMessage = function(msg) {
            _message = msg;
        }

        /**
         * Sets the display object.
         */
        this.setDisplay = function(display) {
            _display = display;
        }

        /**
         * Sets the validate method. 
         */
        this.setValidator = function(validate) {
            _validate = validate;
        }
        
        return this.init();
    }
})();