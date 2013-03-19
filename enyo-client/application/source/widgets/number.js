/*jshint node:true, indent:2, curly:true eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, trailing:true, white:true */
/*global XT:true, XV:true, Globalize:true, enyo:true, _:true */

(function () {

  // ..........................................................
  // COST
  //

  enyo.kind({
    name: "XV.Cost",
    kind: "XV.Number",
    scale: XT.COST_SCALE
  });

  enyo.kind({
    name: "XV.CostWidget",
    kind: "XV.NumberWidget",
    scale: XT.COST_SCALE
  });

  // ..........................................................
  // EXTENDED PRICE
  //

  enyo.kind({
    name: "XV.ExtendedPrice",
    kind: "XV.Number",
    scale: XT.EXTENDED_PRICE_SCALE
  });

  enyo.kind({
    name: "XV.ExtendedPriceWidget",
    kind: "XV.NumberWidget",
    scale: XT.EXTENDED_PRICE_SCALE
  });

  // ..........................................................
  // MONEY
  //

  enyo.kind({
    kind: "XV.NumberWidget",
    name: "XV.MoneyWidget",
    classes: "xv-moneywidget",
    published: {
      scale: XT.MONEY_SCALE,
      amount: null,
      currency: null,
      effective: null,
      currencyDisabled: false,
      currencyShowing: true
    },
    handlers: {
      onSelect: "inputChanged"
    },
    components: [
      {kind: "FittableColumns", components: [
        {name: "label", content: "", classes: "xv-label"},
        {kind: "onyx.InputDecorator", classes: "xv-input-decorator",
          components: [
          {name: "input", kind: "onyx.Input", attr: "amount",
            onchange: "inputChanged", onkeydown: "keyDown"}
        ]},
        {name: "picker", kind: "XV.CurrencyPicker",
          attr: "currency", showLabel: false}
      ]},
      {kind: "FittableColumns", name: "basePanel", showing: false,
        components: [
        {name: "spacer", content: "", classes: "xv-label"},
        {kind: "onyx.InputDecorator", classes: "xv-input-decorator",
          components: [
          {name: "baseAmount"}
        ]},
        {kind: "onyx.InputDecorator", classes: "xv-input-decorator",
          components: [
          {name: "baseLabel"}
        ]}
      ]}
    ],
    /**
      If the effective date is provided, the fixedRate is set and the
      base panel is shown.
     */
    create: function () {
      this.inherited(arguments);
      this.setCurrency(XT.baseCurrency());
      this.$.picker.setValue(this.getCurrency(), {silent: true});
      this.$.baseLabel.setContent(XT.baseCurrency().get('abbreviation'));
      // the currency picker may be disabled or hidden on creation in certain situations
      this.$.picker.setDisabled(this.getCurrencyDisabled());
      this.$.picker.setShowing(this.getCurrencyShowing());
    },
    effectiveChanged: function () {
      this.setBasePanelShowing();
    },
    /**
      Sets visibility of base panel
     */
    setBasePanelShowing: function () {
      var showing = _.isDate(this.getEffective()) && this.getCurrency() && !this.getCurrency().get("isBase");
      if (showing) {
        this.setBaseAmount(this.getAmount());
      }
      this.$.basePanel.setShowing(showing);
    },

    setBaseAmount: function (value) {
      var options = {}, that = this;
      if (value || value === 0) {
        options.success = function (basePrice) {
          var amt = basePrice || basePrice === 0 ? Globalize.format(basePrice, "n" + that.getScale()) : "";
          that.$.baseAmount.setContent(amt);
        };
        that.getCurrency().toBase(value, that.getEffective(), options);
      }
    },

    /**
    If the effective date is available,
    calculate the base currency amount based on the fixed rate
    when the amount or currency are changed.
    */
    inputChanged: function (inSender, inEvent) {
      // only show the base panel if there is an effect date AND the currency doesn't match the base
      // Set base label with calculated value
      this.setBasePanelShowing();
      this.inherited(arguments);
    },

    /**
    This setDisabled function is all or nothing for both widgets
    depending on value
    */
    setDisabled: function (isDisabled) {
      this.$.input.setDisabled(isDisabled);
      this.$.picker.setDisabled(this.currencyDisabled || isDisabled);
    },

    /**
    This setValue function handles a value which is an
      object consisting of two key/value pairs for the
      amount and currency controls. It can also handle just
      a number as the value, which it will assume to be the amount
    */
    setValue: function (value, options) {
      var oldValue,
        inEvent,
        amountAttr,
        newValue;

      // support how this function is used by the base class.
      // assume if we get a number, that means the amount
      if (typeof value === 'number') {
        value = {amount: value};
      }

      options = options || {};
      for (var attribute in value) {
        if (value.hasOwnProperty(attribute)) {
          newValue = value[attribute];
          if (attribute === "amount") {
            oldValue = this.amount;
            if (oldValue !== newValue) {
              this.setAmount(newValue);
              this.valueChanged(newValue);
              // the subwidget does not know its own attr, but we know what
              // it is because it's stored in our attr hash. substitute it.
              // that's all the workspace needs to know about the originator
              amountAttr = this.attr.amount;
              inEvent = { value: newValue, originator: {attr: amountAttr }};
              if (!options.silent) { this.doValueChange(inEvent); }
            }
          } else if (attribute === "currency") {
            oldValue = this.getCurrency();
            if (newValue && oldValue !== newValue) {
              this.setCurrency(newValue);
              this.$.picker.setValue(this.getCurrency(), options);
            }
          }
          // only show the base panel if there is an effect date AND the currency doesn't match the base
          // Set base label with calculated value
          this.setBasePanelShowing();
        }
      }
    }
  });

  // ..........................................................
  // PERCENT
  //

  enyo.kind({
    name: "XV.Percent",
    kind: "XV.Number",
    scale: XT.PERCENT_SCALE,
    validate: function (value) {
      return value && _.isNumber(value) ? value / 100 : null;
    },
    valueChanged: function (value) {
      value = !_.isNaN(value) ? value * 100 : value;
      XV.Number.prototype.valueChanged.call(this, value);
    }
  });

  enyo.kind({
    name: "XV.PercentWidget",
    kind: "XV.NumberWidget",
    scale: XT.PERCENT_SCALE,
    validate: function (value) {
      return value && !_.isNaN(value) ? value / 100 : null;
    },
    valueChanged: function (value) {
      value = !_.isNaN(value) ? value * 100 : value;
      XV.NumberWidget.prototype.valueChanged.call(this, value);
    }
  });

  // ..........................................................
  // PURCHASE PRICE
  //

  enyo.kind({
    name: "XV.PurchasePrice",
    kind: "XV.Number",
    scale: XT.PURCHASE_PRICE_SCALE
  });

  enyo.kind({
    name: "XV.PurchasePriceWidget",
    kind: "XV.NumberWidget",
    scale: XT.PURCHASE_PRICE_SCALE
  });

  // ..........................................................
  // QUANTITY
  //

  enyo.kind({
    name: "XV.Quantity",
    kind: "XV.Number",
    scale: XT.QTY_SCALE
  });

  enyo.kind({
    name: "XV.QuantityWidget",
    kind: "XV.NumberWidget",
    scale: XT.QTY_SCALE
  });

  // ..........................................................
  // QUANTITY PER
  //

  enyo.kind({
    name: "XV.QuantityPer",
    kind: "XV.Number",
    scale: XT.QTY_PER_SCALE
  });

  enyo.kind({
    name: "XV.QuantityPerWidget",
    kind: "XV.NumberWidget",
    scale: XT.QTY_PER_SCALE
  });

  // ..........................................................
  // SALES PRICE
  //

  enyo.kind({
    name: "XV.SalesPrice",
    kind: "XV.Number",
    scale: XT.SALES_PRICE_SCALE
  });

  enyo.kind({
    name: "XV.SalesPriceWidget",
    kind: "XV.NumberWidget",
    scale: XT.SALES_PRICE_SCALE
  });

  // ..........................................................
  // UNIT RATIO
  //

  enyo.kind({
    name: "XV.UnitRatio",
    kind: "XV.Number",
    scale: XT.UNIT_RATIO_SCALE
  });

  enyo.kind({
    name: "XV.UnitRatioWidget",
    kind: "XV.NumberWidget",
    scale: XT.UNIT_RATIO_SCALE
  });

  // ..........................................................
  // WEIGHT
  //

  enyo.kind({
    name: "XV.Weight",
    kind: "XV.Number",
    scale: XT.WEIGHT_SCALE
  });

  enyo.kind({
    name: "XV.WeightWidget",
    kind: "XV.NumberWidget",
    scale: XT.WEIGHT_SCALE
  });

}());
