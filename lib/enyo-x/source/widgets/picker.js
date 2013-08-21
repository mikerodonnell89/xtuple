/*jshint indent:2, curly:true, eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, trailing:true, white:true */
/*global XT:true, XM:true, enyo:true, _:true */

(function () {

  /** @private */
  var _selectValue = function (widget, value) {
    var coll = widget._collection,
      key = widget.idAttribute || (coll && coll.model ? coll.model.prototype.idAttribute : false),
      components = widget.$.picker.getComponents(),
      component;
    value = value && key ? value.get(key) : value;
    component = _.find(components, function (c) {
      if (c.kind === "XV.PickerMenuItem") {
        return (c.value ? c.value.get(key) : null) === value;
      }
    });
    if (!component) { value = null; }
    widget.$.picker.setSelected(component);
    return value;
  };

  /**
    @name XV.Picker
    @class A picker control that implements a dropdown list of items which can be selected.<br />
    Unlike the {@link XV.RelationWidget}, the collection is stored local to the widget.<br />
    The superkind of {@link XV.CharacteristicPicker}.<br />
    Derived from <a href="http://enyojs.com/api/#enyo.Control">enyo.Control</a>.
    @extends enyo.Control
   */
  enyo.kind(/** @lends XV.PickerWidget# */{
    name: "XV.Picker",
    kind: "enyo.Control",
    classes: "xv-pickerwidget",
    events: /** @lends XV.PickerWidget# */{
      /**
        @property {Object} inEvent The payload that's attached to bubbled-up events
        @property {XV.PickerWidget} inEvent.originator This
        @property inEvent.value The value passed up is the key of the object and not the object itself
       */
      onValueChange: ""
    },
    published: {
      attr: null,
      value: null,
      collection: null,
      disabled: false,
      nameAttribute: "name",
      orderBy: null,
      noneText: "_none".loc(),
      noneClasses: "",
      showNone: true
    },
    handlers: {
      onSelect: "itemSelected"
    },
    components: [
      {kind: "onyx.PickerDecorator",
        components: [
        {kind: "XV.PickerButton", name: "pickerButton", content: "_none".loc(), onkeyup: "keyUp"},
        {name: "picker", kind: "onyx.Picker"}
      ]}
    ],
    /**
     @todo Document the buildList method.
     */
    buildList: function (options) {
      var nameAttribute = this.getNameAttribute(),
        models = this.filteredList(options),
        none = this.getNoneText(),
        classes = this.getNoneClasses(),
        component,
        name,
        model,
        i;
      this.$.picker.destroyClientControls();
      if (this.showNone) {
        this.$.picker.createComponent({
          kind: "XV.PickerMenuItem",
          value: null,
          content: none,
          classes: classes
        });
      }
      for (i = 0; i < models.length; i++) {
        model = models[i];
        name = model.get(nameAttribute);
        component = {
          kind: "XV.PickerMenuItem",
          value: model,
          content: name,
          iconClass: this.iconClass,
          iconVisible: this.iconVisible
        };
        this.$.picker.createComponent(component);
      }
      this.$.picker.render();
    },
    /**
     @todo Document the clear method.
     */
    clear: function (options) {
      this.setValue(null, options);
    },
    /**
     Collection can either be a pointer to a real collection, or a string
     that will be resolved to a real collection.
     */
    collectionChanged: function () {
      var collection = _.isObject(this.collection) ? this.collection :
          XT.getObjectByName(this.collection),
        that = this,
        didStartup = false,
        callback;

      // Remove any old bindings
      if (this._collection) {
        this._collection.off("add remove", this.buildList, this);
      }

     // If we don't have data yet, try again after start up tasks complete
      if (!collection) {
        if (didStartup) {
          XT.log('Could not find collection ' + this.getCollection());
          return;
        }
        callback = function () {
          didStartup = true;
          that.collectionChanged();
        };
        XT.getStartupManager().registerCallback(callback);
        return;
      }

      this._collection = collection;
      this._collection.on("add remove", this.buildList, this);
      this.orderByChanged();
      if (this._collection.comparator) { this._collection.sort(); }
      this.buildList();
    },
    /**
     @todo Document the create method.
     */
    create: function () {
      this.inherited(arguments);
      this.noneTextChanged();
      if (this.getCollection()) {
        this.collectionChanged();
      }
    },
    destroy: function () {
      if (this._collection && this._collection.off) {
        this._collection.off("add remove", this.buildList, this);
      }
      this.inherited(arguments);
    },
    /**
     @todo Document the disabledChanged method.
     */
    disabledChanged: function (inSender, inEvent) {
      this.$.pickerButton.setDisabled(this.getDisabled());
    },
    /**
     @todo Document the getValueToString method.
     */
    getValueToString: function () {
      return this.$.pickerButton.getContent();
    },
    /**
     @todo Document the itemSelected method.
     */
    itemSelected: function (inSender, inEvent) {
      var value = this.$.picker.getSelected().value;
      this.setValue(value);
      return true;
    },
    /**
      Implement your own filter function here. By default
      simply returns the array of models passed.

      @param {Array}
      @returns {Array}
    */
    filter: function (models, options) {
      return models || [];
    },
    /**
      Returns array of models for current collection instance with `filter`
      applied.
    */
    filteredList: function (options) {
      return this._collection ? this.filter(this._collection.models, options) : [];
    },
    keyUp: function (inSender, inEvent) {
      var keyCode = inEvent.keyCode,
        currentSelection = this.$.picker.getSelected(),
        controlsContents = _.map(this.$.picker.controls, function (control) {
          return control.content;
        }),
        currentIndex = _.indexOf(controlsContents, currentSelection && currentSelection.content),
        newSelection,
        newIndex;

      if (keyCode === 40) {
        // down key: go down one
        newIndex = Math.min(currentIndex + 1, this.$.picker.controls.length - 1);
        this.$.picker.setSelected(this.$.picker.controls[newIndex]);
        this.itemSelected(); // TODO: only select item on blur
      } else if (keyCode === 38) {
        // up key: go up one
        // looks like the minimum picker option we want to allow is at index 1 ("none"), and not
        // the undefined-value backed index 0
        newIndex = Math.max(currentIndex - 1, 1);
        this.$.picker.setSelected(this.$.picker.controls[newIndex]);
        this.itemSelected();
      } else if (keyCode >= 65 && keyCode <= 90) {
        // alpha keycode: find the first option that starts with that letter
        newSelection = _.find(this.$.picker.$, function (control) {
          return control.content.charCodeAt(0) === keyCode;
        });
        if (newSelection) {
          this.$.picker.setSelected(newSelection);
          this.itemSelected();
        }
      }

    },
    /**
     @todo Document the noneTextChanged method.
     */
    noneTextChanged: function () {
      var noneText = this.getNoneText(),
      button = this.$.pickerButton;
      if (!this.value) {
        button.setContent(noneText);
      }
      this.buildList();
    },
    /**
     @todo Document the noneClassesChanged method.
     */
    noneClassesChanged: function () {
      this.buildList();
    },
    /**
     @todo Document the orderByChanged method.
     */
    orderByChanged: function () {
      var orderBy = this.getOrderBy();
      if (this._collection && orderBy) {
        this._collection.comparator = function (a, b) {
          var aval,
            bval,
            attr,
            i;
          for (i = 0; i < orderBy.length; i++) {
            attr = orderBy[i].attribute;
            aval = orderBy[i].descending ? b.getValue(attr) : a.getValue(attr);
            bval = orderBy[i].descending ? a.getValue(attr) : b.getValue(attr);
            // Bad hack for null 'order' values
            if (attr === "order" && !_.isNumber(aval)) { aval = 9999; }
            if (attr === "order" && !_.isNumber(bval)) { bval = 9999; }
            aval = !isNaN(aval) ? aval - 0 : aval;
            bval = !isNaN(aval) ? bval - 0 : bval;
            if (aval !== bval) {
              return aval > bval ? 1 : -1;
            }
          }

          return 0;
        };
      }
    },
    /**
     @todo Document the select method.
     */
    select: function (index) {
      var i = 0,
        component = _.find(this.$.picker.getComponents(), function (c) {
          if (c.kind === "onyx.MenuItem") { i++; }
          return i > index;
        });
      if (component) {
        this.setValue(component.value);
      }
    },
    /**
      Programatically sets the value of this widget.

      @param value Can be a model or the id of a model (String or Number).
        If it is an ID, then the correct model will be fetched and this
        function will be called again recursively with the model.
      @param {Object} options
     */
    setValue: function (value, options) {
      options = options || {};
      var key = this.idAttribute || (this._collection && this._collection.model ?
        this._collection.model.prototype.idAttribute : false),
        oldValue = this.getValue(),
        actualMenuItem,
        actualModel,
        inEvent;

      // here is where we find the model and re-call this method if we're given
      // an id instead of a whole model.
      // note that we assume that all of the possible models are already
      // populated in the menu items of the picker
      // note: value may be a '0' value
      if (key && (value || value === 0) && typeof value !== 'object') {
        actualMenuItem = _.find(this.$.picker.controls, function (menuItem) {
          var ret = false;
          if (menuItem.value && menuItem.value.get) {
            ret = menuItem.value.get(key) === value;
          } else if (menuItem.value) {
            ret = menuItem.value[key] === value;
          }
          return ret;
        });
        if (actualMenuItem) {
          // a menu item matches the selection. Use the model back backs the menu item
          actualModel = actualMenuItem.value;
          this.setValue(actualModel, options);
        }
        // (else "none" is selected and there's no need to do anything)
        return;
      }

      if (value !== oldValue) {
        if (!_selectValue(this, value) && _selectValue(this, value) !== 0) { value = null; }
        if (value !== oldValue) {
          this.value = value;
          if (!options.silent) {
            inEvent = { originator: this, value: value && value.get ? value.get(key) : value };
            this.doValueChange(inEvent);
          }
        }
      }
    }
  });

  /**
    @name XV.PickerWidget
    @class A picker control that implements a dropdown list of items which can be selected.<br />
    Unlike the {@link XV.RelationWidget}, the collection is stored local to the widget.<br />
    The superkind of {@link XV.CharacteristicPicker}.<br />
    Derived from <a href="http://enyojs.com/api/#enyo.Control">enyo.Control</a>.
    @extends enyo.Control
   */
  enyo.kind(/** @lends XV.PickerWidget# */{
    name: "XV.PickerWidget",
    kind: "XV.Picker",
    published: {
      label: "",
      showLabel: true
    },
    components: [
      {kind: "FittableColumns", components: [
        {name: "label", content: "", classes: "xv-picker-label"},
        {kind: "onyx.InputDecorator", name: "inputWrapper", classes: "xv-input-decorator",
          components: [
          {kind: "onyx.PickerDecorator",
            components: [
            {kind: "XV.PickerButton", name: "pickerButton", content: "_none".loc(), onkeyup: "keyUp"},
            {name: "picker", kind: "onyx.Picker"}
          ]}
        ]}
      ]}
    ],
    /**
     @todo Document the create method.
     */
    create: function () {
      this.inherited(arguments);
      this.labelChanged();
      this.showLabelChanged();
    },
    /**
     @todo Document the labelChanged method.
     */
    labelChanged: function () {
      var label = this.getLabel() ||
        (this.attr ? ("_" + this.attr).loc() : "");
      this.$.label.setShowing(label);
      this.$.label.setContent(label + ":");
    },
    /**
     @todo Document the showLabelChanged method.
     */
    showLabelChanged: function () {
      if (this.getShowLabel()) {
        this.$.label.show();
      } else {
        this.$.label.hide();
      }
    }
  });

  /**
    This is a subclass of the onyx.PickerButton that is used in the PickerDecorator.
    The default behavior is that inside of the decorator, the first empty kind is
    set to be a PickerButton. When the change event is fired, the content of this
    button is changed to the content of the selection.
  */
  enyo.kind(
    /** @lends XV.PickerButton */{
    name: "XV.PickerButton",
    kind: "onyx.PickerButton",
    classes: "xv-picker-button",
    components: [
      {name: "text", content: "", classes: "picker-content"},
      {tag: "i", classes: "icon-caret-down picker-icon"} // font-awesome icon
    ],
    create: function () {
      this.inherited(arguments);
      this.contentChanged();
    },
    /**
      When the content is changed on the parent PickerButton,
      this sets the content of the text component inside the button.
    */
    contentChanged: function () {
      this.$.text.setContent(this.getContent());
    }
  });

  /**
    This is a subclass of the onyx.MenuItem that is used in the Picker's menu.
    Like the XV.PickerButton, it allows for content and an icon. In this case, the
    icon is optional and may be made invisible if included.
  */
  enyo.kind(
    /** @lends XV.PickerButton */{
    name: "XV.PickerMenuItem",
    kind: "onyx.MenuItem",
    classes: "xv-picker-button",
    value: null,
    published: {
      iconClass: "",
      iconVisible: null
    },
    components: [
      {name: "text", content: ""},
      {name: "icon", tag: "i", classes: "icon-dark picker-icon"} // font-awesome icon
    ],
    create: function () {
      this.inherited(arguments);
      this.contentChanged();
      this.iconClassChanged();

      var showing = this.iconVisible;
      if (_.isFunction(this.iconVisible)) {
        showing = this.iconVisible(this.value);
      }
      this.$.icon.setShowing(showing);
    },
    /**
      When the content is changed on the parent MenuItem,
      this sets the content of the text component inside the button.
    */
    contentChanged: function () {
      this.$.text.setContent(this.getContent());
    },
    iconClassChanged: function () {
      this.$.icon.addClass(this.getIconClass());
    }
  });

}());
