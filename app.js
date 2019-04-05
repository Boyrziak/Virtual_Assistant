jQuery(document).ready(function ($) {
    $('#widget_button').draggable({
        containment: 'window'
    });
    $('#widget_body').draggable({
        handle: '#widget_header',
        containment: 'window'
    });

    // Model part

    class MessageWrapper {
        constructor(text, card, event, choice, carousel) {
            this.text = text;
            this.card = card;
            this.event = event;
            this.choice = choice;
            this.carousel = carousel;
        }
    }

    class Text {
        constructor(text) {
            this.text = text;
        }

    }

    class Event {
        constructor(name, languageCode, parameters, display) {
            this.name = name;
            this.languageCode = languageCode;
            this.parameters = parameters;
            this.display = display;
        }
    }

    class Choice {
        constructor(buttons) {
            this.buttons = buttons;
        }
    }

    class Button {
        constructor(text, postback) {
            this.text = text;
            this.postback = postback;
        }
    }

    class MessageContent {
        constructor(messages, currentUri) {
            this.messages = messages;
            this.currentUri = currentUri;
        }
    };

    class MessageDto {
        constructor(message, senderType, userDto) {
            this.message = message; // MessageContent
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

        static messageDtoBuilderText(content, senderType) {
            const _content = [new MessageWrapper()];
            _content[0].text = new Text();
            _content[0].text.text = [content];
            const messageContent = new MessageContent(_content, chat.getCurrentLocation());
            return new MessageDto(messageContent, senderType, chat.user);
        }

        static messageDtoBuilderEvent(content, senderType, display) {
            const _content = [new MessageWrapper()];
            _content[0].event = new Event();
            _content[0].event.name = content;
            _content[0].event.display = display || undefined;
            const messageContent = new MessageContent(_content, chat.getCurrentLocation());
            return new MessageDto(messageContent, senderType, chat.user);
        }
    }

    // Model part end

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
        nextMessageTimer: null,
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
            socket.emit(WS_ENDPOINTS.INIT_BOT, { id: 1 });
            $('.connection_indicator').css('color', 'green');
            $('#widget_input_field').attr('placeholder', 'Enter your message...');
            $('#widget_input_field').attr('contenteditable', 'true');
            if (lStorage.has(lStorage.keys.INT_USER)) {
                //return history for existing user
                const user = lStorage.get(lStorage.keys.INT_USER);
                chat.user = user;
                /* console.log('request to init history');
                console.log(chat.user);
                socket.emit(WS_ENDPOINTS.INIT_HISTORY, user); */
                socket.emit(WS_ENDPOINTS.INIT_USER, ModelFactory.getUserObject(user.id));
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
            console.log(`starting to init history`);
            socket.emit(WS_ENDPOINTS.INIT_HISTORY, user);
            // socket.emit(WS_ENDPOINTS.MESSAGE, ModelFactory.messageDtoBuilderEvent('WELCOME', SenderType.USER));
        },
        initUserHidden: function (user) {
            chat.user = user;
            lStorage.set(lStorage.keys.INT_USER, user);
            console.log(`get init-user response with: ${user}`);
        },
        chatMessage: function (messageDto) {
            console.log('New message reived:');
            console.log(messageDto);
            const delayArr = messageDto.message.messages.filter(mw => mw.hasOwnProperty('payload') && mw.payload.hasOwnProperty('type') && mw.payload.type === 'delay');
            if (delayArr.length > 0) {
                const delay = delayArr[0].payload.delayValue;
                chat.sendNextMessageEvent(delay);
                console.log(delayArr[0]);
            }
            chat.addMessage(messageDto);
        },
        initHistory: function (history) {
            console.log('init history process with data:');
            console.log(history);
            if (history != null) {
                history.forEach(m => chat.addMessage(m));
                chat.socket.emit(WS_ENDPOINTS.MESSAGE, ModelFactory.messageDtoBuilderEvent('WELCOME', SenderType.USER));
            } else {
                console.log('init history null');
            }

        },
        chatException: function (data) {
            console.log('exception: ', data);
        },
        chatDisconnect: function () {
            console.log('Disconnected');
            $('.connection_indicator').css('color', 'red');
            $('#widget_input_field').attr('placeholder', 'Sorry, assitant can not be reached right now');
            $('#widget_input_field').attr('contenteditable', 'false');
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
            body.toggle('blind', { direction: 'down' }, 1000);
            if (body.offset().top <= 5) {
                $(body).animate({ top: '10px' }, 500);
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
            body.toggle('blind', { direction: 'down' }, 1000);
            this.opened = false;
            button.draggable('enable');
            if (button.offset().top + button.outerHeight() >= $(window).outerHeight() - 5) {
                $(button).animate({ top: $(window).outerHeight() - button.outerHeight() - 10 + 'px' }, 500);
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
                $(body).animate({ top: '10px' }, 500);
            } else if (body.offset().top + body.outerHeight() > windowHeight) {
                $(body).animate({ top: windowHeight - body.outerHeight() - 5 + 'px' }, 500);
            }
            if (body.offset().left < 0) {
                $(body).animate({ left: '10px' }, 500);
            } else if (body.offset().left + body.outerWidth() > windowWidth) {
                $(body).animate({ left: windowWidth - body.outerWidth() - 5 + 'px' }, 500);
            }
        },
        setCookie: function (name, value, options) {
            options = options || {};

            var expires = options.expires;

            if (typeof expires == "number" && expires) {
                var d = new Date();
                d.setTime(d.getTime() + expires * 1000);
                expires = options.expires = d;
            }
            if (expires && expires.toUTCString) {
                options.expires = expires.toUTCString();
            }

            value = encodeURIComponent(value);

            var updatedCookie = name + "=" + value;

            for (var propName in options) {
                updatedCookie += "; " + propName;
                var propValue = options[propName];
                if (propValue !== true) {
                    updatedCookie += "=" + propValue;
                }
            }

            document.cookie = updatedCookie;
        },
        getCookie: function (name) {
            var matches = document.cookie.match(new RegExp(
                "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
            ));
            return matches ? decodeURIComponent(matches[1]) : undefined;
        },
        deleteCookie: function (name) {
            setCookie(name, "", {
                expires: -1
            })
        },
        addMessage: function (messageDto) {
            const sender = messageDto.senderType;
            let self = this;
            self.messageQueue++;
            setTimeout(function () {
                let options = { direction: '' };

                messageDto.message.messages.forEach(mw => {
                    if (mw['text'] != null) {
                        mw.text.text.forEach(t => {
                            sender === 'bot' ? (options.direction = 'left', self.lastMessage = t) : options.direction = 'right';
                            self.showText(t, sender, options);
                        });
                    }
                    if (mw['event'] != null) {
                        sender === 'bot' ? (options.direction = 'left', self.lastMessage = mw.event.name) : options.direction = 'right';
                        self.showEvent(mw.event, sender, options);
                    }
                    if (mw['choice'] != null) {
                        self.showChoice(mw.choice);
                    }
                    if (mw['card'] != null) {
                        self.showCard(mw.card)
                    }
                    if (mw['carousel'] != null) {
                        throw new Error('There is no implementation for rendering CAROUSEL');
                    }
                });
                self.messageQueue--;
                self.messageQueue === 0 ?
                    self.scrollQuery(400) : null;
            }, 600);
        },
        showEvent: function (event, sender, options) {
            let self = this;
            if (event.hasOwnProperty('display')) {
                self.showText(event.display, sender, options);
            }            
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
        showChoice: function (choice) {
            let self = this;
            let choiceContainer = document.createElement('div');
            $(choiceContainer).addClass('choice_container');
            choice.buttons.forEach(function (button) {
                let choiceButton = document.createElement('span');
                $(choiceButton).addClass('choice_button');
                $(choiceButton).text(button.text);
                //Здесь обработчик на нажатие кнопки
                choiceButton.addEventListener('click', function () {
                    console.log($(this).text());
                    $(this).addClass('chosen');
                    const chosenValue = ModelFactory.messageDtoBuilderText(button.postback, SenderType.USER);
                    chat.socket.emit(WS_ENDPOINTS.MESSAGE, chosenValue);
                    self.addMessage(chosenValue);
                    $(choiceContainer).remove();
                });
                $(choiceContainer).append(choiceButton);
            });
            $(choiceContainer).appendTo('#widget_queue').show('drop', { direction: 'left' }, 600);
        },
        scrollQuery: function (timeout) {
            $('#widget_queue').animate({ scrollTop: $('#widget_queue')[0].scrollHeight }, timeout);
        },
        showPreview: function (text) {
            let options = { direction: 'left' };
            $('#preview_container').hide('drop', options, 600);
            setTimeout(function () {
                $('#preview_container').empty().append(text).show('fold', options, 600);
            }, 600);
        },
        initialize: function () {
        },
        clearHistoryRequest: function () {
            chat.socket.emit(WS_ENDPOINTS.MESSAGE, ModelFactory.messageDtoBuilderEvent('CLEAR_USER_DATA', SenderType.USER, 'clear my data'));
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
        sendNextMessageEvent(delay) {
            chat.nextMessageTimer = setTimeout(function(){
                chat.socket.emit(WS_ENDPOINTS.MESSAGE, ModelFactory.messageDtoBuilderEvent('NEXT_MESSAGE', SenderType.USER));
            }, delay);
        },
        cancelNextMessageEvent() {
            if (chat.nextMessageTimer) {
                clearTimeout(chat.nextMessageTimer);
            }
            chat.nextMessageTimer = 0;
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
                $(lightbox).show('blind', { direction: 'up' }, 700);
                $('#modal_overlay').show('explode', 800);
            });
            image.addEventListener('load', function () {
                setTimeout(function () {
                    $(image).appendTo('#widget_queue').show('drop', { direction: 'left' }, 600);
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
        const msg = ModelFactory.messageDtoBuilderEvent('CONNECT_WITH_HUMAN', SenderType.USER, 'connect with human');
        chat.addMessage(msg);
        chat.socket.emit(WS_ENDPOINTS.MESSAGE, msg);
        // chat.socket.emit('message', ModelFactory.messageDtoBuilder('NO_REPLY', ContentType.EVENT, SenderType.USER));
    });

    $('#widget_input_field').keypress(function (e) {
        if (!lStorage.has(lStorage.keys.INT_USER)) {
            chat.socket.emit(WS_ENDPOINTS.INIT_USER_HIDDEN, { id: null });
        }
    });

    $('#widget_input_field').keydown(function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            const textContent = $(this).text();
            const messageDto = ModelFactory.messageDtoBuilderText(textContent, SenderType.USER);
            chat.addMessage(messageDto);
            chat.socket.emit(WS_ENDPOINTS.MESSAGE, messageDto);
            chat.cancelNextMessageEvent();
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

    const socket = io('http://localhost:3000', { path: '/chat/socket.io' });
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
