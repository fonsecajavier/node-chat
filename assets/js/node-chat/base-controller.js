NodeChat.BaseController = Class.extend({
  app: null,
  id: null,
  $appContainer: null,

  init: function(app){
    this.app = app;
    this.$appContainer = app.$container;
    this.setId();
  },

  setId: function(){
    this.id = this.generateGUID();
  },

  generateGUID: function() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
                 .toString(16)
                 .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
  }

});