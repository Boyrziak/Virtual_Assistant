jQuery(document).ready(function ($) {
    $('#widget_button').draggable({
        containment: 'window'
    });
    $('#widget_body').draggable({
        handle: '#widget_header',
        containment: 'window'
    });

    // Model part

    class MessageContent {
        constructor(content, type) {
            this.content = content;
            this.type = type;
        }
    };

    class ContentText {
        constructor(text) {
            this.text = text;
        }
    }

    class ContentEvent {
        constructor(name) {
            this.name = name;
        }
    }

    class MessageDto {
        constructor(message, userDto, senderType) {
            this.message = message;
            this.userDto = userDto;
            this.senderType = senderType;
        }
    }

    class ModelFactory {
        static getUserObject(id) {
            return {
                id: id
            }
        };

        static messageDtoBuilder(content, type, senderType) {
            let _content = null;
            switch (type) {
                case ContentType.TEXT:
                    _content = new ContentText([content]);
                    break;
                case ContentType.EVENT:
                    _content = new ContentEvent(content);
                    break;
                default:
                    _content = null;
                    break;
            }
            const messageContent = new MessageContent(_content, type)
            return new MessageDto(messageContent, chat.user, senderType)
        }

        static getMessageDto(messageContent) {
            return new MessageDto(messageContent, chat.user, senderType)
        }
    }

    // Model part end

    const ContentType = Object.freeze({
        TEXT: 'text',
        EVENT: 'event',
        CARD: 'card',
        CHOICE: 'choice',
        CAROUSEL: 'carousel'
    });

    const SenderType = Object.freeze({
        USER: 'user',
        BOT: 'bot',
    });


    const WS_ENDPOINTS = {
        INIT_USER: 'init-user',
        INIT_USER_HIDDEN: 'init-user-hidden',
        INIT_BOT: 'init-bot',
        INIT_HISTORY: 'init-history',
        CLEAR_HISTORY: 'clear-history',
        CLEAR_HISTORY_CONFIRMATION: 'clear-history-confirmation',
        MESSAGE: 'message',
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        EXCEPTION: 'exception',
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
            socket.emit(WS_ENDPOINTS.INIT_BOT, {id: 1});
            $('.connection_indicator').css('color', 'green');
            if (lStorage.has(lStorage.keys.INT_USER)) {
                //return history for existing user
                const user = lStorage.get(lStorage.keys.INT_USER);
                chat.user = user;
                console.log('request to init history');
                console.log(chat.user);
                socket.emit(WS_ENDPOINTS.INIT_HISTORY, user);
            } else {
                socket.emit(WS_ENDPOINTS.INIT_USER, ModelFactory.getUserObject(null));
            }

        },
        initBot: function (bot) {
            chat.bot = bot;
            console.log(`Bot has been initialized`);
            console.log(bot);
        },
        initUser: function (user) {
            chat.user = user;
            lStorage.set(lStorage.keys.INT_USER, user);
            console.log(`get init-user response with: ${user}`);
            // welcome event
            const welcomeEvent = {
                type: ContentType.EVENT,
                content: {
                    name: 'WELCOME'
                }
            };
            socket.emit(WS_ENDPOINTS.MESSAGE, {
                userDto: lStorage.get(lStorage.keys.INT_USER),
                message: welcomeEvent
            });
        },
        initUserHidden: function (user) {
            chat.user = user;
            lStorage.set(lStorage.keys.INT_USER, user);
            console.log(`get init-user response with: ${user}`);
        },
        chatMessage: function (data) {
            console.log(data);
            chat.addMessage(data);
        },
        initHistory: function (history) {
            if (history != null) {
                history.forEach(m => chat.addMessage(m));
                chat.socket.emit(WS_ENDPOINTS.MESSAGE, ModelFactory.messageDtoBuilder('WELCOME', ContentType.EVENT, SenderType.USER));
            } else {
                console.log('init history null');
                console.log(history);
            }

        },
        chatException: function (data) {
            console.log('exception: ', data);
        },
        chatDisconnect: function () {
            console.log('Disconnected');
            $('.connection_indicator').css('color', 'red');
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
        addMessage: function (messageDto) {
            const type = messageDto.message.type;
            const sender = messageDto.senderType;
            const value = messageDto.message.content;
            let self = this;
            self.messageQueue++;
            setTimeout(function () {
                let options = {direction: ''};
                sender === 'bot' ? (options.direction = 'left', self.lastMessage = value) : options.direction = 'right';
                switch (type) {
                    case ContentType.CHOICE:
                        self.showChoice(value);
                        break;
                    case ContentType.EVENT:
                        self.showEvent(value, sender, options);
                        break;
                    case ContentType.TEXT:
                        value.text.forEach(t => self.showText(t, sender, options));
                        break;
                    case ContentType.CARD:
                        self.showImage(value);
                        break;
                }
                self.messageQueue--;
                self.messageQueue === 0 ?
                    self.scrollQuery(400) : null;
            }, 600);
        },
        showEvent: function (event, sender, options) {
            let self = this;

            self.showText(event.name, sender, options);
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
                    self.addMessage(ModelFactory.messageDtoBuilder($(this).text(), ContentType.TEXT, SenderType.USER));
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
        clearHistoryRequest: function () {
            chat.socket.emit(WS_ENDPOINTS.MESSAGE, ModelFactory.messageDtoBuilder('CLEAR_USER_DATA', ContentType.EVENT, SenderType.USER));
        },
        clearUserDataHandler: function (data) {
            console.log('Clear History data => ', data);
            /* $('#widget_queue').empty();
            lStorage.clear();
            delete chat.user;
            chat.renderContent(data); */
        },
        clearHistoryConfirmed: function (data) {
            console.log('Clear History confirmed  => ', data);
            $('#widget_queue').empty();
            lStorage.clear();
            delete chat.user;
        },
        createResponse: function (content, contentType) {
            chat.socket.emit(WS_ENDPOINTS.MESSAGE, ModelFactory.messageDtoBuilder(content, contentType, SenderType.USER));
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
        showCard: function (card) {
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
    // let timeout = 5000;
    //
    // let idleTimer = setTimeout(function () {
    //     chat.idleAction(timeout);
    // }, timeout);

    $('#human_connect').on('click', function () {
        const msg = ModelFactory.messageDtoBuilder('CONNECT_WITH_HUMAN', ContentType.EVENT, SenderType.USER)
        chat.addMessage(msg)
        chat.socket.emit('message', msg);
        // chat.socket.emit('message', ModelFactory.messageDtoBuilder('NO_REPLY', ContentType.EVENT, SenderType.USER));
    });

    $('#widget_input_field').keypress(function (e) {
        if (!lStorage.has(lStorage.keys.INT_USER)) {
            chat.socket.emit(WS_ENDPOINTS.INIT_USER_HIDDEN, {id: null})
        }
    });

    $('#widget_input_field').keydown(function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            const textContent = $(this).text();
            const messageDto = ModelFactory.messageDtoBuilder(textContent, ContentType.TEXT, SenderType.USER)
            chat.addMessage(messageDto);
            chat.createResponse(textContent, ContentType.TEXT);
            $(this).empty();
        }
    });

    $('#widget_button').on('click', function () {
        chat.open();
    });

    $('.close_widget').on('click', chat.close);

    $('#clear_history').on('click', chat.clearHistoryRequest);

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
    chat.socket.on(WS_ENDPOINTS.CONNECT, chat.connect);
    chat.socket.on(WS_ENDPOINTS.INIT_BOT, chat.initBot);
    chat.socket.on(WS_ENDPOINTS.INIT_USER, chat.initUser);
    chat.socket.on(WS_ENDPOINTS.INIT_USER_HIDDEN, chat.initUserHidden);
    chat.socket.on(WS_ENDPOINTS.CLEAR_HISTORY_CONFIRMATION, chat.clearHistoryConfirmed);
    chat.socket.on(WS_ENDPOINTS.MESSAGE, chat.chatMessage);
    chat.socket.on(WS_ENDPOINTS.INIT_HISTORY, chat.initHistory);
    chat.socket.on(WS_ENDPOINTS.EXCEPTION, chat.chatException);
    chat.socket.on(WS_ENDPOINTS.DISCONNECT, chat.chatDisconnect);

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
