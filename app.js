jQuery(document).ready(function($){
    $('#widget_button').draggable();


    const S_CHANNEL = {
        INIT_USER: 'init-user',
        INIT_BOT: 'init-bot',
        INIT_HISTORY: 'init-history',
        MESSAGE: 'message',
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        EXCEPTION: 'exception'
    };
    const lStorage = {
        keys: {
            INT_USER: 'intUser',
        },
        get: function(key) {
            return JSON.parse(localStorage.getItem(key));
        },
        set: function(key, item) {
            localStorage.setItem(key, JSON.stringify(item));
        },
        remove: function(key) {
            localStorage.removeItem(key);
        },
        clear: function() {
            localStorage.clear();
        },
        has: function(key) {
            return localStorage.getItem(key) !== null;
        }

    };
    $('#widget_body').draggable({handle: '#widget_header'});
    // let linkHeaders = new Headers();
    // linkHeaders.append('Access-Control-Allow-Origin', 'http://kh-gis-chat-bot.intetics.com.ua/');
    // let linkedInit = {
    //     method: 'GET',
    //     headers: linkHeaders,
    //     mode: 'cors'
    // };
    // let linkedRequest = new Request('https://www.linkedin.com/oauth/v2/authorization', linkedInit);
    // fetch(linkedRequest).then(function (response){
    //    return response.json();
    // }).then(function (responseJson) {
    //     console.log(responseJson);
    // });
    let chat = {
        socket: {},
        opened: false,
        active: false,
        guestName: 'dear Guest',
        firstTime: true,
        APIkey: '563492ad6f91700001000001bb151c8c07f048768f0c409fc846429b',
        click: function () {
            this.opened ? this.close() : this.open();
        },
        open: function() {
            let button = $('#widget_button');
            let body = $('#widget_body');
            body.css({top: button.offset().top - body.outerHeight() - 40 + 'px', left: button.offset().left - body.outerWidth() + 100 + 'px'});
            button.addClass('clicked');
            body.addClass('opened');
            body.toggle('blind', {direction: 'down'}, 1000);
            if (body.offset().top <= 5) {
                $(body).animate({top: '10px'}, 500);
            }
            button.draggable('disable');
            $('#widget_input').empty();
            this.opened = true;
            $('#preview_container').empty().hide('drop', 600);
        },
        close: function () {
            let body = $('#widget_body');
            let button = $('#widget_button');
            button.css({top: body.offset().top + body.outerHeight() + 40 + 'px', left: body.offset().left + body.outerWidth() - button.outerWidth()});
            button.removeClass('clicked');
            body.removeClass('opened');
            body.toggle('blind', {direction: 'down'}, 1000);
            this.opened = false;
            button.draggable('enable');
            if (button.offset().top + button.outerHeight() >= $(window).outerHeight() - 5) {
                $(button).animate({top: $(window).outerHeight() - button.outerHeight() - 10 + 'px'}, 500);
            }
        },
        addMessage: function (text, sender) {
            let self = this;
            setTimeout(function () {
                let options = {direction: ''};
                sender === 'bot' ? options.direction = 'left' : options.direction = 'right';
                let newMessage = document.createElement('div');
                $(newMessage).addClass('widget_message ' + sender + '_message');
                $(newMessage).append(text);
                $(newMessage).appendTo('#widget_queue').show('drop', options, 600);
                if (sender === 'guest') {
                    self.createResponse(text);
                }
                if (!self.opened) {
                    self.showPreview(text);
                }
                $('#widget_queue').animate({scrollTop: $(this).scrollHeight}, 700);
            }, 600);
        },
        showPreview: function (text) {
            let options = {direction: 'left'};
            $('#preview_container').hide('drop', options, 600);
            setTimeout(function () {
                $('#preview_container').empty().append(text).show('fold', options, 600);
            },600);
        },
        initialize: function () {
            let self = this;
            let initialized = localStorage.getItem('initialized');
            console.log(initialized);
            // if (initialized!=='true') {
                setTimeout(function () {
                    self.addMessage('Hello, dear Guest! My name is Mike! Happy to help you!', 'bot');
                    setTimeout(function () {
                        self.addMessage('What is your name?', 'bot');
                    }, 1300);
                    localStorage.setItem('initialized', 'true');
                }, 1300);
        },
        getHistory: function() {
            this.addMessage('Welcome back!', 'bot');
        },
        clearHistory: function() {
            $('#widget_queue').empty();
        },
        createResponse: function (text) {
            chat.socket.emit('message', {
                message: text,
                user: chat.user,
            });
            // let regExp = /^\/(\w+)\s(\w+)*\s*(\d*)/g;
            // let result = regExp.exec(text);
            // if (!!result) {
            //     console.log(result);
            //     let intent = result[1];
            //     let variable = result[2];
            //     let quantity = result[3];
            //     switch (intent) {
            //         case 'name':
            //             if (!!variable) {
            //                 this.guestName = variable;
            //                 this.addMessage('Hello, ' + this.guestName, 'bot');
            //             }
            //             break;
            //         case 'image':
            //             this.showImage(variable, quantity);
            //             break;
            //         default:
            //             this.addMessage('You need to use one of the commands. Commands are starting with /', 'bot');
            //     }
            // } else {
            //     this.addMessage('You need to use one of the commands. Commands are starting with /', 'bot');
            // }
            // $('#widget_queue').animate({scrollTop: $(this).scrollHeight}, 700);
        },
        showImage: function (category, quantity) {
            let self = this;
            let headers = new Headers();
            headers.append('Authorization', self.APIkey);
            let myInit = {
                method: 'GET',
                headers: headers
            };
            let request =  new Request('https://api.pexels.com/v1/search?query=' + category + '+query&per_page=50&page=1', myInit);
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
                            $(lightbox).show('blind', {direction: 'up'}, 700);
                            $('#modal_overlay').show('explode', 800);
                        });
                        self.addMessage(image, 'bot');
                        image.addEventListener('load', function () {
                            console.log($(image).outerHeight());
                            setTimeout(function () {
                                $('#widget_queue').animate({scrollTop: 150}, 700);
                            }, 600);
                        });
                    }
                } else {
                    self.addMessage('Sorry, i was not able to find the images you requested', 'bot');
                }
            });
        },
        showGallery: function (category, slidesNumber) {
            
        }
    };

    chat.initialize();

    $('#human_connect').on('click', function () {
        const content = 'connect with human';
        chat.addMessage(content, 'guest')
        /* chat.socket.emit('message', {
            message: content,
            user: chat.user,
        }) */
    });

    $('#widget_input').keydown(function (e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            chat.addMessage($(this).text(), 'guest');
            $(this).empty();
        }
    });

    $('#widget_button').on('click', function(){
        chat.click();
    });

    $('.close_widget').on('click', function(){
        chat.click();
    });

    $('#clear_history').on('click', function () {
       chat.clearHistory();
    });

    $('.message_image').on('click', function () {
        let lightbox = $('#widget_lightbox');
        $(lightbox).empty();
        $(this).clone().appendTo(lightbox);
       $(lightbox).show('blind', {direction: 'up'}, 700);
       $('#modal_overlay').show('explode', 800);
    });

    $('#modal_overlay').on('click', function () {
        $('#widget_lightbox').hide('scale', 600);
        $(this).hide('explode', 800);
    });

    const socket = io('http://13b97537.ngrok.io');
    chat.socket = socket;
    chat.socket.on(S_CHANNEL.CONNECT, function () {
        console.log('Connected');
        socket.emit(S_CHANNEL.INIT_BOT, { id: 16 });
        if (lStorage.has(lStorage.keys.INT_USER)) {
            //return history for existing user
            const user = lStorage.get(lStorage.keys.INT_USER);
            chat.user = user;
            socket.emit(S_CHANNEL.INIT_HISTORY, user);
        } else {
            socket.emit(S_CHANNEL.INIT_USER, { name: 'Guest' });
        }

    });
    chat.socket.on(S_CHANNEL.INIT_BOT, function (data) {
        bot = data;
        console.log(`get init-bot response with: ${JSON.stringify(data)}`);
    });
    chat.socket.on(S_CHANNEL.INIT_USER, function (data) {
        chat.user = data;
        lStorage.set(lStorage.keys.INT_USER, data);
        console.log(`get init-user response with: ${JSON.stringify(data)}`);
    });
    chat.socket.on(S_CHANNEL.MESSAGE, function (data) {
        console.log(`get message response with: ${JSON.stringify(data)}`);
        data.forEach(d => chat.addMessage(d, 'bot'));
    });
    chat.socket.on(S_CHANNEL.INIT_HISTORY, function (data) {
        console.log(`get HISTORY init response with: ${JSON.stringify(data)}`);
        data.forEach(d => chat.addMessage(d.content, d.senderType === 'bot' ? 'bot' : 'guest'));
    });
    chat.socket.on(S_CHANNEL.EXCEPTION, function (data) {
        console.log('exception: ', data);
    });
    chat.socket.on(S_CHANNEL.DISCONNECT, function () {
        console.log('Disconnected');
    });

    // let getUserInit = {
    //     method: 'GET'
    // };
    // let getUserRequest = new Request('http://kh-gis-chat-bot.intetics.com.ua:8080/api/rest/v1/user', getUserInit);
    // fetch(getUserRequest).then(function (response){
    //     return response.json();
    // }).then(function (responseJson) {
    //     console.log(responseJson);
    // });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;
    const commands = {
        image: 'image',
        name: 'name',
        nick: 'Nick',
        continue: 'continue',
        post: 'post',
        snow: 'snow',
        sand: 'sand',
        water: 'water',
        1: 'one',
        2: 'two',
        3: 'three',
        4: 'four',
        5: '5',
        6: '6',
        7: '7',
        8: '8',
        9: '9',
        10: 'ten',
    };
    const commandsList = Object.keys(commands);
    const grammar = '#JSGF V1.0; grammar commands; public <command> = ' + commandsList.join(' | ') + ' ;';
    const recognition = new SpeechRecognition();
    const speechRecognitionList = new SpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;
    recognition.lang = 'en-EN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 2;

    $('#audio_input').on('click', function() {
        recognition.start();
        console.log('Ready to receive a command.');
    });

    function getCommand(speechResult) {
        for (let index = 0; index < commandsList.length; index += 1) {
            if (speechResult.indexOf(commandsList[index]) !== -1) {
                const commandKey = commandsList[index];
                return [commandKey, commandsList[commandKey], ''];
            }
        }
        return null;
    }

    let continueLine = false;
    recognition.onresult = function(event) {
        const last = event.results.length - 1;
        const commands = getCommand(event.results[last][0].transcript);
        // recognitionTextResult.textContent = 'Результат: ' + commands[0];
        // speechRecognitionSection.style.backgroundColor = commands[1];
        let inputText = stripObscures(...commands);
        switch (inputText) {
            case 'continue':
                continueLine = true;
                break;
            case 'post':
                chat.addMessage($('#widget_input').text(), 'guest');
                $('#widget_input').empty();
                break;
            default:
                continueLine ? continueLineFromVoice(inputText) : newInputLineFromVoice(inputText);
                continueLine = false;

        }
        console.log('Commands = ' + commands);
        console.log(commands);
        console.log('Confidence: ' + event.results[0][0].confidence);
    };

    function newInputLineFromVoice (inputText) {
        console.log('NewInput');
        if (inputText === 'image') {
            inputText = '/' + inputText;
        }
        $('#widget_input').focus();
        $('#widget_input').empty().text(inputText + ' ');
    }

    function continueLineFromVoice(inputText) {
        console.log('ContinueInput');
        $('#widget_input').focus();
        $('#widget_input').append(inputText + ' ');
    }

    function stripObscures (text) {
        return text.replace(/[^a-zA-Z0-9а-я]/gi);
    }

    recognition.onspeechend = function() {
        recognition.stop();
    };

    recognition.onnomatch = function(event) {
        console.log("I didn't recognise that command.");
    };

    recognition.onerror = function(event) {
        console.log(`Error occurred in recognition: ${event.error}`);
    };

});
