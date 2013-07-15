/*jshint bitwise:true, indent:2, curly:true, eqeqeq:true, immed:true,
latedef:true, newcap:true, noarg:true, regexp:true, undef:true,
trailing:true, white:true*/
/*global XT:true, XM:true, XV:true, enyo:true*/

(function () {

  XT.extensions.inventory.initWorkspaces = function () {
    var extensions;

    // ..........................................................
    // CONFIGURE
    //

    enyo.kind({
      name: "XV.InventoryWorkspace",
      kind: "XV.Workspace",
      title: "_configure".loc() + " " + "_inventory".loc(),
      model: "XM.Inventory",
      components: [
        {kind: "Panels", arrangerKind: "CarouselArranger",
          fit: true, components: [
          {kind: "XV.Groupbox", name: "mainPanel", components: [
            {kind: "XV.ScrollableGroupbox", name: "mainGroup", fit: true,
              classes: "in-panel", components: [
              {kind: "onyx.GroupboxHeader", content: "_reporting".loc()},
              {kind: "XV.NumberWidget", attr: "DefaultEventFence",
                label: "_defaultEventFence".loc(), formatting: false},
            	//{kind: "XV.ToggleButtonWidget", attr: "EnableAsOfQOH",
              	//label: "_enableAsOfQOH".loc()},
              {kind: "onyx.GroupboxHeader", content: "_changeLog".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "WarehouseChangeLog",
                label: "_postSiteChanges".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "ItemSiteChangeLog",
                label: "_postItemSiteChanges".loc()},

              {kind: "onyx.GroupboxHeader", content: "_costing".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "AllowAvgCostMethod",
                label: "_allowAvgCostMethod".loc()},
	      			//{kind: "XV.ToggleButtonWidget", attr: "AllowReceiptCostOverride",
                //label: "_allowReceiptCostOverride".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "AllowStdCostMethod",
                label: "_allowStdCostMethod".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "AllowJobCostMethod",
                label: "_allowJobCostMethod".loc()},
	      			// Not bothering to define a kind
              {kind: "XV.PickerWidget", attr: "CountAvgCostMethod",
                label: "_countAvgCostMethod".loc(), collection: "XM.countAvgCostMethod"},
              
	      			{kind: "onyx.GroupboxHeader", content: "_physicalInventory".loc()},
              // Not bothering to define a kind
              {kind: "XV.PickerWidget", attr: "PostCountTagToDefault",
                label: "_postCountTagToDefault".loc(), collection: "XM.postCountTagToDefault"},      
	      			// Not bothering to define a kind
              {kind: "XV.PickerWidget", attr: "CountSlipAuditing",
                label: "_countSlipAuditing".loc(), collection: "XM.countSlipAuditing"},
              {kind: "onyx.GroupboxHeader", content: "_shippingAndReceiving".loc()},
              {kind: "XV.NumberPolicyPicker", attr: "ShipmentNumberGeneration",
                label: "_shipmentNumberPolicy".loc()},
              {kind: "XV.NumberWidget", attr: "NextShipmentNumber",
                label: "_nextShipmentNumber".loc(), formatting: false},
              {kind: "XV.ToggleButtonWidget", attr: "KitComponentInheritCOS",
                label: "_kitComponentInheritCOS".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "DisallowReceiptExcessQty",
                label: "_disableReceiptExcessQty".loc()},
              {kind: "XV.ToggleButtonWidget", attr: "WarnIfReceiptQtyDiffers",
                label: "_warnIfReceiptQtyDiffers".loc()},
              {kind: "XV.NumberWidget", attr: "ReceiptQtyTolerancePct",
                label: "_receiptQtyTolerancePct".loc(), formatting: false},
              {kind: "XV.ToggleButtonWidget", attr: "RecordPPVonReceipt",
                label: "_recordPPVOnReceipt".loc()}
            ]}
          ]}
        ]}
      ]
    });

    // ..........................................................
    // ORDER
    //

  enyo.kind({
    name: "XV.OrderLineWorkspace",
    kind: "XV.Workspace",
    title: "_orderLine".loc(),
    headerAttrs: ["number", "-", "name"],
    model: "XM.OrderLine",
    handlers: {
      onSavePrompt: "savePrompt"
    },
    components: [
      {kind: "Panels", arrangerKind: "CarouselArranger",
        fit: true, components: [
        {kind: "XV.Groupbox", name: "mainPanel", components: [
          {kind: "onyx.GroupboxHeader", content: "_orderLines".loc()},
          {kind: "XV.ScrollableGroupbox", name: "lines", fit: true, classes: "in-panel", components: [
					//	{kind: "Repeater", name: "lineItemsList", onSetupItem: "setupLineItem", count: 0, components: [
					//		{name: "lineItem"}
					//	]}
					]}
				]}
			]}
    ]
  });
/*
  setupLineItem: function (inSender, inEvent) {
    var row = inEvent.item.$.lineItem,
      model = this._collection.at(inEvent.index);
    row.setValue(model);
    if (inEvent.index === 0) {
      row.initializeNew();
    }
    return true;
  };
*/
  XV.registerModelWorkspace("XM.OrderRelation", "XV.OrderLineWorkspace");
  XV.registerModelWorkspace("XM.OrderListItem", "XV.OrderLineWorkspace");
  XV.registerModelWorkspace("XM.OrderLine", "XV.OrderLineWorkspace");

  };

  // ..........................................................
  // SHIPMENT
  //

  enyo.kind({
    name: "XV.ShipmentWorkspace",
    kind: "XV.Workspace",
    title: "_shipment".loc(),
    model: "XM.Shipment",
    components: [
      {kind: "Panels", arrangerKind: "CarouselArranger",
        fit: true, components: [
        {kind: "XV.Groupbox", name: "mainPanel", components: [
          {kind: "onyx.GroupboxHeader", content: "_overview".loc()},
          {kind: "XV.ScrollableGroupbox", name: "mainGroup",
            classes: "in-panel", fit: true, components: [
            {kind: "XV.InputWidget", attr: "number"},
            {kind: "XV.SalesOrderWidget", attr: "order"},
            {kind: "XV.InputWidget", attr: "shipVia"},
            {kind: "XV.InputWidget", attr: "shipDate"}
          ]}
				]},
        {kind: "XV.Groupbox", name: "lineItemsPanel", components: [
        	{kind: "onyx.GroupboxHeader", content: "_lineItems".loc()},
					{kind: "XV.ScrollableGroupbox", name: "lineItems", classes: "in-panel", components: [
						{kind: "XV.ShipmentLineBox", attr: "issued"}
					]}
				]}
      ]}
    ]
  });

  XV.registerModelWorkspace("XM.ShipmentLine", "XV.ShipmentWorkspace");
  XV.registerModelWorkspace("XM.ShipmentListItem", "XV.ShipmentWorkspace");
  XV.registerModelWorkspace("XM.Shipment", "XV.ShipmentWorkspace");

}());
