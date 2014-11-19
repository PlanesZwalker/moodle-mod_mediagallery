M.mod_mediagallery = M.mod_mediagallery || {};
M.mod_mediagallery.base = {

    mid : 0,
    gallery: 0,
    lbg_setup_ran: false,
    options: {
        enablecomments : false,
        enablelikes : false
    },
    uri : M.cfg.wwwroot + '/mod/mediagallery/rest.php',

    init: function(mid, type, editing, gallery, options) {
        this.mid = mid;
        this.gallery = gallery;
        if (editing || type === 'gallery') {
            this.watch_editing_buttons(type);
        }
        if (options && options.enablecomments) {
            this.options.enablecomments = true;
        }
        if (options && options.enablelikes) {
            this.options.enablelikes = true;
        }

        this.setup_sample_link();
    },

    watch_editing_buttons : function(type) {
        var selector = '.gallery_list_item';
        if (type === 'item') {
            selector = '.item';
        }
        var config = {
            title : M.str.mod_mediagallery["confirm"+type+"delete"],
            origquestion : M.str.mod_mediagallery["delete"+type] + ' ',
            yesLabel : M.str.moodle.yes,
            noLabel : M.str.moodle.cancel,
            closeButtonTitle : M.str.moodle.cancel
        };

        Y.all(selector + ' .action-icon.delete').each(function() {
            this._confirmationListener = this._confirmationListener || this.on('click', function(e) {
                // Prevent the default event (sumbit) from firing
                e.preventDefault();
                // Create the confirm box
                var itemdata = this.ancestor("div"+selector).getData();
                config.question = config.origquestion + itemdata.title + '?';
                var confirm = new M.core.confirm(config);
                // If the user clicks yes
                confirm.on('complete-yes', function(e) {
                    // Detach the listener for the confirm box so it doesn't fire again.
                    this._confirmationListener.detach();
                    // Simulate the original cancel button click
                    itemdata["class"] = type;
                    M.mod_mediagallery.base.delete_object(itemdata, selector);
                }, this);
                // Show the confirm box
                confirm.show();
            }, this);
        });
    },

    add_gallery_info_modal : function(courseid, data) {
        var metainfo = Y.Node.create('<div class="metainfo"></div>');
        var userlink = '<a href="' + M.cfg.wwwroot + '/user/view.php?id=' + data.userid +
            '&course=' + courseid + '">' + data.firstname + ' ' + data.lastname + '</a>';

        var list = [
            [M.str.mod_mediagallery.galleryname, data.name],
            [M.str.mod_mediagallery.creator, userlink]
        ];
        if (data.groupname !== null) {
            list.push([M.str.moodle.group, data.groupname]);
        }

        Y.each(list, function(v) {
            Y.Node.create('<div class="field">'+v[0]+'</div><div class="value">'+v[1]+'</div>').appendTo(metainfo);
        });
        var config = {
            headerContent : M.str.mod_mediagallery.information,
            bodyContent : metainfo,
            modal : true
        }
        Y.one('.gallery_list_item[data-id='+data.id+'] .action-icon.info').on('click', function(e) {
            e.preventDefault();
            new M.core.dialogue(config);
        });
    },

    add_item_info_modal : function(data) {
        var metainfo = Y.Node.create('<div class="metainfo"></div>');

        var list = [
            [M.str.mod_mediagallery.caption, data.caption],
            [M.str.mod_mediagallery.datecreated, data.timecreatedformatted],
            [M.str.moodle.fullnameuser, data.firstname+' '+data.lastname],
            [M.str.moodle.username, data.username],
            [M.str.moodle.group, data.groupname],
            [M.str.moodle.description, data.description],
            [M.str.mod_mediagallery.moralrights, data.moralrights == "1" ? M.str.moodle.yes : M.str.moodle.no],
            [M.str.mod_mediagallery.originalauthor, data.originalauthor],
            [M.str.mod_mediagallery.productiondate, data.productiondateformatted],
            [M.str.mod_mediagallery.medium, data.medium],
            [M.str.mod_mediagallery.publisher, data.publisher],
            [M.str.mod_mediagallery.collection, data.collection],
        ];

        Y.each(list, function(v, k) {
            var display = true;
            if ((k === 4 || k === 3) && list[k][1] === null) {
                display = false;
            }
            if (display) {
                Y.Node.create('<div class="field">'+v[0]+'</div><div class="value">'+v[1]+'</div>').appendTo(metainfo);
            }
        });
        var config = {
            headerContent : M.str.mod_mediagallery.information,
            bodyContent : metainfo,
            modal : true
        }
        Y.one('.item[data-id='+data.id+'] .action-icon.info').on('click', function(e) {
            e.preventDefault();
            var dialogue = new M.core.dialogue(config);
            dialogue.show();
        });
    },

    delete_object : function(data, selector) {

        var statusspinner = false;

        data.m = this.mid;
        data.sesskey = M.cfg.sesskey;

        var config = {
            method: 'DELETE',
            data: data,
            on: {
                success: function(tid, response) {
                    try {
                        responsetext = Y.JSON.parse(response.responseText);
                        if (responsetext.error) {
                            new M.core.ajaxException(responsetext);
                        }
                    } catch (e) {
                        new M.core.ajaxException();
                    }

                    if (statusspinner) {
                        window.setTimeout(function(e) {
                            statusspinner.hide();
                        }, 400);
                    }
                    // TODO: remove gallery from dom.
                    Y.one(selector+'[data-id='+data.id+']').remove();
                },
                failure : function(tid, response) {
                    if (statusspinner) {
                        statusspinner.hide();
                    }
                }
            },
            context: this,
            sync: true
        };

        if (statusspinner) {
            statusspinner.show();
        }

        Y.io(M.mod_mediagallery.base.uri, config);
    },

    lbg_setup : function() {
        if (this.lbg_setup_ran) {
            return;
        }
        this.lbg_setup_ran = true;
        var node = Y.one('.lb-social');
        var template = '<div class="lb-extradetails"></div><div class="lb-socialactions">';
        if (this.options.enablelikes) {
            template += '<a class="like" href="#"><div class="like"></div>'+M.str.mod_mediagallery.like+'</a><span id="lb-likedby"></span>';
        }
        template += '<span id="lb-fullsize"></span></div><div id="lb-comments"></div>';
        node.setHTML(template);

        // Like action.
        Y.delegate('click', function(e) {
            e.preventDefault();

            var action = 'like';
            var likedbyme = 1;
            var text = 'unlike';
            var icon = '<div class="unlike"></div>';
            if (Y.one('.lb-socialactions a.like div').hasClass('unlike')) {
                action = 'unlike';
                likedbyme = 0;
                text = 'like';
                icon = '<div class="like"></div>';
            }

            var datanode = Y.one('.lb-data');
            var data = {
                sesskey : M.cfg.sesskey,
                m : M.mod_mediagallery.base.mid,
                id : datanode.getData('itemid'),
                "class" : 'item',
                action : action
            };

            var config = {
                method: 'POST',
                data: data,
                on: {
                    success : function (id, response) {
                        var resp = JSON.parse(response.responseText);
                        M.mod_mediagallery.base.update_likes(resp.likes, likedbyme);
                    }
                },
                context: this,
                sync: true
            };

            Y.io(M.mod_mediagallery.base.uri, config);
            Y.one('.lb-socialactions a.like').setHTML(icon + M.str.mod_mediagallery[text]);

        }, '.lb-social', '.lb-socialactions a.like');
    },

    update_likes : function(likes, likedbyme) {
        var str = '';
        if (likes > 0) {
            str = '&nbsp;&bull;&nbsp;';
            str += M.str.mod_mediagallery.likedby+': '
            if (likedbyme) {
                likes = likes - 1;
                str += M.str.mod_mediagallery.you + ', ';
            }
            str += likes+' ';
            if (likes != 1) {
                str += M.str.mod_mediagallery.others;
            } else {
                str += M.str.mod_mediagallery.other;
            }
        }
        Y.one('#lb-likedby').setHTML(str);
    },

    lbg_change : function(item, lb) {
        if (!this.lbg_setup_ran) {
            this.lbg_setup();
        }

        var node = Y.one('.lb-data');
        node.setData('itemid', item.itemid);

        if (item.player === "0" || item.player === "2") {
            this.lbg_embed_player(item.itemid, lb);
        }

        var datanode = Y.one('.lb-data');
        var data = {
            sesskey : M.cfg.sesskey,
            m : M.mod_mediagallery.base.mid,
            id : datanode.getData('itemid'),
            "class" : 'item',
            action : 'socialinfo'
        };

        var config = {
            method: 'GET',
            data: data,
            on: {
                success : function (id, response) {
                    var resp = JSON.parse(response.responseText);
                    if (resp.commentcontrol) {
                        Y.one('#lb-comments').setHTML(resp.commentcontrol);
                        var opts = {
                            client_id : resp.client_id,
                            contextid : resp.contextid,
                            itemid : datanode.getData('itemid'),
                            component : 'mod_mediagallery',
                            commentarea : 'item'
                        };
                        M.core_comment.init(Y, opts);
                    }
                    if (this.options.enablelikes) {
                        var icon = '<div class="like"></div>';
                        if (resp.likedbyme) {
                            icon = '<div class="unlike"></div>';
                            Y.one('.lb-socialactions a.like').setHTML(icon + M.str.mod_mediagallery.unlike);
                        } else {
                            Y.one('.lb-socialactions a.like').setHTML(icon + M.str.mod_mediagallery.like);
                        }

                        M.mod_mediagallery.base.update_likes(resp.likes, resp.likedbyme);
                    }

                    str = '';
                    if (item.player === "1") {
                        if (this.options.enablelikes) {
                            str += '&nbsp;&bull;&nbsp;';
                        }
                        str += '<a href="'+item.url+'?forcedownload=0" target="_blank">' +
                            M.str.mod_mediagallery.viewfullsize+'</a>';
                    }
                    Y.one('#lb-fullsize').setHTML(str);

                    if (resp.extradetails) {
                        var details = Y.one('.lb-social .lb-extradetails');
                        details.setHTML(resp.extradetails);
                    }
                }
            },
            context: this,
            sync: true
        };

        Y.io(M.mod_mediagallery.base.uri, config);
    },

    lbg_embed_player : function(itemid, lb) {
        var config = {
            method: 'GET',
            data: {
                sesskey : M.cfg.sesskey,
                m : M.mod_mediagallery.base.mid,
                "class" : 'item',
                action : 'embed',
                id : itemid
            },
            on: {
                success : function (id, response) {
                    var resp = JSON.parse(response.responseText);
                    Y.one('.lb-image').ancestor().append(resp.html);
                    if (resp.type === 'audio') {
                        M.util.add_audio_player(resp.id, resp.url, false);
                    } else {
                        M.util.add_video_player(resp.id, resp.url, false);
                    }
                    M.mod_mediagallery.base.load_flowplayer();
                    if (resp.type === 'video') {
                        lb.sizeContainer(400, 400);
                    }
                }
            },
            context: this,
            sync: true
        };

        Y.io(M.mod_mediagallery.base.uri, config);
    },

    load_flowplayer : function() {
        if (M.util.video_players.length == 0 && M.util.audio_players.length == 0) {
            return;
        }

        var embed_function = function() {

            var controls = {
                    autoHide: true
            }

            for(var i=0; i<M.util.video_players.length; i++) {
                var video = M.util.video_players[i];
                if (video.width > 0 && video.height > 0) {
                    var src = {src: M.cfg.wwwroot + '/lib/flowplayer/flowplayer-3.2.18.swf', width: video.width, height: video.height};
                } else {
                    var src = M.cfg.wwwroot + '/lib/flowplayer/flowplayer-3.2.18.swf';
                }
                flowplayer(video.id, src, {
                    plugins: {controls: controls},
                    clip: {
                        url: video.fileurl, autoPlay: false, autoBuffering: true, scaling: 'fit', mvideo: video,
                        onMetaData: function(clip) {
                            if (clip.mvideo.autosize && !clip.mvideo.resized) {
                                clip.mvideo.resized = true;
                                var width = 0;
                                var height = 0;
                                if (typeof(clip.metaData.width) == 'undefined' || typeof(clip.metaData.height) == 'undefined') {
                                    // bad luck, we have to guess - we may not get metadata at all
                                    width = clip.width;
                                    height = clip.height;
                                } else {
                                    width = clip.metaData.width;
                                    height = clip.metaData.height;
                                }
                                var minwidth = 300; // controls are messed up in smaller objects
                                if (width < minwidth) {
                                    height = (height * minwidth) / width;
                                    width = minwidth;
                                }

                                var object = this._api();
                                object.width = width;
                                object.height = height;
                            }
                        }
                    }
                });
            }
            M.util.video_players = [];
            if (M.util.audio_players.length == 0) {
                return;
            }
            var controls = {
                    autoHide: false,
                    fullscreen: false,
                    next: false,
                    previous: false,
                    scrubber: true,
                    play: true,
                    pause: true,
                    volume: true,
                    mute: false,
                    backgroundGradient: [0.5,0,0.3]
                };

            var rule;
            for (var j=0; j < document.styleSheets.length; j++) {

                // To avoid javascript security violation accessing cross domain stylesheets
                var allrules = false;
                try {
                    if (typeof (document.styleSheets[j].rules) != 'undefined') {
                        allrules = document.styleSheets[j].rules;
                    } else if (typeof (document.styleSheets[j].cssRules) != 'undefined') {
                        allrules = document.styleSheets[j].cssRules;
                    } else {
                        // why??
                        continue;
                    }
                } catch (e) {
                    continue;
                }

                // On cross domain style sheets Chrome V8 allows access to rules but returns null
                if (!allrules) {
                    continue;
                }

                for(var i=0; i<allrules.length; i++) {
                    rule = '';
                    if (/^\.mp3flowplayer_.*Color$/.test(allrules[i].selectorText)) {
                        if (typeof(allrules[i].cssText) != 'undefined') {
                            rule = allrules[i].cssText;
                        } else if (typeof(allrules[i].style.cssText) != 'undefined') {
                            rule = allrules[i].style.cssText;
                        }
                        if (rule != '' && /.*color\s*:\s*([^;]+).*/gi.test(rule)) {
                            rule = rule.replace(/.*color\s*:\s*([^;]+).*/gi, '$1');
                            var colprop = allrules[i].selectorText.replace(/^\.mp3flowplayer_/, '');
                            controls[colprop] = rule;
                        }
                    }
                }
                allrules = false;
            }

            for(i=0; i<M.util.audio_players.length; i++) {
                var audio = M.util.audio_players[i];
                if (audio.small) {
                    controls.controlall = false;
                    controls.height = 15;
                    controls.time = false;
                } else {
                    controls.controlall = true;
                    controls.height = 25;
                    controls.time = true;
                }
                flowplayer(audio.id, M.cfg.wwwroot + '/lib/flowplayer/flowplayer-3.2.18.swf', {
                    plugins: {controls: controls, audio: {url: M.cfg.wwwroot + '/lib/flowplayer/flowplayer.audio-3.2.11.swf'}},
                    clip: {url: audio.fileurl, provider: "audio", autoPlay: false}
                });
            }
            M.util.audio_players = [];
        }

        if (typeof(flowplayer) == 'undefined') {
            if (M.cfg.jsrev == -1) {
                var jsurl = M.cfg.wwwroot + '/lib/flowplayer/flowplayer-3.2.13.js';
            } else {
                var jsurl = M.cfg.wwwroot + '/lib/javascript.php?jsfile=/lib/flowplayer/flowplayer-3.2.13.min.js&rev=' + M.cfg.jsrev;
            }
            var fileref = document.createElement('script');
            fileref.setAttribute('type','text/javascript');
            fileref.setAttribute('src', jsurl);
            fileref.onload = embed_function;
            fileref.onreadystatechange = embed_function;
            document.getElementsByTagName('head')[0].appendChild(fileref);
        } else {
            embed_function();
        }
    },

    setup_sample_link : function() {
        var config = {
            title : M.str.mod_mediagallery.addsamplegallery,
            question : '<img src="'+M.util.image_url('i/loading_small')+'" title="Processing..." />',
            yesLabel : M.str.moodle.add,
            noLabel : M.str.moodle.cancel,
            closeButtonTitle : M.str.moodle.cancel
        };

        if (Y.one('#mg_sample')) {
            Y.one('#mg_sample').on('click', function(e) {
                e.preventDefault();

                // Create the confirm box.
                var confirm = new M.core.confirm(config);

                var ioconfig = {
                    method: 'GET',
                    data: {
                        sesskey : M.cfg.sesskey,
                        m : M.mod_mediagallery.base.mid,
                        "class" : 'gallery',
                        action : 'get_sample_targets'
                    },
                    on: {
                        success: function(tid, response) {
                            try {
                                responsetext = Y.JSON.parse(response.responseText);
                                if (responsetext.error) {
                                    new M.core.ajaxException(responsetext);
                                }
                            } catch (e) {
                                new M.core.ajaxException();
                            }
                            var node = Y.Node.create('<div class="sample_target_wrapper"><span>'+M.str.mod_mediagallery.mediagallery+':</span></div>');
                            var select = Y.Node.create('<select id="sample_target"/>');
                            node.append(select);
                            Y.Object.each(responsetext, function(v, k) {
                                Y.Node.create('<option value="'+k+'">'+v+'</option>').appendTo(select);
                            });
                            confirm.bodyNode.one('.confirmation-message').setHTML(node);
                        },
                        failure : function(tid, response) {
                        }
                    },
                    context: this,
                    sync: true
                };
                Y.io(M.mod_mediagallery.base.uri, ioconfig);

                // If the user clicks add.
                confirm.on('complete-yes', function(e) {
                    var target = Y.one('#sample_target').get('value');
                    var ioconfig = {
                        method: 'POST',
                        data: {
                            sesskey : M.cfg.sesskey,
                            m : M.mod_mediagallery.base.mid,
                            "class" : 'gallery',
                            id : M.mod_mediagallery.base.gallery,
                            action : 'sample',
                            "data[]" : target
                        },
                        on: {
                            success: function(tid, response) {
                                try {
                                    responsetext = Y.JSON.parse(response.responseText);
                                    if (responsetext.error) {
                                        new M.core.ajaxException(responsetext);
                                    }
                                } catch (e) {
                                    new M.core.ajaxException();
                                }
                            },
                            failure : function(tid, response) {
                            }
                        },
                        context: this,
                        sync: true
                    };
                    Y.io(M.mod_mediagallery.base.uri, ioconfig);
                }, this);
                // Show the confirm box
                confirm.show();
            });
        }
    }
};
