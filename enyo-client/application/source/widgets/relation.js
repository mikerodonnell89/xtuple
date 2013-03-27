/*jshint node:true, indent:2, curly:true eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, trailing:true, white:true */
/*global XT:true, XV:true, XM:true, Backbone:true, window:true, enyo:true, _:true */

(function () {

  // ..........................................................
  // ACCOUNT
  //

  enyo.kind({
    name: "XV.AccountWidget",
    kind: "XV.RelationWidget",
    collection: "XM.AccountRelationCollection",
    list: "XV.AccountList"
  });

  // ..........................................................
  // CONTACT
  //

  enyo.kind({
    name: "XV.ContactWidget",
    kind: "XV.RelationWidget",
    label: "_contact".loc(),
    collection: "XM.ContactRelationCollection",
    list: "XV.ContactList",
    keyAttribute: "name",
    nameAttribute: "jobTitle",
    descripAttribute: "phone",
    published: {
      showAddress: false
    },
    components: [
      {kind: "FittableColumns", components: [
        {name: "label", content: "", classes: "xv-decorated-label"},
        {kind: "onyx.InputDecorator", name: "decorator",
          classes: "xv-input-decorator", components: [
          {name: 'input', kind: "onyx.Input", classes: "xv-subinput",
            onkeyup: "keyUp", onkeydown: "keyDown", onblur: "receiveBlur",
            onfocus: "receiveFocus"
          },
          {kind: "onyx.MenuDecorator", onSelect: "itemSelected", components: [
            {kind: "onyx.IconButton", src: "/client/lib/enyo-x/assets/triangle-down-large.png",
              classes: "xv-relationwidget-icon"},
            {name: 'popupMenu', floating: true, kind: "onyx.Menu",
              components: [
              {kind: "XV.MenuItem", name: 'searchItem', content: "_search".loc()},
              {kind: "XV.MenuItem", name: 'openItem', content: "_open".loc(),
                disabled: true},
              {kind: "XV.MenuItem", name: 'newItem', content: "_new".loc(),
                disabled: true}
            ]}
          ]},
          {name: "completer", kind: "XV.Completer", onSelect: "itemSelected"}
        ]}
      ]},
      {kind: "FittableColumns", components: [
        {name: "labels", classes: "xv-relationwidget-column left",
          components: [
          {name: "jobTitleLabel", content: "_jobTitle".loc() + ":",
            classes: "xv-relationwidget-description label",
            showing: false},
          {name: "phoneLabel", content: "_phone".loc() + ":",
            classes: "xv-relationwidget-description label",
            showing: false},
          {name: "alternateLabel", content: "_alternate".loc() + ":",
            classes: "xv-relationwidget-description label",
            showing: false},
          {name: "faxLabel", content: "_fax".loc() + ":",
            classes: "xv-relationwidget-description label",
            showing: false},
          {name: "primaryEmailLabel", content: "_email".loc() + ":",
            classes: "xv-relationwidget-description label",
            showing: false},
          {name: "webAddressLabel", content: "_web".loc() + ":",
            classes: "xv-relationwidget-description label",
            showing: false},
          {name: "addressLabel", content: "_address".loc() + ":",
            classes: "xv-relationwidget-description label",
            showing: false}
        ]},
        {name: "data", fit: true, components: [
          {name: "name", classes: "xv-relationwidget-description hasLabel"},
          {name: "description", classes: "xv-relationwidget-description hasLabel"},
          {name: "alternate", classes: "xv-relationwidget-description hasLabel"},
          {name: "fax", classes: "xv-relationwidget-description hasLabel"},
          {name: "primaryEmail", ontap: "sendMail",
            classes: "xv-relationwidget-description hasLabel hyperlink"},
          {name: "webAddress", ontap: "openWindow",
            classes: "xv-relationwidget-description hasLabel hyperlink"},
          {name: "address", classes: "xv-relationwidget-description hasLabel",
            allowHtml: true}
        ]}
      ]}
    ],
    disabledChanged: function () {
      this.inherited(arguments);
      var disabled = this.getDisabled();
      if (this.$.phone) {
        this.$.jobTitle.addRemoveClass("disabled", disabled);
        this.$.phone.addRemoveClass("disabled", disabled);
        this.$.alternate.addRemoveClass("disabled", disabled);
        this.$.fax.addRemoveClass("disabled", disabled);
        this.$.primaryEmail.addRemoveClass("disabled", disabled);
        this.$.webAddress.addRemoveClass("disabled", disabled);
      }
    },
    setValue: function (value, options) {
      this.inherited(arguments);
      if (value && !value.get) {
        // the value of the widget is still being fetched asyncronously.
        // when the value is fetched, this function will be run again,
        // so for now we can just stop here.
        return;
      }
      var jobTitle = value ? value.get('jobTitle') : "",
        phone = value ? value.get('phone') : "",
        alternate = value ? value.get('alternate') : "",
        fax = value ? value.get('fax') : "",
        primaryEmail = value ? value.get('primaryEmail') : "",
        webAddress = value ? value.get('webAddress') : "",
        address = value ? XM.Address.format(value.get('address')) : "",
        showAddress = this.getShowAddress();
      this.$.jobTitleLabel.setShowing(jobTitle);
      this.$.phoneLabel.setShowing(phone);
      this.$.alternate.setShowing(alternate);
      this.$.alternate.setContent(alternate);
      this.$.alternateLabel.setShowing(alternate);
      this.$.fax.setShowing(fax);
      this.$.fax.setContent(fax);
      this.$.faxLabel.setShowing(fax);
      this.$.primaryEmail.setShowing(primaryEmail);
      this.$.primaryEmail.setContent(primaryEmail);
      this.$.primaryEmailLabel.setShowing(primaryEmail);
      this.$.webAddress.setShowing(webAddress);
      this.$.webAddress.setContent(webAddress);
      this.$.webAddressLabel.setShowing(webAddress);
      this.$.address.setShowing(address && showAddress);
      this.$.addressLabel.setShowing(address && showAddress);
      if (showAddress) { this.$.address.setContent(address); }
    },
    openWindow: function () {
      var address = this.value ? this.value.get('webAddress') : null;
      if (address) { window.open('http://' + address); }
      return true;
    },
    sendMail: function () {
      var email = this.value ? this.value.get('primaryEmail') : null,
        win;
      if (email) {
        win = window.open('mailto:' + email);
        win.close();
      }
      return true;
    }
  });

  // ..........................................................
  // CUSTOMER
  //

  enyo.kind({
    name: "XV.CustomerWidget",
    kind: "XV.RelationWidget",
    collection: "XM.CustomerRelationCollection",
    list: "XV.CustomerList"
  });

  // ..........................................................
  // CUSTOMER PROSPECT
  //

  enyo.kind({
    name: "XV.CustomerProspectWidget",
    kind: "XV.RelationWidget",
    collection: "XM.CustomerProspectRelationCollection",
    list: "XV.CustomerProspectList",
    create: function () {
      var ret = this.inherited(arguments);
      this.createComponent({
        kind: "onyx.Popup",
        name: "customerOrProspectPopup",
        centered: true,
        modal: true,
        floating: true,
        scrim: true,
        onShow: "popupShown",
        onHide: "popupHidden",
        components: [
          {content: "_customerOrProspect".loc()},
          {tag: "br"},
          {kind: "onyx.Button", content: "_customer".loc(), ontap: "newCustomer",
            classes: "onyx-blue xv-popup-button"},
          {kind: "onyx.Button", content: "_prospect".loc(), ontap: "newProspect",
            classes: "onyx-blue xv-popup-button"}
        ]
      });
      this.$.newItem.setDisabled(false);
      return ret;
    },
    newCustomer: function () {
      this.$.customerOrProspectPopup.hide();
      this.doWorkspace({
        workspace: "XV.CustomerWorkspace",
        allowNew: false
      });
    },
    newProspect: function () {
      this.$.customerOrProspectPopup.hide();
      this.doWorkspace({
        workspace: "XV.ProspectWorkspace",
        allowNew: false
      });
    },
    /**
     @menuItemSelected
     this overrides the menuItemSelected function of RelationWidget to
     account for the different types of models presented by the widget.
     */
    menuItemSelected: function (inSender, inEvent) {
      var that = this,
        menuItem = inEvent.originator,
        list = this.getList(),
        model = this.getValue(),
        K, status, id, workspace,
        callback;

      switch (menuItem.name)
      {
      case 'searchItem':
        callback = function (value) {
          that.setValue(value);
        };
        this.doSearch({
          list: list,
          searchText: this.$.input.getValue(),
          callback: callback
        });
        break;
      case 'openItem':
        K = model.getClass();
        status = model.get("status");
        id = model ? model.id : null;
        workspace = status === K.PROSPECT_STATUS ? 'XV.ProspectWorkspace' : 'XV.CustomerWorkspace';

        this.doWorkspace({
          workspace: workspace,
          id: id,
          allowNew: false
        });
        break;
      case 'newItem':
        this.$.customerOrProspectPopup.show();
      }
    }
  });

  // ..........................................................
  // CUSTOMER SHIPTO
  //

  enyo.kind({
    name: "XV.CustomerShiptoWidget",
    kind: "XV.RelationWidget",
    collection: "XM.CustomerShiptoRelationCollection",
    list: "XV.CustomerShiptoList",
    filterRestrictionType: ["customer"]
  });


  // ..........................................................
  // EMPLOYEE
  //

  enyo.kind({
    name: "XV.EmployeeWidget",
    kind: "XV.RelationWidget",
    collection: "XM.EmployeeRelationCollection",
    list: "XV.EmployeeList"
  });

  // ..........................................................
  // INCIDENT
  //

  enyo.kind({
    name: "XV.IncidentWidget",
    kind: "XV.RelationWidget",
    collection: "XM.IncidentRelationCollection",
    list: "XV.IncidentList",
    nameAttribute: "description"
  });

  // ..........................................................
  // ITEM
  //

  enyo.kind({
    name: "XV.ItemWidget",
    kind: "XV.RelationWidget",
    collection: "XM.ItemRelationCollection",
    list: "XV.ItemList",
    nameAttribute: "description1",
    descripAttribute: "description2"
  });

  // ..........................................................
  // ITEM SITE
  //

  var _privateItemSiteWidget = enyo.kind({
    kind: "XV.RelationWidget",
    collection: "XM.ItemSiteRelationCollection",
    list: "XV.ItemSiteList",
    keyAttribute: ["item.number", "item.barcode"],
    nameAttribute: "item.description1",
    descripAttribute: "item.description2",
    style: "border-bottom-color: rgb(170, 170, 170); " +
      "border-bottom-width: 1px; " +
      "border-bottom-style: solid;"
  });

  enyo.kind({
    name: "XV.ItemSiteWidget",
    published: {
      sites: null,
      selectedSite: null,
      attr: null,
      value: null,
      placeholder: null,
      disabled: false,
      query: null
    },
    handlers: {
      "onValueChange": "controlValueChanged"
    },
    events: {
      "onValueChange": ""
    },
    components: [
      {kind: "FittableRows", components: [
        {kind: _privateItemSiteWidget, name: "privateItemSiteWidget",
          label: "_item".loc()},
        {kind: "XV.SitePicker", name: "sitePicker", label: "_site".loc()}
      ]}
    ],
    /**
      Add a parameter to the query object on the widget. Parameter conventions should
      follow those described in the documentation for `XM.Collection`.

      @seealso XM.Collection
      @param {Object} Param
      @returns {Object} Receiver
    */
    addParameter: function (param) {
      this.$.privateItemSiteWidget.addParameter(param);
    },
    /**
      Empty out the widget
     */
    clear: function (options) {
      this.$.privateItemSiteWidget.clear(options);
    },
    controlValueChanged: function (inSender, inEvent) {
      var value = inEvent.value,
        disabledCache = this.$.sitePicker.getDisabled(),
        sitePicker = this.$.sitePicker,
        isNull = _.isNull(value),
        itemSite,
        options = {},
        site,
        item;
      if (inEvent.originator.name === 'privateItemSiteWidget') {
        sitePicker.itemSites.reset();
        sitePicker.buildList();
        if (value && value.get) {
          this.setValue(value); // In case an id was transformed to a model
          // Select the matching site
          site = value.get("site");
          this.setSelectedSite(site);
          // Don't allow another selection until we've fetch an updated list
          sitePicker.setDisabled(true);
          // Go fetch alternate sites for this item
          item = value.get("item");
          options.query = { parameters: [{attribute: "item", value: item}]};
          options.success = function () {
            sitePicker.buildList();
            sitePicker.setDisabled(disabledCache);
          };
          sitePicker.itemSites.fetch(options);
        }
        return true;
      } else if (inEvent.originator.name === 'sitePicker') {
        this.setSelectedSite(value);
        this.$.privateItemSiteWidget.setDisabled(isNull);
        if (isNull) {
          this.$.privateItemSiteWidget.clear();
        } else {
          itemSite = this.$.privateItemSiteWidget.getValue();
          // Change item site selection if the site changed
          if (itemSite && itemSite.getValue("site.id") !== value &&
              sitePicker.itemSites.length) {
            itemSite = _.find(sitePicker.itemSites.models, function (model) {
              return model.getValue("site.id") === value;
            });
            this.$.privateItemSiteWidget.setValue(itemSite);
          }
        }
        return true;
      }
    },
    create: function () {
      this.inherited(arguments);
      // Filter for site picker. Limit list of models if item sites
      // are specified
      var filter = function (models, options) {
        var ids;
        if (this.itemSites.length) {
          // Consolidate all the site ids
          ids = _.pluck(_.pluck(_.pluck(this.itemSites.models, "attributes"), 'site'), 'id');
          return _.filter(models, function (model) {
            return _.contains(ids, model.id);
          });
        }
        return models;
      };
      this.$.sitePicker.itemSites = new XM.ItemSiteRelationCollection();
      this.$.sitePicker.filter = filter;
      this.queryChanged();
    },
    /**
     @todo Document the focus method.
     */
    focus: function () {
      this.$.privateItemSiteWidget.focus();
    },
    placeholderChanged: function () {
      var placeholder = this.getPlaceholder();
      this.$.privateItemSiteWidget.setPlaceholder(placeholder);
    },
    queryChanged: function () {
      this.$.privateItemSiteWidget.setQuery(this.getQuery());
    },
    /**
      Removes a query parameter by attribute name from the widget's query object.

      @param {String} Attribute
      @returns {Object} Receiver
    */
    removeParameter: function (attr) {
      this.$.privateItemSiteWidget.removeParameter(attr);
    },
    /**
      Pass through attributes intended for onyx input inside.
      XXX is this necessary given disabledChanged function above?
    */
    setDisabled: function (isDisabled) {
      this.$.privateItemSiteWidget.setDisabled(isDisabled);
      this.$.sitePicker.setDisabled(isDisabled);
    },
    selectedSiteChanged: function () {
      var site = this.getSelectedSite();
      this.$.sitePicker.setValue(site, {silent: true});
      if (site) {
        this.$.privateItemSiteWidget.addParameter({
          attribute: "site",
          value: site
        }, true);
      } else {
        this.$.privateItemSiteWidget.removeParameter("site");
      }
    },
    validate: function (value) {
      return value;
    },
    setValue: function (value, options) {
      options = options || {};
      var oldValue = this.getValue(),
        inEvent,
        site;
      if (oldValue !== value) {
        this.value = value;
        site = value && value.get ? value.get("site") : undefined;
        this.$.privateItemSiteWidget.setValue(value);
        inEvent = { value: value };
        if (!options.silent) { this.doValueChange(inEvent); }
      }
    }
  });

  // ..........................................................
  // OPPORTUNITY
  //

  enyo.kind({
    name: "XV.OpportunityWidget",
    kind: "XV.RelationWidget",
    collection: "XM.OpportunityRelationCollection",
    list: "XV.OpportunityList"
  });

  // ..........................................................
  // PROJECT
  //

  enyo.kind({
    name: "XV.ProjectWidget",
    kind: "XV.RelationWidget",
    collection: "XM.ProjectRelationCollection",
    list: "XV.ProjectList"
  });

  // ..........................................................
  // USER ACCOUNT
  //

  enyo.kind({
    name: "XV.UserAccountWidget",
    kind: "XV.RelationWidget",
    collection: "XM.UserAccountRelationCollection",
    list: "XV.UserAccountList",
    keyAttribute: "username",
    nameAttribute: "properName"
  });

}());
