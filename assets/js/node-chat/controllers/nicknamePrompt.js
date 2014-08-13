NodeChat.Controllers.NicknamePrompt = NodeChat.ModalController.extend({
  selector: "[data-nickname-prompt]",

  init: function(app){
    this._super( app );
    this.render();
    this.bindEvents();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.nicknamePrompt, {})
    this.appendDOM(rendered);

    this.$chatConnect = this.$modal.find("[data-chat-connect]");
    this.$alertContainer = this.$modal.find("[data-alert-container]");
    this.$nicknameInput = this.$modal.find("[data-nickname-input]");
  },

  bindEvents: function(){
    this.bindChatConnect();
    this.bindInterceptCarriageReturn();
    this.bindAfterOpenModal();
    this.bindAfterCloseModal();
  },

  bindChatConnect: function(){
    var _this = this;
    this.$chatConnect.on("click", function(evt){
      if ($(this).attr("disabled")){
        return false;
      }
      if(/[a-zA-Z][a-zA-Z\d-_]{2,15}/.test(_this.$nicknameInput.val())){
        _this.disableConnectButton();
        _this.connect();
      }
      else {
        _this.showAlert(
          "Please, type from 3 to 16 alphanumeric characters, numbers, dashes and underscores.  No spaces are allowed.  It has to start with letters", "warning");
      }
    });

  },

  bindInterceptCarriageReturn: function(){
    var _this = this;
    this.$nicknameInput.keydown(function(e){
      var keyCode = e.keyCode || e.which;

      if (keyCode == 13) {
        _this.$chatConnect.trigger("click");
        return false;
      }
    });
  },

  bindAfterOpenModal: function(){
    var _this = this;

    // TODO FIXME: Current event should be: 'opened.fndtn.reveal', but foundation has a bug that fires it twice.  See https://github.com/zurb/foundation/issues/5482
    $(document).on('opened', this.selector, function(){
      _this.$nicknameInput.focus();
    });
  },

  bindAfterCloseModal: function(){
    var _this = this;

    // TODO FIXME: Current event should be: 'closed.fndtn.reveal', but foundation has a bug that fires it twice.  See https://github.com/zurb/foundation/issues/5482
    $(document).on('closed', this.selector, function(){
      _this.app.mediator.remove("clientConnected", _this.connectionSuccess);
    });
  },

  disableConnectButton: function(){
    this.$chatConnect.attr("disabled", "disabled");
  },

  enableConnectButton: function(){
    this.$chatConnect.removeAttr("disabled");
  },

  showAlert: function(msg, htmlClass){
    new NodeChat.Controllers.Alert(this.app, {
        htmlClass: htmlClass,
        content: msg,
        $container: this.$alertContainer
      });
  },

  connect: function(){
    var _this = this;
    $.ajax({
      dataType: "json",
      url: "/connect",
      type: "POST",
      data: {
        nickname: _this.$nicknameInput.val()
      }
    })
    .done(function(data){
      _this.showAlert(
        "Nickname is available!  Connecting...");
      _this.app.mediator.publish("proceedConnecting", data);
      _this.app.mediator.subscribe("clientConnected", _this.connectionSuccess, {}, _this);
    })
    .fail(function(jqXHR){
      _this.enableConnectButton();

      var errMsg;
      if(jqXHR.status == 406){
        errMsg = "Error: " + jqXHR.responseJSON.error;
      } else {
        errMsg = "An error occurred when trying to connect to the server.  Please try again.";
      }
      
      _this.showAlert(
        errMsg, "warning");
    });
  },

  connectionSuccess: function(){
    var _this = this;

    this.showAlert(
        "Success!!", "success");
  }
});