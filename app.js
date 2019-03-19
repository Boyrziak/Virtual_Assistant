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
        constructor(message, userDto) {
            this.message = message;
            this.userDto = userDto;
        }
    }

    class ModelFabric {
        static getUserObject(id) {
            return {
                id: id
            }
        };

        static messageDtoBuilder(content, type, userDto) {
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
            return new MessageDto(messageContent, userDto)
        }

        static getMessageDto(messageContent, userDto) {
            return new MessageDto(messageContent, userDto)
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

    const S_CHANNEL = {
        INIT_USER: 'init-user',
        INIT_USER_HIDDEN: 'init-user-hidden',
        INIT_BOT: 'init-bot',
        INIT_HISTORY: 'init-his',
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
        connect: function () {
            console.log('Connected');
            socket.emit(S_CHANNEL.INIT_BOT, { id: 1 });
            if (lStorage.has(lStorage.keys.INT_USER)) {
                //return history for existing user
                const user = lStorage.get(lStorage.keys.INT_USER);
                chat.user = user;
                console.log('request to init history');
                console.log(chat.user);
                socket.emit(S_CHANNEL.INIT_HISTORY, null);
            } else {
                socket.emit(S_CHANNEL.INIT_USER, ModelFabric.getUserObject(null));
            }

        },
        initBot: function (bot) {
            chat.bot = bot;
            console.log(`Bot has been initialized ${bot}`);
        },
        initUser: function (user) {
            chat.user = user;
            lStorage.set(lStorage.keys.INT_USER, user);
            console.log(`get init-user response with: ${user}`);
            // welcome first event
            const welcomeEvent = {
                type: ContentType.EVENT,
                content: {
                    name: 'WELCOME'
                }
            };
            socket.emit(S_CHANNEL.MESSAGE, {
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
            chat.renderContent(data, 'bot');
        },
        initHistory: function (history) {
            chat.renderContent(history)
            // data.forEach(d => chat.addMessage(d.content, d.senderType === 'bot' ? 'bot' : 'guest'));
            chat.socket.emit(S_CHANNEL.MESSAGE, ModelFabric.messageDtoBuilder('WELCOME', ContentType.EVENT), chat.user);
        },
        chatException: function (data) {
            console.log('exception: ', data);
        },
        chatDisconnect: function () {
            console.log('Disconnected');
        },
        open: function () {
            let button = $('#widget_button');
            let self = this;
            let body = $('#widget_body');
            body.css({ top: button.offset().top - body.outerHeight() - 40 + 'px', left: button.offset().left - body.outerWidth() + 100 + 'px' });
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
            button.css({ top: body.offset().top + body.outerHeight() + 40 + 'px', left: body.offset().left + body.outerWidth() - button.outerWidth() });
            button.removeClass('clicked');
            body.removeClass('opened');
            body.toggle('blind', { direction: 'down' }, 1000);
            this.opened = false;
            button.draggable('enable');
            if (button.offset().top + button.outerHeight() >= $(window).outerHeight() - 5) {
                $(button).animate({ top: $(window).outerHeight() - button.outerHeight() - 10 + 'px' }, 500);
            }
        },
        renderContent: function (message, sender) {
            if (message.type === ContentType.TEXT) {
                message.content.text.forEach(t => chat.addMessage(t, sender));
            }
            if (message.type === ContentType.EVENT) {
                // TODO place implementation of rendering EVENT
            }
            if (message.type === ContentType.CHOICE) {
                // TOTO place implementation of rendering CHOICE
            }
            if (message.type === ContentType.CARD) {
                // TOTO place implementation of rendering CARD
            }
            if (message.type === ContentType.CAROUSEL) {
                // TOTO place implementation of rendering CAROUSEL
            }
        },
        addMessage: function (text, sender) {
            let self = this;
            self.messageQueue++;
            setTimeout(function () {
                let options = { direction: '' };
                sender === 'bot' ? options.direction = 'left' : options.direction = 'right';
                let newMessage = document.createElement('div');
                $(newMessage).addClass('widget_message ' + sender + '_message');
                $(newMessage).append(text);
                $(newMessage).appendTo('#widget_queue').show('drop', options, 600);
                if (!self.opened) {
                    self.showPreview(text);
                }
                self.messageQueue--;
                self.messageQueue === 0 ?
                    self.scrollQuery(400) : null;
            }, 600);
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
        clearHistory: function () {
            chat.socket.emit(S_CHANNEL.MESSAGE, ModelFabric.messageDtoBuilder('CLEAR_USER_DATA', ContentType.EVENT, chat.user));
        },
        clearUserData: function (data) {
            console.log('Clear History data => ', data);
            $('#widget_queue').empty();
            lStorage.clear();
            chat.renderContent(data);
        },
        createResponse: function (content, contentType, userDto) {
            chat.socket.emit(S_CHANNEL.MESSAGE, ModelFabric.messageDtoBuilder(content, contentType, userDto));
        },
        showImage: function (category, quantity) {
            let self = this;
            let headers = new Headers();
            headers.append('Authorization', self.APIkey);
            let myInit = {
                method: 'GET',
                headers: headers
            };
            let request = new Request('https://api.pexels.com/v1/search?query=' + category + '+query&per_page=50&page=1', myInit);
            fetch(request).then(function (response) {
                return response.json();
            }).then(function (jsonResponse) {
                console.log(jsonResponse);
                if (jsonResponse.total_results > 0) {
                    for (let i = 0; i < quantity; i++) {
                        let randomImage = Math.floor(Math.random() * 50);
                        let image = new Image();
                        image.src = jsonResponse.photos[randomImage].src.large;
                        $(image).addClass('message_image');
                        image.addEventListener('click', function () {
                            let lightbox = $('#widget_lightbox');
                            $(lightbox).empty();
                            $(this).clone().appendTo(lightbox);
                            $(lightbox).show('blind', { direction: 'up' }, 700);
                            $('#modal_overlay').show('explode', 800);
                        });
                        self.addMessage(image, 'bot');
                        image.addEventListener('load', function () {
                            console.log($(image).outerHeight());
                            setTimeout(function () {
                                $('#widget_queue').animate({ scrollTop: 150 }, 700);
                            }, 600);
                        });
                    }
                } else {
                    self.addMessage('Sorry, i was not able to find the images you requested', 'bot');
                }
            });
        }
    };

    chat.initialize();

    $('#human_connect').on('click', function () {
        const content = 'connect with human';
        chat.addMessage(content, 'guest')
        chat.socket.emit('message', ModelFabric.messageDtoBuilder('CONNECT_WITH_HUMAN', ContentType.EVENT, chat.user));
    });

    $('#widget_input').keypress(function (e) {
        if (!lStorage.has(lStorage.keys.INT_USER)) {
            chat.socket.emit(S_CHANNEL.INIT_USER_HIDDEN, { id: null })
        }
    });

    $('#widget_input').keydown(function (e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            const textContent = $(this).text();
            const content = new MessageContent({
                text: [textContent],
            }, ContentType.TEXT);
            chat.renderContent(content, 'guest');
            chat.createResponse(textContent, ContentType.TEXT, chat.user);
            $(this).empty();
        }
    });

    $('#widget_button').on('click', function () {
        chat.open();
    });

    $('.close_widget').on('click', chat.close);

    $('#clear_history').on('click', chat.clearHistory);

    $('.message_image').on('click', function () {
        let lightbox = $('#widget_lightbox');
        $(lightbox).empty();
        $(this).clone().appendTo(lightbox);
        $(lightbox).show('blind', { direction: 'up' }, 700);
        $('#modal_overlay').show('explode', 800);
    });

    $('#modal_overlay').on('click', function () {
        $('#widget_lightbox').hide('scale', 600);
        $(this).hide('explode', 800);
    });

    const socket = io('http://localhost:3000', { path: '/chat/socket.io' });
    chat.socket = socket;
    chat.socket.on(S_CHANNEL.CONNECT, chat.connect);
    chat.socket.on(S_CHANNEL.INIT_BOT, chat.initBot);
    chat.socket.on(S_CHANNEL.INIT_USER, chat.initUser);
    chat.socket.on(S_CHANNEL.INIT_USER_HIDDEN, chat.initUserHidden);
    chat.socket.on(S_CHANNEL.MESSAGE, chat.chatMessage);
    chat.socket.on(S_CHANNEL.INIT_HISTORY, chat.initHistory);
    chat.socket.on(S_CHANNEL.EXCEPTION, chat.chatException);
    chat.socket.on(S_CHANNEL.DISCONNECT, chat.chatDisconnect);
});
