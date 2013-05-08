select xt.install_js('XM','item','xtuple', $$
  /* Copyright (c) 1999-2011 by OpenMFG LLC, d/b/a xTuple. 
     See www.xm.ple.com/CPAL for the full text of the software license. */

  XM.Item = {};
  
  XM.Item.isDispatchable = true;
  
  /**
    Returns the standard unit cost for an item.
    
    @param {Number} item id
    @returns {Number}
  */
  XM.Item.standardCost = function(itemId) {
    var sql = 'select stdcost(item_id) as cost from item where item_number = $1;';
    return plv8.execute(sql, [itemId])[0].cost;
  }

  /** 
   Return the selling units of measure for a given item id.

   @param {Number} item id
   @returns {Array}
  */
  XM.Item.sellingUnits = function(itemId) {
     return XM.Item._units(itemId, 'Selling');
  }

  /** 
   Return the material issue units of measure for a given item id.

   @param {Number} item id
   @returns {Array}
  */
  XM.Item.materialIssueUnits = function(itemId) {
     return XM.Item._units(itemId, '"MaterialIssue"');
  }

  /**
    Returns a tax type id for a given item and tax zone.
    
    @param {Number} item id
    @param {Number} tax zone id
    @returns {Number} tax type id
  */
  XM.Item.taxType = function(itemId, taxZoneId) {
    var sql = 'select getItemTaxType(item_id, $2::integer) as "taxType" from item where item_number = $1;';
    if (taxZoneId) {
      taxZoneId = XT.Data.getId(XT.Orm.fetch('XM','TaxZone'), taxZoneId);
    }
    return plv8.execute(sql, [itemId, taxZoneId])[0].taxType || 0;
  }

  /**
    Returns whether a unit of measure is fractional for a particular item.
    
    @param {Number} item id
    @param {Number} unit id
    @returns {Boolean}
  */
  XM.Item.unitFractional = function(itemId, unitId) {
    var sql = 'select itemuomfractionalbyuom(item_id, uom_id) as "fractional"' +
              'from item, uom where item_number = $1 and uom_name = $2;';
    return plv8.execute(sql, [itemId, unitId])[0].fractional;
  }

  /**
    Returns a unit of measure conversion ratio for a given item, from unit and to unit.
    
    @param {Number} item id
    @param {Number} from unit id
    @param {Number} to unit id
    @returns {Number}
  */
  XM.Item.unitToUnitRatio = function(itemId, fromUnitId, toUnitId) {
    var sql = 'select itemuomtouomratio($1, $2, $3) as "ratio"' +
              'from item, uom fu, uom tu ' +
              'where item_number = $1 and fu.uom_name = $2 and tu.uom_name = $3;';
    return plv8.execute(sql, [itemId, fromUnitId, toUnitId])[0].ratio;
  }
  
  /** @private
   Return the units of measure for a given item id and type.

   @param {Number} item id
   @returns {Array}
  */
  XM.Item._units = function(itemId, type) {
    var sql = "select array("
            + "select uom_id "
            + "from item "
            + "  join uom on item_inv_uom_id=uom_id "
            + "where item_number=$1 "
            + "union "
            + "select itemuomconv_from_uom_id "
            + "from itemuomconv "
            + "  join itemuom on itemuom_itemuomconv_id=itemuomconv_id "
            + "  join uomtype on uomtype_id=itemuom_uomtype_id "
            + "  join item on itemuomconv_item_id=item_id "
            + "where item_number=$1 "
            + "  and uomtype_name=$2 "
            + "union "
            + "select itemuomconv_to_uom_id "
            + "from itemuomconv "
            + "  join itemuom on itemuom_itemuomconv_id=itemuomconv_id "
            + "  join uomtype on uomtype_id=itemuom_uomtype_id "
            + "  join item on itemuomconv_item_id=item_id "
            + "where uomtype_name=$2 "
            + " and item_number=$1) as units ";

     return JSON.stringify(plv8.execute(sql, [itemId, type])[0].units);
  }

$$ );
