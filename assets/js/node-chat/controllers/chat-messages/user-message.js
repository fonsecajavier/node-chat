NodeChat.Controllers.ChatMessages.UserMessage = NodeChat.Controllers.ChatMessages.Base.extend({

  init: function(app, templateName, messageObject){
    this._super.apply(this, arguments);
    this.templateName = "chatRoomMessageUserMessage";
  },

  processedMessageObject: function(){
    return({
      userToken: this.messageObject.userToken,
      userNickname: this.messageObject.userNickname,
      message: this.messageObject.message
    });
  }

});