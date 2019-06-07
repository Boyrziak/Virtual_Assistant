// eslint-disable-next-line no-undef
jQuery(document).ready(function ($) {
    $('#widget_button').draggable({
        containment: 'window'
    });
    $('#widget_container').draggable({
        handle: '#widget_header',
        containment: 'window'
    });

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
    };

    class Event {
        constructor(name, languageCode, parameters, display) {
            this.name = name;
            this.languageCode = languageCode;
            this.parameters = parameters;
            this.display = display;
        }
    }

    /* class Choice {
        constructor (buttons) {
            this.buttons = buttons;
        }
    }

    class Button {
        constructor(text, postback) {
            this.text = text;
            this.postback = postback;
        }
    } */

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
            };
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
        BOT: 'bot'
    });

    const WS_ENDPOINTS = {
        INIT_USER: 'init-user',
        INIT_USER_COVERTLY: 'init-user-covertly',
        INIT_BOT: 'init-bot',
        INIT_HISTORY: 'init-history',
        CLEAR_HISTORY: 'clear-history',
        CLEAR_HISTORY_CONFIRMATION: 'clear-history-confirmation',
        MESSAGE: 'message',
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        EXCEPTION: 'exception'
    };

    const lStorage = {
        get: function (key) {
            return JSON.parse(localStorage.getItem(key));
        },
        keys: {
            USER: 'user',
            BOT: 'bot',
            HISTORY: 'history',
            IS_WIDGET_OPEN: 'isWidgetOpen',
            PREVIOUS_URL: 'previousUrl'
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
        },
        addMessageToHistory: function (message) {
            let history = this.get(this.keys.HISTORY);
            history = history == null ? [] : history;
            history.push(message);
            this.set(this.keys.HISTORY, history);
            return history;
        }

    };
    const chat = {
        nextMessageTimer: null,
        socket: {},
        opened: false,
        active: false,
        guestName: 'dear Guest',
        firstTime: true,
        APIkey: '563492ad6f91700001000001bb151c8c07f048768f0c409fc846429b',
        messageQueue: 0,
        messageArray: [],
        lastMessage: '',
        type_timer: 1000,
        pause_timer: 500,
        currentLocation: location.href,
        expires: 5,
        connect: function () {
            console.log('Connected');
            $('.connection_indicator').css('color', 'green');
            $('#widget_input_field').attr('placeholder', 'Enter your message...');
            $('#widget_input_field').attr('contenteditable', 'true');
            chat.initialize();
        },
        initBot: function (bot) {
            chat.bot = bot;
            lStorage.set(lStorage.keys.BOT, bot);
            console.log(`Bot has been initialized`);
            console.log(bot);
        },
        initUser: function (user) {
            chat.user = user;
            lStorage.set(lStorage.keys.USER, user);
            console.log(`get init-user response with: ${user}`);
            console.log(`starting to init history`);
            chat.socket.emit(WS_ENDPOINTS.INIT_HISTORY, user);
            // socket.emit(WS_ENDPOINTS.MESSAGE, ModelFactory.messageDtoBuilderEvent('WELCOME', SenderType.USER));
        },
        initUserCovertly: function (user) {
            chat.user = user;
            lStorage.set(lStorage.keys.USER, user);
            console.log(`get init-user response with: ${user}`);
        },
        chatMessage: function (messageDto) {
            console.log('New message received:');
            console.log(messageDto);
            const delayArr = messageDto.message.messages.filter(mw => mw.hasOwnProperty('payload') && mw.payload.hasOwnProperty('type') && mw.payload.type === 'delay');
            if (delayArr.length > 0) {
                const delay = delayArr[0].payload.delayValue;
                const eventName = delayArr[0].payload.eventName;
                chat.sendNextMessageEvent(delay, eventName);
                console.log(delayArr[0]);
            }
            chat.messageArray.push(messageDto);
            chat.flushNewQueue(chat.messageArray);
            // chat.addMessage(messageDto);
        },
        initHistory: function (history) {
            lStorage.set(lStorage.keys.HISTORY, history);
            console.log('init history process with data:');
            console.log(history);
            if (history) {
                chat.flushQueue(history);

                // history.forEach(m => );
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
            const button = $('#widget_button');
            const self = this;
            self.scrollQuery(100);
            // $('#widget_queue')[0].scrollTop = $('#widget_queue')[0].outerHeight();
            console.log('Opened');
            const body = $('#widget_container');
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
            if (body.offset().left <= 5) {
                $(body).animate({left: '10px'}, 500);
            }
            button.draggable('disable');
            $('#widget_input').empty();
            self.opened = true;
            // TODO update the line below when refactoring the init method
            lStorage.set(lStorage.keys.IS_WIDGET_OPEN, self.opened);
            $('#preview_container').empty().hide('drop', 600);
        },
        close: function () {
            const body = $('#widget_container');
            const button = $('#widget_button');
            const self = this;
            button.css({
                top: body.offset().top + body.outerHeight() + 40 + 'px',
                left: body.offset().left + body.outerWidth() - button.outerWidth()
            });
            button.removeClass('clicked');
            body.removeClass('opened');
            body.toggle('blind', {direction: 'down'}, 1000);
            this.opened = false;
            // TODO update the line below when refactoring the init method
            lStorage.set(lStorage.keys.IS_WIDGET_OPEN, self.opened);
            button.draggable('enable');
            if (button.offset().top + button.outerHeight() >= $(window).outerHeight() - 5) {
                $(button).animate({top: $(window).outerHeight() - button.outerHeight() - 10 + 'px'}, 500);
            }
            // self.showPreview(this.lastMessage);
            console.log(self.lastMessage);
        },
        reposition: function () {
            const body = $('#widget_container');
            const windowHeight = $(window).outerHeight();
            const windowWidth = $(window).outerWidth();
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
        setCookie: function (name, value, options) {
            options = options || {};

            var expires = options.expires;

            if (typeof expires === 'number' && expires) {
                var d = new Date();
                d.setTime(d.getTime() + expires * 1000);
                expires = options.expires = d;
            }
            if (expires && expires.toUTCString) {
                options.expires = expires.toUTCString();
            }

            value = encodeURIComponent(value);

            var updatedCookie = name + '=' + value;

            for (var propName in options) {
                updatedCookie += '; ' + propName;
                var propValue = options[propName];
                if (propValue !== true) {
                    updatedCookie += '=' + propValue;
                }
            }

            document.cookie = updatedCookie;
        },
        getCookie: function (name) {
            var matches = document.cookie.match(new RegExp(
                // eslint-disable-next-line no-useless-escape
                '(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'
            ));
            return matches ? decodeURIComponent(matches[1]) : undefined;
        },
        deleteCookie: function (name) {
            const self = this;
            self.setCookie(name, '', {
                expires: -1
            });
        },
        addMessage: function (messageDto) {
            const sender = messageDto.senderType;
            const self = this;
            setTimeout(function () {
                const options = {direction: ''};
                if (sender === 'bot') {
                    options.direction = 'left';
                } else {
                    options.direction = 'right';
                }
                messageDto.message.messages.forEach(mw => {
                    self.messageQueue++;
                    if (mw.text) {
                        mw.text.text.forEach(t => {
                            self.lastMessage = t;
                            self.showText(t, sender, options);
                        });
                    }
                    if (mw.event) {
                        self.lastMessage = mw.event.name;
                        if (mw.event.display) {
                            self.showEvent(mw.event, sender, options);
                        }
                    }
                    if (mw.choice) {
                        self.showChoice(mw.choice);
                        mw.choice = null;
                    }
                    if (mw.card) {
                        self.showCard(mw.card);
                        mw.card.buttons = null;
                    }
                    if (mw.carousel) {
                        // self.s
                        console.log(mw.carousel);
                        throw new Error('There is no implementation for rendering CAROUSEL');
                    }
                    // self.messageQueue--;
                    // self.scrollQuery(400);
                    // if (self.messageQueue === 0) self.scrollQuery(400);
                });
                self.scrollQuery(1);
                // self.messageQueue--;
                // if (self.messageQueue === 0) self.scrollQuery(100);
                lStorage.addMessageToHistory(messageDto);
            }, 600);
        },
        showEvent: function (event, sender, options) {
            const self = this;
            self.showText(event.display, sender, options);
        },
        showText: function (text, sender, options) {
            const self = this;
            const newMessage = document.createElement('div');
            $(newMessage).addClass('widget_message ' + sender + '_message');
            $(newMessage).append(text);
            $(newMessage).appendTo('#widget_queue').show('drop', options, 600);
            if (!self.opened) {
                self.showPreview(text);
            }
        },
        onRespond: function (messageDto) {
            chat.cancelNextMessageEvent();
            chat.socket.emit(WS_ENDPOINTS.MESSAGE, messageDto);
            chat.addMessage(messageDto);
        },
        showChoice: function (choice) {
            const self = this;
            if (choice.buttons) {
                const choiceContainer = document.createElement('div');
                $(choiceContainer).addClass('choice_container');
                choice.buttons.forEach(function (button) {
                    const choiceButton = document.createElement('span');
                    $(choiceButton).addClass('choice_button');
                    $(choiceButton).text(button.text);
                    // Здесь обработчик на нажатие кнопки
                    choiceButton.addEventListener('click', function () {
                        console.log($(this).text());
                        $(this).addClass('chosen');
                        let buttonPostback = /(CALL)\+(\w*)/g.exec(button.postback);
                        if (buttonPostback && buttonPostback[1]) {
                            const functionName = buttonPostback[2];
                            if (chat.hasOwnProperty(functionName)) {
                                chat.functionName();
                            }
                        } else {
                            const chosenValue = ModelFactory.messageDtoBuilderText(button.postback, SenderType.USER);
                            self.onRespond(chosenValue);
                        }
                        $(choiceContainer).remove();
                    });
                    $(choiceContainer).append(choiceButton);
                });
                $(choiceContainer).appendTo('#widget_queue').show('drop', {direction: 'left'}, 600);
                // self.scrollQuery(600);
            }
        },
        scrollQuery: function (timeout) {
            $('#widget_queue').animate({scrollTop: $('#widget_queue')[0].scrollHeight}, timeout);
        },
        showPreview: function (text) {
            const options = {direction: 'left'};
            $('#preview_container').hide('drop', options, 600);
            setTimeout(function () {
                $('#preview_container').empty().append(text).show('fold', options, 600);
            }, 600);
        },
        isSessionExpired: function () {
            // TODO put over here implementation that return real status of session expiration
            return !lStorage.has(lStorage.keys.HISTORY);
        },
        isUserReactedExplicitly: function (lastUserMessage) {
            const msg = lastUserMessage.message.messages[0];
            return msg.hasOwnProperty('text') || (msg.hasOwnProperty('event') && msg.event.hasOwnProperty('display'));
        },
        onUrlChanged: function () {
            lStorage.set('previousUrl', chat.getCurrentLocation());
            const userHistory = lStorage.get(lStorage.keys.HISTORY).filter(m => m.senderType === 'user');
            if (!chat.isUserReactedExplicitly(userHistory[userHistory.length - 1])) {
                const messageDto = ModelFactory.messageDtoBuilderEvent('URL-CHANGED-EVENT', SenderType.USER);
                chat.onRespond(messageDto);
                console.log('URL-CHANGED-EVENT sent');
            }
            console.log('new url detected');
            console.log($('#widget_queue').length);
        },
        initialize: function () {
            if (chat.isSessionExpired()) {
                chat.socket.emit(WS_ENDPOINTS.INIT_BOT, {id: 1});
                if (lStorage.has(lStorage.keys.USER)) {
                    // return history for existing user
                    const user = lStorage.get(lStorage.keys.USER);
                    chat.user = user;
                    chat.socket.emit(WS_ENDPOINTS.INIT_USER, ModelFactory.getUserObject(user.id));
                } else {
                    chat.socket.emit(WS_ENDPOINTS.INIT_USER, ModelFactory.getUserObject(null));
                }
            } else {
                chat.bot = lStorage.get(lStorage.keys.BOT);
                chat.user = lStorage.get(lStorage.keys.USER);
                if (lStorage.has(lStorage.keys.IS_WIDGET_OPEN)) {
                    if (JSON.parse(lStorage.get(lStorage.keys.IS_WIDGET_OPEN))) {
                        chat.open();
                    }
                }
                const history = lStorage.get(lStorage.keys.HISTORY);
                chat.messageArray.push(history);
                chat.flushQueue(history);
                // history.forEach(m => chat.addMessage(m));
                if (lStorage.has(lStorage.keys.IS_WIDGET_OPEN) && (chat.getCurrentLocation() !== lStorage.get(lStorage.keys.PREVIOUS_URL))) {
                    chat.onUrlChanged();
                }
            }
            setTimeout(() => {
                $('#widget_button').animate({opacity: '1'}, 600);
            }, 500);
        },
        deleteMyDataRequest: function () {
            const messageDto = ModelFactory.messageDtoBuilderEvent('CLEAR_USER_DATA', SenderType.USER, 'clear my data');
            chat.onRespond(messageDto);
            chat.cancelNextMessageEvent();
        },
        clearHistoryConfirmed: function (data) {
            console.log('Clear History confirmed  => ', data);
            $('#widget_queue').empty();
            lStorage.clear();
            delete chat.user;
        },
        sendNextMessageEvent: function (delay, eventName) {
            chat.nextMessageTimer = setTimeout(function () {
                const messageDto = ModelFactory.messageDtoBuilderEvent(eventName, SenderType.USER);
                chat.onRespond(messageDto);
            }, delay);
        },
        cancelNextMessageEvent: function () {
            if (chat.nextMessageTimer) {
                clearTimeout(chat.nextMessageTimer);
            }
            chat.nextMessageTimer = 0;
        },
        idleAction: function (timeout) {
            console.log('Idle for ' + timeout + ' seconds');
            chat.idleTimer = setTimeout(function () {
                chat.idleAction(timeout);
            }, timeout);
        },
        getCurrentLocation: function () {
            this.currentLocation = location.href;
            return this.currentLocation;
        },
        showCard: function (card) {
            const self = this;
            const newMessage = document.createElement('div');
            $(newMessage).addClass('widget_message bot_message');
            const image = new Image();
            image.src = card['imageUri'];
            $(image).addClass('message_image');
            $(newMessage).append(image);
            $(newMessage).append(card.description);
            let imgButtons = {buttons: card.buttons};
            image.addEventListener('click', function () {
                $('#modal_overlay').show('fade', 800, () => {
                    $('#modal_overlay').css('display', 'flex');
                    const lightbox = $('#widget_lightbox');
                    $(lightbox).empty();
                    $(this).clone().appendTo(lightbox);
                    $(lightbox).show('blind', {direction: 'up'}, 700);
                });
            });
            // image.addEventListener('load', function () {
            //     setTimeout(function () {
            //         $(newMessage).appendTo('#widget_queue').show('drop', {direction: 'left'}, 600);
            //         self.showChoice(imgButtons);
            //         self.scrollQuery(600);
            //     }, 600);
            // });
            $(newMessage).appendTo('#widget_queue').show('drop', {direction: 'left'}, 600);
            self.showChoice(imgButtons);
            // self.scrollQuery(600);
        },
        showCarousel: function(cards) {
            const self = this;
            const carouselHolder = document.createElement('div');
            $(carouselHolder).addClass('carousel_holder');

        },
        flushQueue: function (currentQueue) {
            let self = this;
            if (currentQueue.length > 10) {
                currentQueue.splice(0, currentQueue.length - 10);
            }
            if (currentQueue.length > 0) {
                let currentElement = currentQueue.shift();
                self.addMessage(currentElement);
                self.flushQueue(currentQueue);
            }
        },
        flushNewQueue: function (currentQueue) {
            let self = this;
            if (currentQueue.length > 0) {
                let currentElement = currentQueue.shift();
                setTimeout(() => {
                    // self.scrollQuery(400);
                    $('#waves_message').show('drop', {'direction': 'left'}, 800);
                    setTimeout(() => {
                        $('#waves_message').hide('drop', {'direction': 'left'}, 200);
                        self.addMessage(currentElement);
                        self.flushQueue(currentQueue);
                    }, self.type_timer);
                }, self.pause_timer);
            }
        },
        connectWithHuman: function () {
            const msg = ModelFactory.messageDtoBuilderEvent('CONNECT_WITH_HUMAN', SenderType.USER, 'connect with human');
            chat.onRespond(msg);
            chat.cancelNextMessageEvent();
        }
    };

    $('#human_connect').on('click', function () {
        chat.connectWithHuman();
    });

    $('#widget_input_field').keypress(function (e) {
        if (!lStorage.has(lStorage.keys.USER)) {
            chat.socket.emit(WS_ENDPOINTS.INIT_USER_COVERTLY, {id: null});
        }
    });

    $('#widget_input_field').keydown(function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            const textContent = $(this).text();
            const messageDto = ModelFactory.messageDtoBuilderText(textContent, SenderType.USER);
            chat.onRespond(messageDto);
            $(this).empty();
        }
    });

    $('#widget_button').on('click', function () {
        chat.open();
    });

    $('.close_widget').on('click', chat.close);

    $('#clear_history').on('click', chat.deleteMyDataRequest);

    let resizeTimer;
    $(window).resize(function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(chat.reposition, 500);
    });

    $('#modal_overlay').on('click', function () {
        $('#widget_lightbox').hide('fade', 600);
        $(this).hide('fade', 800);
    });

    chat.socket = io('https://kh-gis-chat-bot.intetics.com', {path: '/chat/socket.io'});
    // if (chat.currentLocation.startsWith('https://kh-gis-chat-bot.intetics.com')) {
    //     // eslint-disable-next-line no-undef
    //     chat.socket = io('https://kh-gis-chat-bot.intetics.com', { path: '/chat/socket.io' });
    // } else {
    //     // eslint-disable-next-line no-undef
    //     chat.socket = io('http://localhost:3000', { path: '/chat/socket.io' });
    // }

    chat.socket.on(WS_ENDPOINTS.CONNECT, chat.connect);
    chat.socket.on(WS_ENDPOINTS.INIT_BOT, chat.initBot);
    chat.socket.on(WS_ENDPOINTS.INIT_USER, chat.initUser);
    chat.socket.on(WS_ENDPOINTS.INIT_USER_COVERTLY, chat.initUserCovertly);
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
    $(window).on('unload', () => {
        chat.setCookie('close', 'closed', {expires: chat.expires});
        // return "Bye now";
    });
});
