$(function () {
    var output = $('#output')[0];

    window.write = function(str) {
      output.innerHTML += str + "\n";
    }

    var kjs = window.kjs = {};

    kjs.Lesson = function(id,name,editorContents) {
      this.id   = id;
      this.name = name;
      this.editorContents = editorContents;
      this.load = function () {
          kjs.editor.getSession().setValue(this.editorContents);
      }
    }

    kjs.runBuffer = function () {
        kjs.code = kjs.editor.getSession().getValue(); 
        
        $('#output').empty();
        try {
          var context = {};
          var codeFn = new Function(kjs.code);
          kjs.output = codeFn.apply(context);

          if (kjs.output) {
            window.write(["Returned ", kjs.output].join(' '));
          }
        } catch (e) {
          kjs.lastError = e;
          window.write(['<span style="color:red;">Error:', kjs.lastError.message].join(' '));
        }
    };

    kjs.initializeEditor = function () {
        kjs.editor = ace.edit("editor");
        kjs.editor.setShowPrintMargin(false);
        kjs.editor.setTheme("ace/theme/twilight");
        
        var JavaScriptMode = require("ace/mode/javascript").Mode;
        kjs.editorMode = new JavaScriptMode();
        kjs.EditSession    = require("ace/edit_session").EditSession;
        kjs.editor.getSession().setMode(kjs.editorMode);

    };

    kjs.initializeControls = function () {
        $('#run').click(function (e){
            e.preventDefault();
            kjs.runBuffer();
        });

        var $editor = $('#editor');
        var shifted = false;
        $editor.keydown(function (e) {
            if (e.keyCode == 16) {
                shifted = true;
            }
        });
        $editor.keyup(function (e) {
            if (e.keyCode == 16) {
                shifted = false;
            }
        });
        $editor.keypress(function (e) {
          if (e.keyCode === 13 && shifted) {
              e.preventDefault();
              kjs.runBuffer();
          }
        });
    };
     
    kjs.loadHashLesson = function () {
        var lessonId = $(window.location.hash.split('/')).last()[0]; 
        for (var i = 0; i < kjs.lessons.length; i++) {
            var lesson = kjs.lessons[i];
            if (lesson.id === lessonId) {
                lesson.load();
                break;
            }
        }
    };

    kjs.loadLessons = function() {
        $.get('lessons.xml').
        success(function(data) {
            var lessonsXML = $(data);
            kjs.lessons = lessonsXML.find('lesson').map(function(i,lessonXML) {
                var $x   = $(lessonXML);
                var id   = $x.attr('id');
                var name = $x.attr('name');
                var editorContents = $($x.find('editor')[0]).text();
                return new kjs.Lesson(id,name,editorContents);
            });

            window.onhashchange = kjs.loadHashLesson;
            window.location.hash = "/lessons/" + kjs.lessons[0].id
            kjs.loadHashLesson();
        }).
        error(function() {
            alert("Could not load lessons");
        });
    };

    kjs.initializeUI = function() {
      $('a.button').button();
    };

    /* LOCAL DATABASE */

    kjs.State = Backbone.Model.extend({

        defaults: {
            "name"  : "default",
            "code"  : "",
            "lesson": ""
        }
    });

    kjs.States = Backbone.Collection.extend({
        localStorage: new Store("saved_states"),

        model: kjs.SavedState,

        exists: function (name) {
            return this.some(function (state) {
                return state.name === name;
            });
        },

        getByName: function (name) {
            return this.find(function (state) {
                return state.name === name;
            });
        },

        comparator: function (state) {
            return state.get("name");
        },
    });

    kjs.SavedStates = new kjs.States();

    kjs.saveState = function () {
        if (!Modernizr.localstorage) {
            window.alert("Sorry, this feature is only available on newer browsers that support local storage.  We recommend Google Chrome!");
            return;
        }

        var saveName = window.prompt("Save as?", "");
        if (saveName.length === 0) {
            window.alert("You entered a blank save name!");
            return;
        }

        if (kjs.SavedStates.exists(saveName)) {
            doSave = window.confirm("Do you really want to save over " + saveName + "?");
            if (!doSave) {
                return;
            }
            var state = kjs.SavedStates.getByName(saveName);
            state.set({'code': kjs.editor.getSession().getValue(), 'lesson': ''});
        } else {
            kjs.SavedStates.create({
                'name' : "saveName",
                'code': kjs.editor.getSession().getValue(),
                'lesson': ''
            });
    
        }

        if (doSave) {

        }
    };

    kjs.loadState = function (saveName) {
    };

    kjs.initialize = function () {
      kjs.initializeUI();
      kjs.initializeEditor();
      kjs.initializeControls();
      kjs.loadLessons();
      kjs.SavedStates.fetch();
    };
    
    kjs.initialize();
});
