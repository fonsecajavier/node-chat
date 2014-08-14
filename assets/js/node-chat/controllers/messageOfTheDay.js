NodeChat.Controllers.MessageOfTheDay = NodeChat.ModalController.extend({
  selector: "[data-motd]",
  $closeModal: null,
  messageOfTheDay: null,

  init: function(app, messageOfTheDay){
    this._super( app );
    this.messageOfTheDay = messageOfTheDay;
    this.render();
    this.bindEvents();
  },

  render: function(){
    var _this = this;
    var motd = _.escapeWithBr(this.messageOfTheDay);
    var rendered = Mustache.render(this.app.templates.messageOfTheDay, {messageOfTheDay: motd});
    this.appendDOM(rendered);

    this.$closeModal = this.$modal.find("[data-close-modal]");

    $(document).on('opened', this.selector, function () {
      _this.$closeModal.focus();
    });
  },

  bindEvents: function(){
    this.bindCloseModal();
  },

  bindCloseModal: function(){
    var _this = this;
    this.$closeModal.on("click", function(evt){
      _this.closeModal();
    });
  }

});
