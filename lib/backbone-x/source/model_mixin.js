// Contributions of status related functionality borrowed from SproutCore:
// https://github.com/sproutcore/sproutcore

/*jshint indent:2, curly:true eqeqeq:true, immed:true, latedef:true,
newcap:true, noarg:true, regexp:true, undef:true, strict:true, trailing:true
white:true*/
/*global XT:true, XM:true, Backbone:true, _:true, setInterval:true, clearInterval:true */

(function () {
  "use strict";

  /**
    A model mixin used as the base for all models.

    @seealso XM.Model
    @seealso XM.SimpleModel
  */
  XM.ModelMixin = {

    /**
      Set to true if you want an id fetched from the server when the `isNew` option
      is passed on a new model.

      @type {Boolean}
    */
    autoFetchId: true,

    /**
      Are there any binary fields that we might need to worry about transforming?
      see issue 18661
    */
    binaryField: null,

    /**
      Differentiates models that belong to postbooks instances versus models
      that belong to the global database
    */
    databaseType: 'instance',

    /**
      The last error message reported.
    */
    lastError: null,

    /**
      A hash of attributes originally fetched from the server.
    */
    prime: null,

    /**
      A hash structure that defines data access.

      @type {Hash}
    */
    privileges: null,

    /**
      Indicates whether the model is read only.

      @type {Boolean}
    */
    readOnly: false,

    /**
      An array of attribute names designating attributes that are not editable.
      Use `setReadOnly` to edit this array.

      @seealso `setReadOnly`
      @seealso `isReadOnly`
      @type {Array}
    */
    readOnlyAttributes: null,

    /**
      The attribute that is the display name for the model in any case that we
      want to show just the most obvious field for the user.

      @type {String}
    */
    nameAttribute: "name",

    /**
      Specify the name of a data source model here.

      @type {String}
    */
    recordType: null,

    /**
      An array of required attributes. A `validate` will fail until all the required
      attributes have values.

      @type {Array}
    */
    requiredAttributes: null,

    /**
      Model's status. You should never modify this directly.

      @seealso `getStatus`
      @seealse `setStatus`
      @type {Number}
      @default `EMPTY`
    */
    status: null,


    // ..........................................................
    // METHODS
    //

    //
    // All four of the canVerb functions are defined below as class-level
    // functions (akin to static functions). Two of those functions are here
    // as instance functions as well. These just call the class functions.
    // Notice that canCreate and canRead are missing here. This is on purpose.
    // Once we have an instance created, there's no reason to ask if we can create
    // it.
    //

    /**
      Returns whether the current record can be updated based on privilege
      settings.

      @returns {Boolean}
    */
    canUpdate: function () {
      return this.getClass().canUpdate(this);
    },

    /**
      Returns whether the current record can be deleted based on privilege
      settings.

      @returns {Boolean}
    */
    canDelete: function () {
      return this.getClass().canDelete(this);
    },

    /**
      Returns only attribute records that have changed.

      @type Hash
    */
    changeSet: function () {
      var attributes = this.toJSON();

      // recursive function that does the work
      var changedOnly = function (attrs) {
        var ret = null,
          i,
          prop,
          val;
        if (attrs && attrs.dataState !== 'read') {
          ret = {};
          for (prop in attrs) {
            if (attrs[prop] instanceof Array) {
              ret[prop] = [];
              // loop through array and only include dirty items
              for (i = 0; i < attrs[prop].length; i++) {
                val = changedOnly(attrs[prop][i]);
                if (val) {ret[prop].push(val); }
              }
            } else {
              ret[prop] = attrs[prop];
            }
          }
        }
        return ret;
      };

      // do the work
      return changedOnly(attributes);
    },

    /**
      Reimplemented to handle state change. Calling
      `destroy` will cause the model to commit to the server
      immediately.

      @returns {XT.Request|Boolean}
    */
    destroy: function (options) {
      options = options ? _.clone(options) : {};

      var model = this,
          result,
          success = options.success,
          K = XM.ModelClassMixin;

      this.setStatus(K.BUSY_DESTROYING);
      options.wait = true;
      options.success = function (resp) {
        if (XT.debugging) {
          XT.log('Destroy successful');
        }
        XT.log('Destroy successful');
        if (success) { success(model, resp, options); }
      };
      result = Backbone.Model.prototype.destroy.call(this, options);
      delete this._wasNew;
      return result;
    },

    /**
      When any attributes change, store the original value(s) in `prime`
      and update the status if applicable.
    */
    didChange: function (model, options) {
      model = model || {};
      options = options || {};
      var K = XM.ModelClassMixin,
        status = this.getStatus(),
        attr;
      if (this.isBusy()) { return; }

      // Update `prime` with original attributes for tracking
      if (this.isReady()) {
        for (attr in this.changed) {
          if (this.changed.hasOwnProperty(attr) &&
              this.prime[attr] === undefined) {
            this.prime[attr] = this.previous(attr);
          }
        }
      }

      // Mark dirty if we should
      if (status === K.READY_CLEAN) {
        this.setStatus(K.READY_DIRTY);
      }
    },

    /**
      Called after confirmation that the model was destroyed on the
      data source.
    */
    didDestroy: function () {
      var K = XM.ModelClassMixin;
      this.clear({silent: true});
      this.setStatus(K.DESTROYED_CLEAN);
    },

    /**
      Handle a `sync` response that was an error.
    */
    didError: function (model, resp) {
      model = model || {};
      this.lastError = resp;
      XT.log(resp);
    },

    /**
      Called when model is instantiated.
    */
    initialize: function (attributes, options) {
      attributes = attributes || {};
      options = options || {};
      var klass,
          K = XM.ModelClassMixin,
          status = this.getStatus();

      // Validate
      if (_.isEmpty(this.recordType)) { throw 'No record type defined'; }
      if (status !== K.EMPTY) {
        throw 'Model may only be intialized from a status of EMPTY.';
      }

      // Set defaults if not provided
      this.prime = {};
      this.privileges = this.privileges || {};
      this.readOnlyAttributes = this.readOnlyAttributes ?
        this.readOnlyAttributes.slice(0) : [];
      this.requiredAttributes = this.requiredAttributes ?
        this.requiredAttributes.slice(0) : [];

      // Handle options
      if (options.isNew) {
        klass = this.getClass();
        if (!klass.canCreate()) {
          throw 'Insufficent privileges to create a record.';
        }
        this.setStatus(K.READY_NEW);
        if (this.autoFetchId) { this.fetchId(); }
      }

      // Set attributes that should be required and read only
      if (this.idAttribute) { this.setReadOnly(this.idAttribute); }
      if (this.idAttribute &&
          !_.contains(this.requiredAttributes, this.idAttribute)) {
        this.requiredAttributes.push(this.idAttribute);
      }
      this.setReadOnly('type');

      // Bind events, but only if we haven't already been here before
      if (!this._didInit) {
        this.on('change', this.didChange);
        this.on('error', this.didError);
        this.on('destroy', this.didDestroy);
        this.on('change:lock', this.lockDidChange);
        this._didInit = true;
      }
    },

    lockDidChange: function (model, lock) {
      var that = this,
        options = {};

      // Clear any old refresher
      if (this._keyRefresherInterval) {
        clearInterval(this._keyRefresherInterval);
        that._keyRefresherInterval = undefined;
      }

      if (lock && lock.key && !this._keyRefresherInterval) {
        options.automatedRefresh = true;
        options.success = function (renewed) {
          // If for any reason the lock was not renewed (maybe got disconnected?)
          // Update the model so it knows.
          var lock = that.get('lock');
          if (lock && !renewed) {
            lock = _.clone(lock);
            delete lock.key;
            that.set('lock', lock);
          }
        };

        // set up a refresher
        this._keyRefresherInterval = setInterval(function () {
          that.dispatch('XM.Model', 'renewLock', [lock.key], options);
        }, 25 * 1000);

      }
    },

    /*
      Forward a dispatch request to the data source. Runs a "dispatchable" database function.
      Include a `success` callback function in options to handle the result.

      @param {String} Name of the class
      @param {String} Function name
      @param {Object} Parameters
      @param {Object} Options
    */
    dispatch: function (name, func, params, options) {
      options = options ? _.clone(options) : {};
      if (!options.databaseType) { options.databaseType = this.databaseType; }
      var dataSource = options.dataSource || XT.dataSource;
      return dataSource.dispatch(name, func, params, options);
    },

    /*
      Reimplemented to handle status changes.

      @param {Object} Options
      @returns {XT.Request} Request
    */
    fetch: function (options) {
      options = options ? _.clone(options) : {};
      var model = this,
        K = XM.ModelClassMixin,
        success = options.success,
        klass = this.getClass();

      if (klass.canRead()) {
        this.setStatus(K.BUSY_FETCHING);
        options.success = function (resp) {
          model.setStatus(K.READY_CLEAN, options);
          if (XT.debugging) {
            XT.log('Fetch successful');
          }
          if (success) { success(model, resp, options); }
        };
        return Backbone.Model.prototype.fetch.call(this, options);
      }
      XT.log('Insufficient privileges to fetch');
      return false;
    },

    /**
      Set the id on this record an id from the server. Including the `cascade`
      option will call ids to be fetched recursively for `HasMany` relations.

      @returns {XT.Request} Request
    */
    fetchId: function (options) {
      options = _.defaults(options ? _.clone(options) : {}, {});
      var that = this;
      if (!this.id) {
        options.success = function (resp) {
          that.set(that.idAttribute, resp, options);
        };
        this.dispatch('XM.Model', 'fetchId', this.recordType, options);
      }
    },

    /**
      Return a matching record id for a passed user `key` and `value`. If none
      found, returns zero.

      @param {String} Property to search on, typically a user key
      @param {String} Value to search for
      @param {Object} Options
      @param {Function} [options.succss] Callback on success
      @param {Function} [options.error] Callback on error
      @returns {Object} Receiver
    */
    findExisting: function (key, value, options) {
      options = options || {};
      options.databaseType = options.databaseType || this.databaseType;
      return this.getClass().findExisting.call(this, key, value, options);
    },

    /**
      Valid attribute names that can be used on this model based on the
      data source definition, whether or not they already exist yet on the
      current instance.

      @returns {Array}
    */
    getAttributeNames: function () {
      return this.getClass().getAttributeNames.call(this);
    },

    /**
      Returns the current model prototype class.

      @returns {Object}
    */
    getClass: function () {
      return Object.getPrototypeOf(this).constructor;
    },

    /**
      Return the current status.

      @returns {Number}
    */
    getStatus: function () {
      return this.status;
    },

    /**
      Return the current status as as string.

      @returns {String}
    */
    getStatusString: function () {
      var ret = [],
        status = this.getStatus(),
        prop;
      for (prop in XM.ModelClassMixin) {
        if (XM.ModelClassMixin.hasOwnProperty(prop)) {
          if (prop.match(/[A-Z_]$/) && XM.ModelClassMixin[prop] === status) {
            ret.push(prop);
          }
        }
      }
      return ret.join(" ");
    },

    /**
      Searches attributes first, if not found then returns either a function call
      or property value that matches the key. It supports search on an attribute path
      through a model hierarchy.
      @param {String} Key
      @returns {Any}
      @example
      // Returns the first name attribute from primary contact model.
      var firstName = m.getValue('primaryContact.firstName');
    */
    getValue: function (key) {
      var parts,
        value;

      // Search path
      if (key.indexOf('.') !== -1) {
        parts = key.split('.');
        value = this;
        _.each(parts, function (part) {
          value = value instanceof Backbone.Model ? value.getValue(part) : value;
        });
        return value || (_.isBoolean(value) || _.isNumber(value) ? value : "");
      }

      // Search attribute, function, propety
      if (_.has(this.attributes, key)) { return this.attributes[key]; }
      return _.isFunction(this[key]) ? this[key]() : this[key];
    },

    isBusy: function () {
      var status = this.getStatus(),
        K = XM.ModelClassMixin;
      return status === K.BUSY_FETCHING ||
             status === K.BUSY_COMMITTING ||
             status === K.BUSY_DESTROYING;
    },

    /**
      Reimplemented. A model is new if the status is `READY_NEW`.

      @returns {Boolean}
    */
    isNew: function () {
      var K = XM.ModelClassMixin;
      return this.getStatus() === K.READY_NEW || this._wasNew || false;
    },

    /**
      Returns true if status is `READY_NEW` or `READY_DIRTY`.

      @returns {Boolean}
    */
    isDirty: function () {
      var status = this.getStatus(),
        K = XM.ModelClassMixin;
      return status === K.READY_NEW || status === K.READY_DIRTY;
    },

    /**
      Returns true if the model is in one of the `READY` statuses
    */
    isReady: function () {
      var status = this.getStatus(),
        K = XM.ModelClassMixin;
      return status === K.READY_NEW ||
             status === K.READY_CLEAN ||
             status === K.READY_DIRTY;
    },

    /**
      Returns true if you have the lock key, or if this model
      is not lockable. (You can enter the room if you have no
      key or if there is no lock!). When this value is true and the
      `isLockable` is true it means the user has a application lock
      on the object at the database level so that no other users can
      edit the record.

      This is not to be confused with the `isLocked` function that
      is used by Backbone-relational to manage events on relations.

      @returns {Boolean}
    */
    hasLockKey: function () {
      var lock = this.get("lock");
      return !lock || lock.key ? true : false;
    },

    /**
      Return whether the model is in a read-only state. If an attribute name
      is passed, returns whether that attribute is read-only. It is also
      capable of checking the read only status of child objects via a search path string.

      <pre><code>
        // Inquire on the whole model
        var readOnly = this.isReadOnly();

        // Inquire on a single attribute
        var readOnly = this.isReadOnly("name");

        // Inquire using a search path
        var readOnly = this.isReadOnly("contact.firstName");
      </code></pre>

      @seealso `setReadOnly`
      @seealso `readOnlyAttributes`
      @param {String} attribute
      @returns {Boolean}
    */
    isReadOnly: function (value) {
      var result,
        parts,
        isLockedOut = !this.hasLockKey();

      // Search path
      if (_.isString(value) && value.indexOf('.') !== -1) {
        parts = value.split('.');
        result = this;
        _.each(parts, function (part) {
          if (_.isBoolean(result)) {
            // do not drill down further if we have an answer already
            // do nothing.
          } else if (result instanceof Backbone.Model && !result.getValue(part)) {
            // do not bother disabling fields that don't exist
            result = false;
          } else if (result instanceof Backbone.Model) {
            // drill down into the search path
            result.getValue(part);
          } else {
            // we're at the end of the search path
            result = result.isReadOnly(part) || !result.hasLockKey();
          }
        });
        return result;
      }

      if ((!_.isString(value) && !_.isObject(value)) || this.readOnly) {
        result = this.readOnly;
      } else {
        result = _.contains(this.readOnlyAttributes, value);
      }
      return result || isLockedOut;
    },

    /**
      Return whether an attribute is required.

      @param {String} attribute
      @returns {Boolean}
    */
    isRequired: function (value) {
      return _.contains(this.requiredAttributes, value);
    },


    /**
      A utility function that triggers a `notify` event. Useful for passing along
      information to the interface. Bind to `notify` to use.

      <pre><code>
        var m = new XM.MyModel();
        var raiseAlert = function (model, value, options) {
          alert(value);
        }
        m.on('notify', raiseAlert);
      </code></pre>

      @param {String} Message
      @param {Object} Options
      @param {Number} [options.type] Type of notification NOTICE, WARNING, CRITICAL, Question. Default = NOTICE.
      @param {Object} [options.callback] A callback function to process based on user response.
    */
    notify: function (message, options) {
      options = options ? _.clone(options) : {};
      if (options.type === undefined) {
        options.type = XM.ModelClassMixin.NOTICE;
      }
      this.trigger('notify', this, message, options);
    },

    /**
      Return the original value of an attribute the last time fetch was called.

      @returns {Object}
    */
    original: function (attr) {
      var parts,
        value,
        i;
      // Search path
      if (attr.indexOf('.') !== -1) {
        parts = attr.split('.');
        value = this;
        for (i = 0; i < parts.length; i++) {
          value = value.original(parts[i]);
          if (value && value instanceof Date) {
            break;
          } else if (value && typeof value === "object") {
            continue;
          } else if (typeof value === "string") {
            break;
          } else {
            value = "";
            break;
          }
        }
        return value;
      }
      return this.prime[attr] || this.get(attr);
    },

    /**
      Return all the original values of the attributes the last time fetch was called.

      @returns {Array}
    */
    originalAttributes: function () {
      return _.defaults(_.clone(this.prime), _.clone(this.attributes));
    },

    /**
      Recursively checks the object against the schema and converts date strings to
      date objects.

      @param {Object} Response
    */
    parse: function (resp) {
      var K = XT.Session,
        column,
        parse,
        parseIter = function (iter) {
          iter = parse(iter);
        },
        getColumn = function (type, attr) {
          if (!XT.session.getSchema().get(type)) {
            XT.log(type + " not found in schema. Error imminent!");
          }
          var columns = XT.session.getSchema().get(type).columns;
          return _.find(columns, function (column) {
            return column.name === attr;
          });
        };
      parse = function (obj) {
        var attr;
        for (attr in obj) {
          if (obj.hasOwnProperty(attr)) {
            if (_.isArray(obj[attr])) {
              _.each(obj[attr], parseIter);
            } else if (attr === 'lock') {
              // don't try to parse the lock object
            } else if (_.isObject(obj[attr])) {
              obj[attr] = parse(obj[attr]);
            } else {
              column = getColumn(obj.type, attr);
              if (column && column.category &&
                  column.category === K.DB_DATE &&
                  obj[attr] !== null) {
                obj[attr] = new Date(obj[attr]);
              }
            }
          }
        }
        return obj;
      };
      return parse(resp);
    },

    /**
      If the model has a lock on the object at the server level, it
      will be released.
    */
    releaseLock: function (options) {
      options = options || {};
      var lock = this.get('lock') && JSON.parse(JSON.stringify(this.get('lock'))), // Deep copy
        key = lock ? lock.key : false;

      if (key) {
        this.dispatch('XM.Model', 'releaseLock', {key: key}, options);
        delete lock.key;
        this.attributes.lock = lock;
        this.lockDidChange(this, lock);

      } else if (options.success) {
        // let's not forget to call the success callback even if there's no real work to do
        options.success();
      }
    },

    /**
      Revert the model to the previous status. Useful for reseting status
      after a failed validation.

      param {Boolean} - cascade
    */
    revertStatus: function (cascade) {
      var K = XM.ModelClassMixin,
        prev = this._prevStatus;
      this.setStatus(this._prevStatus || K.EMPTY);
      this._prevStatus = prev;
    },

    /**
      Reimplemented.

      @retuns {XT.Request} Request
    */
    save: function (key, value, options) {
      options = options ? _.clone(options) : {};
      var attrs = {},
        model = this,
        K = XM.ModelClassMixin,
        success,
        result;
        
      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key) || _.isEmpty(key)) {
        attrs = key;
        options = value ? _.clone(value) : {};
      } else if (_.isString(key)) {
        attrs[key] = value;
      }

      // Only save if we should.
      if (this.isDirty() || attrs) {
        success = options.success;
        options.wait = true;
        options.success = function (resp) {
          model.setStatus(K.READY_CLEAN, options);
          if (XT.debugging) {
            XT.log('Save successful');
          }
          if (success) { success(model, resp, options); }
        };

        // Handle both `"key", value` and `{key: value}` -style arguments.
        if (_.isObject(key) || _.isEmpty(key)) { value = options; }

        // Call the super version
        this.setStatus(K.BUSY_COMMITTING, {cascade: true});
        result = Backbone.Model.prototype.save.call(this, key, value, options);
        if (!result) { this.revertStatus(true); }
        return result;
      }

      XT.log('No changes to save');
      return false;
    },

    /**
      Overload: Don't allow setting when model is in error or destroyed status, or
      updating a `READY_CLEAN` record without update privileges.

      @param {String|Object} Key
      @param {String|Object} Value or Options
      @param {Objecw} Options
    */
    set: function (key, val, options) {
      var K = XM.ModelClassMixin,
        keyIsObject = _.isObject(key),
        status = this.getStatus(),
        err;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (keyIsObject) { options = val; }
      options = options ? options : {};

      switch (status)
      {
      case K.ERROR:
      case K.DESTROYED_CLEAN:
      case K.DESTROYED_DIRTY:
        // Set error if attempting to edit a record that is ineligable
        err = XT.Error.clone('xt1009', { params: { status: status } });
        break;
      case K.READY_CLEAN:
        // Set error if no update privileges
        if (!this.canUpdate()) { err = XT.Error.clone('xt1010'); }
        break;
      case K.READY_DIRTY:
      case K.READY_NEW:
        break;
      default:
        // If we're not in a `READY` state, silence all events
        if (!_.isBoolean(options.silent)) {
          options.silent = true;
        }
      }

      // Raise error, if any
      if (err) {
        this.trigger('invalid', this, options);
        return false;
      }

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (keyIsObject) { val = options; }
      return Backbone.Model.prototype.set.call(this, key, val, options);
    },

    /**
      Set the entire model, or a specific model attribute to `readOnly`.<br />
      Examples:<pre><code>
      m.setReadOnly() // sets model to read only
      m.setReadOnly(false) // sets model to be editable
      m.setReadOnly('name') // sets 'name' attribute to read-only
      m.setReadOnly('name', false) // sets 'name' attribute to be editable</code></pre>

      Note: Privilege enforcement supercedes read-only settings.

      @seealso `isReadOnly`
      @seealso `readOnly`
      @param {String|Boolean} Attribute to set, or boolean if setting the model
      @param {Boolean} Boolean - default = true.
    */
    setReadOnly: function (key, value) {
      var changes = {},
        delta;
      // handle attribute
      if (_.isString(key)) {
        value = _.isBoolean(value) ? value : true;
        if (value && !_.contains(this.readOnlyAttributes, key)) {
          this.readOnlyAttributes.push(key);
          changes[key] = true;
        } else if (!value && _.contains(this.readOnlyAttributes, key)) {
          this.readOnlyAttributes = _.without(this.readOnlyAttributes, key);
          changes[key] = true;
        }
      // handle model
      } else {
        key = _.isBoolean(key) ? key : true;
        this.readOnly = key;
        // Attributes that were already read-only will stay that way
        // so only count the attributes that were not affected
        delta = _.difference(this.getAttributeNames(), this.readOnlyAttributes);
        _.each(delta, function (attr) {
          changes[attr] = true;
        });
      }
      // Notify changes
      if (!_.isEmpty(changes)) {
        this.trigger('readOnlyChange', this, {changes: changes, isReadOnly: value});
      }
      return this;
    },

    /**
      Set the status on the model. Triggers `statusChange` event.

      @param {Number} Status
    */
    setStatus: function (status, options) {
      var K = XM.ModelClassMixin,
        dataState;

      // Prevent recursion
      if (this.status === status) { return; }
      this._prevStatus = this.status;
      this.status = status;

      // Reset original attributes if applicable
      if (status === K.READY_NEW || status === K.READY_CLEAN) {
        this.prime = {};
      }

      // Update data state at this level.
      switch (status)
      {
      case K.READY_NEW:
        dataState = 'create';
        break;
      case K.READY_CLEAN:
        dataState = 'read';
        break;
      case K.READY_DIRTY:
        dataState = 'update';
        break;
      case K.DESTROYED_DIRTY:
        dataState = 'delete';
      }
      if (dataState) { this.attributes.dataState = dataState; }

      this.trigger('statusChange', this, status, options);
      return this;
    },

    /**
      Sync to xTuple data source.
    */
    sync: function (method, model, options) {
      options = options ? _.clone(options) : {};
      if (!options.databaseType) { options.databaseType = this.databaseType; }
      var that = this,
        dataSource = options.dataSource || XT.dataSource,
        id = options.id || model.id,
        recordType = this.recordType,
        result,
        error = options.error;

      options.error = function (resp) {
        var K = XM.ModelClassMixin;
        that.setStatus(K.ERROR);
        if (error) { error(model, resp, options); }
      };

      // Read
      if (method === 'read' && recordType && id && options.success) {
        result = dataSource.retrieveRecord(this, options);

      // Write
      } else if (method === 'create' || method === 'update' || method === 'delete') {
        result = dataSource.commitRecord(model, options);
      }

      return result || false;
    },

    /**
      Determine whether this record has been referenced by another. By default
      this function inspects foreign key relationships on the database, and is
      therefore dependent on foreign key relationships existing where appropriate
      to work correctly.

      @param {Object} Options
      @returns {XT.Request} Request
    */
    used: function (options) {
      options.databaseType = this.databaseType;
      return this.getClass().used(this.id, options);
    },

    /**
      Default validation checks `attributes` for:<br />
        &#42; Data type integrity.<br />
        &#42; Required fields.<br />
      <br />
      Returns `undefined` if the validation succeeded, or some value, usually
      an error message, if it fails.<br />
      <br />

      @param {Object} Attributes
      @param {Object} Options
    */
    validate: function (attributes, options) {
      attributes = attributes || {};
      options = options || {};
      var i,
        S = XT.Session,
        attr, value, category, column, params = {},
        type = this.recordType.replace(/\w+\./i, ''),
        columns = XT.session.getSchema().get(type).columns,

        getColumn = function (attr) {
          return _.find(columns, function (column) {
            return column.name === attr;
          });
        };

      // Check data type integrity
      for (attr in attributes) {
        if (attributes.hasOwnProperty(attr) &&
            !_.isNull(attributes[attr]) &&
            !_.isUndefined(attributes[attr])) {
          params.attr = ("_" + attr).loc();

          value = attributes[attr];
          column = getColumn(attr);
          category = column ? column.category : false;
          switch (category) {
          case S.DB_BYTEA:
            if (!_.isObject(value) && !_.isString(value)) { // XXX unscientific
              params.type = "_binary".loc();
              return XT.Error.clone('xt1003', { params: params });
            }
            break;
          case S.DB_UNKNOWN:
          case S.DB_STRING:
            if (!_.isString(value) &&
                attr !== 'lock') {
              params.type = "_string".loc();
              return XT.Error.clone('xt1003', { params: params });
            }
            break;
          case S.DB_NUMBER:
            if (!_.isNumber(value)) {
              params.type = "_number".loc();
              return XT.Error.clone('xt1003', { params: params });
            }
            break;
          case S.DB_DATE:
            if (!_.isDate(value)) {
              params.type = "_date".loc();
              return XT.Error.clone('xt1003', { params: params });
            }
            break;
          case S.DB_BOOLEAN:
            if (!_.isBoolean(value)) {
              params.type = "_boolean".loc();
              return XT.Error.clone('xt1003', { params: params });
            }
            break;
          case S.DB_ARRAY:
            if (!_.isArray(value)) {
              params.type = "_array".loc();
              return XT.Error.clone('xt1003', { params: params });
            }
            break;
          case S.DB_COMPOUND:
            if (!_.isObject(value) && !_.isNumber(value)) {
              params.type = "_object".loc();
              return XT.Error.clone('xt1003', { params: params });
            }
            break;
          default:
            return XT.Error.clone('xt1002', { params: params });
          }
        }
      }

      // Check required.
      for (i = 0; i < this.requiredAttributes.length; i += 1) {
        value = attributes[this.requiredAttributes[i]];
        if (value === undefined || value === null || value === "") {
          params.attr = ("_" + this.requiredAttributes[i]).loc();
          return XT.Error.clone('xt1004', { params: params });
        }
      }

      return;
    }

  };

  // ..........................................................
  // CLASS METHODS
  //

  /**
    A mixin for use on model classes that includes status constants
    and privilege control functions.
  */
  XM.ModelClassMixin = {

    /**
      Use this function to find out whether a user can create records before
      instantiating one.

      @returns {Boolean}
    */
    canCreate: function () {
      return XM.ModelClassMixin.canDo.call(this, 'create');
    },

    /**
      Use this function to find out whether a user can read this record type
      before any have been loaded.

      @returns {Boolean}
    */
    canRead: function (model) {
      return XM.ModelClassMixin.canDo.call(this, 'read', model);
    },

    /**
      Returns whether a user has access to update a record of this type. If a
      record is passed that involves personal privileges, it will validate
      whether that particular record is updatable.

      @returns {Boolean}
    */
    canUpdate: function (model) {
      return XM.ModelClassMixin.canDo.call(this, 'update', model);
    },

    /**
      Returns whether a user has access to delete a record of this type. If a
      record is passed that involves personal privileges, it will validate
      whether that particular record is deletable.

      @returns {Boolean}
    */
    canDelete: function (model) {
      return XM.ModelClassMixin.canDo.call(this, 'delete', model);
    },

    /**
      Check privilege on `action`. If `model` is passed, checks personal
      privileges on the model where applicable.

      @param {String} Action
      @param {XM.Model} Model
    */
    canDo: function (action, model) {
      var privs = this.prototype.privileges,
        sessionPrivs = XT.session.privileges,
        isGrantedAll = false,
        isGrantedPersonal = false,
        username = XT.session.details.username,
        value,
        i,
        props,
        K = XM.ModelClassMixin,
        status = model && model.getStatus ? model.getStatus() : K.READY;

      // Need to be in a valid status to "do" anything
      if (!(status & K.READY)) { return false; }

      // If no privileges, nothing to check.
      if (_.isEmpty(privs)) { return true; }

      // If we have session prvileges perform the check.
      if (sessionPrivs && sessionPrivs.get) {
        // Check global privileges.
        if (privs.all && privs.all[action]) {
          isGrantedAll = this.checkCompoundPrivs(sessionPrivs, privs.all[action]);
        }
        // update privs are always sufficient for viewing as well
        if (!isGrantedAll && privs.all && action === 'read' && privs.all.update) {
          isGrantedAll = this.checkCompoundPrivs(sessionPrivs, privs.all.update);
        }

        // Check personal privileges.
        if (!isGrantedAll && privs.personal && privs.personal[action]) {
          isGrantedPersonal = this.checkCompoundPrivs(sessionPrivs, privs.personal[action]);
        }
        // update privs are always sufficient for viewing as well
        if (!isGrantedPersonal && privs.personal && action === 'read' && privs.personal.update) {
          isGrantedPersonal = this.checkCompoundPrivs(sessionPrivs, privs.personal.update);
        }
      }

      // If only personal privileges, check the personal attribute list to
      // see if we can update.
      if (!isGrantedAll && isGrantedPersonal && model) {
        i = 0;
        props = privs.personal && privs.personal.properties ?
                    privs.personal.properties : [];

        isGrantedPersonal = false;
        while (!isGrantedPersonal && i < props.length) {
          value = model.original(props[i]);
          isGrantedPersonal = value === username;
          i += 1;
        }
      }

      return isGrantedAll || isGrantedPersonal;
    },

    checkCompoundPrivs: function (sessionPrivs, privileges) {
      if (typeof privileges !== 'string') {
        return privileges;
      }
      var match = _.find(privileges.split(" "), function (priv) {
        return sessionPrivs.get(priv);
      });
      return !!match; // return true if match is truthy
    },

    /**
      Return an array of valid attribute names on the model.

      @returns {Array}
    */
    getAttributeNames: function () {
      var recordType = this.recordType || this.prototype.recordType,
        type = recordType.replace(/\w+\./i, '');
      return _.pluck(XT.session.getSchema().get(type).columns, 'name');
    },

    /**
      Returns an object from the relational store matching the `name` provided.

      @param {String} Name
      @returns {Object}
    */
    getObjectByName: function (name) {
      return Backbone.Relational.store.getObjectByName(name);
    },

    /**
      Returns an array of text attribute names on the model.

      @returns {Array}
    */
    getSearchableAttributes: function () {
      var recordType = this.prototype.recordType,
        type = recordType.split('.')[1],
        tbldef = XT.session.getSchema().get(type),
        attrs = [],
        name,
        i;

      for (i = 0; i < tbldef.columns.length; i++) {
        name = tbldef.columns[i].name;
        if (tbldef.columns[i].category === 'S') {
          attrs.push(name);
        }
      }
      return attrs;
    },

    /**
      Return a matching record id for a passed user `key` and `value`. If none
      found, returns zero.

      @param {String} Property to search on, typically a user key
      @param {String} Value to search for
      @param {Object} Options
      @returns {Object} Receiver
    */
    findExisting: function (key, value, options) {
      var recordType = this.recordType || this.prototype.recordType,
        params = [ recordType, key, value, this.id || -1 ],
        dataSource = options.dataSource || XT.dataSource;
      dataSource.dispatch('XM.Model', 'findExisting', params, options);
      XT.log("XM.Model.findExisting for: " + recordType);
      return this;
    },

    /**
      Determine whether this record has been referenced by another. By default
      this function inspects foreign key relationships on the database, and is
      therefore dependent on foreign key relationships existing where appropriate
      to work correctly.

      @param {Number} Id
      @param {Object} Options
      @returns {XT.Request} Request
    */
    used: function (id, options) {
      return XT.dataSource.dispatch('XM.Model', 'used', [this.prototype.recordType, id], options);
    },

    // ..........................................................
    // CONSTANTS
    //

    /**
      Generic state for records with no local changes.

      Use a logical AND (single `&`) to test record status.

      @static
      @constant
      @type Number
      @default 0x0001
    */
    CLEAN:            0x0001, // 1

    /**
      Generic state for records with local changes.

      Use a logical AND (single `&`) to test record status.

      @static
      @constant
      @type Number
      @default 0x0002
    */
    DIRTY:            0x0002, // 2

    /**
      State for records that are still loaded.

      This is the initial state of a new record. It will not be editable until
      a record is fetch from the store, or it is initialized with the `isNew`
      option.

      @static
      @constant
      @type Number
      @default 0x0100
    */
    EMPTY:            0x0100, // 256

    /**
      State for records in an error state.

      @static
      @constant
      @type Number
      @default 0x1000
    */
    ERROR:            0x1000, // 4096

    /**
      Generic state for records that are loaded and ready for use.

      Use a logical AND (single `&`) to test record status.

      @static
      @constant
      @type Number
      @default 0x0200
    */
    READY:            0x0200, // 512

    /**
      State for records that are loaded and ready for use with no local changes.

      @static
      @constant
      @type Number
      @default 0x0201
    */
    READY_CLEAN:      0x0201, // 513


    /**
      State for records that are loaded and ready for use with local changes.

      @static
      @constant
      @type Number
      @default 0x0202
    */
    READY_DIRTY:      0x0202, // 514


    /**
      State for records that are new - not yet committed to server.

      @static
      @constant
      @type Number
      @default 0x0203
    */
    READY_NEW:        0x0203, // 515


    /**
      Generic state for records that have been destroyed.

      Use a logical AND (single `&`) to test record status.

      @static
      @constant
      @type Number
      @default 0x0400
    */
    DESTROYED:        0x0400, // 1024


    /**
      State for records that have been destroyed and committed to server.

      @static
      @constant
      @type Number
      @default 0x0401
    */
    DESTROYED_CLEAN:  0x0401, // 1025

    /**
      State for records that have been destroyed but not yet committed to
      the server.

      @static
      @constant
      @type Number
      @default 0x0402
    */
    DESTROYED_DIRTY:  0x0402, // 1026

    /**
      Generic state for records that have been submitted to data source.

      Use a logical AND (single `&`) to test record status.

      @static
      @constant
      @type Number
      @default 0x0800
    */
    BUSY:             0x0800, // 2048


    /**
      State for records that are still loading data from the server.

      @static
      @constant
      @type Number
      @default 0x0804
    */
    BUSY_FETCHING:     0x0804, // 2052


    /**
      State for records that have been modified and submitted to server.

      @static
      @constant
      @type Number
      @default 0x0810
    */
    BUSY_COMMITTING:  0x0810, // 2064

    /**
      State for records that have been destroyed and submitted to server.

      @static
      @constant
      @type Number
      @default 0x0840
    */
    BUSY_DESTROYING:  0x0840, // 2112

    /**
      Constant for `notify` message type notice.

      @static
      @constant
      @type Number
      @default 0
    */
    NOTICE:  0,

    /**
      Constant for `notify` message type warning.

      @static
      @constant
      @type Number
      @default 1
    */
    WARNING:  1,

    /**
      Constant for `notify` message type critical.

      @static
      @constant
      @type Number
      @default 3
    */
    CRITICAL:  2,

    /**
      Constant for `notify` message type question.

      @static
      @constant
      @type Number
      @default 4
    */
    QUESTION:  3
  };

}());