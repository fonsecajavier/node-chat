//= require oop.js
//= require mediator.js
//= require node-chat/extras.js
//= require node-chat/namespace.js
//= require node-chat/client-app.js
//= require node-chat/controllers/_base.js
//= require_tree node-chat/controllers

$(document).foundation();

$(function() {
  window.chatApp = new NodeChat.ClientApp();
  new NodeChat.Controllers.Init( window.chatApp, $('.main-container') );
});