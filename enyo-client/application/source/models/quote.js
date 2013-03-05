/*jshint indent:2, curly:true eqeqeq:true, immed:true, latedef:true,
newcap:true, noarg:true, regexp:true, undef:true, strict:true, trailing:true
white:true*/
/*global XT:true, XM:true, Backbone:true, _:true */

(function () {
  "use strict";

  /**
    @class

    @extends XM.Document
  */
  XM.Quote = XM.Document.extend({
    /** @scope XM.Quote.prototype */

    recordType: 'XM.Quote',

    numberPolicySetting: 'QUNumberGeneration',

    documentDateKey: "quoteDate",

    freightTaxDetail: undefined,

    defaults: function () {
      var K = this.getClass();
      return {
        quoteDate: new Date(),
        status: K.OPEN_STATUS,
        saleType: XM.saleTypes.at(0)
      };
    },

    requiredAttributes: [
      "calculateFreight",
      "customer",
      "quoteDate",
      "salesRep",
      "terms"
    ],

    billtoAttrArray: ["billtoName", "billtoAddress1", "billtoAddress2", "billtoAddress3", "billtoCity",
      "billtoState", "billtoPostalCode", "billtoCountry", "billtoPhone", "billtoContactHonorific",
      "billtoContactFirstName", "billtoContactMiddleName", "billtoContactLastName",
      "billtoContactSuffix", "billtoContactPhone", "billtoContactTitle",
      "billtoContactFax", "billtoContactEmail"
    ],

    shiptoAttrArray: ["shiptoName", "shiptoAddress1", "shiptoAddress2", "shiptoAddress3", "shiptoCity",
      "shiptoState", "shiptoPostalCode", "shiptoCountry", "shiptoPhone", "shiptoContactHonorific",
      "shiptoContactFirstName", "shiptoContactMiddleName", "shiptoContactLastName",
      "shiptoContactSuffix", "shiptoContactPhone", "shiptoContactTitle",
      "shiptoContactFax", "shiptoContactEmail"
    ],

    // ..........................................................
    // METHODS
    //

    /**
      Initialize
    */
    initialize: function (attributes, options) {
      XM.Document.prototype.initialize.apply(this, arguments);
      this.freightTaxDetail = [];
      this.on('add:lineItems remove:lineItems', this.calculateTotals);
      this.on('change:customer', this.customerDidChange);
      this.on('change:shipto', this.shiptoDidChange);
    },

    /**
      Used to update calculated fiels.
    */
    calculateTotals: function (model, value, options) {
      var K = XM.Model,
        status = this.getStatus(),
        miscCharge = this.get("miscCharge") || 0.0,
        freight = this.get("freight") || 0.0,
        scale = XT.MONEY_SCALE,
        add = XT.math.add,
        substract = XT.math.subtract,
        subtotals = [],
        taxDetails = [],
        costs = [],
        weights = [],
        subtotal,
        freightWeight,
        taxTotal = 0.0,
        costTotal,
        total,
        margin,
        taxCodes;

      if (status & K.READY) {
        // Collect line item detail
        _.each(this.get('lineItems').models, function (lineItem) {
          var extPrice = lineItem.get('extendedPrice') || 0,
            quantity = lineItem.get("quantity") || 0,
            unitCost = lineItem.get("unitCost") || 0,
            item = lineItem.getValue("itemSite.item"),
            prodWeight = item ? item.get("productWeight") : 0,
            packWeight = item ? item.get("packageWeight") : 0,
            itemWeight = item ? add(prodWeight, packWeight, scale) : 0,
            quantityUnitRatio = lineItem.get("quantityUnitRatio"),
            grossWeight = itemWeight * quantity * quantityUnitRatio;

          weights.push(grossWeight);
          subtotals.push(extPrice);
          costs.push(quantity * unitCost);
          taxDetails = taxDetails.concat(lineItem.taxDetail);
        });

        // Total taxes
        // First group amounts by tax code
        taxCodes = _.groupBy(taxDetails, function (detail) {
          return detail.taxCode.id;
        });

        // Loop through each tax code group and subtotal
        _.each(taxCodes, function (group) {
          var taxes = [],
            subtotal;

          // Collect array of taxes
          _.each(group, function (detail) {
            taxes.push(detail.tax);
          });

          // Subtotal first to make sure we round by subtotal
          subtotal = add(taxes, 6);

          // Now add to tax grand total
          taxTotal = add(taxTotal, subtotal, scale);
        });

        // Totaling calculations
        freightWeight = add(weights, scale);
        subtotal = add(subtotals, scale);
        costTotal = add(costs, scale);
        margin = substract(subtotal, costTotal, scale);
        subtotals = subtotals.concat([miscCharge, freight, taxTotal]);
        total = add(subtotals, scale);

        // Set values
        this.set("freightWeight", freightWeight);
        this.set("subtotal", subtotal);
        this.set("taxTotal", taxTotal);
        this.set("total", total);
        this.set("margin", margin);
      }
    },

    /**
      Populates billto information based on the entered customer.
    */
    customerDidChange: function (model, value, options) {
      var K = XM.Model,
        status = this.getStatus(),
        customer = this.get("customer"),
        isFreeFormBillto = customer ? customer.get("isFreeFormBillto") : false,
        isFreeFormShipto = customer ? customer.get("isFreeFormShipto") : false,
        billtoContact = customer ? customer.get("billingContact") || customer.get("contact") : false,
        billtoAddress = billtoContact ? billtoContact.get("address") : false,
        opts = {force: true},
        that = this,
        unsetBilltoAddress = function () {
          that.unset("billtoName", opts);
          that.unset("billtoAddress1", opts);
          that.unset("billtoAddress2", opts);
          that.unset("billtoAddress3", opts);
          that.unset("billtoCity", opts);
          that.unset("billtoState", opts);
          that.unset("billtoPostalCode", opts);
          that.unset("billtoCountry", opts);
        },
        unsetBilltoContact = function () {
          that.unset("billtoContact");
          that.unset("billtoContactHonorific");
          that.unset("billtoContactFirstName");
          that.unset("billtoContactMiddleName");
          that.unset("billtoContactLastName");
          that.unset("billtoContactSuffix");
          that.unset("billtoContactTitle");
          that.unset("billtoContactPhone");
          that.unset("billtoContactFax");
          that.unset("billtoContactEmail");
        };

      // Handle case of prospect that has no free form settings
      isFreeFormBillto = isFreeFormBillto === undefined ? true : isFreeFormBillto;
      isFreeFormShipto = isFreeFormShipto === undefined ? true : isFreeFormShipto;

      this.setReadOnly("lineItems", !customer);

      // Set read only state for free form billto
      for (var i = 0; i < this.billtoAttrArray.length; i++) {
        this.setReadOnly(this.billtoAttrArray[i], isFreeFormBillto);
      }

      // Set read only state for free form shipto
      for (i = 0; i < this.shiptoAttrArray.length; i++) {
        this.setReadOnly(this.shiptoAttrArray[i], isFreeFormShipto);
      }

      if (status & K.READY) {
        // Set customer default data
        if (customer) {
          this.set("billtoName", customer.get("name"), opts);
          this.set("salesRep", customer.get("salesRep"));
          this.set("commission", customer.get("commission"));
          this.set("terms", customer.get("terms"));
          this.set("taxZone", customer.get("taxZone"));
          this.set("shipVia", customer.get("shipVia"));
          this.set("site", customer.get("preferredSite"));
          this.set("currency", customer.get("currency"));
          this.set("shipto", customer.get("shipto"));
          if (billtoContact) {
            this.set("billtoContact", billtoContact);
            this.set("billtoContactHonorific", billtoContact.get("honoroific"));
            this.set("billtoContactFirstName", billtoContact.get("firstName"));
            this.set("billtoContactMiddleName", billtoContact.get("middleName"));
            this.set("billtoContactLastName", billtoContact.get("lastName"));
            this.set("billtoContactSuffix", billtoContact.get("suffix"));
            this.set("billtoContactTitle", billtoContact.get("title"));
            this.set("billtoContactPhone", billtoContact.get("phone"));
            this.set("billtoContactFax", billtoContact.get("fax"));
            this.set("billtoContactEmail", billtoContact.get("email"));
          } else {
            unsetBilltoContact();
          }
          if (billtoAddress) {
            this.set("billtoAddress1", billtoAddress.getValue("line1"), opts);
            this.set("billtoAddress2", billtoAddress.getValue("line2"), opts);
            this.set("billtoAddress3", billtoAddress.getValue("line3"), opts);
            this.set("billtoCity", billtoAddress.getValue("city"), opts);
            this.set("billtoState", billtoAddress.getValue("state"), opts);
            this.set("billtoPostalCode", billtoAddress.getValue("postalCode"), opts);
            this.set("billtoCountry", billtoAddress.getValue("country"), opts);
          } else {
            unsetBilltoAddress();
          }
        } else {
          this.unset("salesRep");
          this.unset("commission");
          this.unset("terms");
          this.unset("taxZone");
          this.unset("shipVia");
          this.unset("currency");
          this.unset("shipZone");
          unsetBilltoAddress();
          unsetBilltoContact();
          this.unset("shipto", opts);
          this.unset("shiptoName", opts);
          this.unset("shiptoAddress1", opts);
          this.unset("shiptoAddress2", opts);
          this.unset("shiptoAddress3", opts);
          this.unset("shiptoCity", opts);
          this.unset("shiptoState", opts);
          this.unset("shiptoPostalCode", opts);
          this.unset("shiptoCountry", opts);
        }
      }
    },
    
    /**
      Populate shipto defaults
    */
    shiptoDidChange: function () {
      var K = XM.Model,
        status = this.getStatus(),
        shipto = this.get("shipto"),
        shiptoContact = shipto ? shipto.get("contact") : false,
        shiptoAddress = shiptoContact ? shiptoContact.get("address") : false,
        opts = {force: true};

      if ((status & K.READY) && shipto) {
        this.set("shiptoName", shipto.get("name"), opts);
        this.set("salesRep", shipto.get("salesRep"));
        this.set("commission", shipto.get("commission"));
        this.set("taxZone", shipto.get("taxZone"));
        this.set("shipZone", shipto.get("shipZone"));
        this.set("shipVia", shipto.get("shipVia"));
        if (shiptoContact) {
          this.set("shiptoContact", shiptoContact);
          this.set("shiptoContactHonorific", shiptoContact.get("honoroific"));
          this.set("shiptoContactFirstName", shiptoContact.get("firstName"));
          this.set("shiptoContactMiddleName", shiptoContact.get("middleName"));
          this.set("shiptoContactLastName", shiptoContact.get("lastName"));
          this.set("shiptoContactSuffix", shiptoContact.get("suffix"));
          this.set("shiptoContactTitle", shiptoContact.get("title"));
          this.set("shiptoContactPhone", shiptoContact.get("phone"));
          this.set("shiptoContactFax", shiptoContact.get("fax"));
          this.set("shiptoContactEmail", shiptoContact.get("email"));
        }
        if (shiptoAddress) {
          this.set("shiptoAddress1", shiptoAddress.getValue("line1"), opts);
          this.set("shiptoAddress2", shiptoAddress.getValue("line2"), opts);
          this.set("shiptoAddress3", shiptoAddress.getValue("line3"), opts);
          this.set("shiptoCity", shiptoAddress.getValue("city"), opts);
          this.set("shiptoState", shiptoAddress.getValue("state"), opts);
          this.set("shiptoPostalCode", shiptoAddress.getValue("postalCode"), opts);
          this.set("shiptoCountry", shiptoAddress.getValue("country"), opts);
        }
      }
    },

    /**
      copyBilltoToShipto

      This function empties all of the shipto information, then
      takes all the info from the billto and copies it to the shipto.
    */
    copyBilltoToShipto: function () {
      this.unset("shipto");
      for (var i = 0; i < this.shiptoAttrArray.length; i++) {
        this.set(this.shiptoAttrArray[i], this.get(this.billtoAttrArray[i]));
      }
    },

    /**
    Returns quote status as a localized string.

    @returns {String}
    */
    getQuoteStatusString: function () {
      var K = this.getClass(),
        status = this.get("status");
      return status === K.OPEN_STATUS ? "_open".loc() : "_closed".loc();
    },

    validateSave: function () {
      var pricePolicy = XT.session.settings.get("soPriceEffective"),
        scheduleDate = this.get("scheduleDate"),
        customer = this.get("customer"),
        shipto = this.get("shipto"),
        total = this.get("total"),
        lineItems = this.get("lineItems"),
        params = {};

      if (pricePolicy === "ScheduleDate" && !scheduleDate) {
        params.attr = "_scheduleDate".loc();
        return XT.Error.clone('xt1004', { params: params });
      }

      if (!customer.get("isFreeFormShipto") && !shipto) {
        params.attr = "_shipto".loc();
        return XT.Error.clone('xt1004', { params: params });
      }

      if (total < 0) {
        return XT.Error.clone('xt2011');
      }

      if (!lineItems.length) {
        return XT.Error.clone('xt2012');
      }
    }

  });

  // ..........................................................
  // CLASS METHODS
  //

  _.extend(XM.Quote, /** @lends XM.QuoteLine# */{

    // ..........................................................
    // CONSTANTS
    //

    /**
      Quote is open.

      @static
      @constant
      @type String
      @default O
    */
    OPEN_STATUS: "O",

    /**
      Quote is closed.

      @static
      @constant
      @type String
      @default C
    */
    CLOSED_STATUS: "C"

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteLine = XM.Model.extend({
    /** @scope XM.QuoteLine.prototype */

    recordType: 'XM.QuoteLine',

    sellingUnits: undefined,

    taxDetail: undefined,

    defaults: function () {
      return {
        quantityUnitRatio: 1,
        priceMode: XM.QuoteLine.DISCOUNT_MODE,
        priceUnitRatio: 1
      };
    },

    initialize: function (attributes, options) {
      XM.Model.prototype.initialize.apply(this, arguments);
      this.taxDetail = [];
      this._updatePrice = true;
      this.on('change:discount', this.discountDidChange);
      this.on("change:itemSite", this.itemSiteDidChange);
      this.on('change:quantity', this.calculatePrice);
      this.on('change:quantity change:price', this.calculateExtendedPrice);
      this.on('change:price', this.calculatePercentages);
      this.on('change:price change:unitCost', this.calculateProfit);
      this.on('change:quote', this.parentDidChange);
      this.on('change:taxType change:extendedPrice', this.calculateTax);
      this.on('change:quantityUnit change:priceUnit', this.unitDidChange);
      this.on('change:scheduleDate', this.scheduleDateDidChange);
      this.on('change:extendedPrice change:unitCost change:itemSite',
        this.recalculateParent());

      // Only recalculate price on date changes if pricing is date driven
      if (XT.session.settings.get("soPriceEffective") === "ScheduleDate") {
        this.on('change:scheduleDate', this.calculatePrice);
      }

      this.sellingUnits = new XM.UnitCollection();
    },

    readOnlyAttributes: [
      "customerPrice",
      "extendedPrice",
      "inventoryQuantityUnitRatio",
      "item",
      "lineNumber",
      "listCost",
      "listCostMarkup",
      "listPrice",
      "listPriceDiscount",
      "priceMode",
      "priceUnitRatio",
      "profit",
      "site",
      "tax",
      "unitCost"
    ],

    requiredAttributes: [
      "customerPrice",
      "itemSite",
      "item",
      "site",
      "quote",
      "lineNumber",
      "quantity",
      "quantityUnit",
      "quantityUnitRatio",
      "price",
      "priceMode",
      "priceUnit",
      "priceUnitRatio",
      "scheduleDate",
      "unitCost"
    ],

    /**
      Calculates and sets the extended price.

      returns {Object} Receiver
    */
    calculateExtendedPrice: function () {
      var quantity = this.get("quantity") || 0,
        quantityUnitRatio = this.get("quantityUnitRatio"),
        priceUnitRatio = this.get("priceUnitRatio"),
        price = this.get("price") || 0,
        extPrice =  (quantity * quantityUnitRatio / priceUnitRatio) * price;
      extPrice = XT.toExtendedPrice(extPrice);
      this.set("extendedPrice", extPrice, {force: true});
      return this;
    },

    /**
      Calculate and set discount and markup percentages.

      returns {Object} Receiver
    */
    calculatePercentages: function () {
      var that = this,
        parent = this.getParent(),
        currency = parent.get("currency"),
        parentDate = parent.get(parent.documentDateKey),
        price = this.get("price"),
        options = {};
      options.success = function (basePrice) {
        var K = that.getClass(),
          priceMode = that.get("priceMode"),
          customerPrice = that.get("customerPrice"),
          listCost = that.get("listCost"),
          listPrice = that.get("listPrice"),
          attrs = {
            discount: undefined,
            listPriceDiscount: undefined,
            listCostMarkup: undefined
          };

        if (price === 0) {
          attrs.discount = priceMode === K.MARKUP_MODE ? 0 : 1;
          attrs.listPriceDiscount = 1;
          attrs.listCostMarkup = 0;
        } else {
          if (listPrice) {
            attrs.listPriceDiscount = XT.toPercent(1 - basePrice / listPrice);
          }
          if (listCost) {
            attrs.listCostMarkup = XT.toPercent(basePrice / listCost - 1);
          }
          if (customerPrice) {
            attrs.discount = priceMode === K.MARKUP_MODE ?
              XT.toPercent(price / customerPrice - 1) : // Markup
              XT.toPercent(1 - price / customerPrice);  // Discount
          }
        }

        // TODO: Handle characteristics
        that.set(attrs, {force: true});
      };
      options.error = function (error) {
        this.trigger("error", error);
      };

      // Convert price to base, then do the real work in the callback
      currency.toBase(price, parentDate, options);

      return this;
    },

    calculatePrice: function (force) {
      var settings = XT.session.settings,
        K = this.getClass(),
        that = this,
        isReady = this.getStatus() & K.READY,
        asOf = new Date(),
        canUpdate = this.canUpdate(),
        customerPrice = this.get("customerPrice"),
        ignoreDiscount = settings.get("IgnoreCustDisc"),
        isConfigured = this.getValue("itemSite.item.isConfigured"),
        item = this.getValue("itemSite.item"),
        editing = !this.isNew(),
        options = {},
        price = this.get("price"),
        priceUnit = this.get("priceUnit"),
        effectivePolicy = settings.get("soPriceEffective"),
        quantity = this.get("quantity"),
        quantityUnit = this.get("quantityUnit"),
        scheduleDate = this.get("scheduleDate"),
        updatePolicy = settings.get("UpdatePriceLineEdit"),
        readOnlyCache = this.isReadOnly("price"),
        parent = this.getParent(),
        parentDate,
        customer,
        currency;

      // If no parent, don't bother
      if (!parent) { return; }
      
      parentDate = parent.get(parent.documentDateKey);
      customer = parent.get("customer");
      currency = parent.get("currency");

      // Make sure we have all the necessary values
      if (isReady && canUpdate && customer && currency &&
          item && quantity && quantityUnit && priceUnit) {

        // Handle alternate price effectivity settings
        if (effectivePolicy === "ScheduleDate") {
          asOf = scheduleDate;
        } else if (effectivePolicy === "OrderDate") {
          asOf = parentDate || new Date();
        }

        // Determine whether updating net price or just customer price
        if (editing) {
          if (customerPrice !== price &&
             (ignoreDiscount || (updatePolicy === K.NEVER_UPDATE && !force))) {
            this._updatePrice = false;
          } else if (updatePolicy !== K.ALWAYS_UPDATE) {
            // TO DO: We need to prompt the user. How?
            this._updatePrice = false;
          }
        }

        // Don't allow user editing of price until we hear back from the server
        this.setReadOnly("price", true);

        if (isConfigured) {
          // TO DO: Loop through characteristics and get pricing
        }

        // Get the price
        options.success = function (resp) {
          var priceMode;

          // Handle no price found scenario
          if (resp.price === -9999) {
            that.notify("_noPriceFound".loc());
            this.unset("customerPrice");
            this.unset("price", {force: true});
            if (that.hasChanges("quantity")) {
              this.unset("quantity");
            } else {
              this.unset("scheduleDate");
            }

          // Handle normal scenario
          } else {
            priceMode = (resp.type === "N" ||
                         resp.type === "D" ||
                         resp.type === "P") ? K.DISCOUNT_MODE : K.MARKUP_MODE;
            that.set("priceMode", priceMode);
            that.set("customerPrice", resp.price); // TO DO: Need to add char price totals here too
            if (that._updatePrice) {
              that.set("price", resp.price, {force: true});
            }
          }

          // Allow editing again if we could before
          that.setReadOnly("price", readOnlyCache);
        };
        options.error = function (err) {
          that.trigger("error", err);
        };
        options.asOf = asOf;
        options.quantityUnit = quantityUnit;
        options.priceUnit = priceUnit;
        options.currency = currency;
        options.effective = parentDate;
        customer.price(item, quantity, options);
      }
    },

    calculateProfit: function () {
      var unitCost = this.get("unitCost"),
        price = this.get("price"),
        parent = this.getParent(),
        effective = this.get(parent.documentDateKey),
        currency = parent.get("currency"),
        that = this,
        options = {},
        opt = {force: true};
      if (price) {
        if (unitCost) {
          options.success = function (value) {
            that.set("profit", (value - unitCost) / unitCost, opt);
          };
          currency.toBase(price, effective, options);
        } else {
          this.set("profit", 1, opt);
        }
      } else {
        this.unset("profit", opt);
      }
    },

    calculateTax: function () {
      var parent = this.getParent(),
        amount = this.get("extendedPrice"),
        taxTypeId = this.getValue("taxType.id"),
        recordType,
        taxZoneId,
        effective,
        currency,
        that = this,
        options = {},
        params;
        
      // If no parent, don't bother
      if (!parent) { return; }
      
      recordType = parent.recordType;
      taxZoneId = parent.getValue("taxZone.id");
      effective = parent.get(parent.documentDateKey);
      currency = parent.get("currency");
      
      if (effective && currency && amount) {
        params = [taxZoneId, taxTypeId, effective, currency.id, amount];
        options.success = function (resp) {
          var tax;
          that.taxDetail = resp;
          if (resp.length) {
            tax = XT.math.add(_.pluck(resp, "tax"), 6);
            that.set("tax", XT.math.round(tax, XT.SALES_PRICE_SCALE));
          } else {
            that.set("tax", 0);
          }
          that.recalculateParent();
        };
        this.dispatch(recordType, "calculateTaxDetail", params, options);
      } else {
        this.set("tax", 0);
      }
    },

    /**
      Recalculates and sets price from customer price based on user defined
      discount/markup.

      returns {Object} Receiver
    */
    discountDidChange: function () {
      var K = this.getClass(),
        discount = this.get("discount"),
        customerPrice = this.get("customer"),
        sense = this.get("priceMode") === K.MARKUP_MODE ? -1 : 1;
      if (!customerPrice) {
        this.unset("discount");
      } else if (this._updatePrice) {
        this.set("price", customerPrice - customerPrice * discount * sense);
      }
      return this;
    },

    itemSiteDidChange: function () {
      var K = XM.Model,
        parent = this.getParent(),
        taxZone = parent ? parent.get("taxZone") : undefined,
        item = this.getValue("itemSite.item"),
        status = this.getStatus(),
        that = this,
        unitOptions = {},
        taxOptions = {},
        itemOptions = {};

      // Reset values
      this.unset("quantityUnit");
      this.unset("priceUnit");
      this.unset("taxType");
      this.unset("unitCost");
      this.sellingUnits.reset();

      if ((status & K.READY) && item) {
        // Fetch and update selling units
        unitOptions.success = function (resp) {
          // Resolve and add each id found
          _.each(resp, function (id) {
            var unit = XM.units.get(id);
            that.sellingUnits.add(unit);
          });

          // Set the item default selections
          that.set("quantityUnit", item.get("inventoryUnit"));
          that.set("priceUnit", item.get("priceUnit"));
        };
        item.sellingUnits(unitOptions);

        // Fetch and update tax type
        taxOptions.success = function (id) {
          var taxType = XM.taxTypes.get(id);
          if (taxType) {
            that.set("taxType", taxType);
          } else {
            that.unset("taxType");
          }
        };
        item.taxType(taxZone, taxOptions);

        // Fetch and update unit cost
        itemOptions.success = function (cost) {
          that.set("unitCost", cost, {force: true});
        };
        item.standardCost(itemOptions);

        // TODO: Get default characteristics
      }
    },
    
    parentDidChange: function () {
      var parent = this.getParent(),
       lineNumber = this.get("lineNumber");

      // Set next line number
      if (parent && !lineNumber) {
        this.set("lineNumber", parent.get("lineItems").length);
      }
    },

    recalculateParent: function () {
      var parent = this.getParent();
      if (parent) { parent.calculateTotals(); }
    },

    scheduleDateChanged: function () {
      var item = this.getValue("itemSite.item"),
        parent = this.get("parent"),
        customer = parent.get("customer"),
        shipto = parent.get("shipto"),
        scheduleDate = this.get("scheduleDate"),
        that = this,
        options = {};
      if (item && scheduleDate) {
        options.success = function (canPurchase) {
          if (!canPurchase) {
            that.notify("_noPurchase".loc());
            that.unset("scheduleDate");
          }
        };
        options.shipto = shipto;
        customer.canPurchase(item, scheduleDate, options);
      }
    },

    unitDidChange: function () {
      this.calculatePrice(true);
    }

  });

  // ..........................................................
  // CLASS METHODS
  //

  _.extend(XM.QuoteLine, /** @lends XM.QuoteLine# */{

    // ..........................................................
    // CONSTANTS
    //

    /**
      Discount is calculated normally.

      @static
      @constant
      @type String
      @default D
    */
    DISCOUNT_MODE: "D",

    /**
      Never update automatically pricing once a line item has been saved.

      @static
      @constant
      @type String
      @default M
    */
    NEVER_UPDATE: 1,

    /**
      Prompt user whether to update pricing on a saved line item.

      @static
      @constant
      @type String
      @default 2
    */
    PROMPT_UPDATE: 2,

    /**
      Always update pricing automatically.

      @static
      @constant
      @type String
      @default 3
    */
    ALWAYS_UPDATE: 3

  });

  /**
    @class

    @extends XM.Comment
  */
  XM.QuoteComment = XM.Comment.extend({
    /** @scope XM.QuoteComment.prototype */

    recordType: 'XM.QuoteComment',

    sourceName: 'Q'

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteAccount = XM.Model.extend({
    /** @scope XM.QuoteAccount.prototype */

    recordType: 'XM.QuoteAccount',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteContact = XM.Model.extend({
    /** @scope XM.QuoteContact.prototype */

    recordType: 'XM.QuoteContact',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteFile = XM.Model.extend({
    /** @scope XM.QuoteFile.prototype */

    recordType: 'XM.QuoteFile',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteItem = XM.Model.extend({
    /** @scope XM.QuoteItem.prototype */

    recordType: 'XM.QuoteItem',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteLineCharacteristic = XM.Model.extend({
    /** @scope XM.QuoteLineCharacteristic.prototype */

    recordType: 'XM.QuoteLineCharacteristic'

    //there should be some default characteristics that are pulled automatically
    //  these are reconstructed when the item site changes
    //  should probably have an itemsitedidchange function

  });

  /**
    @class

    @extends XM.Info
  */
  XM.QuoteListItem = XM.Info.extend({
    /** @scope XM.QuoteListItem.prototype */

    recordType: 'XM.QuoteListItem',

    editableModel: 'XM.Quote'

  });

  /**
    @class

    @extends XM.Info
  */
  XM.QuoteRelation = XM.Info.extend({
    /** @scope XM.QuoteRelation.prototype */

    recordType: 'XM.QuoteRelation',

    editableModel: 'XM.Quote',

    descriptionKey: "number"

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteUrl = XM.Model.extend({
    /** @scope XM.QuoteUrl.prototype */

    recordType: 'XM.QuoteUrl',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteProject = XM.Model.extend({
     /** @scope XM.QuoteProject.prototype */

    recordType: 'XM.QuoteProject',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteIncident = XM.Model.extend({
     /** @scope XM.QuoteIncident.prototype */

    recordType: 'XM.QuoteIncident',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.QuoteOpportunity = XM.Model.extend({
    /** @scope XM.QuoteOpportunity.prototype */

    recordType: 'XM.QuoteOpportunity',

    isDocumentAssignment: true

  });

  /*
    @extends XM.Model
  */
  XM.QuoteCustomer = XM.Model.extend({
    /** @scope XM.QuoteCustomer.prototype */

    recordType: 'XM.QuoteCustomer',

    isDocumentAssignment: true

  });

  /*
    @extends XM.Model
  */
  XM.QuoteToDo = XM.Model.extend({

    recordType: 'XM.QuoteToDo',

    isDocumentAssignment: true

  });

  // ..........................................................
  // COLLECTIONS
  //

  /**
    @class

    @extends XM.Collection
  */
  XM.QuoteListItemCollection = XM.Collection.extend({
    /** @scope XM.QuoteListItemCollection.prototype */

    model: XM.QuoteListItem

  });

  /**
    @class

    @extends XM.Collection
  */
  XM.QuoteRelationCollection = XM.Collection.extend({
    /** @scope XM.QuoteRelationCollection.prototype */

    model: XM.QuoteRelation

  });

}());
