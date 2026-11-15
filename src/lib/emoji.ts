// The emoji the composer's picker offers: a curated few hundred of the common
// ones, grouped in X's categories, each with words to search by. Kept here
// rather than fetched so the picker works offline and adds no dependency.
// Browser-safe.

export interface Emoji {
  char: string;
  /** Lowercase search words, the emoji's name first. */
  words: string;
}

export interface EmojiCategory {
  key: string;
  label: string;
  emoji: Emoji[];
}

/** "😀 grinning face smile happy" → { char, words }: one line per emoji keeps the list readable. */
function parse(lines: string): Emoji[] {
  return lines
    .trim()
    .split("\n")
    .map((l) => {
      const line = l.trim();
      const space = line.indexOf(" ");
      return { char: line.slice(0, space), words: line.slice(space + 1).toLowerCase() };
    });
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    key: "smileys",
    label: "Smileys & people",
    emoji: parse(`
😀 grinning face smile happy
😃 grinning face big eyes smile happy
😄 grinning face smiling eyes happy joy
😁 beaming face grin teeth
😆 grinning squinting laugh
😅 grinning sweat relief nervous laugh
🤣 rolling on the floor laughing rofl lol
😂 face with tears of joy laughing crying lol lmao
🙂 slightly smiling face
🙃 upside down face sarcasm silly
😉 winking face wink
😊 smiling face blush happy
😇 smiling face halo angel innocent
🥰 smiling face hearts love adore
😍 heart eyes love crush
🤩 star struck excited wow
😘 face blowing a kiss love
😋 face savoring food yum delicious
😛 face with tongue
😜 winking face tongue crazy
🤪 zany face crazy goofy
😝 squinting face tongue
🤑 money mouth face rich dollar
🤗 hugging face hug
🤭 face with hand over mouth oops giggle
🤫 shushing face quiet secret
🤔 thinking face hmm think
🤐 zipper mouth face secret
🤨 face with raised eyebrow skeptical suspicious
😐 neutral face meh
😑 expressionless face blank
😶 face without mouth speechless
😏 smirking face smirk
😒 unamused face annoyed
🙄 face with rolling eyes eyeroll
😬 grimacing face awkward yikes
😮‍💨 face exhaling sigh relief
🤥 lying face liar pinocchio
😌 relieved face calm
😔 pensive face sad
😪 sleepy face tired
🤤 drooling face
😴 sleeping face zzz tired
😷 face with medical mask sick
🤒 face with thermometer ill sick
🤕 face with head bandage hurt
🤢 nauseated face sick gross
🤮 face vomiting sick gross
🥵 hot face heat sweating
🥶 cold face freezing
🥴 woozy face drunk dizzy
😵 face with crossed out eyes dizzy dead
🤯 exploding head mind blown shocked
🤠 cowboy hat face yeehaw
🥳 partying face party celebrate birthday
😎 smiling face sunglasses cool
🤓 nerd face geek glasses
🧐 face with monocle inspect curious
😕 confused face
😟 worried face
🙁 slightly frowning face sad
☹️ frowning face sad
😮 face with open mouth surprised wow
😯 hushed face surprised
😲 astonished face shocked
😳 flushed face embarrassed
🥺 pleading face puppy eyes please
😦 frowning face open mouth
😧 anguished face
😨 fearful face scared
😰 anxious face sweat nervous
😥 sad but relieved face
😢 crying face tear sad
😭 loudly crying face sob sad
😱 face screaming in fear scream shocked
😖 confounded face
😣 persevering face
😞 disappointed face sad
😓 downcast face sweat
😩 weary face tired
😫 tired face
🥱 yawning face bored tired
😤 face with steam from nose triumph angry
😡 pouting face angry rage mad
😠 angry face mad
🤬 face with symbols on mouth cursing swearing
😈 smiling face horns devil evil
💀 skull dead dying lmao
☠️ skull and crossbones danger death
💩 pile of poo poop
🤡 clown face clown
👻 ghost boo spooky
👽 alien ufo
🤖 robot bot ai
😺 grinning cat
😹 cat tears of joy laughing
😻 cat heart eyes
🙈 see no evil monkey embarrassed
🙉 hear no evil monkey
🙊 speak no evil monkey
💋 kiss mark lips
💯 hundred points 100 perfect
💢 anger symbol
💥 collision boom explosion
💫 dizzy stars
💦 sweat droplets water
💨 dashing away fast wind
💬 speech balloon chat comment
💭 thought balloon thinking
💤 zzz sleep
👋 waving hand hello hi bye wave
🤚 raised back of hand
✋ raised hand stop high five
🖖 vulcan salute spock
👌 ok hand perfect
🤌 pinched fingers italian
🤏 pinching hand small tiny
✌️ victory hand peace
🤞 crossed fingers luck hope
🤟 love you gesture
🤘 sign of the horns rock
🤙 call me hand shaka
👈 backhand index pointing left
👉 backhand index pointing right
👆 backhand index pointing up
👇 backhand index pointing down
☝️ index pointing up
👍 thumbs up like yes approve good
👎 thumbs down dislike no bad
✊ raised fist power
👊 oncoming fist punch bump
👏 clapping hands applause clap bravo
🙌 raising hands hooray celebrate praise
👐 open hands
🤲 palms up together
🤝 handshake deal agreement
🙏 folded hands please pray thanks
✍️ writing hand
💅 nail polish sassy
🤳 selfie
💪 flexed biceps strong muscle
🧠 brain smart
👀 eyes looking watching side eye
👁️ eye
👅 tongue
👄 mouth lips
🫡 saluting face salute respect
🫠 melting face embarrassed
🫣 face with peeking eye
🫢 face with open eyes hand over mouth
🫤 face with diagonal mouth unsure
🥹 face holding back tears grateful
👶 baby
🧒 child kid
👦 boy
👧 girl
🧑 person adult
👨 man
👩 woman
🧓 older person
👴 old man grandpa
👵 old woman grandma
🤷 person shrugging shrug idk whatever
🤦 person facepalming facepalm
🙋 person raising hand
🙇 person bowing sorry
💁 person tipping hand sassy
🙅 person gesturing no
🙆 person gesturing ok
🧑‍💻 technologist coder developer programmer laptop
🧑‍🍳 cook chef
🧑‍🚀 astronaut space
🧑‍⚖️ judge court law
👮 police officer cop
🕵️ detective spy
💂 guard
👷 construction worker
🤴 prince
👸 princess queen
🦸 superhero
🦹 supervillain
🧙 mage wizard
🧛 vampire
🧟 zombie
🚶 person walking
🏃 person running run
💃 woman dancing dance party
🕺 man dancing dance disco
👯 people with bunny ears party
🧘 person in lotus position yoga meditate
👫 couple holding hands
👪 family
🗣️ speaking head talking shouting
👤 bust in silhouette
`),
  },
  {
    key: "nature",
    label: "Animals & nature",
    emoji: parse(`
🐶 dog face puppy pet
🐱 cat face kitten pet
🐭 mouse face
🐹 hamster
🐰 rabbit face bunny
🦊 fox
🐻 bear
🐼 panda
🐨 koala
🐯 tiger face
🦁 lion
🐮 cow face
🐷 pig face
🐸 frog
🐵 monkey face
🐔 chicken
🐧 penguin
🐦 bird
🐤 baby chick
🦆 duck
🦅 eagle
🦉 owl
🦇 bat
🐺 wolf
🐗 boar
🐴 horse face
🦄 unicorn startup
🐝 honeybee bee
🐛 bug
🦋 butterfly
🐌 snail slow
🐞 lady beetle ladybug
🐜 ant
🕷️ spider
🐢 turtle slow
🐍 snake
🦎 lizard
🦖 t rex dinosaur
🦕 sauropod dinosaur
🐙 octopus
🦑 squid
🦀 crab
🐠 tropical fish
🐟 fish
🐬 dolphin
🐳 spouting whale
🐋 whale
🦈 shark
🐊 crocodile
🐅 tiger
🐆 leopard
🦓 zebra
🦍 gorilla
🐘 elephant
🦛 hippopotamus
🦏 rhinoceros
🐪 camel
🦒 giraffe
🦘 kangaroo
🐂 ox bull market
🐄 cow
🐎 horse
🐖 pig
🐑 ewe sheep
🐐 goat greatest of all time
🦌 deer
🐕 dog
🐈 cat
🐓 rooster
🦃 turkey
🦚 peacock
🦜 parrot
🦢 swan
🐇 rabbit
🦝 raccoon
🦦 otter
🐿️ chipmunk squirrel
🦔 hedgehog
🐾 paw prints
🐉 dragon
🌵 cactus
🎄 christmas tree
🌲 evergreen tree
🌳 deciduous tree
🌴 palm tree
🌱 seedling growth
🌿 herb
☘️ shamrock
🍀 four leaf clover luck
🍁 maple leaf canada autumn
🍂 fallen leaf autumn fall
🍃 leaf fluttering in wind
🍄 mushroom
💐 bouquet flowers
🌷 tulip
🌹 rose
🥀 wilted flower
🌺 hibiscus
🌸 cherry blossom
🌼 blossom
🌻 sunflower
🌞 sun with face
🌝 full moon face
🌚 new moon face
🌙 crescent moon night
🌎 globe americas earth world
🌍 globe europe africa earth world
🌏 globe asia australia earth world
🪐 ringed planet saturn space
⭐ star
🌟 glowing star
✨ sparkles shiny magic
⚡ high voltage lightning zap
🔥 fire lit hot flame
🌈 rainbow
☀️ sun sunny
⛅ sun behind cloud
☁️ cloud
🌧️ cloud with rain
⛈️ cloud with lightning and rain storm
🌩️ cloud with lightning
❄️ snowflake cold winter
☃️ snowman
🌪️ tornado
🌊 water wave ocean sea
💧 droplet water
☔ umbrella with rain drops
`),
  },
  {
    key: "food",
    label: "Food & drink",
    emoji: parse(`
🍏 green apple
🍎 red apple
🍐 pear
🍊 tangerine orange
🍋 lemon
🍌 banana
🍉 watermelon
🍇 grapes
🍓 strawberry
🫐 blueberries
🍈 melon
🍒 cherries
🍑 peach
🥭 mango
🍍 pineapple
🥥 coconut
🥝 kiwi fruit
🍅 tomato
🍆 eggplant aubergine
🥑 avocado
🥦 broccoli
🥬 leafy green
🥒 cucumber
🌶️ hot pepper chili spicy
🌽 ear of corn
🥕 carrot
🧄 garlic
🧅 onion
🥔 potato
🍠 roasted sweet potato
🥐 croissant
🥯 bagel
🍞 bread
🥖 baguette
🧀 cheese wedge
🥚 egg
🍳 cooking fried egg
🧈 butter
🥞 pancakes
🧇 waffle
🥓 bacon
🥩 cut of meat steak
🍗 poultry leg chicken
🍖 meat on bone
🌭 hot dog
🍔 hamburger burger
🍟 french fries
🍕 pizza
🥪 sandwich
🌮 taco
🌯 burrito
🥗 green salad
🍝 spaghetti pasta
🍜 steaming bowl ramen noodles
🍲 pot of food stew
🍛 curry rice
🍣 sushi
🍱 bento box
🥟 dumpling
🍤 fried shrimp
🍙 rice ball
🍚 cooked rice
🍿 popcorn drama watching
🧂 salt salty
🥫 canned food
🍦 soft ice cream
🍩 doughnut donut
🍪 cookie
🎂 birthday cake
🍰 shortcake cake slice
🧁 cupcake
🥧 pie
🍫 chocolate bar
🍬 candy
🍭 lollipop
🍯 honey pot
☕ hot beverage coffee tea
🍵 teacup tea
🧋 bubble tea boba
🥤 cup with straw soda
🧃 beverage box juice
🍶 sake
🍺 beer mug
🍻 clinking beer mugs cheers
🥂 clinking glasses cheers champagne celebrate
🍷 wine glass
🥃 tumbler glass whiskey
🍸 cocktail glass martini
🍹 tropical drink
🍾 bottle with popping cork champagne celebrate
🧊 ice cube
🥄 spoon
🍴 fork and knife
🍽️ fork and knife with plate dinner
`),
  },
  {
    key: "activity",
    label: "Activity",
    emoji: parse(`
⚽ soccer ball football
🏀 basketball nba
🏈 american football nfl
⚾ baseball mlb
🥎 softball
🎾 tennis
🏐 volleyball
🏉 rugby football
🎱 pool 8 ball billiards
🏓 ping pong table tennis
🏸 badminton
🏒 ice hockey nhl
⛳ flag in hole golf
🏹 bow and arrow archery
🎣 fishing pole
🥊 boxing glove fight
🥋 martial arts uniform
⛸️ ice skate
🎿 skis skiing
🏂 snowboarder
🏋️ person lifting weights gym
🤸 person cartwheeling
⛹️ person bouncing ball
🤺 person fencing
🏇 horse racing
🏄 person surfing surf
🏊 person swimming swim
🚴 person biking cycling
🏆 trophy winner champion
🥇 1st place medal gold first
🥈 2nd place medal silver second
🥉 3rd place medal bronze third
🏅 sports medal
🎖️ military medal
🎗️ reminder ribbon
🎫 ticket
🎟️ admission tickets
🎪 circus tent
🎭 performing arts theater drama
🎨 artist palette art paint
🎬 clapper board movie film
🎤 microphone sing karaoke
🎧 headphone music
🎼 musical score
🎹 musical keyboard piano
🥁 drum
🎷 saxophone
🎺 trumpet
🎸 guitar rock
🎻 violin
🎲 game die dice
♟️ chess pawn
🎯 bullseye direct hit target
🎳 bowling
🎮 video game controller gaming
🕹️ joystick arcade
🧩 puzzle piece
🎰 slot machine gambling
🎉 party popper tada celebrate congrats
🎊 confetti ball celebrate
🎈 balloon party
🎁 wrapped gift present
🎃 jack o lantern halloween
🎆 fireworks
🎇 sparkler
🏁 chequered flag finish race f1
`),
  },
  {
    key: "travel",
    label: "Travel & places",
    emoji: parse(`
🚗 automobile car
🚕 taxi cab
🚙 sport utility vehicle suv
🚌 bus
🏎️ racing car f1 formula one
🚓 police car
🚑 ambulance
🚒 fire engine
🚚 delivery truck
🚜 tractor
🛵 motor scooter
🏍️ motorcycle
🚲 bicycle bike
🛴 kick scooter
🚨 police car light siren alert breaking
🚦 vertical traffic light
🚧 construction
⛽ fuel pump gas
🚂 locomotive train
🚆 train
🚇 metro subway
🚊 tram
✈️ airplane plane flight travel
🛫 airplane departure
🛬 airplane arrival
🚁 helicopter
🚀 rocket launch moon
🛸 flying saucer ufo
🛰️ satellite
⛵ sailboat
🚤 speedboat
🛳️ passenger ship cruise
⚓ anchor
🗺️ world map
🗽 statue of liberty new york usa
🗼 tokyo tower
🏰 castle
🏯 japanese castle
🏟️ stadium
🎡 ferris wheel
🎢 roller coaster
⛲ fountain
🏖️ beach with umbrella vacation
🏝️ desert island
🏜️ desert
🌋 volcano
⛰️ mountain
🏔️ snow capped mountain
🏕️ camping
🏠 house home
🏡 house with garden
🏢 office building
🏬 department store
🏦 bank
🏥 hospital
🏫 school
🏛️ classical building government court
⛪ church
🕌 mosque
🕍 synagogue
🌃 night with stars city
🌆 cityscape at dusk
🌇 sunset
🌉 bridge at night
🌅 sunrise
🎠 carousel horse
🧳 luggage travel
`),
  },
  {
    key: "objects",
    label: "Objects",
    emoji: parse(`
⌚ watch
📱 mobile phone iphone
💻 laptop computer
⌨️ keyboard
🖥️ desktop computer
🖨️ printer
🖱️ computer mouse
💾 floppy disk save
💿 optical disk cd
📷 camera photo
📸 camera with flash
🎥 movie camera
📺 television tv
📻 radio
🎙️ studio microphone podcast
⏰ alarm clock
⏳ hourglass time waiting
⌛ hourglass done
📡 satellite antenna
🔋 battery
🪫 low battery
🔌 electric plug
💡 light bulb idea
🔦 flashlight
🕯️ candle
💸 money with wings spending
💵 dollar banknote cash money
💰 money bag rich
💳 credit card
🪙 coin crypto
💎 gem stone diamond hands
⚖️ balance scale justice law
🧰 toolbox
🔧 wrench fix
🔨 hammer
⚒️ hammer and pick
🛠️ hammer and wrench tools
⛏️ pick
🔩 nut and bolt
⚙️ gear settings
🧱 brick
⛓️ chains
🔫 water pistol
💣 bomb
🔪 kitchen knife
🗡️ dagger
⚔️ crossed swords fight
🛡️ shield
🚬 cigarette
⚰️ coffin dead
🔮 crystal ball prediction future
🧿 nazar amulet
💈 barber pole
🔭 telescope
🔬 microscope science
💊 pill medicine
💉 syringe vaccine
🩸 drop of blood
🧬 dna
🦠 microbe virus
🧪 test tube science
🌡️ thermometer
🧹 broom
🧻 roll of paper toilet paper
🛒 shopping cart
🛍️ shopping bags
🎀 ribbon
🪄 magic wand
📦 package box shipping
📫 mailbox
📮 postbox
📜 scroll
📃 page with curl
📄 page facing up document
📊 bar chart stats
📈 chart increasing stonks up stocks
📉 chart decreasing down stocks crash
🗒️ spiral notepad
📅 calendar date
📆 tear off calendar
📇 card index
📋 clipboard
📁 file folder
📰 newspaper news
🗞️ rolled up newspaper
📓 notebook
📕 closed book
📖 open book reading
📚 books library
🔖 bookmark
🔗 link
📎 paperclip
✂️ scissors
🖊️ pen
✏️ pencil
🖍️ crayon
📝 memo note writing
🔍 magnifying glass search
🔒 locked lock
🔓 unlocked
🔑 key
🗝️ old key
🚪 door
🪑 chair
🛏️ bed
🛋️ couch and lamp
🚽 toilet
🚿 shower
🛁 bathtub
🧸 teddy bear
🖼️ framed picture art
👓 glasses
🕶️ sunglasses cool
👔 necktie
👕 t shirt
👖 jeans
👗 dress
👙 bikini
👟 running shoe sneaker
👠 high heeled shoe
👑 crown king queen
🎩 top hat
🧢 billed cap
💍 ring engagement
💼 briefcase work business
🎒 backpack school
`),
  },
  {
    key: "symbols",
    label: "Symbols",
    emoji: parse(`
❤️ red heart love
🧡 orange heart
💛 yellow heart
💚 green heart
💙 blue heart
💜 purple heart
🖤 black heart
🤍 white heart
🤎 brown heart
💔 broken heart heartbreak sad
❣️ heart exclamation
💕 two hearts love
💞 revolving hearts
💓 beating heart
💗 growing heart
💖 sparkling heart
💘 heart with arrow cupid
💝 heart with ribbon
❤️‍🔥 heart on fire
❤️‍🩹 mending heart
☮️ peace symbol
✝️ latin cross
☪️ star and crescent
🕉️ om
☯️ yin yang
✡️ star of david
♈ aries zodiac
♉ taurus zodiac
♊ gemini zodiac
♋ cancer zodiac
♌ leo zodiac
♍ virgo zodiac
♎ libra zodiac
♏ scorpio zodiac
♐ sagittarius zodiac
♑ capricorn zodiac
♒ aquarius zodiac
♓ pisces zodiac
⚛️ atom symbol
☢️ radioactive
☣️ biohazard
📴 mobile phone off
🆚 vs versus button
🆗 ok button
🆕 new button
🆓 free button
🆒 cool button
🆙 up button
🔞 no one under eighteen
⛔ no entry
🚫 prohibited forbidden banned
❌ cross mark no wrong
⭕ hollow red circle
❗ red exclamation mark
❕ white exclamation mark
❓ red question mark
❔ white question mark
‼️ double exclamation mark
⁉️ exclamation question mark
⚠️ warning caution
🔱 trident emblem
♻️ recycling symbol
✅ check mark button yes done
☑️ check box with check
✔️ check mark
➕ plus
➖ minus
➗ divide
✖️ multiply
♾️ infinity
💲 heavy dollar sign
💱 currency exchange
™️ trade mark
©️ copyright
®️ registered
〰️ wavy dash
➰ curly loop
🔚 end arrow
🔙 back arrow
🔛 on arrow
🔝 top arrow
🔜 soon arrow
⬆️ up arrow
↗️ up right arrow
➡️ right arrow
↘️ down right arrow
⬇️ down arrow
↙️ down left arrow
⬅️ left arrow
↖️ up left arrow
↕️ up down arrow
↔️ left right arrow
🔄 counterclockwise arrows refresh
🔃 clockwise arrows
🔀 shuffle
🔁 repeat
▶️ play button
⏸️ pause button
⏹️ stop button
⏺️ record button
⏭️ next track
⏮️ last track
⏩ fast forward
⏪ fast reverse
🔔 bell notification
🔕 bell with slash mute
📣 megaphone
📢 loudspeaker announcement
🔊 speaker high volume loud
🔇 muted speaker
🎵 musical note
🎶 musical notes
🔴 red circle
🟠 orange circle
🟡 yellow circle
🟢 green circle
🔵 blue circle
🟣 purple circle
⚫ black circle
⚪ white circle
🟥 red square
🟩 green square
🟦 blue square
⬛ black large square
⬜ white large square
🔺 red triangle pointed up
🔻 red triangle pointed down
🔸 small orange diamond
🔹 small blue diamond
🔶 large orange diamond
🔷 large blue diamond
#️⃣ keycap number sign hashtag
0️⃣ keycap 0 zero
1️⃣ keycap 1 one
2️⃣ keycap 2 two
3️⃣ keycap 3 three
4️⃣ keycap 4 four
5️⃣ keycap 5 five
🔟 keycap 10 ten
🅰️ a button blood type
🅱️ b button blood type
🆘 sos help
`),
  },
  {
    key: "flags",
    label: "Flags",
    emoji: parse(`
🏳️ white flag surrender
🏴 black flag
🏴‍☠️ pirate flag
🏳️‍🌈 rainbow flag pride
🏳️‍⚧️ transgender flag
🚩 triangular flag red flag
🇺🇸 flag united states usa america us
🇬🇧 flag united kingdom uk britain england
🇨🇦 flag canada
🇲🇽 flag mexico
🇧🇷 flag brazil
🇦🇷 flag argentina
🇫🇷 flag france
🇩🇪 flag germany
🇮🇹 flag italy
🇪🇸 flag spain
🇵🇹 flag portugal
🇳🇱 flag netherlands
🇧🇪 flag belgium
🇨🇭 flag switzerland
🇦🇹 flag austria
🇸🇪 flag sweden
🇳🇴 flag norway
🇩🇰 flag denmark
🇫🇮 flag finland
🇮🇪 flag ireland
🇵🇱 flag poland
🇺🇦 flag ukraine
🇷🇺 flag russia
🇹🇷 flag turkey
🇬🇷 flag greece
🇮🇱 flag israel
🇵🇸 flag palestinian territories palestine
🇸🇦 flag saudi arabia
🇦🇪 flag united arab emirates uae
🇪🇬 flag egypt
🇳🇬 flag nigeria
🇿🇦 flag south africa
🇰🇪 flag kenya
🇮🇳 flag india
🇵🇰 flag pakistan
🇨🇳 flag china
🇯🇵 flag japan
🇰🇷 flag south korea
🇹🇼 flag taiwan
🇭🇰 flag hong kong
🇸🇬 flag singapore
🇮🇩 flag indonesia
🇵🇭 flag philippines
🇻🇳 flag vietnam
🇹🇭 flag thailand
🇦🇺 flag australia
🇳🇿 flag new zealand
🇪🇺 flag european union eu
🇺🇳 flag united nations un
`),
  },
];

/** Every emoji once, for searching. */
const ALL: Emoji[] = (() => {
  const seen = new Set<string>();
  return EMOJI_CATEGORIES.flatMap((c) => c.emoji).filter((e) => !seen.has(e.char) && seen.add(e.char));
})();

// A keycap ("1️⃣") is a digit and a combining mark, not a pictograph, but X counts it as an emoji.
const PICTOGRAPH = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

/** A post's length as X counts it towards 280: an emoji is 2 however many code
 *  points it is made of (a family or a flag included), anything else 1 per
 *  code point. The composer and the server both count with this. */
export function postLength(text: string): number {
  let n = 0;
  for (const { segment } of graphemes.segment(text)) {
    n += PICTOGRAPH.test(segment) ? 2 : [...segment].length;
  }
  return n;
}

/** Emoji whose words start with every typed word ("red hea" finds the red heart), in list order. */
export function searchEmoji(query: string): Emoji[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return ALL.filter((e) => {
    const words = e.words.split(" ");
    return terms.every((t) => words.some((w) => w.startsWith(t)));
  });
}
