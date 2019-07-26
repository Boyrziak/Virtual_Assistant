# Frontend part of Virtual Assistant

Front-end for Intetics Virtual Assistant

# Features

Chat is opened via clicking the "Info" button;

While the chat is closed it could be dragged around by dragging the button. 
When the chat is opened dragging will be enabled via dragging the header

# Methods

## Chat

#### initialize ()

Initializes all data from storage and sets up the bot to the last state. Inits local history

### Messaging

#### chatMessage (Object{} `messageDto`)

Accepts `messageDto` **Object** and appends it to the message queue array then flushes the array with `flushNewQueue` method

#### flushNewQueue (Array[])

Accepts **Array** of current message queue and recursively calls `addMessage` it with delays for typing. Typing delay is set as the property of chat objects. Typing animation is shown via html construction with css animation

#### addMessage (Object{} `messageDto`, boolean `toHistory`)

Accepts `messageDto` **Object** and `toHistory` boolean which indicates should it go to the history or not. Messages that come from history are always marked `false`. `messageDto`
include sender type and actual messages. Message type is used to render messages correctly. Removes choices from the history. Messages array have different types which renders with accorded function - `showText`, `showEvent`, `showChoice`, `showCards`, `showNecklace`

#### showText( String `text`, String `sender`, ~~Object{} options~~)

Appends and renders text as message in the queue. Sender is used to show proper message sender Options are deprecated. 

#### showChoice (Object{} `choice`)

Appends and renders choice in form of buttons in the queue. Renders one button for each button in choice array. Each button has a `OnClick` listener which is associated with 
function in the chat or has postback which is sent back to the server. Render is removing all previous choices from the queue. 
Performed click on the button also makes the button disappear

#### showCards (Array[] `cards`, Object{} `messageDto`)

Appends and renders card or carousel. Creates a holder and appends all cards to it. Cards can be of two types - video or image. If cards come in multiple numbers they are shown as the carousel.
Dots and arrows is appended to carousel. Each card has a holder which opens it as a lightbox. Cliking on a carousel card will result in carousel lightbox which opens on the clicked big card. 
Opening the lightbox also pauses the delay timer for next message until it is closed.

#### showCarouselLightbox (Array[] `cards`, Number `scrollTo`)

Opens lightbox with a clicked carousel. Scrolls it to the slide number `scrollTo`.

#### scrollHolder (DOM Element `element`, DOM Element `carousel`, Number `carouselLength`, Number `rightOffset`)

Used by thumbnail and large carousel to scroll by clicking on arrows. Accepts clicked arrow button, carousel wrap, lenght of the current carousel and cards offset. Shifts the carousel to the appropriate side by the length of single card + offset

#### dotScroller (DOM Element `dot`, DOM Element `carousel`, Number `carouselLength`, Number `rightOffset`)

Used by thumbnail and large carousel to scroll by clicking on navigation dots. As above.

#### checkArrows (DOM Element `holder`, Number `scrollDistance`, Number `carouselLength`)

Used to check if arrows should be visible in the current position. Otherwise hides them

#### showNecklace (Array[] `links`)

Appends and renders links to social media. Accepts array of links which contain a link, an image url and hover color.
Can be used to show any link.

### History

#### renderHistory (Array[] `history`) 

Renders history from Local Storage. Flushes `history` array to render via `flushQueue` method. Also renders bot open if it was so.


#### flushQueue (Array[] `currentQueue`)

Recursively calls `addMessage` function from shifting the `currentQueue` **Array**. The flag to write message to history is always `false` here. Also can cut the shown history to make lazy load in future.

#### clearHistoryConfirmed (Object{} `data`)

Clears history and deletes the user from storage. Empties the queue and appends the typing animation again.

### Visualisation

#### open ()

Opens the bot from hidden view. Used as callback from widget button click and in the initialization step. Removes the subscription after click to prevent multiclick, show widget, hide button and reposition widget if needed. 
Makes header draggable and disable dragging by the button. Also scrolls the queue down and makes changes for mobile adaptive layout.
Subscribe the button again after full render.

#### close () 

Closes the bot to hidden view. Used as callback from close button on header. Reposition the button if needed. 

#### reposition ()

Checks if the widget remains in the window boundaries. Reposition it to have distance 5px from the closest boundaries.

#### showPreview (String `text`)

Renders and shows 

### Cookie

#### setCookie (String `name`, String `value`, Object{} `options`)

Sets cookie valued `value` to `name`. `options` can set expiration and prop names.

#### getCookie (String `name`)

Gets cookie by `name`

#### deleteCookie (String `name`)

Deletes cookie by `name`

### Linkedin

#### linkedinGetAuthToken ()

Makes request for authentication code to the backend. Request url has `user.id` and current `location.href`. Response contains json with `uri` property, which is used to navigate to the authorization page.
After authentication code is located in the http parameter

#### linkedinExchangeAuthToken ()

Claims code from http request and makes another request to the backend, sending code to Linkedin to get authorization token. Then methods `linkedinGetUser` and `linkedinGetEmail` are called

#### linkedinGetUser (String `token`)

Makes request to the backend with authorization token to get authorized user data. 

#### linkedinGetEmail (String `token`)

Makes request to the backend with authorization token to get authorized user email. 

### Util

#### openUrl (String `url`)

Navigates page to the `url`

#### scrollQuery (Number `timeout`)

Scrolls widget queue to the bottom with `timeout` speed

#### isUrlChanged ()

Checks if page were navigated to another url

#### idleAction (Number `timeout`)

Starts idle countdown for `timeout` milliseconds

#### getCurrentLocation ()

Returns current location

#### getUser ()

Returns current user 

### Listeners

Listeners are made using jQuery `on` method or using Rx.js `subscribe`

#### $('.human_connect').on('click')

##### Runs connectWithHuman ()

Makes a request for human connection, appends message 'connect with human' to the queue

#### $(window).resize() 

Sets timeout for chat reposition after window resize

#### $('#audio_input').on('click')

##### Runs audioRecording ()

Changes view of the audio button, stops next message event end starts audio recording

#### $('.show_buttons').on('click')

Works on mobile view. Changes show button and shows or hide mobile buttons

#### $(window).on('unload')

When page is changed or closed cookie `opened` is written


