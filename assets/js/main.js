//= require oop.js
//= require mediator.js
//= require node-chat/namespace.js
//= require node-chat/base-controller.js
//= require_tree node-chat/controllers

$(document).foundation('alert','events');

$(function() {
  var app = new NodeChat.Controllers.Init( $('body') );
});