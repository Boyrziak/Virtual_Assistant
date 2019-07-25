# Frontend part of Virtual Assistant

Front-end for Intetics Virtual Assistant

# Features

Chat is opened via clicking the "Info" button;

While the chat is closed it could be dragged around by dragging the button. 
When the chat is opened dragging will be enabled via dragging the header

# Methods

## Chat

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



##Description
