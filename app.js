jQuery(document).ready(function($){
    $('#widget_button').draggable();
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
            this.firstTime ? (this.initialize(), this.firstTime = false) : null;
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
                console.log($(newMessage).text());
                if (sender === 'guest') {
                    self.createResponse(text);
                }
                $('#widget_queue').scrollTop($('#widget_queue').prop("scrollHeight"));
            }, 600);
        },
        initialize: function () {
            let self = this;
            setTimeout(function () {
                self.addMessage('Hello, dear Guest! My name is Mike! Happy to help you!', 'bot');
                setTimeout(function () {
                    self.addMessage('What is your name?', 'bot');
                }, 700);
            }, 1300);
        },
        createResponse: function (text) {
            let regExp = /^\/(\w+)\s(\w+)*/g;
            let result = regExp.exec(text);
            if (!!result) {
                let intent = result[1];
                let variable = result[2];
                switch (intent) {
                    case 'name':
                        if (!!variable) {
                            this.guestName = variable;
                            this.addMessage('Hello, ' + this.guestName, 'bot');
                        }
                        break;
                    case 'image':
                        this.showImage(variable);
                        break;
                    default:
                        this.addMessage('You need to use one of the commands. Commands are starting with /', 'bot');
                }
            } else {
                this.addMessage('You need to use one of the commands. Commands are starting with /', 'bot');
            }
        },
        showImage: function (category) {
            let self = this;
            let headers = new Headers();
            let randomImage = Math.floor(Math.random() * 50);
            headers.append('Authorization', this.APIkey);
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
                    let image = new Image();
                    image.src = jsonResponse.photos[randomImage].src.large;
                    $(image).addClass('message_image');
                    image.addEventListener('click',  function () {
                        let lightbox = $('#widget_lightbox');
                        $(lightbox).empty();
                        $(this).clone().appendTo(lightbox);
                        $(lightbox).show('blind', {direction: 'up'}, 700);
                        $('#modal_overlay').show('explode', 800);
                    });
                    self.addMessage(image, 'bot');
                } else {
                    self.addMessage('Sorry, i was not able to find the images you requested', 'bot');
                }
            });
        },
        showGallery: function (category, slidesNumber) {
            
        }
    };

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
});
