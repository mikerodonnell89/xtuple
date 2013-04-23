select xt.install_js('XM','Sales','xtuple', $$
/* Copyright (c) 1999-2011 by OpenMFG LLC, d/b/a xTuple. 
   See www.xtuple.com/CPAL for the full text of the software license. */

  XM.Sales = {};

  XM.Sales.isDispatchable = true;

  XM.Sales.options = [
    "CONumberGeneration",
    "CMNumberGeneration",
    "QUNumberGeneration",
    "InvcNumberGeneration",
    "NextSalesOrderNumber",
    "NextCreditMemoNumber",
    "NextQuoteNumber",
    "NextInvoiceNumber",
    "InvoiceDateSource",
    "QuoteChangeLog",
    "ShowQuotesAfterSO",
    "AllowDiscounts",
    "AllowASAPShipSchedules",
    "SalesOrderChangeLog",
    "RestrictCreditMemos",
    "AutoSelectForBilling",
    "AlwaysShowSaveAndAdd",
    "FirmSalesOrderPackingList",
    "DisableSalesOrderPriceOverride",
    "AutoAllocateCreditMemos",
    "HideSOMiscCharge",
    "EnableSOShipping",
    "DefaultPrintSOOnSave",
    "UsePromiseDate",
    "CalculateFreight",
    "IncludePackageWeight",
    "ShowQuotesAfterSO",
    "soPriceEffective",
    "UpdatePriceLineEdit",
    "IgnoreCustDisc",
    "CustomerChangeLog",
    "DefaultShipFormId",
    "DefaultShipViaId",
    "DefaultBalanceMethod",
    "DefaultCustType",
    "DefaultSalesRep",
    "DefaultTerms",
    "DefaultPartialShipments",
    "DefaultBackOrders",
    "DefaultFreeFormShiptos",
    "SOCreditLimit",
    "SOCreditRate"
  ]
  
  /**
   Returns an array of freight detail records based on input

   @param {Number} Customer id
   @param {Number} Shipto id
   @param {Number} Ship Zone id
   @param {Date} Quote Date
   @param {String} Ship Via
   @param {Number} Currency Id
   @param {Number} Site Id
   @param {Number} Freight Class Id
   @param {Number} Weight
   
   @returns Array 
  */
  XM.Sales.freightDetail = function(customerId, shiptoId, shipZoneId, orderDate, shipVia, currencyId, siteId, freightClassId, weight) {
    var sql1 = "select custtype_id, custtype_code from custinfo join custtype on custtype_id=cust_custtype_id where cust_id=$1;",
      sql2 = "select shipto_num from shiptoinfo where shipto_id=$1;",
      sql3 = "select currconcat($1) as currabbr;",
      sql4 = "select * from calculatefreightdetail($1, $2, $3, $4::integer, $5::integer, $6, $7::date, $8, $9, $10, $11, $12::integer, $13::numeric);",
      customerTypeId,
      customerTypeCode,
      currencyAbbreviation,
      shipToNumber,
      query,
      row,
      results = [],
      i;

    /* Fetch customer type information */
    query = plv8.execute(sql1, [customerId]);
    if (!query.length) { plv8.elog(ERROR, "Invalid Customer") };
    customerTypeId = query[0].custtype_id;
    customerTypeCode = query[0].custtype_code;

    /* Fetch shipto information */
    if (shiptoId) {
      query = plv8.execute(sql2, [shiptoId]);
      if (!query.length) { plv8.elog(ERROR, "Invalid Shipto") };
      shiptoNumber = query[0].shipto_num;
    } else {
      shiptoId = -1;
      shiptoNumber = "";
    }

    /* Fetch currency */
    query = plv8.execute(sql3, [currencyId]);
    if (!query.length) { plv8.elog(ERROR, "Invalid Currency") };
    currencyAbbreviation = query[0].currabbr;

    /* Get the data */
    query = plv8.execute(sql4, [customerId, customerTypeId, customerTypeCode,
      shiptoId, shipZoneId, shiptoNumber, orderDate, shipVia, currencyId, currencyAbbreviation,
      siteId, freightClassId, weight]);

    /* Finally, map to JavaScript friendly names */
    for (i = 0; i < query.length; i++) {
      row = query[i];
      results.push({
        schedule: row.freightdata_schedule,
        from: row.freightdata_from,
        to: row.freightdata_to,
        shipVia: row.freightdata_shipvia,
        freightClass: row.freightdata_freightclass,
        weight: row.freightdata_weight,
        unit: row.freightdata_uom,
        price: row.freightdata_price,
        type: row.freightdata_type,
        total: row.freightdata_total,
        currency: row.freightdata_currency
      });
    }
    return JSON.stringify(results);
  };

  /* 
  Return Sales configuration settings.

  @returns {Object}
  */
  XM.Sales.settings = function() {
    var keys = XM.Sales.options.slice(0),
        data = Object.create(XT.Data),
        sql = "select orderseq_number as value "
            + "from orderseq"
            + " where (orderseq_name=$1)",
        ret = {},
        qry;
    
    ret.NextSalesOrderNumber = plv8.execute(sql, ['SoNumber'])[0].value;
    ret.NextQuoteNumber = plv8.execute(sql, ['QuNumber'])[0].value;
    ret.NextCreditMemoNumber = plv8.execute(sql, ['CmNumber'])[0].value;
    ret.NextInvoiceNumber = plv8.execute(sql, ['InvcNumber'])[0].value;
    
    ret = XT.extend(ret, data.retrieveMetrics(keys));
    
    return JSON.stringify(ret);
  }
  
  /* 
  Update Sales configuration settings. Only valid options as defined in the array
  XM.Sales.options will be processed.

   @param {Object} settings
   @returns {Boolean}
  */
  XM.Sales.commitSettings = function(settings) {
    var sql, options = XM.Sales.options.slice(0),
        data = Object.create(XT.Data), metrics = {};
        
    /* check privileges */
    if(!data.checkPrivilege('ConfigureSO')) throw new Error('Access Denied');

    /* update numbers */
    if(settings['NextSalesOrderNumber']) {
      plv8.execute('select setNextSoNumber($1)', [settings['NextSalesOrderNumber'] - 0]);
    }
    options.remove('NextSalesOrderNumber');

    if(settings['NextCreditMemoNumber']) {
      plv8.execute('select setNextCmNumber($1)', [settings['NextCreditMemoNumber'] - 0]);
    }
    options.remove('NextCreditMemoNumber');
    
    if(settings['NextQuoteNumber']) {
      plv8.execute('select setNextQuNumber($1)', [settings['NextQuoteNumber'] - 0]);
    }
    options.remove('NextQuoteNumber');

    if(settings['NextInvoiceNumber']) {
      plv8.execute('select setNextInvcNumber($1)', [settings['NextInvoiceNumber'] - 0]);
    }
    options.remove('NextInvoiceNumber');
  
  /* update remaining options as metrics
       first make sure we pass an object that only has valid metric options for this type */
    for(var i = 0; i < options.length; i++) {
      var prop = options[i];
      if(settings[prop] !== undefined) metrics[prop] = settings[prop];
    }
 
    return data.commitMetrics(metrics);
  }
  
$$ );
