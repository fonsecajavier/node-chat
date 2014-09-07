NodeChat.Controllers.Modals.RoomJoin = NodeChat.Controllers.Modals.Base.extend({
  selector: "[data-room-join-modal]",

  init: function(app){
    this._super( app );
    this.render();
    this.bindEvents();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.roomJoin, {})
    this.appendDOM(rendered);

    this.$roomJoinButton = this.$modal.find("[data-room-join-button]");
    this.$alertContainer = this.$modal.find("[data-alert-container]");
    this.$roomNameInput = this.$modal.find("[data-room-name-input]");
  },

  bindEvents: function(){
    this.bindRoomJoinButton();
    this.bindInterceptCarriageReturn();
    this.bindAfterOpenModal();
  },

  bindRoomJoinButton: function(){
    var _this = this;
    this.$roomJoinButton.on("click", function(evt){
      var roomName = _this.$roomNameInput.val();
      if(/[a-zA-Z][a-zA-Z\d-_]{2,15}/.test(roomName)){
        _this.app.joinRoomByName(roomName);
        _this.closeModal();
      }
      else {
        _this.showAlert(
          "Please, type from 3 to 16 alphanumeric characters, numbers, dashes and underscores.  No spaces are allowed.  It has to start with letters", "warning");
      }
    });

  },

  bindInterceptCarriageReturn: function(){
    var _this = this;
    this.$roomNameInput.keydown(function(e){
      var keyCode = e.keyCode || e.which;

      if (keyCode == 13) {
        _this.$roomJoinButton.trigger("click");
        return false;
      }
    });
  },

  bindAfterOpenModal: function(){
    var _this = this;

    // TODO FIXME: Current event should be: 'opened.fndtn.reveal', but foundation has a bug that fires it twice.  See https://github.com/zurb/foundation/issues/5482
    $(document).on('opened', this.selector, function(){
      _this.$roomNameInput.focus();
    });
  },

  showAlert: function(msg, htmlClass){
    new NodeChat.Controllers.Alert(this.app, {
        htmlClass: htmlClass,
        content: msg,
        $container: this.$alertContainer
      });
  }

});