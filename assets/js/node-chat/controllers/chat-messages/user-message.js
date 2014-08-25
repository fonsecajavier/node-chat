NodeChat.Controllers.ChatMessages.UserMessage = NodeChat.Controllers.ChatMessages.Base.extend({

  init: function(app, $messagesContainer, templateName, messageObject){
    this._super.apply(this, arguments);
  },

  processedMessageObject: function(){
    return({
      userToken: this.messageObject.userToken,
      userNickname: this.messageObject.userNickname,
      message: this.messageObject.message
    });
  }

});