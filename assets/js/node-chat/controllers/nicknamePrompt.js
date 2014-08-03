NodeChat.Controllers.NicknamePrompt = NodeChat.BaseController.extend({
  $modal: null,

  init: function(app){
    this._super( app );
    this.render();
    this.bindEvents();
  },

  render: function(){
    var rendered = Mustache.render(this.app.templates.nicknamePrompt, {})

    this.destroyModalDOM();

    this.app.$container.append(rendered);

    this.$modal = this.$findModal();
    this.$chatConnect = this.$modal.find("[data-chat-connect]");
    this.$alertContainer = this.$modal.find("[data-alert-container]");
    this.$nicknameInput = this.$modal.find("[data-nickname-input]");
  },

  bindEvents: function(){
    this.bindChatConnect();
    this.bindBeforeCloseModal();
  },

  bindChatConnect: function(){
    var _this = this;
    this.$chatConnect.on("click", function(evt){
      if ($(this).attr("disabled")){
        return false;
      }
      if(/[a-zA-Z][a-zA-Z\d-_]{2,15}/.exec(_this.$nicknameInput.val())){
        _this.disableConnectButton();
        _this.connect();
      }
      else {
        _this.showAlert(
          "Please, type from 3 to 16 alphanumeric characters, numbers, dashes and underscores.  No spaces are allowed.  It has to start with letters", "warning");
      }
    });

  },

  bindBeforeCloseModal: function(){
    var _this = this;

    this.$modal.bind("closed", function(){
      _this.app.mediator.remove("clientConnected", _this.connectionSuccess);
    })
  },

  disableConnectButton: function(){
    this.$chatConnect.attr("disabled", "disabled");
  },

  enableConnectButton: function(){
    this.$chatConnect.removeAttr("disabled");
  },

  showAlert: function(htmlContent, htmlClass){
    new NodeChat.Controllers.Alert(this.app, {
        htmlClass: htmlClass,
        htmlContent: htmlContent,
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

  openModal: function(){
    this.$modal.foundation('reveal', 'open');
  },

  closeModal: function(){
    this.$modal.foundation('reveal', 'close');
  },

  $findModal: function(){
    return this.$appContainer.find("[data-nickname-prompt]");
  },

  destroyModalDOM: function(){
    var $modal = this.$findModal();

    if ($modal){
      $modal.remove();
      return true;
    } else {
      return false;
    }
  },

  connectionSuccess: function(){
    var _this = this;

    this.showAlert(
        "Success!!", "success");

    setTimeout(function(){
      _this.closeModal();
    }, 1000);
  }
});