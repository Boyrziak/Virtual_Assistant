jQuery(document).ready(function ($) {
    $('#widget_button').draggable({
        containment: 'window'
    });
    $('#widget_body').draggable({
        handle: '#widget_header',
        containment: 'window'
    });

    const S_CHANNEL = {
        INIT_USER: 'init-user',
        INIT_BOT: 'init-bot',
        INIT_HISTORY: 'init-history',
        MESSAGE: 'message',
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        EXCEPTION: 'exception',
        CLEAR_USER_DATA: 'clear-user-data',
        WELCOME_EVENT_FIRST: 'welcome-event-first',
        WELCOME_EVENT_RETURN: 'welcome-event-return'
    };
    const INIT_STATUS = {
        INITIALIZED: 'initialized',
        NON_INITIALIZED: 'non-initialized',
        RESET: 'reset'
    };
    const lStorage = {
        get: function (key) {
            return JSON.parse(localStorage.getItem(key));
        },
        keys: {
            INT_USER: 'intUser',
            INIT_STATUS: 'init-status'

        },
        set: function (key, item) {
            localStorage.setItem(key, JSON.stringify(item));
        },
        remove: function (key) {
            localStorage.removeItem(key);
        },
        clear: function () {
            localStorage.clear();
        },
        has: function (key) {
            return localStorage.getItem(key) !== null;
        }

    };
    let chat = {
        socket: {},
        opened: false,
        active: false,
        guestName: 'dear Guest',
        firstTime: true,
        APIkey: '563492ad6f91700001000001bb151c8c07f048768f0c409fc846429b',
        messageQueue: 0,
        lastMessage: '',
        currentLocation: location.href,
        connect: function () {
            console.log('Connected');
            socket.emit(S_CHANNEL.INIT_BOT, {id: 16});
            if (lStorage.has(lStorage.keys.INT_USER) && lStorage.get(lStorage.keys.INIT_STATUS) === INIT_STATUS.INITIALIZED) {
                //return history for existing user
                const user = lStorage.get(lStorage.keys.INT_USER);
                chat.user = user;
                socket.emit(S_CHANNEL.INIT_HISTORY, user);
            } else {
                socket.emit(S_CHANNEL.INIT_USER, {name: 'Guest'});
            }

        },
        initBot: function (data) {
            bot = data;
            console.log(`get init-bot response with: ${JSON.stringify(data)}`);
        },
        initUser: function (data) {
            chat.user = data;
            lStorage.set(lStorage.keys.INT_USER, data);
            console.log(`get init-user response with: ${JSON.stringify(data)}`);
            if (lStorage.get(lStorage.keys.INIT_STATUS) !== INIT_STATUS.RESET) {
                socket.emit(S_CHANNEL.WELCOME_EVENT_FIRST, chat.user);
            }
            lStorage.set(lStorage.keys.INIT_STATUS, INIT_STATUS.INITIALIZED);

        },
        chatMessage: function (data) {
            console.log(`get message response with: ${JSON.stringify(data)}`);
            data.forEach(d => chat.addMessage(d, 'bot'));
        },
        initHistory: function (data) {
            console.log(`get HISTORY init response with: ${JSON.stringify(data)}`);
            data.forEach(d => chat.addMessage(d.content, d.senderType === 'bot' ? 'bot' : 'user'));
            chat.socket.emit(S_CHANNEL.WELCOME_EVENT_RETURN, chat.user);
        },
        chatException: function (data) {
            console.log('exception: ', data);
        },
        chatDissconnect: function () {
            console.log('Disconnected');
        },
        open: function () {
            let button = $('#widget_button');
            let self = this;
            let body = $('#widget_body');
            body.css({
                top: button.offset().top - body.outerHeight() - 40 + 'px',
                left: button.offset().left - body.outerWidth() + 100 + 'px'
            });
            button.addClass('clicked');
            body.addClass('opened');
            body.toggle('blind', {direction: 'down'}, 1000);
            if (body.offset().top <= 5) {
                $(body).animate({top: '10px'}, 500);
            }
            button.draggable('disable');
            $('#widget_input').empty();
            self.opened = true;
            $('#preview_container').empty().hide('drop', 600);
            self.scrollQuery(1200);
        },
        close: function () {
            let body = $('#widget_body');
            let button = $('#widget_button');
            let self = this;
            button.css({
                top: body.offset().top + body.outerHeight() + 40 + 'px',
                left: body.offset().left + body.outerWidth() - button.outerWidth()
            });
            button.removeClass('clicked');
            body.removeClass('opened');
            body.toggle('blind', {direction: 'down'}, 1000);
            this.opened = false;
            button.draggable('enable');
            if (button.offset().top + button.outerHeight() >= $(window).outerHeight() - 5) {
                $(button).animate({top: $(window).outerHeight() - button.outerHeight() - 10 + 'px'}, 500);
            }
            // self.showPreview(this.lastMessage);
            console.log(self.lastMessage);
        },
        reposition: function () {
            let self = this;
            let body = $('#widget_body');
            let windowHeight = $(window).outerHeight();
            let windowWidth = $(window).outerWidth();
            if (body.offset().top <= 5) {
                $(body).animate({top: '10px'}, 500);
            } else if (body.offset().top + body.outerHeight() > windowHeight) {
                $(body).animate({top: windowHeight - body.outerHeight() - 5 + 'px'}, 500);
            }
            if (body.offset().left < 0) {
                $(body).animate({left: '10px'}, 500);
            } else if (body.offset().left + body.outerWidth() > windowWidth) {
                $(body).animate({left: windowWidth - body.outerWidth() - 5 + 'px'}, 500);
            }
        },
        addMessage: function (value, sender, type) {
            let self = this;
            self.messageQueue++;
            setTimeout(function () {
                let options = {direction: ''};
                sender === 'bot' ? (options.direction = 'left', self.lastMessage = value) : options.direction = 'right';
                switch (type) {
                    case 'choice':
                        self.showChoice(value);
                        break;
                    case 'text':
                        self.showText(value, sender, options);
                        break;
                    case 'image':
                        self.showImage(value);
                        break;
                }
                self.messageQueue--;
                self.messageQueue === 0 ?
                    self.scrollQuery(400) : null;
            }, 600);
        },
        showText: function (text, sender, options) {
            let self = this;
            let newMessage = document.createElement('div');
            $(newMessage).addClass('widget_message ' + sender + '_message');
            $(newMessage).append(text);
            $(newMessage).appendTo('#widget_queue').show('drop', options, 600);
            if (!self.opened) {
                self.showPreview(text);
            }
        },
        showChoice: function (choices) {
            let self = this;
            let choiceContainer = document.createElement('div');
            $(choiceContainer).addClass('choice_container');
            choices.forEach(function (choice) {
                let choiceButton = document.createElement('span');
                $(choiceButton).addClass('choice_button');
                $(choiceButton).text(choice['value']);
                //Здесь обработчик на нажатие кнопки
                choiceButton.addEventListener('click', function () {
                    console.log($(this).text());
                    $(this).addClass('chosen');
                    self.addMessage($(this).text(), 'user', 'text');
                    $(choiceContainer).remove();
                });
                $(choiceContainer).append(choiceButton);
            });
            $(choiceContainer).appendTo('#widget_queue').show('drop', {direction: 'left'}, 600);
        },
        scrollQuery: function (timeout) {
            $('#widget_queue').animate({scrollTop: $('#widget_queue')[0].scrollHeight}, timeout);
        },
        showPreview: function (text) {
            let options = {direction: 'left'};
            $('#preview_container').hide('drop', options, 600);
            setTimeout(function () {
                $('#preview_container').empty().append(text).show('fold', options, 600);
            }, 600);
        },
        initialize: function () {
        },
        clearHistory: function () {
            chat.socket.emit(S_CHANNEL.CLEAR_USER_DATA, {
                message: 'clear my data',
                user: chat.user,
            });
        },
        clearUserData: function (data) {
            console.log('Clear History data => ', data);
            $('#widget_queue').empty();
            lStorage.clear();
            lStorage.set(lStorage.keys.INIT_STATUS, INIT_STATUS.RESET);
            chat.user = null;
            data.forEach(d => chat.addMessage(d, 'bot'));
            chat.socket.emit(S_CHANNEL.INIT_BOT, {id: 16});
            chat.socket.emit(S_CHANNEL.INIT_USER, {name: 'Guest'});
        },
        welcomeEvent: function (data) {
            data.forEach(d => chat.addMessage(d, 'bot'));
        },
        welcomeReturnEvent: function (data) {
            data.forEach(d => chat.addMessage(d, 'bot'));
        },
        createResponse: function (text) {
            chat.socket.emit(S_CHANNEL.MESSAGE, {
                message: text,
                user: chat.user,
            });
        },
        idleAction: function (timeout) {
          console.log('Idle for ' + timeout + ' seconds');
          idleTimer = setTimeout(function () {
              chat.idleAction(timeout);
          }, timeout);
        },
        getCurrentLocation: function () {
            this.currentLocation = location.href;
            return this.currentLocation;
        },
        showImage: function (card) {
            let self = this;
            let image = new Image();
            image.src = card['src'];
            $(image).addClass('message_image');
            image.addEventListener('click', function () {
                let lightbox = $('#widget_lightbox');
                $(lightbox).empty();
                $(this).clone().appendTo(lightbox);
                $(lightbox).show('blind', {direction: 'up'}, 700);
                $('#modal_overlay').show('explode', 800);
            });
            image.addEventListener('load', function () {
                setTimeout(function () {
                    $(image).appendTo('#widget_queue').show('drop', {direction: 'left'}, 600);
                }, 600);
            });
        }
    };

    chat.initialize();
    let timeout = 5000;

    let idleTimer = setTimeout(function () {
        chat.idleAction(timeout);
    }, timeout);

    $('#human_connect').on('click', function () {
        const content = 'connect with human';
        chat.addMessage(content, 'user')
        chat.socket.emit('message', {
            message: content,
            user: chat.user,
        })
    });

    $('#widget_input_field').keydown(function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            chat.addMessage($(this).text(), 'user');
            chat.createResponse($(this).text());
            $(this).empty();
        }
    });

    $('#widget_button').on('click', function () {
        chat.open();
    });

    $('.close_widget').on('click', chat.close);

    $('#clear_history').on('click', chat.clearHistory);

    let resizeTimer;
    $(window).resize(function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(chat.reposition, 500);
    });

    $('#modal_overlay').on('click', function () {
        $('#widget_lightbox').hide('scale', 600);
        $(this).hide('explode', 800);
    });

    const socket = io('https://kh-gis-chat-bot.intetics.com', {path: '/chat/socket.io'});
    chat.socket = socket;
    chat.socket.on(S_CHANNEL.CONNECT, chat.connect);
    chat.socket.on(S_CHANNEL.INIT_BOT, chat.initBot);
    chat.socket.on(S_CHANNEL.INIT_USER, chat.initUser);
    chat.socket.on(S_CHANNEL.MESSAGE, chat.chatMessage);
    chat.socket.on(S_CHANNEL.INIT_HISTORY, chat.initHistory);
    chat.socket.on(S_CHANNEL.EXCEPTION, chat.chatException);
    chat.socket.on(S_CHANNEL.DISCONNECT, chat.chatDissconnect);
    chat.socket.on(S_CHANNEL.CLEAR_USER_DATA, chat.clearUserData);
    chat.socket.on(S_CHANNEL.WELCOME_EVENT_FIRST, chat.welcomeEvent);
    chat.socket.on(S_CHANNEL.WELCOME_EVENT_RETURN, chat.welcomeReturnEvent());

    // let timeout = 5000;
    //
    // let idleTimer = setTimeout(function () {
    //     chat.idleAction(timeout);
    // }, timeout);
    // let choices = [{value: 'Yes'}, {value: 'No'}];
    // let img = {src: 'Layer 6.png'};
    // chat.addMessage(choices, 'bot', 'choice');
    // chat.addMessage(img, 'bot', 'image');

    // $(window).mousemove(function () {
    //     clearTimeout(idleTimer);
    //     console.log('Mouse move was performed');
    //     idleTimer = setTimeout(function () {
    //         chat.idleAction(timeout);
    //     }, timeout);
    // });

    // if(window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition){
    //     console.log('Браузер поддерживает данную технологию');
    // }else{
    //     console.log('Не поддерживается данным браузером');
    // }
    // let SpeechRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)();
    // SpeechRecognition.lang = "en-EN";
    // SpeechRecognition.onresult = function(event){
    //     console.log(event);
    // };
    // SpeechRecognition.onend = function(){
    //     SpeechRecognition.start();
    // };
    //
    // let recording = false;
    //
    // $('#audio_input').on('click', function () {
    //         console.log('Recognition started');
    //         SpeechRecognition.start();
    // });

});
