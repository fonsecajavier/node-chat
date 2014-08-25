NodeChat.Controllers.Modals.Base = NodeChat.Controllers.Base.extend({
  $modal: null,
  selector: null,

  init: function(app){
    this._super( app );
    if(!this.selector){
      throw "Must supply string selector for the modal";
    }

    this.destroyModalDOM();
  },

  openModal: function(){
    this.$modal.foundation('reveal', 'open');
  },

  closeModal: function(){
    this.$modal.foundation('reveal', 'close');
  },

  appendDOM: function(rendered){
    this.$modal = $(rendered).appendTo(this.app.$container);
  },

  $findModal: function(){
    return this.app.$container.find(this.selector);
  },

  destroyModalDOM: function(){
    var $modal = this.$findModal();

    if ($modal){
      $modal.remove();
      return true;
    } else {
      return false;
    }
  }

});