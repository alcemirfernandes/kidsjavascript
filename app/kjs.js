// vim: ts=4:sw=4
$(function () {
    var kjs = window.kjs = {};

    /* INITIALIZATION */

    kjs.initialize = function () {
      kjs.app = new kjs.AppView();

      kjs.workbench = new kjs.Workbench();
      kjs.loadLessons(function() {
        kjs.SavedStates.fetch();
         
        Backbone.history.start();
      });
    };
     
    kjs.AppView = Backbone.View.extend({
        
        el: $('#container'),

        events: {
            "click #run":        "runBuffer",  // run button
            "keypress #editor":  "runBuffer",  // shift + enter to run console
            "click #open-state": "openState",  // open and load a saved editor/lesson state
            "click #save-state": "saveState",  // save editor/lesson state
            "click #browse":     "openBrowse", // Open lesson browsing
            "mouseout #lesson-browse-dialog": "closeBrowse",
            "mouseover #lesson-browse-dialog": "ensureBrowse"
        },

        templates: {
            "open-state-dialog"           : _.template($('#open-state-dialog').html()),
            "lesson-browse-dialog"        : _.template($('#lesson-browse-dialog-tmpl').html()),
            "console-output"              : _.template($('#console-output-tmpl').html()),
            "raphael-output"              : _.template($('#raphael-output-tmpl').html())
        },

        initialize: function () {
            _.bindAll(this, 'runBuffer', 'render', 'loadLesson', 'saveState', 'loadState', 'openState', 'autoSave');

            this.console = {
                write:  function (str) {
                    // NOTE: we only use the less readable array.join method since we don't know how this
                    // function will be called and whether performance will matter (possibly 10^20 times, who knows!)
                    var output = $('#console')[0];
                    output.innerHTML = [output.innerHTML, str, "\n"].join("");
                }
            };

            // init jquery buttons
            this.$('a.button').button();

            // init ace javascript editor
            this.editor = ace.edit("editor");
            this.editor.setShowPrintMargin(false);
            this.editor.setTheme("ace/theme/twilight");
            
            var JavaScriptMode = require("ace/mode/javascript").Mode;
            this.editorMode = new JavaScriptMode();
            this.editor.getSession().setMode(this.editorMode);

            // init notification settings
            $.extend($.gritter.options, {
                position: 'bottom-right', // defaults to 'top-right' but can be 'bottom-left', 'bottom-right', 'top-left', 'top-right' (added in 1.7.1)
                fade_in_speed: 'medium', // how fast notifications fade in (string or int)
                fade_out_speed: 'medium', // how fast the notices fade out
                time: 3000 // hang on the screen for...
            });                

            // init auto save
            window.setInterval(this.autoSave, 5*60*1000);
        },

        runBuffer: function (e) {
            if ( (!e.shiftKey || !(e.keyCode === 13)) && !(e.type === 'click') ) {
                return;
            }
            e.preventDefault();
            this.code = this.editor.getSession().getValue(); 
            
            $('#console').empty();
  
            if (this.lesson.get('type') === 'raphael') {
                this.paper.clear();
                this.pen = new kjs.Pen(this.paper);
            }

            try {
                var context = {
                };
                //var args = [ {}, this.console ];
                var codeFn = new Function("window", "document", "$", "jQuery", "console", "paper", "pen", this.code);
                this.returned = codeFn.call(context, {}, {}, {}, {}, this.console, this.paper, this.pen);

                if (this.returned) {
                    this.console.write(["Returned ", this.returned].join(' '));
                }
            } catch (e) {
                this.lastError = e;
                this.console.write(['<span style="color:red;">Error:', this.lastError.message].join(' '));
            }
        },

        render: function() {
            this.editor.getSession().setValue(this.lesson.get("editorContents"));
            this.$('#browse span').html((this.lesson.get("index") + 1) + " of " +
                               kjs.lessons.length + " - " + 
                               this.lesson.get('name'));

            var prevLesson    = kjs.lessons.at(this.lesson.get("index") - 1);
            var prevLessonUrl = prevLesson ? '#' + kjs.workbench.urls.lesson(prevLesson.get("id")) :
                                             '#' + kjs.workbench.urls.lesson(this.lesson.get("id"));
            this.$('#prev-lesson').attr('href', prevLessonUrl);

            
            var nextLesson    = kjs.lessons.at(this.lesson.get("index") + 1);
            var nextLessonUrl = nextLesson ? '#' + kjs.workbench.urls.lesson(nextLesson.get("id")) :
                                             '#' + kjs.workbench.urls.lesson(this.lesson.get("id"));
            this.$('#next-lesson').attr('href', nextLessonUrl);

            var ltype = this.lesson.get('type');
            var blankOutput = null;
            if (ltype === 'raphael') {
                blankOutput = this.templates['raphael-output']();
            } else {
                blankOutput = this.templates['console-output']();
            }
            this.$('#output-container').html(blankOutput);

            if (ltype === 'raphael') {
                this.paper = Raphael('paper',370, 300);
                this.pen   = new kjs.Pen(this.paper);
            }
        },

        loadLesson: function (lesson) {
            this.lesson = lesson;            
            this.render();
        },

        displayNotification: function (text) {
           $.gritter.add({
            title: (new Date).toLocaleTimeString(),
            text: text
           });
        },

        autoSave:  function () {
            var autosave = kjs.SavedStates.getByName("_autosave");
            if (!autosave) {
                kjs.SavedStates.create({
                    "name": "_autosave",
                    "code": this.editor.getSession().getValue(),
                    "lesson": this.lesson.get("id")
                });
            } else {
                autosave.set({
                    "code": this.editor.getSession().getValue(),
                    "lesson": this.lesson.get("id")
                });
                autosave.save();
            }

            this.displayNotification("Your session was auto-saved");
        },
        
        saveState: function () {
            if (!Modernizr.localstorage) {
                window.alert("Sorry, this feature is only available on newer browsers that support local storage.  We recommend Google Chrome!");
                return;
            }

            var saveName = window.prompt("Save as?", "");
            if (saveName.length === 0) {
                window.alert("You entered a blank save name!");
                return;
            }

            if (kjs.SavedStates.nameExists(saveName)) {
                doSave = window.confirm("Do you really want to save over " + saveName + "?");
                if (!doSave) {
                    return;
                }
                var state = kjs.SavedStates.getByName(saveName);
                state.set({
                    "name":   saveName,
                    "code":   this.editor.getSession().getValue(),
                    "lesson": this.lesson.get("id")
                });
                state.save();
            } else {
                kjs.SavedStates.create({
                    "name" :  saveName,
                    "code":   this.editor.getSession().getValue(),
                    "lesson": this.lesson.get("id")
                }); 
            }

            this.displayNotification("Successfully saved");
        },

        loadState: function (state) {
            this.editor.getSession().setValue(state.get("code"));
        },

        openState: function (e) {
            e.preventDefault();
            var states = kjs.SavedStates.models;
            var dialogHTML = this.templates['open-state-dialog']({
                'states': states
            });
            var selectedState = null;
            $(dialogHTML).dialog({
                'autoOpen': true,
                'modal':    true,
                'buttons': {
                    'Open': function () {
                        if (selectedState) {
                            var state = kjs.SavedStates.getById(selectedState);
                            window.location.hash = "/lessons/" + state.get("lesson") + "/" + selectedState;
                            $(this).dialog("close");
                        }
                    },
                    'Cancel': function () {
                        $(this).dialog("close");
                    }
                }
            })
            .find('.selector').selectable({
                'selected': function (event, ui) {
                    selectedState = ui.selected.dataset.id;
                }
            });
        },

        openBrowse: function(e) {
            this.toggleBrowse(e,'open');
        },
        
        closeBrowse: function(e) {
            var self = this;
            this.closeBrowseTimeout = setTimeout(function() {
                self.toggleBrowse(e,'close');
            }, 500);
        },
        
        ensureBrowse: function(e) {
            if (this.closeBrowseTimeout) {
                clearTimeout(this.closeBrowseTimeout);
            }
        },
        
        toggleBrowse: function(e,state) {
            if (e) {
                e.preventDefault();
            }

            var self = this;
            var browseCont = $('#lesson-browse-dialog');
             
            if (state === 'close') {
                self.browseOpen = false;
                browseCont.hide();
            } else {
                self.browseOpen = true;
                 
                var browseHTML = self.templates['lesson-browse-dialog']({
                    'lessons': kjs.lessons
                });
                 
                browseCont.html(browseHTML);
                browseCont.find('a').click(function(e) {
                  self.toggleBrowse(null, 'close');
                });
                browseCont.show();
            }
        }
    });

    kjs.Workbench = Backbone.Router.extend({
      routes: {
          "/lessons/:lessonId":           "lesson",
          "/lessons/:lessonId/:stateId":  "lesson",
      },

      urls: {
        lesson: function(lessonId) {
            return "/lessons/" + lessonId;
        }
      },

      lesson: function(lessonId, stateId) {
        var lesson = kjs.lessons.find(function(lesson) {
            return(lesson.get('id') === lessonId);
        });

        kjs.app.loadLesson(lesson);

        if (stateId) {
            var state = kjs.SavedStates.getById(stateId);
            kjs.app.loadState(state);
        }
      },
    });

    /* LESSON MANAGEMENT */

    kjs.Lesson = Backbone.Model.extend({
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
                var type = $x.attr('type').trim();
                var editorContents = $($x.find('editor')[0]).text().trim();
                return kjs.lessons.add({id: id, index: i, name: name, type: type,
                                        editorContents: editorContents});
            });

            window.location.hash = kjs.workbench.urls.lesson(kjs.lessons.first().get('id'));

            if (callback) { callback() };
        }).
        error(function() {
            alert("Could not load lessons");
        });
    };

    /* LOCAL DATABASE */

    kjs.State = Backbone.Model.extend({

        initialize: function () {
            this.id = this.cid;
        },

        defaults: {
            "name"  : "",
            "code"  : "",
            "lesson": ""
        }
    });

    kjs.States = Backbone.Collection.extend({
        localStorage: new Store("saved_states"),

        model: kjs.SavedState,

        exists: function (id) {
            return this.some(function (state) {
                return state.get("id") === id;
            });
        },

        getById: function (id) {
            return this.find(function (state) {
                return state.get("id") === id;
            });
        },

        nameExists: function (name) {
            return this.some(function (state) {
                return state.get("name") === name;
            });
        },

        getByName: function (name) {
            return this.find(function (state) {
                return state.get("name") === name;
            });
        },

        comparator: function (state) {
            return state.get("id");
        },
    });

    kjs.SavedStates = new kjs.States();

    kjs.SavedStateSelector = Backbone.View.extend({
    });

    kjs.Pen = function(paper) {
        this.paper = paper;
        this.x     = 0;
        this.y     = 0;
        this.penState = 'down';
        this.penUp = function() {
            this.penState = 'up';
            return this;
        },
        this.penDown = function() {
            this.penState = 'down';
            return this;
        },
        this.move  = function(x,y) {
            var path = "M" + this.x + ' ' + this.y;
            this.x = x;
            this.y = y;
            if (this.penState === 'down') {
                path += ("L" + x + ' ' + y);
            } else {
                path += ("M" + x + ' ' + y);
            }
            paper.path(path);
            return this;
        },
        this.left = function(dist) {
            return this.move(this.x - dist,this.y);
        }
        this.right = function(dist) {
            return this.move(this.x + dist,this.y);
        },
        this.down = function(dist) {
            return this.move(this.x, this.y + dist);
        },
        this.up   = function(dist) {
            return this.move(this.x, this.y - dist);
        }
    }

    kjs.initialize();
});
