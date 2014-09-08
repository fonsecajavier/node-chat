NodeChat.Controllers.ChatMessages.Global = NodeChat.Controllers.ChatMessages.Base.extend({

  init: function(app, templateName, messageObject){
    this._super.apply(this, arguments);
    this.templateName = "chatRoomMessageGlobal";
  },

  processedMessageObject: function(){
    return({
      message: this.messageObject.message
    });
  }

});