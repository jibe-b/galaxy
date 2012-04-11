(function(g){var d,h,b;if(typeof window==="undefined"){d=require("underscore");h=require("backbone");b=module.exports=h}else{var d=window._;h=window.Backbone;b=window}h.Relational={showWarnings:true};h.Semaphore={_permitsAvailable:null,_permitsUsed:0,acquire:function(){if(this._permitsAvailable&&this._permitsUsed>=this._permitsAvailable){throw new Error("Max permits acquired")}else{this._permitsUsed++}},release:function(){if(this._permitsUsed===0){throw new Error("All permits released")}else{this._permitsUsed--}},isLocked:function(){return this._permitsUsed>0},setAvailablePermits:function(i){if(this._permitsUsed>i){throw new Error("Available permits cannot be less than used permits")}this._permitsAvailable=i}};h.BlockingQueue=function(){this._queue=[]};d.extend(h.BlockingQueue.prototype,h.Semaphore,{_queue:null,add:function(i){if(this.isBlocked()){this._queue.push(i)}else{i()}},process:function(){while(this._queue&&this._queue.length){this._queue.shift()()}},block:function(){this.acquire()},unblock:function(){this.release();if(!this.isBlocked()){this.process()}},isBlocked:function(){return this.isLocked()}});h.Relational.eventQueue=new h.BlockingQueue();h.Store=function(){this._collections=[];this._reverseRelations=[]};d.extend(h.Store.prototype,h.Events,{_collections:null,_reverseRelations:null,addReverseRelation:function(j){var i=d.any(this._reverseRelations,function(k){return d.all(j,function(m,l){return m===k[l]})});if(!i&&j.model&&j.type){this._reverseRelations.push(j);if(!j.model.prototype.relations){j.model.prototype.relations=[]}j.model.prototype.relations.push(j);this.retroFitRelation(j)}},retroFitRelation:function(j){var i=this.getCollection(j.model);i.each(function(k){new j.type(k,j)},this)},getCollection:function(i){var j=d.detect(this._collections,function(k){return i===k.model||i.constructor===k.model});if(!j){j=this._createCollection(i)}return j},getObjectByName:function(i){var j=d.reduce(i.split("."),function(k,l){return k[l]},b);return j!==b?j:null},_createCollection:function(j){var i;if(j instanceof h.RelationalModel){j=j.constructor}if(j.prototype instanceof h.RelationalModel.prototype.constructor){i=new h.Collection();i.model=j;this._collections.push(i)}return i},resolveIdForItem:function(i,j){var k=d.isString(j)||d.isNumber(j)?j:null;if(k==null){if(j instanceof h.RelationalModel){k=j.id}else{if(d.isObject(j)){k=j[i.prototype.idAttribute]}}}return k},find:function(j,k){var l=this.resolveIdForItem(j,k);var i=this.getCollection(j);return i&&i.get(l)},register:function(j){var i=j.collection;var k=this.getCollection(j);k&&k.add(j);j.bind("destroy",this.unregister,this);j.collection=i},update:function(i){var j=this.getCollection(i);j._onModelEvent("change:"+i.idAttribute,i,j)},unregister:function(i){i.unbind("destroy",this.unregister);var j=this.getCollection(i);j&&j.remove(i)}});h.Relational.store=new h.Store();h.Relation=function(i,j){this.instance=i;j=(typeof j==="object"&&j)||{};this.reverseRelation=d.defaults(j.reverseRelation||{},this.options.reverseRelation);this.reverseRelation.type=!d.isString(this.reverseRelation.type)?this.reverseRelation.type:h[this.reverseRelation.type]||h.Relational.store.getObjectByName(this.reverseRelation.type);this.model=j.model||this.instance.constructor;this.options=d.defaults(j,this.options,h.Relation.prototype.options);this.key=this.options.key;this.keySource=this.options.keySource||this.key;this.keyDestination=this.options.keyDestination||this.options.keySource||this.key;this.relatedModel=this.options.relatedModel;if(d.isString(this.relatedModel)){this.relatedModel=h.Relational.store.getObjectByName(this.relatedModel)}if(!this.checkPreconditions()){return false}if(i){this.keyContents=this.instance.get(this.keySource);if(this.key!==this.keySource){this.instance.unset(this.keySource,{silent:true})}this.instance._relations.push(this)}if(!this.options.isAutoRelation&&this.reverseRelation.type&&this.reverseRelation.key){h.Relational.store.addReverseRelation(d.defaults({isAutoRelation:true,model:this.relatedModel,relatedModel:this.model,reverseRelation:this.options},this.reverseRelation))}d.bindAll(this,"_modelRemovedFromCollection","_relatedModelAdded","_relatedModelRemoved");if(i){this.initialize();h.Relational.store.getCollection(this.instance).bind("relational:remove",this._modelRemovedFromCollection);h.Relational.store.getCollection(this.relatedModel).bind("relational:add",this._relatedModelAdded).bind("relational:remove",this._relatedModelRemoved)}};h.Relation.extend=h.Model.extend;d.extend(h.Relation.prototype,h.Events,h.Semaphore,{options:{createModels:true,includeInJSON:true,isAutoRelation:false},instance:null,key:null,keyContents:null,relatedModel:null,reverseRelation:null,related:null,_relatedModelAdded:function(k,l,j){var i=this;k.queue(function(){i.tryAddRelated(k,j)})},_relatedModelRemoved:function(j,k,i){this.removeRelated(j,i)},_modelRemovedFromCollection:function(i){if(i===this.instance){this.destroy()}},checkPreconditions:function(){var n=this.instance,l=this.key,j=this.model,p=this.relatedModel,q=h.Relational.showWarnings&&typeof console!=="undefined";if(!j||!l||!p){q&&console.warn("Relation=%o; no model, key or relatedModel (%o, %o, %o)",this,j,l,p);return false}if(!(j.prototype instanceof h.RelationalModel.prototype.constructor)){q&&console.warn("Relation=%o; model does not inherit from Backbone.RelationalModel (%o)",this,n);return false}if(!(p.prototype instanceof h.RelationalModel.prototype.constructor)){q&&console.warn("Relation=%o; relatedModel does not inherit from Backbone.RelationalModel (%o)",this,p);return false}if(this instanceof h.HasMany&&this.reverseRelation.type===h.HasMany.prototype.constructor){q&&console.warn("Relation=%o; relation is a HasMany, and the reverseRelation is HasMany as well.",this);return false}if(n&&n._relations.length){var o=d.any(n._relations,function(i){var k=this.reverseRelation.key&&i.reverseRelation.key;return i.relatedModel===p&&i.key===l&&(!k||this.reverseRelation.key===i.reverseRelation.key)},this);if(o){q&&console.warn("Relation=%o between instance=%o.%s and relatedModel=%o.%s already exists",this,n,l,p,this.reverseRelation.key);return false}}return true},setRelated:function(j,i){this.related=j;this.instance.acquire();this.instance.set(this.key,j,d.defaults(i||{},{silent:true}));this.instance.release()},createModel:function(i){if(this.options.createModels&&typeof(i)==="object"){return new this.relatedModel(i)}},_isReverseRelation:function(i){if(i.instance instanceof this.relatedModel&&this.reverseRelation.key===i.key&&this.key===i.reverseRelation.key){return true}return false},getReverseRelations:function(i){var j=[];var k=!d.isUndefined(i)?[i]:this.related&&(this.related.models||[this.related]);d.each(k,function(l){d.each(l.getRelations(),function(m){if(this._isReverseRelation(m)){j.push(m)}},this)},this);return j},sanitizeOptions:function(i){i=i?d.clone(i):{};if(i.silent){i=d.extend({},i,{silentChange:true});delete i.silent}return i},unsanitizeOptions:function(i){i=i?d.clone(i):{};if(i.silentChange){i=d.extend({},i,{silent:true});delete i.silentChange}return i},destroy:function(){h.Relational.store.getCollection(this.instance).unbind("relational:remove",this._modelRemovedFromCollection);h.Relational.store.getCollection(this.relatedModel).unbind("relational:add",this._relatedModelAdded).unbind("relational:remove",this._relatedModelRemoved);d.each(this.getReverseRelations(),function(i){i.removeRelated(this.instance)},this)}});h.HasOne=h.Relation.extend({options:{reverseRelation:{type:"HasMany"}},initialize:function(){d.bindAll(this,"onChange");this.instance.bind("relational:change:"+this.key,this.onChange);var j=this.findRelated({silent:true});this.setRelated(j);var i=this;d.each(i.getReverseRelations(),function(k){k.addRelated(i.instance)})},findRelated:function(j){var k=this.keyContents;var i=null;if(k instanceof this.relatedModel){i=k}else{if(k){i=h.Relational.store.find(this.relatedModel,k);if(i&&d.isObject(k)){i.set(k,j)}else{if(!i){i=this.createModel(k)}}}}return i},onChange:function(l,i,k){if(this.isLocked()){return}this.acquire();k=this.sanitizeOptions(k);var o=d.isUndefined(k._related);var m=o?this.related:k._related;if(o){this.keyContents=i;if(i instanceof this.relatedModel){this.related=i}else{if(i){var n=this.findRelated(k);this.setRelated(n)}else{this.setRelated(null)}}}if(m&&this.related!==m){d.each(this.getReverseRelations(m),function(p){p.removeRelated(this.instance,k)},this)}d.each(this.getReverseRelations(),function(p){p.addRelated(this.instance,k)},this);if(!k.silentChange&&this.related!==m){var j=this;h.Relational.eventQueue.add(function(){j.instance.trigger("update:"+j.key,j.instance,j.related,k)})}this.release()},tryAddRelated:function(j,i){if(this.related){return}i=this.sanitizeOptions(i);var k=this.keyContents;if(k){var l=h.Relational.store.resolveIdForItem(this.relatedModel,k);if(j.id===l){this.addRelated(j,i)}}},addRelated:function(j,i){if(j!==this.related){var k=this.related||null;this.setRelated(j);this.onChange(this.instance,j,{_related:k})}},removeRelated:function(j,i){if(!this.related){return}if(j===this.related){var k=this.related||null;this.setRelated(null);this.onChange(this.instance,j,{_related:k})}}});h.HasMany=h.Relation.extend({collectionType:null,options:{reverseRelation:{type:"HasOne"},collectionType:h.Collection,collectionKey:true,collectionOptions:{}},initialize:function(){d.bindAll(this,"onChange","handleAddition","handleRemoval","handleReset");this.instance.bind("relational:change:"+this.key,this.onChange);this.collectionType=this.options.collectionType;if(d(this.collectionType).isString()){this.collectionType=h.Relational.store.getObjectByName(this.collectionType)}if(!this.collectionType.prototype instanceof h.Collection.prototype.constructor){throw new Error("collectionType must inherit from Backbone.Collection")}if(this.keyContents instanceof h.Collection){this.setRelated(this._prepareCollection(this.keyContents))}else{this.setRelated(this._prepareCollection())}this.findRelated({silent:true})},_getCollectionOptions:function(){return d.isFunction(this.options.collectionOptions)?this.options.collectionOptions(this.instance):this.options.collectionOptions},_prepareCollection:function(j){if(this.related){this.related.unbind("relational:add",this.handleAddition).unbind("relational:remove",this.handleRemoval).unbind("relational:reset",this.handleReset)}if(!j||!(j instanceof h.Collection)){j=new this.collectionType([],this._getCollectionOptions())}j.model=this.relatedModel;if(this.options.collectionKey){var i=this.options.collectionKey===true?this.options.reverseRelation.key:this.options.collectionKey;if(j[i]&&j[i]!==this.instance){if(h.Relational.showWarnings&&typeof console!=="undefined"){console.warn("Relation=%o; collectionKey=%s already exists on collection=%o",this,i,this.options.collectionKey)}}else{if(i){j[i]=this.instance}}}j.bind("relational:add",this.handleAddition).bind("relational:remove",this.handleRemoval).bind("relational:reset",this.handleReset);return j},findRelated:function(i){if(this.keyContents){var j=[];if(this.keyContents instanceof h.Collection){j=this.keyContents.models}else{this.keyContents=d.isArray(this.keyContents)?this.keyContents:[this.keyContents];d.each(this.keyContents,function(l){var k=h.Relational.store.find(this.relatedModel,l);if(k&&d.isObject(l)){k.set(l,i)}else{if(!k){k=this.createModel(l)}}if(k&&!this.related.getByCid(k)&&!this.related.get(k)){j.push(k)}},this)}if(j.length){i=this.unsanitizeOptions(i);this.related.add(j,i)}}},onChange:function(l,i,k){k=this.sanitizeOptions(k);this.keyContents=i;d.each(this.getReverseRelations(),function(n){n.removeRelated(this.instance,k)},this);if(i instanceof h.Collection){this._prepareCollection(i);this.related=i}else{var m;if(this.related instanceof h.Collection){m=this.related;m.reset([],{silent:true})}else{m=this._prepareCollection()}this.setRelated(m);this.findRelated(k)}d.each(this.getReverseRelations(),function(n){n.addRelated(this.instance,k)},this);var j=this;h.Relational.eventQueue.add(function(){!k.silentChange&&j.instance.trigger("update:"+j.key,j.instance,j.related,k)})},tryAddRelated:function(j,i){i=this.sanitizeOptions(i);if(!this.related.getByCid(j)&&!this.related.get(j)){var k=d.any(this.keyContents,function(l){var m=h.Relational.store.resolveIdForItem(this.relatedModel,l);return m&&m===j.id},this);if(k){this.related.add(j,i)}}},handleAddition:function(k,l,j){if(!(k instanceof h.Model)){return}j=this.sanitizeOptions(j);d.each(this.getReverseRelations(k),function(m){m.addRelated(this.instance,j)},this);var i=this;h.Relational.eventQueue.add(function(){!j.silentChange&&i.instance.trigger("add:"+i.key,k,i.related,j)})},handleRemoval:function(k,l,j){if(!(k instanceof h.Model)){return}j=this.sanitizeOptions(j);d.each(this.getReverseRelations(k),function(m){m.removeRelated(this.instance,j)},this);var i=this;h.Relational.eventQueue.add(function(){!j.silentChange&&i.instance.trigger("remove:"+i.key,k,i.related,j)})},handleReset:function(k,j){j=this.sanitizeOptions(j);var i=this;h.Relational.eventQueue.add(function(){!j.silentChange&&i.instance.trigger("reset:"+i.key,i.related,j)})},addRelated:function(k,j){var i=this;j=this.unsanitizeOptions(j);k.queue(function(){if(i.related&&!i.related.getByCid(k)&&!i.related.get(k)){i.related.add(k,j)}})},removeRelated:function(j,i){i=this.unsanitizeOptions(i);if(this.related.getByCid(j)||this.related.get(j)){this.related.remove(j,i)}}});h.RelationalModel=h.Model.extend({relations:null,_relations:null,_isInitialized:false,_deferProcessing:false,_queue:null,constructor:function(j,k){var i=this;if(k&&k.collection){this._deferProcessing=true;var l=function(m){if(m===i){i._deferProcessing=false;i.processQueue();k.collection.unbind("relational:add",l)}};k.collection.bind("relational:add",l);d.defer(function(){l(i)})}this._queue=new h.BlockingQueue();this._queue.block();h.Relational.eventQueue.block();h.Model.prototype.constructor.apply(this,arguments);h.Relational.eventQueue.unblock()},trigger:function(j){if(j.length>5&&"change"===j.substr(0,6)){var i=this,k=arguments;h.Relational.eventQueue.add(function(){h.Model.prototype.trigger.apply(i,k)})}else{h.Model.prototype.trigger.apply(this,arguments)}return this},initializeRelations:function(){this.acquire();this._relations=[];d.each(this.relations,function(i){var j=!d.isString(i.type)?i.type:h[i.type]||h.Relational.store.getObjectByName(i.type);if(j&&j.prototype instanceof h.Relation.prototype.constructor){new j(this,i)}else{h.Relational.showWarnings&&typeof console!=="undefined"&&console.warn("Relation=%o; missing or invalid type!",i)}},this);this._isInitialized=true;this.release();this.processQueue()},updateRelations:function(i){if(this._isInitialized&&!this.isLocked()){d.each(this._relations,function(j){var k=this.attributes[j.key];if(j.related!==k){this.trigger("relational:change:"+j.key,this,k,i||{})}},this)}},queue:function(i){this._queue.add(i)},processQueue:function(){if(this._isInitialized&&!this._deferProcessing&&this._queue.isBlocked()){this._queue.unblock()}},getRelation:function(i){return d.detect(this._relations,function(j){if(j.key===i){return true}},this)},getRelations:function(){return this._relations},fetchRelated:function(n,p){p||(p={});var l,j=[],o=this.getRelation(n),q=o&&o.keyContents,m=q&&d.select(d.isArray(q)?q:[q],function(r){var s=h.Relational.store.resolveIdForItem(o.relatedModel,r);return s&&!h.Relational.store.find(o.relatedModel,s)},this);if(m&&m.length){var k=d.map(m,function(t){var s;if(typeof(t)==="object"){s=new o.relatedModel(t)}else{var r={};r[o.relatedModel.prototype.idAttribute]=t;s=new o.relatedModel(r)}return s},this);if(o.related instanceof h.Collection&&d.isFunction(o.related.url)){l=o.related.url(k)}if(l&&l!==o.related.url()){var i=d.defaults({error:function(){var r=arguments;d.each(k,function(s){s.trigger("destroy",s,s.collection,p);p.error&&p.error.apply(s,r)})},url:l},p,{add:true});j=[o.related.fetch(i)]}else{j=d.map(k,function(r){var s=d.defaults({error:function(){r.trigger("destroy",r,r.collection,p);p.error&&p.error.apply(r,arguments)}},p);return r.fetch(s)},this)}}return j},set:function(l,m,k){h.Relational.eventQueue.block();var j;if(d.isObject(l)||l==null){j=l;k=m}else{j={};j[l]=m}var i=h.Model.prototype.set.apply(this,arguments);if(!this._isInitialized&&!this.isLocked()){h.Relational.store.register(this);this.initializeRelations()}else{if(j&&this.idAttribute in j){h.Relational.store.update(this)}}if(j){this.updateRelations(k)}h.Relational.eventQueue.unblock();return i},unset:function(k,j){h.Relational.eventQueue.block();var i=h.Model.prototype.unset.apply(this,arguments);this.updateRelations(j);h.Relational.eventQueue.unblock();return i},clear:function(j){h.Relational.eventQueue.block();var i=h.Model.prototype.clear.apply(this,arguments);this.updateRelations(j);h.Relational.eventQueue.unblock();return i},change:function(k){var i=this,j=arguments;h.Relational.eventQueue.add(function(){h.Model.prototype.change.apply(i,j)})},clone:function(){var i=d.clone(this.attributes);if(!d.isUndefined(i[this.idAttribute])){i[this.idAttribute]=null}d.each(this.getRelations(),function(j){delete i[j.key]});return new this.constructor(i)},toJSON:function(){if(this.isLocked()){return this.id}this.acquire();var i=h.Model.prototype.toJSON.call(this);d.each(this._relations,function(j){var k=i[j.key];if(j.options.includeInJSON===true&&k&&d.isFunction(k.toJSON)){i[j.keyDestination]=k.toJSON()}else{if(d.isString(j.options.includeInJSON)){if(k instanceof h.Collection){i[j.keyDestination]=k.pluck(j.options.includeInJSON)}else{if(k instanceof h.Model){i[j.keyDestination]=k.get(j.options.includeInJSON)}}}else{delete i[j.key]}}if(j.keyDestination!==j.key){delete i[j.key]}},this);this.release();return i}});d.extend(h.RelationalModel.prototype,h.Semaphore);var f=h.Collection.prototype.__add=h.Collection.prototype.add;h.Collection.prototype.add=function(k,i){i||(i={});if(!d.isArray(k)){k=[k]}var j=[];d.each(k,function(m){if(!(m instanceof h.Model)){var l=h.Relational.store.find(this.model,m[this.model.prototype.idAttribute]);if(l){l.set(l.parse?l.parse(m):m,i);m=l}else{m=h.Collection.prototype._prepareModel.call(this,m,i)}}if(m instanceof h.Model&&!this.get(m)&&!this.getByCid(m)){j.push(m)}},this);if(j.length){f.call(this,j,i);d.each(j,function(l){this.trigger("relational:add",l,this,i)},this)}return this};var a=h.Collection.prototype.__remove=h.Collection.prototype.remove;h.Collection.prototype.remove=function(j,i){i||(i={});if(!d.isArray(j)){j=[j]}d.each(j,function(k){k=this.getByCid(k)||this.get(k);if(k instanceof h.Model){a.call(this,k,i);this.trigger("relational:remove",k,this,i)}},this);return this};var e=h.Collection.prototype.__reset=h.Collection.prototype.reset;h.Collection.prototype.reset=function(j,i){e.call(this,j,i);this.trigger("relational:reset",j,i);return this};var c=h.Collection.prototype.__trigger=h.Collection.prototype.trigger;h.Collection.prototype.trigger=function(j){if(j==="add"||j==="remove"||j==="reset"){var i=this,k=arguments;h.Relational.eventQueue.add(function(){c.apply(i,k)})}else{c.apply(this,arguments)}return this};h.RelationalModel.extend=function(j,k){var l=h.Model.extend.apply(this,arguments);var i=(j&&j.relations)||[];d.each(i,function(m){if(m.reverseRelation){m.model=l;var o=true;if(d.isString(m.relatedModel)){var n=h.Relational.store.getObjectByName(m.relatedModel);o=n&&(n.prototype instanceof h.RelationalModel.prototype.constructor)}var p=!d.isString(m.type)?m.type:h[m.type]||h.Relational.store.getObjectByName(m.type);if(o&&p&&p.prototype instanceof h.Relation.prototype.constructor){new p(null,m)}}});return l}})();