NodeChat.Controllers.ChatMessages.UserTyping = NodeChat.Controllers.ChatMessages.Base.extend({

  init: function(app, templateName, messageObject){
    this._super.apply(this, arguments);
    this.templateName = "chatRoomMessageUserTyping";
  },

  processedMessageObject: function(){
    return({
      userToken: this.messageObject.userToken,
      userNickname: this.messageObject.userNickname
    });
  }

});