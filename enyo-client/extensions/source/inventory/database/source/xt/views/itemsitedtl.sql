select xt.create_view('xt.itemsitedtl', $$
   select itemloc.*,  
     itemsite.obj_uuid as itemsite_uuid,
     0 as distributed
   from itemloc
     join itemsite on itemsite_id = itemloc_itemsite_id;
$$);
