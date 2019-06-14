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
        expires: 10,
        connect: function () {
            let opened = chat.getCookie('opened');
            console.log(opened);
            if (!opened) {
                alert('Cookie has expired');
            }
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
            $('#widget_button').off('click');
            const button = $('#widget_button');
            const self = this;
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
            self.scrollQuery(10);
            let timer = setInterval(() => {
                $('#widget_queue')[0].scrollTop = 99999;
            }, 20);
            setTimeout(() => {
                clearInterval(timer);
            }, 1000);
            setTimeout(() => {
                if (window.outerWidth() <= 780) {
                    $('#widget_container').css('height', '95%');
                    let widgetHeight = $('#widget_container').outerHeight();
                    console.log(widgetHeight);
                    $('#widget_container').css('height', widgetHeight + 'px');
                    $('#widget_button').on('click', chat.open);
                }
            }, 2000);
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
                        console.log(mw.carousel.cards);
                        self.showCarousel(mw.carousel.cards);
                    }
                });
                self.scrollQuery(1);
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
                const history = lStorage.get(lStorage.keys.HISTORY);
                chat.messageArray.push(history);
                chat.flushQueue(history);
                setTimeout(() => {
                    if (lStorage.has(lStorage.keys.IS_WIDGET_OPEN)) {
                        if (JSON.parse(lStorage.get(lStorage.keys.IS_WIDGET_OPEN))) {
                            // $('#widget_queue')[0].scrollTop = 648;
                            // chat.open();
                        }
                    }
                }, 1000);
                // history.forEach(m => chat.addMessage(m));
                if (lStorage.has(lStorage.keys.IS_WIDGET_OPEN) && (chat.getCurrentLocation() !== lStorage.get(lStorage.keys.PREVIOUS_URL))) {
                    chat.onUrlChanged();
                }
            }
            setInterval(() => {
                chat.setCookie('opened', 'true');
            }, 1000);
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
            $(newMessage).addClass('widget_message bot_message carousel_card shadow_card');
            let cardButtons = {buttons: card.buttons};
            let content = null;
            if (card.imageUri) {
                content = new Image();
                content.src = card.imageUri;
                $(content).addClass('message_image');
            } else if (card.videoUri) {
                content = document.createElement('video');
                content.src = card.videoUri;
                $(content).addClass('message_video');
            }
            $(newMessage).append(content);
            // $(newMessage).append(card.description);
            content.addEventListener('click', function () {
                $('#modal_overlay').show('fade', 800, () => {
                    $('#modal_overlay').css('display', 'flex');
                    const lightbox = $('#widget_lightbox');
                    $(lightbox).empty();
                    $(this).clone().appendTo(lightbox);
                    $(lightbox).append('<div class="lightbox_descr">' + card.title + '</div>');
                    $(lightbox).show('blind', {direction: 'up'}, 700);
                    $(document).mouseup(function (e) {
                        let container = $('#widget_lightbox');
                        if (container.has(e.target).length === 0) {
                            $('#widget_lightbox').hide('fade', 600);
                            $('#modal_overlay').hide('fade', 800);
                        }
                    });
                    setTimeout(() => {
                        $('#close_lightbox').css('top', $('#widget_lightbox').offset().top - 40 + 'px');
                    }, 1500);
                });
            });
            $(newMessage).appendTo('#widget_queue').show('drop', {direction: 'left'}, 600);
            self.showChoice(cardButtons);
        },
        showCarousel: function (cards) {
            const self = this;
            $('#carousel_lightbox').empty();
            const carouselHolder = document.createElement('div');
            $(carouselHolder).addClass('carousel_holder');
            const dotsHolder = document.createElement('div');
            const bigDotsHolder = document.createElement('div');
            $(dotsHolder).addClass('dots_holder').appendTo($(carouselHolder));
            $(bigDotsHolder).addClass('dots_holder').appendTo($('#carousel_lightbox'));
            cards.forEach((card, index) => {
                const newMessage = document.createElement('div');
                $(newMessage).addClass('widget_message bot_message carousel_card');
                let cardButtons = {buttons: card.buttons};
                let content = null;
                let icon = document.createElement('i');
                $(icon).addClass('far fa-play-circle');
                if (card.imageUri) {
                    content = new Image();
                    content.src = card.imageUri;
                    $(content).addClass('message_image');
                } else if (card.videoUri) {
                    content = document.createElement('video');
                    content.src = card.videoUri;
                    $(content).addClass('message_video');
                    $(newMessage).append(icon);
                }
                const lightboxCard = document.createElement('div');
                $(lightboxCard).addClass('lightbox_card');
                let carouselContent = document.createElement(content.tagName.toLowerCase());
                carouselContent.src = card.imageUri || card.videoUri;
                $(lightboxCard).append(carouselContent);
                $(lightboxCard).append('<div class="lightbox_descr">' + card.title + '</div>');
                if (carouselContent.tagName.toLowerCase() === 'video') {
                    $(carouselContent).attr('controls', 'true');
                }
                $('#carousel_lightbox').append(lightboxCard);

                $(newMessage).append(content);
                // $(newMessage).append('<p>' + card.description + '</p>');
                $(carouselHolder).append(newMessage);
                let dot = document.createElement('div');
                $(dot).addClass('control_dot').appendTo($(dotsHolder));
                let bigDot = document.createElement('div');
                $(bigDot).addClass('control_dot').appendTo($(bigDotsHolder));

                content.addEventListener('click', function () {
                    $('#carousel_overlay').show('fade', 800, () => {
                        $('#carousel_overlay').css('display', 'flex');
                        $('#carousel_lightbox').show('blind', {direction: 'up'}, 400);
                        $(document).mouseup(function (e) {
                            let container = $('#carousel_lightbox');
                            if (container.has(e.target).length === 0) {
                                $('#carousel_lightbox').hide('fade', 600);
                                $('#carousel_overlay').hide('fade', 800);
                            }
                        });
                        setTimeout(() => {
                            $('#close_carousel_lightbox').css('top', $('#carousel_lightbox').offset().top - 50 + 'px');
                            let bigDotsOffset = ($('#carousel_lightbox').outerWidth() - $(bigDotsHolder).outerWidth()) / 2;
                            $('#carousel_lightbox').find('.dots_holder').css('left', bigDotsOffset + 'px');
                        }, 500);
                    });
                });

                // let icon = $(newMessage).find('.far');
                // console.log(icon);
                if (icon) {
                    icon.addEventListener('click', function () {
                        $('#carousel_overlay').show('fade', 800, () => {
                            $('#carousel_overlay').css('display', 'flex');
                            $('#carousel_lightbox').show('blind', {direction: 'up'}, 400);
                            $(document).mouseup(function (e) {
                                let container = $('#carousel_lightbox');
                                if (container.has(e.target).length === 0) {
                                    $('#carousel_lightbox').hide('fade', 600);
                                    $('#carousel_overlay').hide('fade', 800);
                                }
                            });
                            setTimeout(() => {
                                $('#close_carousel_lightbox').css('top', $('#carousel_lightbox').offset().top - 50 + 'px');
                                let lighbox = $('#carousel_lightbox');
                                let bigDotsOffset = (lighbox.outerWidth() - $(bigDotsHolder).outerWidth()) / 2;
                                lighbox.find('.dots_holder').css('left', bigDotsOffset + 'px');
                                let currentOffset = (lighbox.outerWidth() + 10) * index;
                                lighbox.animate({scrollLeft: currentOffset + 'px'}, 600);

                                if (currentOffset <= 0) {
                                    lighbox.find('.left_arrow').css('display', 'none');
                                    lighbox.find('.right_arrow').css('display', 'block');
                                } else if (currentOffset >= lighbox.outerWidth() * (cards.length - 1)) {
                                    lighbox.find('.right_arrow').css('display', 'none');
                                    lighbox.find('.left_arrow').css('display', 'block');
                                } else if (0 < currentOffset < lighbox.outerWidth() * (cards.length - 1)) {
                                    lighbox.find('.right_arrow').css('display', 'block');
                                    lighbox.find('.left_arrow').css('display', 'block');
                                }
                            }, 500);
                        });
                    });
                }
            });
            let arrowContainer = document.createElement('div');
            $(arrowContainer).addClass('arrow_container');
            $(carouselHolder).prepend(arrowContainer);
            $(carouselHolder).appendTo('#widget_queue').show('drop', {direction: 'left'}, 600);

            setTimeout(() => {
                let width = $(carouselHolder).outerWidth();
                $(carouselHolder).find('.carousel_card').css({'min-width': width || 267.91 + 'px'});

                let rightArrow = document.createElement('div');
                $(rightArrow).addClass('arrow_button right_arrow');
                $(rightArrow).append('<i class="fas fa-chevron-right"></i>');
                rightArrow.addEventListener('click', () => {
                    scrollHolder(rightArrow, carouselHolder);
                });

                let leftArrow = document.createElement('div');
                $(leftArrow).addClass('arrow_button left_arrow');
                $(leftArrow).append('<i class="fas fa-chevron-left"></i>');
                leftArrow.addEventListener('click', () => {
                    scrollHolder(leftArrow, carouselHolder);
                });

                $($(carouselHolder).find('.control_dot')[0]).addClass('active_dot');
                $($('#carousel_lightbox').find('.control_dot')[0]).addClass('active_dot');
                $('.control_dot').on('click', function () {
                    dotScroller(this, carouselHolder)
                });
                $('#carousel_lightbox').find('.control_dot').on('click', function () {
                    dotScroller(this, $('#carousel_lightbox')[0])
                });
                $(carouselHolder).find('.left_arrow').css('display', 'none');

                let dotsOffset = ($(carouselHolder).outerWidth() - $(dotsHolder).outerWidth()) / 2;
                $(carouselHolder).find('.dots_holder').css('left', dotsOffset + 'px');

                function scrollHolder(element, carousel) {
                    console.log(`Button pressed: ${$(element).attr('class')}`);
                    // element.removeEventListener('click', () => {
                    //     scrollHolder(element);
                    // });
                    let holder = $(carousel);
                    let currentScroll = holder.scrollLeft();
                    console.log(`Current scroll: ${currentScroll}`);
                    let scrollDistance = $(element).hasClass('right_arrow') ? currentScroll + holder.outerWidth() + 10 : currentScroll - holder.outerWidth() - 10;
                    holder.animate({scrollLeft: scrollDistance}, 600);
                    $(element).parent().animate({left: scrollDistance + 'px'}, 600);
                    let offset = ($(holder).outerWidth() - $(holder).find('.dots_holder').outerWidth()) / 2;
                    holder.find('.dots_holder').css('left', offset + scrollDistance + 'px');
                    let currentActive = $(holder).find('.active_dot');
                    console.log($('.control_dot').index(currentActive));
                    if ($(element).hasClass('right_arrow')) {
                        if (currentActive.next('.control_dot')) {
                            currentActive.removeClass('active_dot');
                            currentActive.next('.control_dot').addClass('active_dot');
                        } else {
                            currentActive.addClass('active_dot');
                        }
                    } else {
                        if (currentActive.prev('.control_dot')) {
                            currentActive.removeClass('active_dot');
                            currentActive.prev('.control_dot').addClass('active_dot');
                        } else {
                            currentActive.addClass('active_dot');
                        }
                    }
                    console.log(`Current scroll: ${scrollDistance}`);
                    // setTimeout(() => {
                    //     element.addEventListener('click', () => {
                    //         scrollHolder(element);
                    //     });
                    // }, 200);
                    if (scrollDistance <= 0) {
                        holder.find('.left_arrow').css('display', 'none');
                        holder.find('.right_arrow').css('display', 'block');
                    } else if (scrollDistance >= holder.outerWidth() * (cards.length - 1)) {
                        holder.find('.right_arrow').css('display', 'none');
                        holder.find('.left_arrow').css('display', 'block');
                    } else if (0 < scrollDistance < holder.outerWidth() * (cards.length - 1)) {
                        holder.find('.right_arrow').css('display', 'block');
                        holder.find('.left_arrow').css('display', 'block');
                    }
                }

                function dotScroller(dot, carousel) {
                    let holder = $(carousel);
                    $(holder).find('.control_dot').removeClass('active_dot');
                    $(dot).addClass('active_dot');
                    let scrollDistance = holder.find('.control_dot').index(dot) * (holder.outerWidth() + 10);
                    holder.animate({scrollLeft: scrollDistance}, 600);
                    let offset = (holder.outerWidth() - $(dot).parent().outerWidth()) / 2;
                    $(dot).parent().css('left', offset + scrollDistance + 'px');
                    holder.find('.arrow_container').animate({left: scrollDistance + 'px'}, 600);

                    if (scrollDistance <= 0) {
                        holder.find('.left_arrow').css('display', 'none');
                        holder.find('.right_arrow').css('display', 'block');
                    } else if (scrollDistance >= holder.outerWidth() * (cards.length - 1)) {
                        holder.find('.right_arrow').css('display', 'none');
                        holder.find('.left_arrow').css('display', 'block');
                    } else if (0 < scrollDistance < holder.outerWidth() * (cards.length - 1)) {
                        holder.find('.right_arrow').css('display', 'block');
                        holder.find('.left_arrow').css('display', 'block');
                    }
                }

                let bigContainer = document.createElement('div');
                $(bigContainer).addClass('arrow_container');


                let bigRightArrow = document.createElement('div');
                $(bigRightArrow).addClass('arrow_button right_arrow');
                $(bigRightArrow).append('<i class="fas fa-chevron-right"></i>');
                bigRightArrow.addEventListener('click', () => {
                    scrollHolder(bigRightArrow, $('#carousel_lightbox')[0]);
                });

                let bigLeftArrow = document.createElement('div');
                $(bigLeftArrow).addClass('arrow_button left_arrow');
                $(bigLeftArrow).append('<i class="fas fa-chevron-left"></i>');
                bigLeftArrow.addEventListener('click', () => {
                    scrollHolder(bigLeftArrow, $('#carousel_lightbox')[0]);
                });


                $(arrowContainer).append(leftArrow);
                $(arrowContainer).append(rightArrow);

                $(bigContainer).append(bigLeftArrow);
                $(bigContainer).append(bigRightArrow);
                $('#carousel_lightbox').prepend(bigContainer);
                $(carouselHolder).find('.left_arrow').css('display', 'none');
                $('#carousel_lightbox').find('.left_arrow').css('display', 'none');
            }, 500);

            // console.log($('.carousel_card').outerWidth());
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

    $('.human_connect').on('click', function () {
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

    $('.clear_history').on('click', chat.deleteMyDataRequest);

    let resizeTimer;
    $(window).resize(function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(chat.reposition, 500);
        // $('#widget_container').css('height', '95%');
        // let widgetHeight = $('#widget_container').outerHeight();
        // console.log(widgetHeight);
        // $('#widget_container').css('height', widgetHeight + 'px');
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


    window.SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    let finalTranscript = '';
    let recognition = new window.SpeechRecognition();
    recognition.interimResults = true;
    recognition.maxAlternatives = 10;
    recognition.continuous = false;
    recognition.lang = "en-GB";
    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex, len = event.results.length; i < len; i++) {
            let transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        console.log(`Final Transcript: ${finalTranscript} | Interim Transcript: ${interimTranscript}`);
    };
    let pressed = false;
    recognition.onaudioend = (event) => {
        console.log('Recognition stopped');
        recognition.stop();
        $('#audio_input').removeClass('recording');
        pressed = false;
        setTimeout(() => {
            if (finalTranscript !='') {
                const messageDto = ModelFactory.messageDtoBuilderText(finalTranscript, SenderType.USER);
                chat.onRespond(messageDto);
                $('#widget_input_field').empty();
                finalTranscript = '';
            }
        }, 300);
    };

    $('#audio_input').on('click', function () {
        if (!pressed) {
            console.log('Recognition started');
            recognition.start();
            pressed = true;
            $(this).addClass('recording');
        } else {
            console.log('Recognition stopped');
            recognition.stop();
            $(this).removeClass('recording');
            pressed = false;
            setTimeout(() => {
                // $('#widget_input_field').empty();
                if (finalTranscript.toLowerCase() !== 'отправить' || finalTranscript.toLowerCase() !== 'send') {
                    $('#widget_input_field').text(finalTranscript);
                    finalTranscript = '';
                } else {
                    const textContent = $('#widget_input_field').text();
                    const messageDto = ModelFactory.messageDtoBuilderText(textContent, SenderType.USER);
                    chat.onRespond(messageDto);
                    $('#widget_input_field').empty();
                    finalTranscript = '';
                }
            }, 600);
        }
    });

    $('.show_buttons').on('click', function () {
        $(this).toggleClass('rotated');
        $('#mobile_buttons').toggleClass('expanded');
    });

    $(window).on('unload', () => {
        chat.setCookie('opened', 'false', {expires: chat.expires});
        // alert('Cookie set');
        // return "Bye now";
    });
});
