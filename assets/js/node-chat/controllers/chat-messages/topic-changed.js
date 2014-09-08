NodeChat.Controllers.ChatMessages.TopicChanged = NodeChat.Controllers.ChatMessages.Base.extend({

  init: function(app, templateName, messageObject){
    this._super.apply(this, arguments);
    this.templateName = "chatRoomMessageTopicChanged";
  },

  processedMessageObject: function(){
    return({
      userToken: this.messageObject.userToken,
      userNickname: this.messageObject.userNickname,
      topic: this.messageObject.topic
    });
  }

});