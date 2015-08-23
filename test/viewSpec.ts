/// <reference path='../typings/angularjs/angular.d.ts' />
/// <reference path='../typings/angularjs/angular-mocks.d.ts' />
/// <reference path='../typings/jasmine/jasmine.d.ts' />

var module = angular.mock.module;

import {inherit, extend, curry} from "../src/common/common";
import Path from "../src/path/path";
import ResolveContext from "../src/resolve/resolveContext";
import PathContext from "../src/resolve/pathContext";
import PathFactory from "../src/path/pathFactory";
import {ViewConfig} from "../src/view/view";
import StateBuilder from "../src/state/stateBuilder";
import StateMatcher from "../src/state/stateMatcher";

import {IState} from "../src/state/interface";
import {State} from "../src/state/state";

describe('view', function() {
  var scope, $compile, $injector, elem, $controllerProvider, $urlMatcherFactoryProvider;
  let root: IState, states: {[key: string]: IState};

  beforeEach(module('ui.router', function(_$provide_, _$controllerProvider_, _$urlMatcherFactoryProvider_) {
    _$provide_.factory('foo', function() {
      return "Foo";
    });
    $controllerProvider = _$controllerProvider_;
    $urlMatcherFactoryProvider = _$urlMatcherFactoryProvider_;
  }));

  let register;
  let registerState = curry(function(_states, stateBuilder, config) {
    let state = inherit(new State(), extend({}, config, {
      self: config,
      resolve: config.resolve || {}
    }));
    let built: IState  = stateBuilder.build(state);
    return _states[built.name] = built;
  });

  beforeEach(inject(function ($rootScope, _$compile_, _$injector_) {
    scope = $rootScope.$new();
    $compile = _$compile_;
    $injector = _$injector_;
    elem = angular.element('<div>');

    states = {};
    let matcher = new StateMatcher(states);
    let stateBuilder = new StateBuilder(() => root, matcher, $urlMatcherFactoryProvider);
    register = registerState(states, stateBuilder);
    root = register({name: ""});
  }));

  describe('controller handling', function() {
    let ctx, state;
    beforeEach(() => {
      state = register({ name: "foo" });
      var nodes = [root, state].map(_state => ({ state: _state, ownParams: {}}));
      var path = PathFactory.bindTransNodesToPath(<any> new Path(nodes));
      ctx = new ResolveContext(path);
    });

    it('uses the controllerProvider to get controller dynamically', inject(function ($view, $q) {
      var ctrlExpression;
      $controllerProvider.register("AcmeFooController", function($scope, foo) { });
      elem.append($compile('<div><ui-view></ui-view></div>')(scope));

      var viewConfig = {
        view: {
          template: "test",
          controllerProvider: function (/* $stateParams, */ foo) { // todo: reimplement localized $stateParams
            ctrlExpression = /* $stateParams.type + */ foo + "Controller as foo";
            return ctrlExpression;
          }
        },
        name: '$default',
        params: {type: "Acme"},
        locals: new PathContext(ctx, state, $injector)
      };
      $view.load(new ViewConfig(<any> viewConfig));
      $q.flush();
      expect(ctrlExpression).toEqual("FooController as foo");
    }));
  });
});