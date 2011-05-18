$(function () {
    var output = $('#output')[0];

    window.write = function(str) {
      output.innerHTML += str + "\n";
    }

    var kjs = window.kjs = {};

    /* INITIALIZATION */

    kjs.initialize = function () {
      kjs.initializeUI();
      kjs.initializeEditor();
      kjs.initializeControls();
      kjs.loadLessons(function() {
        kjs.SavedStates.fetch();
         
        kjs.workbench = new kjs.Workbench();
        Backbone.history.start();
      });
    };

    kjs.Workbench = Backbone.Controller.extend({
      routes: {
          "/lessons/:lessonId": "lesson"
      },
      lesson: function(lessonId) {
        var lesson = kjs.lessons.find(function(lesson) {
            return(lesson.get('id') === lessonId);
        });
        lesson.load();
         
        $('#browse span').html((lesson.get("index") + 1) + " of " +
                               kjs.lessons.length + " - " + 
                               lesson.get('name'));

        var prevLesson    = kjs.lessons.at(lesson.get("index") - 1);
        var prevLessonUrl = prevLesson ? "#/lessons/" + prevLesson.get("id") :
                                         "#/lessons/" + lesson.get("id");
        $('#prev-lesson').attr('href', prevLessonUrl);

         
        var nextLesson    = kjs.lessons.at(lesson.get("index") + 1);
        var nextLessonUrl = nextLesson ? "#/lessons/" + nextLesson.get("id") :
                                         "#/lessons/" + lesson.get("id");
        $('#next-lesson').attr('href', nextLessonUrl);

        // Clear the output
        $('#output').empty();
      }
    });

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

        // Catch shift + enter to exec console
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

    kjs.initializeUI = function() {
      $('a.button').button();
    };

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

    /* LESSON MANAGEMENT */

    kjs.Lesson = Backbone.Model.extend({
        load: function() {
          kjs.editor.getSession().setValue(this.get('editorContents'));
        }
    });

    kjs.Lessons = Backbone.Collection.extend({
        model: kjs.Lesson,
    });

    kjs.loadLessons = function(callback) {
        $.get('lessons.xml').
        success(function(data) {
            var lessonsXML = $(data);
            kjs.lessons = new kjs.Lessons();
            lessonsXML.find('lesson').each(function(i,lessonXML) {
                var $x   = $(lessonXML);
                var id   = $x.attr('id').trim();
                var name = $x.attr('name').trim();
                var editorContents = $($x.find('editor')[0]).text().trim();
                return kjs.lessons.add({id: id, index: i, name: name,
                                        editorContents: editorContents});
            });

            window.location.hash = "/lessons/" + kjs.lessons.first().get('id');

            if (callback) { callback() };
        }).
        error(function() {
            alert("Could not load lessons");
        });
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

    
    kjs.initialize();
});
