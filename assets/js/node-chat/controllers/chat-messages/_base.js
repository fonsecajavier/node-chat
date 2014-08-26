NodeChat.Controllers.ChatMessages.Base = NodeChat.Controllers.Base.extend({
  templateName: null,
  messageObject: null,

  init: function(app, messageObject){
    this._super( app );

    this.messageObject = messageObject;
  },

  generateHTML: function(){
    if(!this.processedMessageObject){
      throw "Can't find definition for processedMessageObject function.  Make sure you're extending ChatMessages.Base class and setting up this method."
    }

    return Mustache.render(this.app.templates[this.templateName], this.processedMessageObject());
  }

});