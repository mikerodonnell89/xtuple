/*jshint indent:2, curly:true, eqeqeq:true, immed:true, latedef:true,
newcap:true, noarg:true, regexp:true, undef:true, strict:true, trailing:true,
white:true*/
/*global XT:true, XM:true, Backbone:true, _:true */

(function () {

  "use strict";

  /**
    @class

    @extends XM.SalesOrderBase
  */
  XM.SalesOrder = XM.SalesOrderBase.extend(
    /** @lends XM.SalesOrder.prototype */{

    recordType: 'XM.SalesOrder',

    nameAttribute: 'number',

    numberPolicySetting: 'CONumberGeneration',

    documentDateKey: "orderDate",

    /**
      Add default for wasQuote.
     */
    defaults: function () {
      var defaults = XM.SalesOrderBase.prototype.defaults.apply(this, arguments);

      defaults.wasQuote = false;

      return defaults;
    },

    convertFromQuote: function (id) {
      var matchingArray = [],
        soAttrs = XM.SalesOrder.getAttributeNames(),
        quoteAttrs = XM.Quote.getAttributeNames(),
        quote = new XM.Quote(),
        fetchOptions = {},
        that = this;

      fetchOptions.id = id;

      fetchOptions.success = function (resp) {
        //find all the matching attributes
        for (var i = 0; i < soAttrs.length; i++) {
          if (quoteAttrs.indexOf(soAttrs[i]) !== -1) {
            matchingArray.push(soAttrs[i]);
          }
        }
        for (var i = 0; i < matchingArray.length; i++) {
          if (matchingArray[i] !== 'lineItems')
            that.set(matchingArray[i], quote.get(matchingArray[i]));
          else {
            //need to convert quote lines to sales order lines
            var quoteLineItems = quote.get('lineItems'),
              salesOrderLineItems = new XM.SalesOrderLineCollection(),
              salesOrderLine = new XM.SalesOrderLine(),
              quoteLine = new XM.QuoteLine(),
              fetchOptions2 = {},
              matchingArray2 = [],
              notMatchingArray2 = [],
              quoteLineAttrs = XM.QuoteLine.getAttributeNames(),
              soLineAttrs = XM.SalesOrderLine.getAttributeNames();

            for (var i = 0; i < soLineAttrs.length; i++) {
              if (quoteLineAttrs.indexOf(soLineAttrs[i]) !== -1)
                matchingArray2.push(soLineAttrs[i]);
              else
                notMatchingArray2.push(soLineAttrs[i]);
            }

            _.each(quoteLineItems.models, function (line) {

              fetchOptions2.id = line.get('id');

              fetchOptions2.success = function (resp) {
                for (var i = 0; i < matchingArray2.length; i++) {
                  salesOrderLine.set(matchingArray2[i], line.get(matchingArray2[i]));
                }
              }
              fetchOptions2.error = function (resp) {
                console.log("could not fetch quote line");
              }
              quoteLine.fetch();
              salesOrderLineItems.add(salesOrderLine);
            });

            that.set('lineItems', salesOrderLineItems);
          }
        }
        //the attrs below are ones with names that don't match between
        //  quotes and sales orders
        that.set('id', 1891731)
        that.set('orderDate', quote.get('quoteDate'));
        that.set('wasQuote', true);
        that.set('quoteNumber', quote.get('number'));
        that.setReadOnly("number", false);
        that.set("number", quote.get("number"));
        that.setReadOnly("number", true);
        that.revertStatus();
        that.checkConflicts = false;
        that.save();
      };
      fetchOptions.error = function (resp) {
        XT.log("Fetch failed in convertFromSalesOrder");
      };
      this.setStatus(XM.Model.BUSY_FETCHING);
      quote.fetch(fetchOptions);
    }
  });

  /**
    @class

    @extends XM.SalesOrderLineBase
  */
  XM.SalesOrderLine = XM.SalesOrderLineBase.extend(/** @lends XM.SalesOrderLine.prototype */{

    recordType: 'XM.SalesOrderLine',

    parentKey: 'salesOrder',

    lineCharacteristicRecordType: "XM.SalesOrderLineCharacteristic",

    /**
      Add defaults for firm, and subnumber.
     */
    defaults: function () {
      var defaults = XM.SalesOrderLineBase.prototype.defaults.apply(this, arguments);

      defaults.firm = false;
      defaults.subnumber = 0;

      return defaults;
    }
  });


  /**
    @class

    @extends XM.Comment
  */
  XM.SalesOrderComment = XM.Comment.extend(/** @lends XM.SalesOrderComment.prototype */{

    recordType: 'XM.SalesOrderComment',

    sourceName: 'S'

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderAccount = XM.Model.extend(/** @lends XM.SalesOrderAccount.prototype */{

    recordType: 'XM.SalesOrderAccount',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderContact = XM.Model.extend(/** @lends XM.SalesOrderContact.prototype */{

    recordType: 'XM.SalesOrderContact',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderFile = XM.Model.extend(/** @lends XM.SalesOrderFile.prototype */{

    recordType: 'XM.SalesOrderFile',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderItem = XM.Model.extend(/** @lends XM.SalesOrderItem.prototype */{

    recordType: 'XM.SalesOrderItem',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.CharacteristicAssignment
  */
  XM.SalesOrderLineCharacteristic = XM.CharacteristicAssignment.extend(/** @lends XM.SalesOrderLineCharacteristic.prototype */{

    recordType: 'XM.SalesOrderLineCharacteristic',

    readOnlyAttributes: [
      "price"
    ]

  });

  /**
    @class

    @extends XM.Comment
  */
  XM.SalesOrderLineComment = XM.Comment.extend(/** @lends XM.SalesOrderLineComment.prototype */{

    recordType: 'XM.SalesOrderLineComment',

    sourceName: 'SI'

  });

  /**
    @class

    @extends XM.Info
  */
  XM.SalesOrderListItem = XM.Info.extend(/** @lends XM.SalesOrderListItem.prototype */{

    recordType: 'XM.SalesOrderListItem',

    editableModel: 'XM.SalesOrder'

  });

  /**
    @class

    @extends XM.Info
  */
  XM.SalesOrderRelation = XM.Info.extend(/** @lends XM.SalesOrderRelation.prototype */{

    recordType: 'XM.SalesOrderRelation',

    editableModel: 'XM.SalesOrder',

    descriptionKey: "number"

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderUrl = XM.Model.extend(/** @lends XM.SalesOrderUrl.prototype */{

    recordType: 'XM.SalesOrderUrl',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderProject = XM.Model.extend(/** @lends XM.SalesOrderProject.prototype */{

    recordType: 'XM.SalesOrderProject',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderIncident = XM.Model.extend(/** @lends XM.SalesOrderIncident.prototype */{

    recordType: 'XM.SalesOrderIncident',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderOpportunity = XM.Model.extend(/** @lends XM.SalesOrderOpportunity.prototype */{

    recordType: 'XM.SalesOrderOpportunity',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderCustomer = XM.Model.extend(/** @lends XM.SalesOrderCustomer.prototype */{

    recordType: 'XM.SalesOrderCustomer',

    isDocumentAssignment: true

  });

  /**
    @class

    @extends XM.Model
  */
  XM.SalesOrderToDo = XM.Model.extend(/* @lends XM.SalesOrderToDo */{

    recordType: 'XM.SalesOrderToDo',

    isDocumentAssignment: true

  });

  // ..........................................................
  // COLLECTIONS
  //

  /**
    @class

    @extends XM.Collection
  */
  XM.SalesOrderListItemCollection = XM.Collection.extend(/** @lends XM.SalesOrderListItemCollection.prototype */{

    model: XM.SalesOrderListItem

  });

  /**
    @class

    @extends XM.Collection
  */
  XM.SalesOrderRelationCollection = XM.Collection.extend(/** @lends XM.SalesOrderRelationCollection.prototype */{

    model: XM.SalesOrderRelation

  });

  /**
    @class

    @extends XM.Collection
  */
  XM.SalesOrderLineCollection = XM.Collection.extend(/** @lends XM.SalesOrderLineCollection.prototype */{

    model: XM.SalesOrderLine

  });

}());
