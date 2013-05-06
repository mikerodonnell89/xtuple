/*jshint indent:2, curly:true eqeqeq:true, immed:true, latedef:true,
newcap:true, noarg:true, regexp:true, undef:true, strict:true, trailing:true
white:true*/
/*global XT:true, XM:true, Backbone:true, _:true, console:true, setTimeout: true, enyo:true */

(function () {
  "use strict";

  /**
  */
  _.extend(XT.Session, {
    /** @scope XT.Session */

    privileges: {},
    relevantPrivileges: [], // those privileges that are needed for an active extension
    settings: {},
    schemas: {
      XM: false // false means we have not yet fetched it
    },

    SETTINGS: 0x01,
    PRIVILEGES: 0x02,
    SCHEMA: 0x04,
    LOCALE: 0x08,
    EXTENSIONS: 0x10,
    ALL: 0x01 | 0x02 | 0x04 | 0x08 | 0x10,

    /**
      Loads session objects for settings, preferences and privileges into local
      memory. Types `XT.session.SETTINGS` or `XT.session.PRIVILEGES` can be passed
      as bitwise operators. If no arguments are passed the default is
      `XT.session.ALL` which will load all session objects.

      @param {Number} Types
      @param {Object} Options
    */
    loadSessionObjects: function (types, options) {
      var that = this,
        privilegesOptions,
        settingsOptions,
        settings,
        schemaOptions,
        localeOptions,
        extensionOptions,
        callback,
        schemaCount = 0,
        schemasReturned = 0,
        privilegeSetCount = 0,
        privilegeSetsReturned = 0,
        i;

      if (options && options.success && options.success instanceof Function) {
        callback = options.success;
      } else { callback = XT.K; }

      if (types === undefined) { types = this.ALL; }

      if (types & this.PRIVILEGES) {
        privilegesOptions = options ? _.clone(options) : {};

        // callback
        privilegesOptions.success = function (resp) {
          var privileges, i;

          if (that.getPrivileges().attributes) {
            // add incoming data to already loaded privilege
            privileges = that.getPrivileges();

          } else {
            // create privilege as a new model
            privileges = new Backbone.Model();
            privileges.get = function (attr) {
              // Sometimes the answer is already known...
              if (_.isBoolean(attr)) { return attr; }
              return Backbone.Model.prototype.get.call(this, attr);
            };
          }

          privilegeSetsReturned++;

          // Loop through the response and set a privilege for each found.
          for (i = 0; i < resp.length; i++) {
            privileges.set(resp[i].privilege, resp[i].isGranted);
          }

          // Attach the privileges to the session object.
          that.setPrivileges(privileges);

          if (privilegeSetsReturned === privilegeSetCount) {
            callback();
          }
        };

        if (!privilegesOptions.databaseTypes) {
          // by default we just run one query against the default database type
          privilegesOptions.databaseTypes = [undefined];
        }
        for (i = 0; i < privilegesOptions.databaseTypes.length; i++) {
          privilegesOptions.databaseType = privilegesOptions.databaseTypes[i];
          XM.ModelMixin.dispatch('XT.Session', 'privileges', null, privilegesOptions);
          privilegeSetCount++;
        }

      }

      if (types & this.SETTINGS) {
        settingsOptions = options ? _.clone(options) : {};

        // callback
        settingsOptions.success = function (resp) {
          settings = new Backbone.Model(resp);

          // Attach the settings to the session object
          that.setSettings(settings);

          callback();
        };

        XM.ModelMixin.dispatch('XT.Session', 'settings', null, settingsOptions);
      }

      if (types & this.SCHEMA) {
        schemaOptions = options ? _.clone(options) : {};

        // callback
        schemaOptions.success = function (resp, options) {
          var schema,
            prop,
            Klass,
            relations,
            rel,
            obj,
            proto,
            i;

          if (that.getSchemas()[options.schemaName].attributes) {
            // add incoming data to already loaded schema attributes
            schema = that.getSchemas()[options.schemaName];
            schema.set(resp);

          } else {
            // create schema as a new model
            schema = new Backbone.Model(resp);
            that.setSchema(options.schemaName, schema);
          }
          schemasReturned++;

          if (schemasReturned === schemaCount) {
            _.each(that.getSchemas(), function (schema, schemaName) {
              // Set relations
              for (prop in schema.attributes) {
                if (schema.attributes.hasOwnProperty(prop)) {
                  Klass = XM.Model.getObjectByName(schemaName + '.' + prop);
                  if (Klass) {
                    proto = Klass.prototype;
                    obj = schema.attributes[prop];
                    relations = obj.relations || [];
                    if (relations.length) {
                      proto.relations = [];
                      for (i = 0; i < relations.length; i++) {
                        rel = relations[i];
                        if (rel.type === "Backbone.HasOne") {
                          rel.type = Backbone.HasOne;
                        } else if (rel.type === "Backbone.HasMany") {
                          rel.type = Backbone.HasMany;
                        } else {
                          continue;
                        }
                        proto.relations.push(rel);
                      }
                    }

                    proto.idAttribute = obj.idAttribute;
                    proto.lockable = obj.lockable;
                    if (obj.privileges) {
                      // don't overwrite a privilege with undefined if it's
                      // already defined in the model, e.g. XM.Settings
                      proto.privileges = obj.privileges;
                    }
                  }
                }
              }
            });
            callback();
          }
        };

        schemaOptions.error = function () {
          console.log("schema error", arguments);
        };

        _.each(this.schemas, function (value, schemaName) {
          // get schema for instance DB models
          schemaOptions.schemaName = schemaName;
          XM.ModelMixin.dispatch('XT.Session', 'schema', schemaName.toLowerCase(), schemaOptions);
          schemaCount++;
        });

        // get schema for global DB models
        schemaOptions.databaseType = 'global';
        schemaOptions.schemaName = 'XM';
        XM.ModelMixin.dispatch('XT.Session', 'schema', 'xm', schemaOptions);
        schemaCount++;
      }

      if (types & this.LOCALE) {
        localeOptions = options ? _.clone(options) : {};

        // callback
        localeOptions.success = function (resp) {
          var locale = new Backbone.Model(resp);
          that.setLocale(locale);
          callback();
        };

        XM.ModelMixin.dispatch('XT.Session', 'locale', null, localeOptions);
      }

      if (types & this.EXTENSIONS) {
        extensionOptions = options ? _.clone(options) : {};

        // callback
        extensionOptions.error = function (resp) {
          XT.log("Error loading extensions");
        };
        extensionOptions.success = function (resp) {
          that.extensions = resp;
          callback();
        };

        XT.dataSource.getExtensionList(extensionOptions);
      }

      return true;
    },

    getLocale: function () {
      return this.locale;
    },

    getSchemas: function () {
      return this.schemas;
    },

    getSettings: function () {
      return this.settings;
    },

    getPrivileges: function () {
      return this.privileges;
    },

    setLocale: function (value) {
      this.locale = value;
      return this;
    },

    setSchema: function (schemaName, value) {
      this.schemas[schemaName] = value;
      return this;
    },

    setSettings: function (value) {
      this.settings = value;
      return this;
    },

    setPrivileges: function (value) {
      this.privileges = value;
      return this;
    },

    /**
      Each extension has a set of privileges that it cares about. The extension will load those
      privileges here into the session object with then name of the module that the privilege
      should be associated with. The module name will frequently be the extension name, but some
      extensions do not have their own modules.

      @param {String} module
      @param {Array} privArray
    */
    addRelevantPrivileges: function (module, privArray) {
      var privMap = _.map(privArray, function (priv) {return {module: module, privilege: priv}; });
      this.relevantPrivileges = _.union(this.relevantPrivileges, privMap);
    },

    // ..........................................................
    // CLASS CONSTANTS
    //

    DB_BOOLEAN: 'B',
    DB_STRING: 'S',
    DB_COMPOUND: 'C',
    DB_DATE: 'D',
    DB_NUMBER: 'N',
    DB_ARRAY: 'A',
    DB_BYTEA: 'U',
    DB_UNKNOWN: 'X'

  });

}());
