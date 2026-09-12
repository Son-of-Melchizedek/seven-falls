// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Procedural Event System
// Generates unique events from templates + player context
// Expanded: 83 event templates across 47 categories.
// Each template: category, weight(1-5), slots (>=2 arrays of >=5 opts),
// text with {slot} placeholders, 2-3 choices with effect strings.
// ═══════════════════════════════════════════════════════════════

const EventEngine = {
  // ── EVENT TEMPLATES ───────────────────────────────────────
  // Each template has slots that get filled based on context
  templates: [
    // ── NPC MEETINGS ───────────────────────────────────────
    {
      category: 'npc',
      weight: 3,
      slots: {
        npc_role: ['wounded knight', 'blind prophet', 'crying child', 'armed monk', 'hermit scholar', 'fallen angel penitent', 'exorcist', 'treasure hunter', 'ghost of a martyr', 'talking skull'],
        npc_request: ['asks for water', 'begs for protection', 'offers a trade', 'pleads for a prayer', 'demands you leave', 'shares a warning', 'requests a verse', 'sings a broken hymn'],
      },
      text: 'A {npc_role} blocks your path and {npc_request}.',
      choices: [
        { text: 'Help them', effect: 'random_positive', weight: 2 },
        { text: 'Ignore them', effect: 'nothing', weight: 1 },
        { text: 'Ask what they know', effect: 'reveal_weakness', weight: 1 },
      ],
    },
    // ── TRAP ROOMS ─────────────────────────────────────────
    {
      category: 'trap',
      weight: 2,
      slots: {
        trap_type: ['collapsing floor', 'swinging blades', 'poison darts', 'fire jets', 'soul drain sigil', 'ceiling pendulum', 'hidden pit'],
        trap_trigger: ['steps on a loose stone', 'opens the wrong door', 'touches a cold wall', 'breathes the still air', 'gazes into a mirror'],
      },
      text: 'You enter a room with {trap_type}. It {trap_trigger}! React quickly!',
      choices: [
        { text: 'Dodge carefully', effect: 'skill_check', weight: 2 },
        { text: 'Charge through', effect: 'hp_cost_random', weight: 1 },
        { text: 'Find another way', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    // ── TEMPTATIONS ────────────────────────────────────────
    {
      category: 'temptation',
      weight: 3,
      slots: {
        temptation: ['a chest overflowing with gold', 'a beautiful vision of heaven', 'a voice promising power', 'a mirror showing your deepest desire', 'a feast laid out on a table', 'a crown that whispers your name'],
        temptation_voice: ['coos from the dark', 'echoes like a friend', 'speaks in tongues', 'promises safety', 'laughs softly'],
      },
      text: 'You find {temptation}. It {temptation_voice}... You feel drawn to it.',
      choices: [
        { text: 'Resist the temptation', effect: 'buff_wisdom', weight: 1 },
        { text: 'Give in', effect: 'gold_or_hp_cost', weight: 2 },
        { text: 'Destroy it', effect: 'reveal_truth', weight: 1 },
      ],
    },
    // ── BATTLEFIELD DISCOVERIES ────────────────────────────
    {
      category: 'discovery',
      weight: 2,
      slots: {
        discovery: ['a dead soldier clutching a scroll', 'a demon corpse with something glowing inside', 'an altar with fresh blood', 'a circle of standing stones', 'a shattered reliquary'],
        discovery_detail: ['Its hand is still warm', 'The glow pulses', 'The blood is wet', 'The stones hum', 'Dust falls as you near'],
      },
      text: 'Among the ruins, you find {discovery}. {discovery_detail}.',
      choices: [
        { text: 'Investigate', effect: 'learn_verse_or_trap', weight: 2 },
        { text: 'Pray first', effect: 'safe_discover', weight: 1 },
        { text: 'Leave it alone', effect: 'nothing', weight: 1 },
      ],
    },
    // ── MORAL CHOICES ──────────────────────────────────────
    {
      category: 'moral',
      weight: 4,
      slots: {
        dilemma: ['a demon begging for mercy', 'a child trapped with a demon', 'a scholar who sold his soul for knowledge', 'a fellow traveler who stole your map', 'a mother weeping over a fallen son'],
        dilemma_price: ['costs you gold', 'costs you time', 'costs you blood', 'costs you a verse', 'costs you nothing but peace'],
      },
      text: 'You encounter {dilemma}. Resolving it {dilemma_price}.',
      choices: [
        { text: 'Show mercy', effect: 'mercy_reward', weight: 1 },
        { text: 'Choose justice', effect: 'justice_reward', weight: 1 },
        { text: 'Walk away', effect: 'neutral', weight: 1 },
      ],
    },
    // ── SCRIPTURE PUZZLES ──────────────────────────────────
    {
      category: 'puzzle',
      weight: 2,
      slots: {
        puzzle: ['a door with seven locks', 'a bridge that only appears when you speak truth', 'a circle of light that moves', 'a wall of fire with a narrow gap', 'a stair that counts your sins'],
        puzzle_clue: ['carved in latin', 'written in blood', 'sung by wind', 'shown in shadow', 'hinted by a star'],
      },
      text: 'Before you: {puzzle}. The way forward requires wisdom, {puzzle_clue}.',
      choices: [
        { text: 'Quote Psalm 23', effect: 'psalm_path', weight: 1 },
        { text: 'Quote John 3:16', effect: 'john_path', weight: 1 },
        { text: 'Quote Ephesians 6', effect: 'ephesians_path', weight: 1 },
        { text: 'Force through', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    // ── TREASURE TEMPTATIONS ───────────────────────────────
    {
      category: 'treasure',
      weight: 2,
      slots: {
        treasure: ['a golden censer', 'a jeweled chalice', 'a crown of thorns', 'a silver sword', 'a glowing orb', 'an iron key of forgotten shape'],
        treasure_sign: ['radiates power', 'weeps light', 'bears a serpent mark', 'shivers in your hand', 'smells of incense'],
      },
      text: 'You find {treasure}. It {treasure_sign}. But it might be cursed...',
      choices: [
        { text: 'Take it carefully', effect: 'random_item', weight: 2 },
        { text: 'Pray over it first', effect: 'safe_item', weight: 1 },
        { text: 'Leave it', effect: 'nothing', weight: 1 },
      ],
    },
    // ── DEMON ENCOUNTERS (non-combat) ──────────────────────
    {
      category: 'demon_talk',
      weight: 3,
      slots: {
        demon_speech: ['"I can teach you things the Bible won\'t."', '"Power is yours if you just reach for it."', '"Your God has abandoned you here."', '"We are not so different, you and I."', '"Kneel, and the pain stops."'],
        demon_form: ['a figure of smoke', 'a beautiful liar', 'a child with black eyes', 'a winged horror', 'a face you once loved'],
      },
      text: 'A demon speaks: {demon_speech} It appears as {demon_form}.',
      choices: [
        { text: 'Counter with Scripture', effect: 'damage_demon', weight: 1 },
        { text: 'Listen', effect: 'gain_knowledge_lose_hp', weight: 1 },
        { text: 'Attack', effect: 'combat_start', weight: 1 },
      ],
    },
    // ── SHRINE EVENTS ──────────────────────────────────────
    {
      category: 'shrine',
      weight: 2,
      slots: {
        deity: ['the Lord', 'an angel', 'a saint', 'a prophet', 'a martyr', 'the Holy Spirit'],
        shrine_state: ['glows faintly', 'weeps oil', 'stands cracked', 'burns without fuel', 'echoes with song'],
      },
      text: 'An altar to {deity} stands before you. It {shrine_state}.',
      choices: [
        { text: 'Kneel and pray', effect: 'heal_or_verse', weight: 2 },
        { text: 'Offer gold', effect: 'buff_for_gold', weight: 1 },
        { text: 'Light a candle', effect: 'reveal_map', weight: 1 },
      ],
    },
    // ── SCROLL FINDS ───────────────────────────────────────
    {
      category: 'scroll',
      weight: 2,
      slots: {
        scroll_type: ['weathered', 'glowing', 'blood-stained', 'golden', 'shadowy', 'burning-cold'],
        scroll_word: ['a name of God', 'a forgotten psalm', 'a warning', 'a map', 'a prayer of the damned'],
      },
      text: 'A {scroll_type} scroll lies on the ground. {scroll_word} shimmers on its surface.',
      choices: [
        { text: 'Read it aloud', effect: 'learn_verse', weight: 2 },
        { text: 'Study it silently', effect: 'partial_verse', weight: 1 },
        { text: 'Burn it', effect: 'fire_damage_or_wisdom', weight: 1 },
      ],
    },
    // ── ENVIRONMENTAL HAZARDS ──────────────────────────────
    {
      category: 'hazard',
      weight: 2,
      slots: {
        hazard: ['rising floodwater', 'closing walls', 'swarming bats', 'a pit that opens beneath you', 'a cloud of locusts', 'a floor of broken glass'],
        hazard_sign: ['roars like the sea', 'grinds slowly', 'screams in the dark', 'breathes cold', 'hums with hunger'],
      },
      text: '{hazard}! It {hazard_sign} You must act fast!',
      choices: [
        { text: 'Use a verse to protect yourself', effect: 'verse_defense_check', weight: 2 },
        { text: 'Run for it', effect: 'speed_check', weight: 1 },
        { text: 'Stand firm', effect: 'courage_check', weight: 1 },
      ],
    },
    // ── RECURRING NEMESIS ENCOUNTERS ───────────────────────
    {
      category: 'nemesis_hint',
      weight: 1,
      slots: {
        clue: ['scratch marks on the wall', 'a message written in blood', 'footprints that circle back', 'a demon that flees at the sight of you', 'a torn scrap of your own map'],
        clue_tone: ['fresh and wet', 'old and cold', 'glowing faintly', 'smoking still', 'humming a tune you hate'],
      },
      text: 'You notice {clue}. It is {clue_tone}. The Stalker is near...',
      choices: [
        { text: 'Prepare for battle', effect: 'buff_for_nemesis', weight: 1 },
        { text: 'Set a trap', effect: 'trap_for_nemesis', weight: 1 },
        { text: 'Move quickly', effect: 'avoid_nemesis', weight: 1 },
      ],
    },
    // ── LORE EVENTS ────────────────────────────────────────
    {
      category: 'lore',
      weight: 1,
      slots: {
        lore_subject: ['the fall of the Watchers', 'why Lucifer rebelled', 'the meaning of the seven seals', 'what happened to the Garden of Eden', 'the first martyr\'s last words'],
        lore_scene: ['a city of white stone', 'a war in the heavens', 'a garden in flame', 'a throne grown silent', 'a chorus that broke'],
      },
      text: 'A vision shows you {lore_subject}... {lore_scene} unfolds before your eyes.',
      choices: [
        { text: 'Remember this', effect: 'permanent_knowledge', weight: 1 },
        { text: 'Reject the vision', effect: 'nothing', weight: 1 },
      ],
    },
    // ── VERSUS MULTIPLE DEMONS ─────────────────────────────
    {
      category: 'ambush',
      weight: 3,
      slots: {
        demon_count: ['two', 'three', 'four', 'five', 'six', 'a whole pack of'],
        ambush_place: ['from the ceiling', 'behind a false wall', 'out of the dark', 'through a rift', 'from the corpses'],
      },
      text: 'You walk into an ambush! {demon_count} demons leap {ambush_place}!',
      choices: [
        { text: 'Fight them all', effect: 'multi_combat', weight: 1 },
        { text: 'Use an area verse', effect: 'aoe_or_damage', weight: 1 },
        { text: 'Flee', effect: 'flee_or_damage', weight: 1 },
      ],
    },
    // ── HEALING EVENTS ─────────────────────────────────────
    {
      category: 'healing',
      weight: 2,
      slots: {
        source: ['a pool of living water', 'a tree bearing fruit', 'a ray of sunlight through the ceiling', 'a chorus of angelic voices', 'a spring of warm bloodless wine'],
        source_feel: ['radiates life', 'tingles on your skin', 'warms the cold', 'sings without sound', 'pulls the pain out'],
      },
      text: 'You find {source}. It {source_feel}.',
      choices: [
        { text: 'Drink / Partake', effect: 'heal_amount', weight: 2 },
        { text: 'Save it for later', effect: 'store_heal', weight: 1 },
        { text: 'Share with others', effect: 'heal_less_more_later', weight: 1 },
      ],
    },
    // ── CHOIR EVENTS ───────────────────────────────────────
    {
      category: 'choir',
      weight: 1,
      slots: {
        hymn: ['Amazing Grace', 'How Great Thou Art', 'A Mighty Fortress', 'Be Thou My Vision', 'It Is Well'],
        hymn_from: ['from a cracked chapel', 'from the depths', 'from above', 'from behind a veil', 'from the silence'],
      },
      text: 'You hear a distant choir singing "{hymn}" — it comes {hymn_from}.',
      choices: [
        { text: 'Join the singing', effect: 'full_heal_small', weight: 1 },
        { text: 'Listen carefully', effect: 'reveal_floor_secret', weight: 1 },
        { text: 'Walk toward the sound', effect: 'find_choir', weight: 1 },
      ],
    },
    // ── DEMON NEGOTIATION ──────────────────────────────────
    {
      category: 'negotiate',
      weight: 2,
      slots: {
        demon_offer: ['knowledge of your enemy', 'a powerful verse', 'safe passage', 'gold beyond measure', 'the location of the Stalker'],
        demon_price: ['a small favor', 'a drop of blood', 'a forgotten name', 'your shadow', 'a prayer reversed'],
      },
      text: '"I offer you {demon_offer}. All I ask is {demon_price}..."',
      choices: [
        { text: 'Accept the deal', effect: 'deal_with_demon', weight: 1 },
        { text: 'Refuse and fight', effect: 'combat_start', weight: 1 },
        { text: 'Turn the deal around', effect: 'reverseDeal', weight: 1 },
      ],
    },
    // ── SACRIFICE EVENTS ───────────────────────────────────
    {
      category: 'sacrifice',
      weight: 2,
      slots: {
        sacrifice: ['your sword', 'some of your blood', 'a cherished memory', 'years of your life', 'a verse you love'],
        sacrifice_return: ['great power', 'a cleared path', 'a fallen enemy', 'hidden sight', 'a second wind'],
      },
      text: 'The altar demands a sacrifice: {sacrifice}. In return, {sacrifice_return}.',
      choices: [
        { text: 'Sacrifice', effect: 'sacrifice_power', weight: 1 },
        { text: 'Refuse', effect: 'nothing', weight: 1 },
        { text: 'Offer something else', effect: 'alternative_sacrifice', weight: 1 },
      ],
    },
    // ── MAP REVEALS ────────────────────────────────────────
    {
      category: 'map_event',
      weight: 1,
      slots: {
        reveal: ['the location of the boss', 'a hidden path', 'a treasure room', 'an enemy patrol route', 'a shortcut upward'],
        reveal_medium: ['a vision', 'a whisper', 'a burning map', 'a dream', 'a reflection'],
      },
      text: 'A {reveal_medium} reveals {reveal}.',
      choices: [
        { text: 'Mark it on your map', effect: 'reveal_map_node', weight: 1 },
        { text: 'Forget it', effect: 'nothing', weight: 1 },
      ],
    },
    // ── ENEMY TRICKS ───────────────────────────────────────
    {
      category: 'enemy_trick',
      weight: 2,
      slots: {
        trick: ['illusionary walls', 'a demon disguised as a friend', 'a floor that gives way', 'a poison gas trap', 'a false exit'],
        trick_mask: ['shimmers as you watch', 'smiles like kin', 'cracks underfoot', 'hisses sweet', 'glows welcoming'],
      },
      text: 'It\'s a trap! {trick} {trick_mask}!',
      choices: [
        { text: 'React quickly', effect: 'dodge_check', weight: 2 },
        { text: 'Use a wisdom verse', effect: 'wisdom_reveal', weight: 1 },
        { text: 'Take the hit', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    // ── FORSAKEN PLACES ────────────────────────────────────
    {
      category: 'forsaken',
      weight: 1,
      slots: {
        place: ['a church turned upside down', 'a cemetery where the dead walk', 'a library where books scream', 'a playground where shadows play', 'a nursery of forgotten prayers'],
        place_wrong: ['something is very wrong', 'the light bends away', 'the air tastes of ash', 'footsteps follow none', 'no echo answers'],
      },
      text: 'You enter {place}. {place_wrong} here.',
      choices: [
        { text: 'Pray for protection', effect: 'temporary_invincibility', weight: 1 },
        { text: 'Investigate', effect: 'random_encounter', weight: 1 },
        { text: 'Leave immediately', effect: 'nothing', weight: 1 },
      ],
    },
    // ── VISION EVENTS ──────────────────────────────────────
    {
      category: 'vision',
      weight: 2,
      slots: {
        vision: ['the end of the world', 'a city of gold descending', 'a great war in heaven', 'a lamb opening a scroll', 'the dead made alive'],
        vision_sense: ['you see the truth', 'you feel the weight', 'you hear the silence break', 'you know the name', 'you remember what was taken'],
      },
      text: 'A vision seizes you: {vision}. {vision_sense}.',
      choices: [
        { text: 'Accept the vision', effect: 'learn_verse', weight: 2 },
        { text: 'Resist it', effect: 'mental_resistance', weight: 1 },
        { text: 'Write it down', effect: 'permanent_knowledge', weight: 1 },
      ],
    },

    // ═════════════════════════════════════════════════════════
    // NEW CATEGORIES
    // ═════════════════════════════════════════════════════════

    // ── BOOK OF REVELATION ─────────────────────────────────
    {
      category: 'BOOK_OF_REVELATION',
      weight: 2,
      slots: {
        seal: ['the first seal', 'the fourth seal', 'the sixth seal', 'a seal of silence', 'the scroll\'s edge'],
        seal_sign: ['a pale horse rides', 'war breaks loose', 'famine follows', 'death is given power', 'the sky splits'],
      },
      text: 'A scroll trembles open: {seal} breaks and {seal_sign}.',
      choices: [
        { text: 'Witness the opening', effect: 'seal_opening', weight: 1 },
        { text: 'Seal it shut with prayer', effect: 'buff_wisdom', weight: 1 },
        { text: 'Flee the prophecy', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    {
      category: 'BOOK_OF_REVELATION',
      weight: 2,
      slots: {
        trumpet: ['the first trumpet', 'the third trumpet', 'the fifth trumpet', 'the seventh trumpet', 'a trumpet of woe'],
        trumpet_effect: ['hail and fire mingled with blood', 'a burning mountain casts into the sea', 'a star falls named Wormwood', 'locusts with crowns ascend', 'the kingdoms of the world fall'],
      },
      text: 'On high, {trumpet} sounds: {trumpet_effect}.',
      choices: [
        { text: 'Cover your ears and pray', effect: 'trumpet_sound', weight: 1 },
        { text: 'Sing against it', effect: 'buff_defense', weight: 1 },
        { text: 'Charge the sound', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'BOOK_OF_REVELATION',
      weight: 2,
      slots: {
        bowl: ['the first bowl', 'the third bowl', 'the fifth bowl', 'the seventh bowl', 'a bowl of scorching heat'],
        bowl_plague: ['sores on the unrighteous', 'the sea turns to blood', 'the sun scorches with fire', 'darkness on the throne', 'a great earthquake'],
      },
      text: 'An angel pours {bowl} upon the land: {bowl_plague}.',
      choices: [
        { text: 'Endure it in faith', effect: 'bowl_of_wrath', weight: 1 },
        { text: 'Turn the plague aside', effect: 'reveal_truth', weight: 1 },
        { text: 'Loot the chaos', effect: 'gold_or_hp_cost', weight: 1 },
      ],
    },
    {
      category: 'BOOK_OF_REVELATION',
      weight: 1,
      slots: {
        revelation: ['a new heaven and new earth', 'the river of life', 'the bride adorned', 'the throne of God', 'the books opened'],
        revelation_who: ['an elder shows you', 'the Lamb unveils', 'an angel swears', 'a voice like many waters', 'the Spirit reveals'],
      },
      text: '{revelation_who} a prophetic vision: {revelation}.',
      choices: [
        { text: 'Receive the vision', effect: 'prophetic_vision', weight: 1 },
        { text: 'Write it for others', effect: 'permanent_knowledge', weight: 1 },
      ],
    },

    // ── MIRACLE ────────────────────────────────────────────
    {
      category: 'MIRACLE',
      weight: 2,
      slots: {
        water_body: ['a storm-tossed sea', 'a rushing river', 'a lake of black water', 'a flooded corridor', 'a wine-dark deep'],
        water_walk: ['the waves grow still', 'a path of light appears', 'foam hardens underfoot', 'the current parts', 'ice forms from His word'],
      },
      text: 'Before {water_body}, you are called to walk — and {water_walk}.',
      choices: [
        { text: 'Step out in faith', effect: 'walk_water', weight: 1 },
        { text: 'Wait for a boat', effect: 'safe_discover', weight: 1 },
        { text: 'Fear and turn back', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'MIRACLE',
      weight: 2,
      slots: {
        vessel: ['six stone jars', 'a cracked pitcher', 'an empty chalice', 'a wineskin split', 'a bronze basin'],
        wine_sign: ['water becomes wine', 'the hosts overflow', 'the bitter turns sweet', 'draughts multiply', 'the cup never empties'],
      },
      text: 'At the feast, {vessel} stand empty — and {wine_sign}.',
      choices: [
        { text: 'Fill them with faith', effect: 'water_to_wine', weight: 1 },
        { text: 'Drink deeply', effect: 'heal_amount', weight: 1 },
        { text: 'Share with the weary', effect: 'heal_less_more_later', weight: 1 },
      ],
    },
    {
      category: 'MIRACLE',
      weight: 2,
      slots: {
        loaves: ['five loaves', 'seven loaves', 'a single crust', 'bread from ashes', 'manna on the floor'],
        crowd: ['a hungry multitude', 'the dying in the pit', 'captive souls', 'your own party', 'a legion of shadows'],
      },
      text: 'You hold {loaves} before {crowd} and are told to feed them.',
      choices: [
        { text: 'Break and bless', effect: 'multiply_loaves', weight: 1 },
        { text: 'Keep it for yourself', effect: 'gold_or_hp_cost', weight: 1 },
        { text: 'Give all away', effect: 'mercy_reward', weight: 1 },
      ],
    },
    {
      category: 'MIRACLE',
      weight: 2,
      slots: {
        sick_one: ['a leper at the gate', 'a blind beggar', 'a paralytic on a mat', 'a feverish child', 'a demon-tormented soul'],
        sick_plea: ['"Lord, if you will"', '"Have mercy on me"', '"My friends lowered me through the roof"', '"Touch me and I am clean"', '"Only say the word"'],
      },
      text: '{sick_one} reaches out: {sick_plea}.',
      choices: [
        { text: 'Lay hands and heal', effect: 'heal_sick', weight: 1 },
        { text: 'Pray from afar', effect: 'learn_verse', weight: 1 },
        { text: 'Pass by', effect: 'neutral', weight: 1 },
      ],
    },

    // ── TEMPTATION OF CHRIST ───────────────────────────────
    {
      category: 'TEMPTATION_OF_CHRIST',
      weight: 2,
      slots: {
        wilderness: ['forty days of sun', 'a desert of bones', 'a silent waste', 'a valley of stones', 'a place no bird crosses'],
        wilderness_need: ['you are starving', 'you are parched', 'you are alone', 'you are watched', 'you are weary to death'],
      },
      text: 'You are driven into {wilderness}, where {wilderness_need}.',
      choices: [
        { text: 'Fast and endure', effect: 'wilderness_40', weight: 1 },
        { text: 'Cry out for help', effect: 'heal_amount', weight: 1 },
        { text: 'Curse the waste', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'TEMPTATION_OF_CHRIST',
      weight: 2,
      slots: {
        stone: ['a stone like bread', 'a rock that gleams', 'a loaf of granite', 'a pebble that hungers', 'a boulder of crusts'],
        devil_word: ['"Command these to become bread"', '"You need not suffer"', '"Fill your belly, prophet"', '"Is fasting not pride?"', '"The Father would not wish this"'],
      },
      text: 'The devil points to {stone}: {devil_word}.',
      choices: [
        { text: 'Refuse — man shall not live by bread alone', effect: 'stones_to_bread', weight: 1 },
        { text: 'Strike the stone', effect: 'combat_start', weight: 1 },
        { text: 'Pray the verse', effect: 'buff_wisdom', weight: 1 },
      ],
    },
    {
      category: 'TEMPTATION_OF_CHRIST',
      weight: 2,
      slots: {
        kingdom: ['all the kingdoms of the world', 'a throne of iron', 'a city of gold', 'an empire of shadow', 'a crown that blots the sun'],
        kingdom_price: ['"if you will bow to me"', '"if you but kneel"', '"for a single word"', '"if you doubt the Father"', '"if you take my hand"'],
      },
      text: 'The devil shows you {kingdom} and says: {kingdom_price}.',
      choices: [
        { text: 'Worship the Lord your God only', effect: 'kingdoms_offer', weight: 1 },
        { text: 'Reject and cast him out', effect: 'damage_demon', weight: 1 },
        { text: 'Consider it', effect: 'gold_or_hp_cost', weight: 1 },
      ],
    },

    // ── PARABLES ───────────────────────────────────────────
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        sheep: ['one lost sheep', 'a lamb on the cliff', 'a stray in the thorns', 'a wanderer from the fold', 'a bleating soul'],
        sheep_finder: ['a shepherd leaves ninety-nine', 'a lamp is lit', 'the hills are searched', 'angels rejoice', 'the fold opens'],
      },
      text: 'A parable unfolds: {sheep_finder} for {sheep}.',
      choices: [
        { text: 'Join the search', effect: 'lost_sheep', weight: 1 },
        { text: 'Carry it home', effect: 'heal_amount', weight: 1 },
        { text: 'Let it stray', effect: 'neutral', weight: 1 },
      ],
    },
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        son: ['the younger son', 'the brother who left', 'a prodigal returned', 'the one who squandered', 'a child in rags'],
        son_welcome: ['the father runs to him', 'a robe is brought', 'a feast is killed', 'a ring is given', 'music rises'],
      },
      text: 'You see {son_welcome} for {son}.',
      choices: [
        { text: 'Celebrate his return', effect: 'prodigal', weight: 1 },
        { text: 'Give him your share', effect: 'mercy_reward', weight: 1 },
        { text: 'Judge him as the elder brother', effect: 'justice_reward', weight: 1 },
      ],
    },
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        seed: ['the seed on the path', 'the seed on rock', 'the seed among thorns', 'the seed in good soil', 'the mustard seed'],
        sower_act: ['a sower goes out', 'birds devour some', 'the sun scorches some', 'thorns choke some', 'it yields thirtyfold'],
      },
      text: '{sower_act} — and {seed} is sown.',
      choices: [
        { text: 'Be the good soil', effect: 'sower_seed', weight: 1 },
        { text: 'Pull the thorns', effect: 'reveal_hidden', weight: 1 },
        { text: 'Scatter widely', effect: 'random_positive', weight: 1 },
      ],
    },
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        victim: ['a man beaten by robbers', 'a traveler left for dead', 'a stranger in a ditch', 'a wounded pilgrim', 'one stripped and bleeding'],
        samaritan: ['a Samaritan passes', 'a priest crosses over', 'a Levite hurries by', 'a foreigner stops', 'an enemy shows mercy'],
      },
      text: 'By the road, {victim}; {samaritan}.',
      choices: [
        { text: 'Bind his wounds', effect: 'good_samaritan', weight: 1 },
        { text: 'Give your coin', effect: 'heal_less_more_later', weight: 1 },
        { text: 'Pass by', effect: 'neutral', weight: 1 },
      ],
    },
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        talent: ['five talents', 'two talents', 'one talent', 'a bag of coins', 'a hidden measure'],
        talent_master: ['a master going on a journey', 'a king who tests', 'an owner who trusts', 'a lord who returns', 'a steward who reckons'],
      },
      text: '{talent_master} gives you {talent} and says, "Trade with this."',
      choices: [
        { text: 'Invest and multiply', effect: 'talents', weight: 1 },
        { text: 'Bury it safe', effect: 'store_heal', weight: 1 },
        { text: 'Waste it in fear', effect: 'hp_cost_random', weight: 1 },
      ],
    },

    // ── OLD TESTAMENT ──────────────────────────────────────
    {
      category: 'OLD_TESTAMENT',
      weight: 2,
      slots: {
        sea: ['the Red Sea', 'the parted deep', 'a wall of water', 'the dried sea-bed', 'the crushed waves'],
        sea_act: ['Moses lifts his staff', 'a wind drives all night', 'the waters stand like walls', 'Israel walks through', 'the Egyptians follow'],
      },
      text: '{sea_act} at {sea}.',
      choices: [
        { text: 'Walk through the wall', effect: 'red_sea', weight: 1 },
        { text: 'Raise your staff too', effect: 'reveal_map', weight: 1 },
        { text: 'Wait on the shore', effect: 'safe_discover', weight: 1 },
      ],
    },
    {
      category: 'OLD_TESTAMENT',
      weight: 2,
      slots: {
        furnace: ['a fiery furnace', 'sevenfold flames', 'a burning pit', 'a kiln of Nebuchadnezzar', 'a blaze that eats stone'],
        furnace_men: ['three men are thrown in', 'a fourth walks among them', 'the bonds are loosed', 'not a hair is singed', 'the king trembles'],
      },
      text: '{furnace_men} into {furnace}.',
      choices: [
        { text: 'Step into the flame unbound', effect: 'fiery_furnace', weight: 1 },
        { text: 'Call the fourth figure', effect: 'buff_defense', weight: 1 },
        { text: 'Refuse and be thrown', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'OLD_TESTAMENT',
      weight: 2,
      slots: {
        den: ['a den of lions', 'a pit of starving cats', 'a cave of teeth', 'Darius\'s prison', 'a hungry dark'],
        den_man: ['Daniel is cast in', 'an angel shuts the mouths', 'the lions will not touch him', 'the accusers are thrown', 'the king believes'],
      },
      text: '{den_man} into {den}.',
      choices: [
        { text: 'Pray as the lions watch', effect: 'lions_den', weight: 1 },
        { text: 'Stand still and trust', effect: 'combat_bonus', weight: 1 },
        { text: 'Fight the beasts', effect: 'multi_combat', weight: 1 },
      ],
    },
    {
      category: 'OLD_TESTAMENT',
      weight: 1,
      slots: {
        flood: ['the great flood', 'rising waters', 'the window of heaven', 'the broken deep', 'forty days of rain'],
        flood_ark: ['an ark rides the wave', 'the dove finds no rest', 'the raven does not return', 'the mountain appears', 'the rainbow is set'],
      },
      text: '{flood_ark} as {flood} covers the world.',
      choices: [
        { text: 'Build and board', effect: 'great_flood', weight: 1 },
        { text: 'Send out the dove', effect: 'reveal_map', weight: 1 },
        { text: 'Swim the deluge', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'OLD_TESTAMENT',
      weight: 1,
      slots: {
        babel: ['the tower of Babel', 'a ziggurat of pride', 'a city of one tongue', 'a stair to heaven', 'a monument of confusion'],
        babel_act: ['they build to the sky', 'the Lord confounds speech', 'languages scatter', 'the work halts', 'the people are dispersed'],
      },
      text: '{babel_act} at {babel}.',
      choices: [
        { text: 'Speak the true tongue', effect: 'babel', weight: 1 },
        { text: 'Topple a stone', effect: 'reveal_secret', weight: 1 },
        { text: 'Join the builders', effect: 'gold_or_hp_cost', weight: 1 },
      ],
    },

    // ── ANGELIC ENCOUNTERS ─────────────────────────────────
    {
      category: 'ANGELIC_ENCOUNTERS',
      weight: 2,
      slots: {
        angel: ['a seraph with six wings', 'a guardian with a drawn sword', 'a messenger in white', 'a cherub of light', 'an angel of the Lord'],
        angel_task: ['blocks your path with flame', 'bears a sealed letter', 'heals a wound unseen', 'names you by your true name', 'points to a hidden door'],
      },
      text: '{angel} appears and {angel_task}.',
      choices: [
        { text: 'Fall to your knees', effect: 'angel_appears', weight: 1 },
        { text: 'Ask its errand', effect: 'angel_truth', weight: 1 },
        { text: 'Draw your weapon', effect: 'combat_start', weight: 1 },
      ],
    },
    {
      category: 'ANGELIC_ENCOUNTERS',
      weight: 1,
      slots: {
        fight: ['a demon of the pit', 'a prince of air', 'a legioned horror', 'the Stalker\'s scout', 'a beast with many heads'],
        angel_fight: ['an archangel descends', 'Michael unsheathes', 'a host surrounds', 'the angel stands between', 'light splits the dark'],
      },
      text: '{angel_fight} as {fight} charges you.',
      choices: [
        { text: 'Fight beside the angel', effect: 'angel_fights', weight: 1 },
        { text: 'Let the angel finish it', effect: 'combat_bonus', weight: 1 },
        { text: 'Flee the crossfire', effect: 'flee_or_damage', weight: 1 },
      ],
    },
    {
      category: 'ANGELIC_ENCOUNTERS',
      weight: 1,
      slots: {
        truth: ['why the dungeon exists', 'the name of the Stalker', 'the weakness of Lucifer', 'the fate of the fallen', 'the price of mercy'],
        truth_how: ['the angel whispers', 'a scroll unfurls in light', 'the angel touches your brow', 'a star spells it out', 'silence speaks it'],
      },
      text: 'The angel reveals {truth} — {truth_how}.',
      choices: [
        { text: 'Receive the truth', effect: 'angel_truth', weight: 1 },
        { text: 'Question it', effect: 'reveal_weakness', weight: 1 },
      ],
    },
    {
      category: 'ANGELIC_ENCOUNTERS',
      weight: 1,
      slots: {
        block: ['a blade of fire', 'a wall of wings', 'a sealed gate', 'a river of light', 'a standing rank of host'],
        block_reason: ['"You are not ready"', '"The way is guarded"', '"Pride bars this door"', '"Wait, little one"', '"Faith first"'],
      },
      text: 'The angel raises {block}: {block_reason}.',
      choices: [
        { text: 'Wait in obedience', effect: 'angel_blocks', weight: 1 },
        { text: 'Prove your faith', effect: 'buff_wisdom', weight: 1 },
        { text: 'Force past', effect: 'hp_cost_random', weight: 1 },
      ],
    },

    // ── DEMON NATURE ───────────────────────────────────────
    {
      category: 'DEMON_NATURE',
      weight: 2,
      slots: {
        trueform: ['a writhing mass of eyes', 'a serpent of ash', 'a giant of smoke', 'a chorus of faces', 'a thing without shape'],
        trueform_act: ['it tears off its disguise', 'the mask melts', 'the lie burns away', 'its true name screams', 'the veil drops'],
      },
      text: 'The demon sheds its guise: {trueform_act} into {trueform}.',
      choices: [
        { text: 'Name it by its true name', effect: 'true_form', weight: 1 },
        { text: 'Strike the weakness', effect: 'damage_demon', weight: 1 },
        { text: 'Shield your eyes', effect: 'buff_defense', weight: 1 },
      ],
    },
    {
      category: 'DEMON_NATURE',
      weight: 1,
      slots: {
        history: ['how the dungeon was built', 'who first opened the pit', 'why the souls are trapped', 'the Stalker\'s origin', 'Lucifer\'s prison design'],
        history_tell: ['the demon laughs as it speaks', 'it weeps old memory', 'it carves it in frost', 'it shows you in dream', 'it trades the tale for silence'],
      },
      text: 'The demon reveals {history} — {history_tell}.',
      choices: [
        { text: 'Listen and remember', effect: 'demon_history', weight: 1 },
        { text: 'Trade a secret back', effect: 'reverseDeal', weight: 1 },
        { text: 'Reject the lie', effect: 'reveal_truth', weight: 1 },
      ],
    },
    {
      category: 'DEMON_NATURE',
      weight: 2,
      slots: {
        beg: ['a thrall of the pit', 'a duke brought low', 'a whispering wretch', 'a once-bright fallen', 'a thing that was a man'],
        beg_plea: ['"End me, pilgrim"', '"I cannot bear the dark"', '"Kill me, I beg"', '"Let me sleep"', '"Free me from this form"'],
      },
      text: '{beg} grovels: {beg_plea}.',
      choices: [
        { text: 'Grant its release', effect: 'begs_death', weight: 1 },
        { text: 'Bind it to your service', effect: 'combat_bonus', weight: 1 },
        { text: 'Leave it to suffer', effect: 'neutral', weight: 1 },
      ],
    },

    // ── COMBAT VARIANTS ────────────────────────────────────
    {
      category: 'COMBAT_VARIANTS',
      weight: 2,
      slots: {
        foe: ['a chained brute', 'a pit champion', 'a warden of the floor', 'a screaming host', 'a beast of the deep'],
        force_why: ['it blocks the only door', 'it answers your every step', 'the floor demands a duel', 'it will not let you pass', 'the Stalker sent it'],
      },
      text: '{foe} steps in — {force_why}.',
      choices: [
        { text: 'Fight, no choice', effect: 'forced_combat', weight: 1 },
        { text: 'Try to talk', effect: 'demon_talk', weight: 1 },
        { text: 'Look for a way around', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    {
      category: 'COMBAT_VARIANTS',
      weight: 2,
      slots: {
        condition: ['no fire may touch it', 'only wisdom can wound', 'you are timed', 'mercy alone ends it', 'silence must be kept'],
        condition_foe: ['a shade of glass', 'a judge of lies', 'a ticking horror', 'a weeping ghost', 'a mute specter'],
      },
      text: 'The foe is {condition_foe} — and {condition}.',
      choices: [
        { text: 'Fight under the condition', effect: 'combat_condition', weight: 1 },
        { text: 'Refuse the terms', effect: 'combat_start', weight: 1 },
        { text: 'Study the condition', effect: 'reveal_weakness', weight: 1 },
      ],
    },
    {
      category: 'COMBAT_VARIANTS',
      weight: 2,
      slots: {
        reward: ['a relic if you win', 'a verse if you survive', 'gold for the kill', 'freedom for the captive', 'a blade for the bold'],
        reward_foe: ['a cowardly duelist', 'a gambling demon', 'a bound titan', 'a boastful knight', 'a doomed champion'],
      },
      text: '{reward_foe} offers {reward}.',
      choices: [
        { text: 'Fight for the reward', effect: 'combat_reward', weight: 1 },
        { text: 'Take the reward without fighting', effect: 'gold_or_hp_cost', weight: 1 },
        { text: 'Walk away', effect: 'neutral', weight: 1 },
      ],
    },

    // ── GEOGRAPHIC ─────────────────────────────────────────
    {
      category: 'GEOGRAPHIC',
      weight: 2,
      slots: {
        river: ['a black river', 'a river of memory', 'a tide of the dead', 'a silver current', 'a flood of forgetfulness'],
        river_cross: ['a bridge of bone', 'a ferry with no master', 'stones that rise', 'a ford of fire', 'a path that sinks'],
      },
      text: 'You reach {river} crossed only by {river_cross}.',
      choices: [
        { text: 'Cross carefully', effect: 'river_cross', weight: 1 },
        { text: 'Wade through', effect: 'hp_cost_random', weight: 1 },
        { text: 'Seek another bank', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    {
      category: 'GEOGRAPHIC',
      weight: 2,
      slots: {
        mountain: ['a spike of cold stone', 'a stair cut in cliff', 'a peak of bone', 'a climb of ash', 'a ridge of glass'],
        mountain_toll: ['the air thins', 'the wind cuts', 'the path crumbles', 'cold bites', 'something follows'],
      },
      text: 'You begin {mountain}; {mountain_toll}.',
      choices: [
        { text: 'Climb on', effect: 'mountain_climb', weight: 1 },
        { text: 'Rest and pray', effect: 'heal_amount', weight: 1 },
        { text: 'Turn back', effect: 'avoid_nemesis', weight: 1 },
      ],
    },
    {
      category: 'GEOGRAPHIC',
      weight: 1,
      slots: {
        desert: ['a waste of salt', 'a dune of skulls', 'a plain of dust', 'a barren red flat', 'a horizon of nothing'],
        desert_danger: ['the sun blinds', 'thirst claws', 'mirrages lie', 'the sand drinks sound', 'bones shift underfoot'],
      },
      text: 'You cross {desert} where {desert_danger}.',
      choices: [
        { text: 'Press on', effect: 'desert_waste', weight: 1 },
        { text: 'Conserve what you have', effect: 'store_heal', weight: 1 },
        { text: 'Pray for water', effect: 'heal_amount', weight: 1 },
      ],
    },
    {
      category: 'GEOGRAPHIC',
      weight: 1,
      slots: {
        lake: ['a frozen lake', 'a sheet of black ice', 'a glass plain', 'a rink of the dead', 'a mirror of frost'],
        lake_hazard: ['it cracks', 'voices sing below', 'shadow moves under', 'it reflects a lie', 'it burns cold'],
      },
      text: 'You stand on {lake}; {lake_hazard}.',
      choices: [
        { text: 'Skate across', effect: 'frozen_lake', weight: 1 },
        { text: 'Break the ice to see', effect: 'learn_verse_or_trap', weight: 1 },
        { text: 'Go around', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    {
      category: 'GEOGRAPHIC',
      weight: 1,
      slots: {
        vent: ['a volcanic vent', 'a pit of molten rock', 'a geyser of flame', 'a crack that breathes fire', 'a river of lava'],
        vent_use: ['it lights the dark', 'it forges or burns', 'it guards a door', 'it powers a trap', 'it sings in heat'],
      },
      text: 'You reach {vent}; {vent_use}.',
      choices: [
        { text: 'Use the heat', effect: 'volcanic_vent', weight: 1 },
        { text: 'Cool it with a verse', effect: 'fiery_furnace', weight: 1 },
        { text: 'Avoid the glow', effect: 'avoid_nemesis', weight: 1 },
      ],
    },

    // ── TEMPORAL ───────────────────────────────────────────
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        loop: ['the last minute repeats', 'the room resets', 'the fight begins again', 'the door re-locks', 'the words return'],
        loop_cause: ['a clock of glass', 'a demon\'s curse', 'a broken hour', 'a weeping saint', 'the dungeon\'s breath'],
      },
      text: 'A {loop_cause} traps you — {loop}.',
      choices: [
        { text: 'Break the loop with a verse', effect: 'time_loop', weight: 1 },
        { text: 'Endure it', effect: 'buff_wisdom', weight: 1 },
        { text: 'Run the loop', effect: 'random_positive', weight: 1 },
      ],
    },
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        freeze: ['the world holds still', 'a breath hangs', 'the Stalker freezes', 'a blade stops', 'time knots'],
        freeze_why: ['an angel stays it', 'a verse catches it', 'the dungeon sleeps', 'a relic hums', 'your prayer holds'],
      },
      text: '{freeze_why}: {freeze}.',
      choices: [
        { text: 'Act in the stillness', effect: 'time_freeze', weight: 1 },
        { text: 'Pray through it', effect: 'buff_defense', weight: 1 },
        { text: 'Watch and wait', effect: 'reveal_map', weight: 1 },
      ],
    },
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        past: ['the dungeon as it was built', 'a monk who first fell', 'Lucifer\'s first prison', 'a village above', 'the first seal'],
        past_sense: ['you stand unseen', 'you hear their prayers', 'you feel their dread', 'you know their names', 'you taste their fear'],
      },
      text: 'A vision pulls you to {past} — {past_sense}.',
      choices: [
        { text: 'Learn from the past', effect: 'past_vision', weight: 1 },
        { text: 'Change nothing', effect: 'permanent_knowledge', weight: 1 },
      ],
    },
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        future: ['your own death', 'the floor\'s end', 'Lucifer\'s throne', 'a friend\'s fall', 'the breaking of the seal'],
        future_how: ['a mirror shows', 'a star writes', 'a voice warns', 'the lamb unveils', 'the scroll turns'],
      },
      text: '{future_how} a future vision: {future}.',
      choices: [
        { text: 'Prepare for it', effect: 'future_vision', weight: 1 },
        { text: 'Deny it', effect: 'courage_check', weight: 1 },
      ],
    },
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        dejavu: ['you have stood here', 'you have heard this', 'you have spoken this', 'you have died this', 'you have seen this face'],
        dejavu_source: ['a ripple in time', 'a demon\'s echo', 'an angel\'s mark', 'a wound that repeats', 'a song returning'],
      },
      text: 'A {dejavu_source} — {dejavu}.',
      choices: [
        { text: 'Trust the feeling', effect: 'deja_vu', weight: 1 },
        { text: 'Ignore it', effect: 'random_positive', weight: 1 },
        { text: 'Map the pattern', effect: 'reveal_map', weight: 1 },
      ],
    },

    // ── MORAL AMBIGUOUS ────────────────────────────────────
    {
      category: 'MORAL_AMBIGUOUS',
      weight: 2,
      slots: {
        no_right: ['a child who is also a trap', 'a friend who is a demon', 'a mercy that kills', 'a truth that destroys', 'a rescue that dooms'],
        no_right_stakes: ['both paths bleed', 'no clean end', 'the cost is paid either way', 'innocence is already lost', 'the dungeon watches'],
      },
      text: 'You face {no_right_stakes}: {no_right}.',
      choices: [
        { text: 'Choose the lesser wound', effect: 'no_right', weight: 1 },
        { text: 'Refuse to choose', effect: 'neutral', weight: 1 },
        { text: 'Pray for a third way', effect: 'third_option', weight: 1 },
      ],
    },
    {
      category: 'MORAL_AMBIGUOUS',
      weight: 2,
      slots: {
        both_cost: ['gold and a life', 'a verse and blood', 'time and mercy', 'pride and peace', 'a soul and safety'],
        both_cost_scene: ['the scale tips', 'the price is shown', 'the debt is called', 'the bargain bites', 'the ledger opens'],
      },
      text: '{both_cost_scene}: every answer costs {both_cost}.',
      choices: [
        { text: 'Pay in gold', effect: 'both_cost', weight: 1 },
        { text: 'Pay in blood', effect: 'hp_cost_random', weight: 1 },
        { text: 'Pay in both', effect: 'sacrifice_power', weight: 1 },
      ],
    },
    {
      category: 'MORAL_AMBIGUOUS',
      weight: 2,
      slots: {
        third: ['a hidden passage', 'a silent prayer', 'a surrendered weapon', 'a spoken name', 'a broken seal'],
        third_scene: ['no one expected', 'the dungeon hid', 'the demon missed', 'the angel left', 'you never tried'],
      },
      text: 'The choice seems forced — but {third_scene} a {third}.',
      choices: [
        { text: 'Take the hidden way', effect: 'third_option', weight: 1 },
        { text: 'Pick the obvious lesser', effect: 'no_right', weight: 1 },
        { text: 'Walk away', effect: 'neutral', weight: 1 },
      ],
    },

    // ── HIDDEN ROOM ────────────────────────────────────────
    {
      category: 'HIDDEN_ROOM',
      weight: 1,
      slots: {
        room: ['a vault behind the altar', 'a crawlspace in the wall', 'a room under the floor', 'a pocket behind the veil', 'a cell no key fits'],
        room_reward: ['a cache of verses', 'forgotten gold', 'a sleeping relic', 'a bound ally', 'a map of the deep'],
      },
      text: 'You find {room} — inside, {room_reward}.',
      choices: [
        { text: 'Claim the prize', effect: 'secret_reward', weight: 1 },
        { text: 'Bless the place', effect: 'permanent_knowledge', weight: 1 },
        { text: 'Leave it sealed', effect: 'nothing', weight: 1 },
      ],
    },

    // ── TRADER DEMONS ──────────────────────────────────────
    {
      category: 'TRADER_DEMONS',
      weight: 2,
      slots: {
        trader: ['a merchant with too many eyes', 'a hag of the market', 'a duke in finery', 'a peddler of souls', 'a smith of the pit'],
        trader_goods: ['a verse for a memory', 'gold for a year', 'a blade for a name', 'sight for a sin', 'power for a prayer'],
      },
      text: '{trader} unfurls its wares: {trader_goods}.',
      choices: [
        { text: 'Trade fairly', effect: 'demon_trade', weight: 1 },
        { text: 'Haggle hard', effect: 'reverseDeal', weight: 1 },
        { text: 'Rob the stall', effect: 'combat_start', weight: 1 },
      ],
    },
    {
      category: 'TRADER_DEMONS',
      weight: 1,
      slots: {
        goods: ['a jar of stolen light', 'a clock that runs backward', 'a feather of a fallen', 'a vial of silence', 'a coin that lies'],
        goods_cost: ['your reflection', 'a day of life', 'a forgotten name', 'a drop of grace', 'a verse you know'],
      },
      text: 'Unusual goods: {goods}, priced in {goods_cost}.',
      choices: [
        { text: 'Buy the curiosity', effect: 'unusual_goods', weight: 1 },
        { text: 'Refuse the price', effect: 'nothing', weight: 1 },
        { text: 'Counter with Scripture', effect: 'damage_demon', weight: 1 },
      ],
    },

    // ── GAMBLING ───────────────────────────────────────────
    {
      category: 'GAMBLING',
      weight: 1,
      slots: {
        bet: ['your gold on the throw', 'your life on the card', 'a soul on the wheel', 'your verse on the flip', 'the floor on the dice'],
        bet_demon: ['a grinning gamester', 'a duke of chance', 'a shade with loaded bones', 'a liar in silk', 'the Stalker\'s bookie'],
      },
      text: '{bet_demon} invites you to wager {bet}.',
      choices: [
        { text: 'Place the bet', effect: 'bet_gold', weight: 1 },
        { text: 'Cheat with a verse', effect: 'reveal_truth', weight: 1 },
        { text: 'Walk from the table', effect: 'neutral', weight: 1 },
      ],
    },
    {
      category: 'GAMBLING',
      weight: 1,
      slots: {
        dice: ['bones that whisper', 'dice of frozen tears', 'a wheel of eyes', 'cards of the damned', 'a coin of two faces'],
        dice_stakes: ['double or nothing', 'a life for a life', 'gold for gold', 'a verse for freedom', 'pride for power'],
      },
      text: 'A game of {dice} with stakes: {dice_stakes}.',
      choices: [
        { text: 'Roll the bones', effect: 'dice_demon', weight: 1 },
        { text: 'Let fate decide', effect: 'random_positive', weight: 1 },
        { text: 'Refuse the game', effect: 'nothing', weight: 1 },
      ],
    },

    // ── RIDDLE ─────────────────────────────────────────────
    {
      category: 'RIDDLE',
      weight: 2,
      slots: {
        riddle: ['what walks on four, then two, then three', 'what has a voice but no mouth', 'what dies the moment it speaks', 'what the lion and lamb share', 'what seals cannot hold'],
        riddle_keeper: ['a sphinx of ash', 'a monk of puzzles', 'a demon of wit', 'a child of riddles', 'the gate itself'],
      },
      text: '{riddle_keeper} poses: "{riddle}?"',
      choices: [
        { text: 'Answer with a verse', effect: 'answer_riddle', weight: 1 },
        { text: 'Guess aloud', effect: 'dodge_check', weight: 1 },
        { text: 'Admit you know not', effect: 'buff_wisdom', weight: 1 },
      ],
    },

    // ── CHORUS OF HELL ─────────────────────────────────────
    {
      category: 'CHORUS_OF_HELL',
      weight: 2,
      slots: {
        hellsong: ['a hymn of hate', 'a liturgy of lies', 'a chant of the pit', 'a song that bends will', 'a chorus of the damned'],
        hellsong_effect: ['it pulls your feet', 'it clouds your prayer', 'it lifts the dark', 'it steals your name', 'it opens a wound'],
      },
      text: 'Demons sing {hellsong} — {hellsong_effect}.',
      choices: [
        { text: 'Counter with praise', effect: 'counter_praise', weight: 1 },
        { text: 'Join the chorus', effect: 'join_chorus', weight: 1 },
        { text: 'Silence them by force', effect: 'combat_start', weight: 1 },
      ],
    },

    // ── SACRIFICIAL ALTAR ──────────────────────────────────
    {
      category: 'SACRIFICIAL_ALTAR',
      weight: 1,
      slots: {
        altar_offer: ['your strength', 'a memory of home', 'a bond of friendship', 'your sight for a day', 'a verse from your heart'],
        altar_payoff: ['a door opens', 'a foe falls', 'sight beyond', 'a shield of bone', 'the Stalker\'s trail'],
      },
      text: 'The altar asks {altar_offer}; in return, {altar_payoff}.',
      choices: [
        { text: 'Sacrifice what is asked', effect: 'choose_sacrifice', weight: 1 },
        { text: 'Offer gold instead', effect: 'alternative_sacrifice', weight: 1 },
        { text: 'Spurn the altar', effect: 'nothing', weight: 1 },
      ],
    },

    // ── LOST SOULS ─────────────────────────────────────────
    {
      category: 'LOST_SOULS',
      weight: 2,
      slots: {
        soul: ['a child in the dark', 'a monk who doubted', 'a mother searching', 'a soldier unshriven', 'a saint gone dim'],
        soul_bond: ['a chain of ash', 'a cage of glass', 'a thread of smoke', 'a circle of salt', 'a name scratched out'],
      },
      text: 'A {soul} is bound by {soul_bond}.',
      choices: [
        { text: 'Free the soul', effect: 'free_soul', weight: 1 },
        { text: 'Free it at a cost', effect: 'gold_or_hp_cost', weight: 1 },
        { text: 'Leave it bound', effect: 'leave_soul', weight: 1 },
      ],
    },
    {
      category: 'LOST_SOULS',
      weight: 1,
      slots: {
        soul_many: ['a choir of the trapped', 'a host of the forgotten', 'a line of the waiting', 'a crowd of the silenced', 'a flock of the lost'],
        soul_many_place: ['behind a weeping door', 'in a well of names', 'under a cracked bell', 'within a book of faces', 'at the foot of a cross'],
      },
      text: '{soul_many} wait {soul_many_place}.',
      choices: [
        { text: 'Release them all', effect: 'free_soul', weight: 1 },
        { text: 'Free one, bless the rest', effect: 'mercy_reward', weight: 1 },
        { text: 'Pass by', effect: 'leave_soul', weight: 1 },
      ],
    },

    // ── CURSED ITEM ────────────────────────────────────────
    {
      category: 'CURSED_ITEM',
      weight: 2,
      slots: {
        cursed: ['a ring that drinks light', 'a blade that thirsts', 'a book that forgets', 'a cloak of whispers', 'a gem that weeps blood'],
        curse_trade: ['power for a price', 'sight for a soul', 'strength for a year', 'speed for a name', 'luck for a prayer'],
      },
      text: 'You find {cursed}. It offers {curse_trade}.',
      choices: [
        { text: 'Take it up', effect: 'take_cursed', weight: 1 },
        { text: 'Refuse and bless it', effect: 'refuse_cursed', weight: 1 },
        { text: 'Smash it', effect: 'reveal_truth', weight: 1 },
      ],
    },

    // ── LEGENDARY WEAPONS ──────────────────────────────────
    {
      category: 'LEGENDARY_WEAPONS',
      weight: 1,
      slots: {
        weapon: ['the Sword of the Spirit', 'a spear of living flame', 'a shield of faith', 'a bow of answered prayer', 'a mace of the archangel'],
        weapon_term: ['for this floor only', 'until you fall', 'for three battles', 'until the dawn breaks', 'for one desperate hour'],
      },
      text: 'You are offered {weapon}, {weapon_term}.',
      choices: [
        { text: 'Wield it', effect: 'temp_weapon', weight: 1 },
        { text: 'Bless it and store it', effect: 'store_heal', weight: 1 },
        { text: 'Decline the gift', effect: 'nothing', weight: 1 },
      ],
    },

    // ── SCRIPTURE WALK ─────────────────────────────────────
    {
      category: 'SCRIPTURE_WALK',
      weight: 2,
      slots: {
        verse: ['"I am the way"', '"Though I walk through the valley"', '"The Lord is my light"', '"Greater is He in you"', '"Fear not, for I am with you"'],
        path: ['a road that answers', 'a stair that listens', 'a bridge of words', 'a gate of truth', 'a floor of verses'],
      },
      text: '{path} responds only to {verse}.',
      choices: [
        { text: 'Speak the verse', effect: 'verse_path', weight: 1 },
        { text: 'Speak a wrong verse', effect: 'wrong_verse', weight: 1 },
        { text: 'Walk in silence', effect: 'reveal_hidden', weight: 1 },
      ],
    },

    // ── DARK COMMUNION ─────────────────────────────────────
    {
      category: 'DARK_COMMUNION',
      weight: 1,
      slots: {
        ritual: ['a communion of ash', 'a mass of the pit', 'a rite of the reversed cross', 'a feast of the fallen', 'a baptism in black'],
        ritual_grant: ['strength beyond', 'sight of the deep', 'a voice that commands', 'a shield of hate', 'the Stalker\'s favor'],
      },
      text: 'A {ritual} offers {ritual_grant}.',
      choices: [
        { text: 'Partake for power', effect: 'dark_ritual', weight: 1 },
        { text: 'Refuse and pray', effect: 'refuse_ritual', weight: 1 },
        { text: 'Break the rite', effect: 'damage_demon', weight: 1 },
      ],
    },

    // ── PILGRIMAGE ─────────────────────────────────────────
    {
      category: 'PILGRIMAGE',
      weight: 1,
      slots: {
        pilgrim: ['seven stations of the fell', 'a walk to the sealed gate', 'a climb to the crying cross', 'a path of the fourteen wounds', 'a road to the light below'],
        pilgrim_step: ['each step costs', 'each station teaches', 'each door tests', 'each wound heals', 'each turn reveals'],
      },
      text: 'A {pilgrim} — {pilgrim_step}.',
      choices: [
        { text: 'Make the pilgrimage', effect: 'pilgrim_steps', weight: 1 },
        { text: 'Abandon it at the third station', effect: 'abandon_pilgrim', weight: 1 },
        { text: 'Pray at each station', effect: 'permanent_knowledge', weight: 1 },
      ],
    },

    // ── WITNESS ────────────────────────────────────────────
    {
      category: 'WITNESS',
      weight: 2,
      slots: {
        argument: ['"If God is good, why this pit?"', '"Your faith is a crutch"', '"The cross failed"', '"Why are you spared?"', '"Prove He hears you"'],
        witness: ['a demon of law', 'a fallen apologist', 'the Stalker\'s tongue', 'a shade of a heretic', 'a liar in priest\'s robes'],
      },
      text: '{witness} tests you: {argument}',
      choices: [
        { text: 'Answer with Scripture', effect: 'faith_argued', weight: 1 },
        { text: 'Doubt, if only a moment', effect: 'doubt_sown', weight: 1 },
        { text: 'Silence the argument', effect: 'damage_demon', weight: 1 },
      ],
    },

    // ── MARTYRDOM ──────────────────────────────────────────
    {
      category: 'MARTYRDOM',
      weight: 1,
      slots: {
        martyr: ['a captive host about to die', 'a sealed gate that needs a life', 'a plague only blood can stop', 'the Stalker\'s chain that needs a key of flesh', 'a light that dies without a flame'],
        martyr_reward: ['all souls freed', 'the floor undone', 'the pit weakened', 'the Stalker wounded', 'the seal opened'],
      },
      text: '{martyr_reward} — but only if {martyr}.',
      choices: [
        { text: 'Give yourself', effect: 'martyr_self', weight: 1 },
        { text: 'Seek another way', effect: 'third_option', weight: 1 },
        { text: 'Let it pass', effect: 'neutral', weight: 1 },
      ],
    },
  ],

  // ── EFFECT RESOLUTION ─────────────────────────────────────
  resolveEffect(effect, game) {
    const ctx = {
      hp: game.hp,
      maxHp: game.maxHp,
      gold: game.gold,
      floor: game.floor,
      knownVerses: KnowledgeSystem.getAvailableVerses(),
    };

    switch (effect) {
      case 'random_positive': {
        const roll = RNG.random();
        if (roll < 0.3) return { heal: 15, text: 'They heal your wounds. +15 HP.' };
        if (roll < 0.6) return { learnVerse: true, text: 'They teach you a verse.' };
        return { gold: 20, text: 'They share their gold. +20 gold.' };
      }
      case 'nothing': return { text: 'Nothing happens. You move on.' };
      case 'reveal_weakness': return { revealWeakness: true, text: 'They share knowledge of demon weaknesses.' };
      case 'skill_check': {
        if (RNG.random() < 0.6) return { text: 'You navigate the trap safely!' };
        return { hpCost: Math.floor(game.maxHp * 0.1), text: 'You get caught! -10% HP.' };
      }
      case 'hp_cost_random': return { hpCost: RNG.randint(5, 15), text: `You take ${RNG.randint(5,15)} damage.` };
      case 'reveal_hidden': return { revealSecret: true, text: 'You discover a hidden passage.' };
      case 'buff_wisdom': return { buff: 'wisdom', text: 'Your wisdom grows. Next verse does +50% damage.' };
      case 'buff_defense': return { buff: 'defense', text: 'Your faith hardens you. +2 defense.' };
      case 'buff_attack': return { buff: 'attack', text: 'Conviction fills you. +3 attack.' };
      case 'combat_bonus': return { combatBonus: 10, text: 'The moment favors you. +10 combat advantage.' };
      case 'gold_or_hp_cost': {
        if (RNG.random() < 0.5) return { gold: 30, text: 'You gain 30 gold! But something feels wrong...' };
        return { hpCost: 15, text: 'The temptation drains your life force. -15 HP.' };
      }
      case 'reveal_truth': return { revealAll: true, text: 'The truth is revealed! All weaknesses exposed.' };
      case 'reveal_secret': return { revealSecret: true, text: 'A secret of the floor is laid bare.' };
      case 'learn_verse_or_trap': {
        if (RNG.random() < 0.4) return { learnVerse: true, text: 'You learn a new verse!' };
        return { hpCost: 10, text: 'It was a trap! -10 HP.' };
      }
      case 'safe_discover': return { learnVerse: true, gold: 15, text: 'Prayer protects you. You find a verse and 15 gold.' };
      case 'mercy_reward': return { heal: 20, learnVerse: true, text: 'Mercy rewarded. +20 HP and a new verse.' };
      case 'justice_reward': return { gold: 25, text: 'Justice served. +25 gold.' };
      case 'neutral': return { text: 'You walk away. Sometimes the best choice is no choice.' };
      case 'psalm_path': case 'john_path': case 'ephesians_path': {
        if (RNG.random() < 0.5) return { learnVerse: true, text: 'The path opens! You learn a verse.' };
        return { hpCost: 8, text: 'The verse echoes but the path remains. -8 HP.' };
      }
      case 'random_item': {
        if (RNG.random() < 0.3) return { learnVerse: true, text: 'It contains a hidden verse!' };
        return { gold: 15 + game.floor * 5, text: `You find ${15 + game.floor * 5} gold.` };
      }
      case 'safe_item': return { learnVerse: true, text: 'Prayer purifies the item. You learn a verse.' };
      case 'damage_demon': return { combatBonus: 10, text: 'Your Scripture weakens the demon. +10 combat advantage.' };
      case 'gain_knowledge_lose_hp': return { learnVerse: true, hpCost: 10, text: 'Dark knowledge. +1 verse, -10 HP.' };
      case 'combat_start': return { startCombat: true, text: 'Combat begins!' };
      case 'heal_or_verse': {
        if (RNG.random() < 0.4) return { learnVerse: true, text: 'The shrine teaches you a verse!' };
        return { heal: 25, text: 'The shrine heals you. +25 HP.' };
      }
      case 'buff_for_gold': {
        if (game.gold >= 20) return { gold: -20, buff: 'attack', text: 'Offering accepted. +3 attack.' };
        return { text: 'Not enough gold for the offering.' };
      }
      case 'reveal_map': return { revealMap: true, text: 'The path ahead is revealed.' };
      case 'learn_verse': return { learnVerse: true, text: 'You learn a new verse!' };
      case 'partial_verse': return { scrollFragment: true, text: 'You find a scroll fragment. Collect more to unlock the verse.' };
      case 'fire_damage_or_wisdom': {
        if (RNG.random() < 0.5) return { buff: 'fire', text: 'The fire teaches you. Fire verses +50%.' };
        return { hpCost: 10, text: 'The scroll burns you! -10 HP.' };
      }
      case 'verse_defense_check': {
        if (ctx.knownVerses.length >= 3) return { shield: 15, text: 'Your verses protect you! +15 shield.' };
        return { hpCost: 12, text: 'Not enough verses known. -12 HP.' };
      }
      case 'speed_check': return { hpCost: RNG.randint(5, 12), text: `You run! Took ${RNG.randint(5,12)} damage escaping.` };
      case 'courage_check': return { buff: 'defense', text: 'Your courage inspires you. +2 defense.' };
      case 'multi_combat': return { startCombat: true, multiEnemy: true, text: 'Multiple demons attack!' };
      case 'aoe_or_damage': {
        if (ctx.knownVerses.length >= 5) return { heal: 10, text: 'Your area verse clears the room! +10 HP.' };
        return { hpCost: 8, text: 'Not enough verses for area attack. Took 8 damage.' };
      }
      case 'flee_or_damage': {
        if (RNG.random() < 0.4) return { text: 'You escape! Lucky!' };
        return { hpCost: 10, text: 'Escaping costs you. -10 HP.' };
      }
      case 'heal_amount': return { heal: 15 + game.floor * 3, text: `Restoration! +${15 + game.floor * 3} HP.` };
      case 'store_heal': return { storeHeal: 10, text: 'You store healing energy for later. (+10 stored)' };
      case 'heal_less_more_later': return { heal: 10, bonusLater: true, text: 'Sharing heals you now (+10) and will reward you later.' };
      case 'full_heal_small': return { heal: game.maxHp, text: 'The hymn fills you with peace. Full heal!' };
      case 'reveal_floor_secret': return { revealSecret: true, text: 'You sense a secret on this floor.' };
      case 'find_choir': return { heal: 20, learnVerse: true, text: 'The choir teaches you a verse and heals you.' };
      case 'deal_with_demon': return { gold: 30, hpCost: 15, text: 'The deal is struck. +30 gold, -15 HP.' };
      case 'reverseDeal': return { gold: 40, text: 'You turn the demon\'s deal against it! +40 gold.' };
      case 'sacrifice_power': return { hpCost: 20, buff: 'attack', sacrificePower: true, text: 'Sacrifice accepted! -20 HP, but +5 attack permanently.' };
      case 'alternative_sacrifice': return { gold: -15, buff: 'defense', text: 'You offer gold instead. +2 defense.' };
      case 'reveal_map_node': return { revealMap: true, text: 'The map reveals hidden nodes.' };
      case 'dodge_check': {
        if (RNG.random() < 0.5) return { text: 'You dodge the trap!' };
        return { hpCost: 10, text: 'You fall for the trap! -10 HP.' };
      }
      case 'wisdom_reveal': return { revealWeakness: true, text: 'Wisdom reveals the truth behind the trick.' };
      case 'temporary_invincibility': return { invincible: 2, text: 'Divine protection! Invincible for 2 rooms.' };
      case 'random_encounter': return { startCombat: true, text: 'Something stirs in the darkness...' };
      case 'mental_resistance': return { buff: 'defense', text: 'You resist the vision. Your mind hardens.' };
      case 'permanent_knowledge': return { permanentKnowledge: true, text: 'You will never forget this.' };
      case 'buff_for_nemesis': return { buff: 'attack', text: 'You steel yourself for the Stalker. +3 attack.' };
      case 'trap_for_nemesis': return { revealSecret: true, text: 'You set a snare for the Stalker.' };
      case 'avoid_nemesis': return { text: 'You slip away before the Stalker arrives.' };
      case 'demon_talk': return { text: 'The demon listens, for a moment.' };

      // ── NEW EFFECT HANDLERS ──────────────────────────────
      case 'seal_opening': return { learnVerse: true, revealSecret: true, text: 'A seal breaks open — you learn a verse and sense a secret.' };
      case 'trumpet_sound': {
        if (RNG.random() < 0.5) return { buff: 'defense', hpCost: 8, text: 'The trumpet shakes you. -8 HP, but your faith holds (+2 defense).' };
        return { hpCost: 12, text: 'The blast deafens and wounds you. -12 HP.' };
      }
      case 'bowl_of_wrath': {
        if (RNG.random() < 0.4) return { gold: 40, text: 'Amid the plague you loot 40 gold!' };
        return { hpCost: 18, text: 'The bowl\'s plague scorches you. -18 HP.' };
      }
      case 'prophetic_vision': return { permanentKnowledge: true, learnVerse: true, text: 'You receive a revelation: a verse and lasting knowledge.' };
      case 'walk_water': return { revealMap: true, shield: 10, text: 'You walk the water unharmed. +10 shield, path revealed.' };
      case 'water_to_wine': return { heal: 20, gold: 15, text: 'The miracle refreshes you. +20 HP, +15 gold from the feast.' };
      case 'multiply_loaves': return { heal: 15 + game.floor * 2, storeHeal: 15, text: `Loaves multiply! +${15 + game.floor * 2} HP and 15 stored.` };
      case 'heal_sick': return { heal: 30 + game.floor * 3, learnVerse: true, text: `The sick one is healed and you are too. +${30 + game.floor * 3} HP, +1 verse.` };
      case 'wilderness_40': return { buff: 'wisdom', hpCost: 10, text: 'You endure the wilderness. -10 HP, but wisdom grows.' };
      case 'stones_to_bread': {
        if (RNG.random() < 0.5) return { buff: 'wisdom', text: 'You refuse the devil. Wisdom +50% vs temptation.' };
        return { hpCost: 14, text: 'Hunger weakens you. -14 HP.' };
      }
      case 'kingdoms_offer': {
        if (RNG.random() < 0.5) return { buff: 'attack', hpCost: 20, text: 'You spurn the offer but the trial cost you. -20 HP, +5 attack.' };
        return { gold: 50, hpCost: 25, text: 'The lure nearly takes you. +50 gold, -25 HP.' };
      }
      case 'lost_sheep': return { heal: 15, learnVerse: true, text: 'The sheep is found! +15 HP and a new verse.' };
      case 'prodigal': return { gold: 35, learnVerse: true, text: 'The feast is yours. +35 gold, +1 verse.' };
      case 'sower_seed': return { learnVerse: true, text: 'You are good soil. You learn a verse.' };
      case 'good_samaritan': return { heal: 25, text: 'Compassion heals you. +25 HP.' };
      case 'talents': return { gold: 20 + game.floor * 5, text: `Your trading multiplies. +${20 + game.floor * 5} gold.` };
      case 'red_sea': return { revealMap: true, heal: 10, text: 'You cross on dry ground. +10 HP, path revealed.' };
      case 'fiery_furnace': return { buff: 'fire', shield: 15, text: 'The flame does not touch you. Fire verses +50%, +15 shield.' };
      case 'lions_den': return { combatBonus: 15, shield: 10, text: 'The lions will not touch you. +15 combat advantage, +10 shield.' };
      case 'great_flood': {
        if (RNG.random() < 0.5) return { heal: 20, revealMap: true, text: 'You ride the ark. +20 HP, map revealed.' };
        return { hpCost: 20, text: 'The deluge batters you. -20 HP.' };
      }
      case 'babel': return { revealSecret: true, gold: 10, text: 'The tower\'s secret is yours. +10 gold.' };
      case 'angel_appears': return { heal: 25, learnVerse: true, text: 'The angel\'s presence heals and teaches. +25 HP, +1 verse.' };
      case 'angel_fights': return { combatBonus: 20, text: 'The angel fights beside you. +20 combat advantage.' };
      case 'angel_truth': return { revealAll: true, revealMap: true, text: 'The angel reveals all: weaknesses and the map.' };
      case 'angel_blocks': return { buff: 'defense', text: 'The angel\'s guard steadies you. +2 defense.' };
      case 'true_form': return { revealWeakness: true, combatBonus: 10, text: 'You name its true form. Weakness exposed, +10 advantage.' };
      case 'demon_history': return { permanentKnowledge: true, revealMap: true, text: 'The dungeon\'s history is yours. Lasting knowledge, map revealed.' };
      case 'begs_death': return { heal: 15, learnVerse: true, text: 'You grant release. The soul\'s peace heals you. +15 HP, +1 verse.' };
      case 'forced_combat': return { startCombat: true, text: 'No choice — combat begins!' };
      case 'combat_condition': return { startCombat: true, condition: 'restricted', text: 'Combat begins under a condition!' };
      case 'combat_reward': return { startCombat: true, rewardOnWin: true, text: 'Combat begins — a reward waits on victory!' };
      case 'river_cross': {
        if (RNG.random() < 0.6) return { revealMap: true, text: 'You cross safely. Path revealed.' };
        return { hpCost: 10, text: 'The current bites. -10 HP.' };
      }
      case 'mountain_climb': {
        if (RNG.random() < 0.6) return { buff: 'defense', text: 'You summit. +2 defense.' };
        return { hpCost: 12, text: 'The climb costs you. -12 HP.' };
      }
      case 'desert_waste': {
        if (RNG.random() < 0.5) return { storeHeal: 10, text: 'You ration well. +10 stored.' };
        return { hpCost: 10, text: 'The waste drains you. -10 HP.' };
      }
      case 'frozen_lake': {
        if (RNG.random() < 0.5) return { text: 'You skate across cleanly!' };
        return { hpCost: 14, text: 'The ice breaks! -14 HP.' };
      }
      case 'volcanic_vent': return { buff: 'fire', hpCost: 8, text: 'You harness the heat. Fire +50%, -8 HP from the glow.' };
      case 'time_loop': return { learnVerse: true, text: 'You break the loop with a verse! +1 verse.' };
      case 'time_freeze': return { buff: 'defense', revealSecret: true, text: 'In the stillness you ready yourself. +2 defense, secret found.' };
      case 'past_vision': return { permanentKnowledge: true, text: 'The past is clear to you now. Lasting knowledge.' };
      case 'future_vision': return { revealMap: true, buff: 'wisdom', text: 'You prepare for what comes. Map revealed, wisdom grows.' };
      case 'deja_vu': return { random_positive_tag: true, heal: 5, text: 'You trust the feeling. +5 HP.' };
      case 'no_right': return { hpCost: 12, gold: -10, text: 'There was no clean answer. -12 HP, -10 gold spent.' };
      case 'both_cost': return { hpCost: 15, gold: -15, text: 'Both costs paid. -15 HP, -15 gold.' };
      case 'third_option': return { revealSecret: true, learnVerse: true, text: 'A hidden third way opens! Secret found, +1 verse.' };
      case 'secret_reward': return { learnVerse: true, gold: 25, text: 'The hidden room yields treasure. +25 gold, +1 verse.' };
      case 'demon_trade': return { gold: 30, hpCost: 10, text: 'Trade struck. +30 gold, -10 HP in fees.' };
      case 'unusual_goods': return { buff: 'attack', gold: -20, text: 'The curiosity empowers you. +3 attack, -20 gold.' };
      case 'bet_gold': {
        if (RNG.random() < 0.5) return { gold: 50, text: 'You win the wager! +50 gold.' };
        return { gold: -30, text: 'You lose the bet. -30 gold.' };
      }
      case 'dice_demon': {
        if (RNG.random() < 0.4) return { gold: 60, learnVerse: true, text: 'Snake eyes in your favor! +60 gold, +1 verse.' };
        return { gold: -25, hpCost: 5, text: 'The bones betray you. -25 gold, -5 HP.' };
      }
      case 'answer_riddle': return { learnVerse: true, gold: 20, text: 'Correct! The keeper yields a verse and 20 gold.' };
      case 'counter_praise': return { heal: 20, buff: 'defense', text: 'Your praise breaks the chorus. +20 HP, +2 defense.' };
      case 'join_chorus': return { hpCost: 20, text: 'You join the hellish song. -20 HP, something is taken.' };
      case 'choose_sacrifice': return { hpCost: 15, buff: 'attack', text: 'The altar takes its due. -15 HP, +4 attack.' };
      case 'free_soul': return { heal: 20, learnVerse: true, text: 'The soul goes free and blesses you. +20 HP, +1 verse.' };
      case 'leave_soul': return { text: 'You leave the soul bound. The dark thickens.' };
      case 'take_cursed': {
        if (RNG.random() < 0.5) return { buff: 'attack', hpCost: 15, text: 'The curse empowers and wounds. +5 attack, -15 HP.' };
        return { buff: 'fire', hpCost: 20, text: 'Cursed power surges. Fire +50%, -20 HP.' };
      }
      case 'refuse_cursed': return { buff: 'wisdom', text: 'You bless the item and refuse it. Wisdom grows.' };
      case 'temp_weapon': return { combatBonus: 25, buff: 'attack', text: 'The legendary weapon sings in your hand. +25 advantage, +3 attack.' };
      case 'verse_path': return { learnVerse: true, revealMap: true, text: 'The verse opens the way. +1 verse, map revealed.' };
      case 'wrong_verse': return { hpCost: 12, text: 'The wrong verse seals the path. -12 HP.' };
      case 'dark_ritual': return { buff: 'attack', hpCost: 20, text: 'Dark communion grants power. +5 attack, -20 HP.' };
      case 'refuse_ritual': return { buff: 'wisdom', text: 'You refuse the rite. Your faith deepens.' };
      case 'pilgrim_steps': return { heal: 20, learnVerse: true, permanentKnowledge: true, text: 'The pilgrimage completes you. +20 HP, +1 verse, lasting knowledge.' };
      case 'abandon_pilgrim': return { text: 'You abandon the path. The station falls silent.' };
      case 'faith_argued': return { buff: 'wisdom', learnVerse: true, text: 'You answer well. Wisdom grows, +1 verse.' };
      case 'doubt_sown': return { hpCost: 12, text: 'A seed of doubt takes root. -12 HP.' };
      case 'martyr_self': return { hpCost: game.maxHp, sacrificePower: true, permanentKnowledge: true, text: 'You give all. The reward is won at the cost of your life — great power, lasting knowledge.' };

      default: return { text: 'Something happens, but you cannot explain what.' };
    }
  },

  // ── GENERATE EVENT ────────────────────────────────────────
  // Floor gating keeps early floors readable; new categories phase in by depth.
  generate(floor, gameContext) {
    const floorGates = {
      npc: 1, trap: 1, temptation: 1, discovery: 1, moral: 1, puzzle: 1,
      treasure: 1, demon_talk: 1, shrine: 1, scroll: 1, hazard: 1,
      nemesis_hint: 1, lore: 1, ambush: 3, healing: 1, choir: 1,
      negotiate: 4, sacrifice: 1, map_event: 1, enemy_trick: 1, forsaken: 1, vision: 1,
      BOOK_OF_REVELATION: 6, MIRACLE: 3, TEMPTATION_OF_CHRIST: 4, PARABLES: 2,
      OLD_TESTAMENT: 2, ANGELIC_ENCOUNTERS: 3, DEMON_NATURE: 5, COMBAT_VARIANTS: 4,
      GEOGRAPHIC: 2, TEMPORAL: 6, MORAL_AMBIGUOUS: 5, HIDDEN_ROOM: 2,
      TRADER_DEMONS: 3, GAMBLING: 4, RIDDLE: 2, CHORUS_OF_HELL: 4,
      SACRIFICIAL_ALTAR: 3, LOST_SOULS: 5, CURSED_ITEM: 2, LEGENDARY_WEAPONS: 3,
      SCRIPTURE_WALK: 3, DARK_COMMUNION: 6, PILGRIMAGE: 4, WITNESS: 5, MARTYRDOM: 7,
    };

    // Weight templates by category and floor
    const eligible = this.templates.filter(t => {
      if ((floorGates[t.category] || 1) > floor) return false;
      if (t.category === 'nemesis_hint' && gameContext.nemesisEncounters < 1) return false;
      if (t.category === 'ambush' && floor < 3) return false;
      if (t.category === 'negotiate' && floor < 4) return false;
      return true;
    });

    // Weighted random selection
    const totalWeight = eligible.reduce((s, t) => s + t.weight, 0);
    let roll = RNG.random() * totalWeight;
    let template = eligible[0];
    for (const t of eligible) {
      roll -= t.weight;
      if (roll <= 0) { template = t; break; }
    }

    // Fill slots
    let text = template.text;
    const filledSlots = {};
    for (const [key, values] of Object.entries(template.slots || {})) {
      let val;
      if (typeof values === 'function') {
        val = values();
      } else {
        val = RNG.choice(values);
      }
      text = text.replace(`{${key}}`, val);
      filledSlots[key] = val;
    }

    // Resolve effects
    const resolvedChoices = template.choices.map(c => ({
      text: c.text,
      effect: this.resolveEffect(c.effect, gameContext),
      weight: c.weight,
    }));

    return {
      id: `event_${Date.now()}_${RNG.randint(0, 9999)}`,
      category: template.category,
      title: this.getCategoryTitle(template.category),
      text,
      choices: resolvedChoices,
    };
  },

  getCategoryTitle(cat) {
    const titles = {
      npc: 'Encounter',
      trap: 'Danger!',
      temptation: 'Temptation',
      discovery: 'Discovery',
      moral: 'Moral Choice',
      puzzle: 'Puzzle',
      treasure: 'Treasure',
      demon_talk: 'Dark Words',
      shrine: 'Sacred Ground',
      scroll: 'Ancient Scroll',
      hazard: 'Hazard',
      nemesis_hint: 'The Stalker',
      lore: 'Vision',
      ambush: 'Ambush!',
      healing: 'Restoration',
      choir: 'Heavenly Sound',
      negotiate: 'Deal',
      sacrifice: 'Sacrifice',
      map_event: 'Revelation',
      enemy_trick: 'Trap!',
      forsaken: 'Forsaken Place',
      vision: 'Divine Vision',
      BOOK_OF_REVELATION: 'Revelation',
      MIRACLE: 'Miracle',
      TEMPTATION_OF_CHRIST: 'The Wilderness',
      PARABLES: 'Parable',
      OLD_TESTAMENT: 'Of Old',
      ANGELIC_ENCOUNTERS: 'Angel',
      DEMON_NATURE: 'Demon\'s Nature',
      COMBAT_VARIANTS: 'Battle',
      GEOGRAPHIC: 'The Land',
      TEMPORAL: 'Time',
      MORAL_AMBIGUOUS: 'No Right Answer',
      HIDDEN_ROOM: 'Hidden Room',
      TRADER_DEMONS: 'Demon Market',
      GAMBLING: 'The Gamble',
      RIDDLE: 'Riddle',
      CHORUS_OF_HELL: 'Chorus of Hell',
      SACRIFICIAL_ALTAR: 'Altar',
      LOST_SOULS: 'Lost Soul',
      CURSED_ITEM: 'Cursed',
      LEGENDARY_WEAPONS: 'Relic',
      SCRIPTURE_WALK: 'The Word',
      DARK_COMMUNION: 'Dark Rite',
      PILGRIMAGE: 'Pilgrimage',
      WITNESS: 'Trial of Faith',
      MARTYRDOM: 'Martyrdom',
    };
    return titles[cat] || 'Event';
  },
};
