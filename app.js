jQuery(document).ready(function($){
    $('#widget_button').draggable();
    let linkHeaders = new Headers();
    linkHeaders.append('Access-Control-Allow-Origin', 'http://kh-gis-chat-bot.intetics.com.ua/');
    let linkedInit = {
        method: 'GET',
        headers: linkHeaders,
        mode: 'cors'
    };
    let linkedRequest = new Request('https://www.linkedin.com/oauth/v2/authorization', linkedInit);
    fetch(linkedRequest).then(function (response){
       return response.json();
    }).then(function (responseJson) {
        console.log(responseJson);
    });
    let chat = {
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
            button.draggable('disable');
            this.opened = true;
            $('#preview_container').empty().hide('drop', 600);
            // this.firstTime ? (this.initialize(), this.firstTime = false) : null;
            $('#widget_queue').css('height', $('#widget_body').outerHeight() - $('#widget_header').outerHeight() - $('#widget_input').outerHeight() - 24 + 'px');
        },
        close: function () {
            $('#widget_button').removeClass('clicked');
            $('#widget_body').removeClass('opened');
            $('#widget_body').toggle('blind', {direction: 'down'}, 1000);
            this.opened = false;
            $('#widget_button').draggable('enable');
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
                $('#widget_queue').scrollTop($('#widget_queue').prop("scrollHeight"));
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
            // } else {
            //     this.getHistory();
            // }
        },
        getHistory: function() {
            this.addMessage('Welcome back!', 'bot');
        },
        clearHistory: function() {
            localStorage.setItem('initialized', 'false');
            location.reload();
        },
        createResponse: function (text) {
            let regExp = /^\/(\w+)\s(\w+)*\s*(\d*)/g;
            let result = regExp.exec(text);
            if (!!result) {
                console.log(result);
                let intent = result[1];
                let variable = result[2];
                let quantity = result[3];
                switch (intent) {
                    case 'name':
                        if (!!variable) {
                            this.guestName = variable;
                            this.addMessage('Hello, ' + this.guestName, 'bot');
                        }
                        break;
                    case 'image':
                        this.showImage(variable, quantity);
                        break;
                    default:
                        this.addMessage('You need to use one of the commands. Commands are starting with /', 'bot');
                }
            } else {
                this.addMessage('You need to use one of the commands. Commands are starting with /', 'bot');
            }
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

    // const socket = io('http://kh-gis-chat-bot.intetics.com.ua:3000');
    // socket.on('connect', function () {
    //     console.log('Connected');
    //     socket.emit('init-bot', { id: 16 });
    //     socket.emit('init-user', { name: 'Guest' });
    // });
    // socket.on('init-bot', function (data) {
    //     console.log('event', data);
    // });
    // socket.on('init-user', function (data) {
    //     console.log('event', data);
    // });
    // socket.on('exception', function (data) {
    //     console.log('event', data);
    // });
    // socket.on('disconnect', function () {
    //     console.log('Disconnected');
    // });
    // let headers = new Headers();
    // headers.append("Content-Type", "application/json");
    // headers.append("Accept", "application/json");
    // let body = {
    //     name: 'Nick'
    // };
    // let postUserInit = {
    //     method: 'POST',
    //     headers: headers,
    //     body: JSON.stringify(body)
    // };
    // let postUserRequest = new Request('http://kh-gis-chat-bot.intetics.com.ua:8080/api/rest/v1/user', postUserInit);
    // fetch(postUserRequest).then(function (response){
    //     return response.json();
    // }).then(function (responseJson) {
    //     console.log(responseJson);
    // });
    //
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
        // красный: 'red',
        // оранжевый: 'orange',
        // желтый: 'yellow',
        // зеленый: 'green',
        // голубой: 'blue',
        // синий: 'darkblue',
        // фиолетовый: 'violet',
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
